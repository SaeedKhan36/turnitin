import { db } from "./db.ts";
import { extractDocument } from "./extract/index.ts";
import { analyseWritingStyle } from "./similarity/ai-heuristic.ts";
import { MIN_SHARED_HASHES } from "./similarity/candidates.ts";
import {
	applyExclusions,
	coverage,
	defaultMatchOptions,
	findMatches,
	type MatchOptions,
	toCharSpans,
} from "./similarity/compare.ts";
import { fingerprintDoc } from "./similarity/fingerprint.ts";
import { normalize } from "./similarity/normalize.ts";
import { getStorage, storageKeys } from "./storage/index.ts";

/** Documents sharing the most fingerprints are inspected in full; the rest aren't. */
const MAX_CANDIDATES = 25;
/** Per-source cap so one pathological match can't produce a 10k-row report. */
const MAX_SPANS_PER_SOURCE = 400;
/** Stay under Postgres/Prisma parameter limits on long theses. */
const FINGERPRINT_INSERT_BATCH = 1000;

/**
 * Extract → fingerprint → compare → report, advancing `status` as it goes so
 * the UI can poll a submission through the pipeline.
 *
 * Runs in-process, fired off after the upload response. That is the right shape
 * for a single node; a multi-node deployment would move this body behind a job
 * queue without changing anything else.
 */
export async function processSubmission(submissionId: string): Promise<void> {
	try {
		await extractStep(submissionId);
		await indexStep(submissionId);
		const meta = await db.submission.findUnique({
			where: { id: submissionId },
			select: { isReference: true },
		});
		// Reference docs are matchable corpus material, not themselves reported on.
		if (!meta?.isReference) {
			await compareStep(submissionId);
		}
		await db.submission.update({
			where: { id: submissionId },
			data: { status: "READY", error: null },
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`[pipeline] submission ${submissionId} failed: ${message}`);
		await db.submission
			.update({
				where: { id: submissionId },
				data: { status: "FAILED", error: message.slice(0, 500) },
			})
			.catch(() => {});
	}
}

async function extractStep(submissionId: string): Promise<void> {
	const submission = await db.submission.update({
		where: { id: submissionId },
		data: { status: "EXTRACTING" },
	});

	const storage = getStorage();
	const bytes = await storage.get(submission.storageKey);
	const result = await extractDocument(bytes, submission.mimeType);

	const text = result.text.trim();
	if (text.length === 0) {
		throw new Error(
			"No readable text was found in this file. If it is a scan, try a " +
				"higher-resolution copy.",
		);
	}

	const textKey = storageKeys.text(submissionId);
	await storage.put(textKey, text, "text/plain; charset=utf-8");

	await db.submission.update({
		where: { id: submissionId },
		data: {
			textKey,
			charCount: text.length,
			wordCount: normalize(text).tokens.length,
			pageCount: result.pageCount ?? null,
		},
	});
}

async function indexStep(submissionId: string): Promise<void> {
	const submission = await db.submission.update({
		where: { id: submissionId },
		data: { status: "INDEXING" },
	});
	if (!submission.textKey) throw new Error("Extraction produced no text file.");

	const text = await getStorage().getText(submission.textKey);
	const fingerprints = fingerprintDoc(normalize(text));

	// Re-indexing replaces the previous run wholesale. Batched so a long
	// thesis cannot exceed Postgres bind-parameter limits (~32k).
	await db.fingerprint.deleteMany({ where: { submissionId } });
	for (let i = 0; i < fingerprints.length; i += FINGERPRINT_INSERT_BATCH) {
		const batch = fingerprints.slice(i, i + FINGERPRINT_INSERT_BATCH);
		await db.fingerprint.createMany({
			data: batch.map((f) => ({
				submissionId,
				hash: f.hash,
				position: f.position,
			})),
		});
	}
}

async function compareStep(submissionId: string): Promise<void> {
	const submission = await db.submission.update({
		where: { id: submissionId },
		data: { status: "COMPARING" },
		include: { assignment: true },
	});
	if (!submission.textKey) throw new Error("Extraction produced no text file.");

	const storage = getStorage();
	const text = await storage.getText(submission.textKey);
	const doc = normalize(text);

	const options: MatchOptions = {
		...defaultMatchOptions,
		minMatchWords:
			submission.assignment?.minMatchWords ?? defaultMatchOptions.minMatchWords,
		excludeQuotes:
			submission.assignment?.excludeQuotes ?? defaultMatchOptions.excludeQuotes,
		excludeBibliography:
			submission.assignment?.excludeBibliography ??
			defaultMatchOptions.excludeBibliography,
	};

	const candidates = await findCandidates(submissionId);
	const queryFingerprints = fingerprintDoc(doc, options.k, options.w);
	const sources: Array<{
		matchedSubmissionId: string;
		score: number;
		matchedChars: number;
		spans: Array<{
			startChar: number;
			endChar: number;
			matchedStartChar: number;
			matchedEndChar: number;
		}>;
	}> = [];

	const allSpans: ReturnType<typeof toCharSpans> = [];

	for (const candidate of candidates) {
		const other = await db.submission.findUnique({
			where: { id: candidate.submissionId },
			select: { id: true, textKey: true },
		});
		if (!other?.textKey) continue;

		const [otherText, storedFingerprints] = await Promise.all([
			storage.getText(other.textKey),
			db.fingerprint.findMany({
				where: { submissionId: other.id },
				select: { hash: true, position: true },
			}),
		]);
		const otherDoc = normalize(otherText);
		const spans = applyExclusions(
			toCharSpans(
				doc,
				otherDoc,
				findMatches(
					doc,
					otherDoc,
					options,
					queryFingerprints,
					storedFingerprints,
				),
			),
			text,
			options,
		).slice(0, MAX_SPANS_PER_SOURCE);
		if (spans.length === 0) continue;

		const perSource = coverage(doc, spans);
		allSpans.push(...spans);
		sources.push({
			matchedSubmissionId: other.id,
			score: perSource.score,
			matchedChars: perSource.matchedChars,
			spans: spans.map((s) => ({
				startChar: s.startChar,
				endChar: s.endChar,
				matchedStartChar: s.matchedStartChar,
				matchedEndChar: s.matchedEndChar,
			})),
		});
	}

	// Headline score is the union across sources, so overlapping matches from
	// two documents don't add up to more than the text they actually cover.
	const overall = coverage(doc, allSpans);
	const style = analyseWritingStyle(text);

	await db.$transaction(async (tx) => {
		await tx.report.deleteMany({ where: { submissionId } });
		const report = await tx.report.create({
			data: {
				submissionId,
				similarityScore: overall.score,
				matchedChars: overall.matchedChars,
				totalChars: text.length,
				aiScore: style.score,
				aiConfidence: style.confidence,
			},
		});
		for (const source of sources.sort((a, b) => b.score - a.score)) {
			await tx.matchSource.create({
				data: {
					reportId: report.id,
					matchedSubmissionId: source.matchedSubmissionId,
					score: source.score,
					matchedChars: source.matchedChars,
					spans: { createMany: { data: source.spans } },
				},
			});
		}
	});
}

/**
 * Rank the corpus by number of shared fingerprints. This is the index lookup
 * that makes comparison tractable: only these documents get read and diffed.
 */
async function findCandidates(
	submissionId: string,
): Promise<Array<{ submissionId: string; shared: number }>> {
	const own = await db.fingerprint.findMany({
		where: { submissionId },
		select: { hash: true },
	});
	const hashes = [...new Set(own.map((f) => f.hash))];
	if (hashes.length === 0) return [];

	const rows = await db.$queryRaw<
		Array<{ submissionId: string; shared: bigint }>
	>`
		SELECT f."submissionId" AS "submissionId", COUNT(DISTINCT f.hash)::bigint AS shared
		FROM "Fingerprint" f
		JOIN "Submission" s ON s.id = f."submissionId"
		WHERE f.hash = ANY(${hashes}::int[])
		  AND f."submissionId" <> ${submissionId}
		  AND s.status <> 'FAILED'
		GROUP BY f."submissionId"
		HAVING COUNT(DISTINCT f.hash) >= ${MIN_SHARED_HASHES}
		ORDER BY shared DESC, f."submissionId" ASC
		LIMIT ${MAX_CANDIDATES}
	`;

	return rows.map((r) => ({
		submissionId: r.submissionId,
		shared: Number(r.shared),
	}));
}
