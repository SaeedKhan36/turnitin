import { type Fingerprint, fingerprintDoc, K, W } from "./fingerprint.ts";
import type { NormalizedDoc } from "./normalize.ts";

export interface MatchOptions {
	k: number;
	w: number;
	/** Shared runs shorter than this are noise (shared idiom, citations). */
	minMatchWords: number;
	excludeQuotes: boolean;
	excludeBibliography: boolean;
}

export const defaultMatchOptions: MatchOptions = {
	k: K,
	w: W,
	minMatchWords: 8,
	excludeQuotes: true,
	excludeBibliography: true,
};

/**
 * Adjacent exact runs separated by at most this many tokens (on both sides)
 * are treated as one passage. Large enough for a short edit or OCR glitch;
 * small enough that two unrelated nearby sentences stay separate.
 */
export const MAX_MERGE_GAP = 2;

/** Lookahead window for substitution-tolerant extension, in tokens. */
const EXTEND_LOOKAHEAD = 4;
/** Minimum identical-token ratio inside a lookahead window to keep growing. */
const EXTEND_TOLERANCE = 0.75;
/** Bounded tolerant rounds — enough for a few scattered edits, not boilerplate crawl. */
const MAX_TOLERANT_ROUNDS = 3;

/** A shared passage, as inclusive token indices in each document. */
export interface TokenSpan {
	queryStart: number;
	queryEnd: number;
	sourceStart: number;
	sourceEnd: number;
	/**
	 * The runs this passage was stitched from, when it is a merge of several.
	 * Each run keeps a constant query-to-source offset; the merged envelope does
	 * not, because an insertion shifts the alignment. Reporting splits these
	 * rather than the envelope, so an edit mid-passage doesn't lose everything
	 * after it.
	 */
	parts?: TokenSpan[];
}

/** The same passage as character offsets into each document's original text. */
export interface CharSpan {
	startChar: number;
	endChar: number;
	matchedStartChar: number;
	matchedEndChar: number;
	words: number;
}

function indexByHash(fingerprints: Fingerprint[]): Map<number, number[]> {
	const index = new Map<number, number[]>();
	for (const { hash, position } of fingerprints) {
		const bucket = index.get(hash);
		if (bucket) bucket.push(position);
		else index.set(hash, [position]);
	}
	return index;
}

/**
 * Grow a seed k-gram collision into the longest run of identical tokens around
 * it, then walk a short lookahead window so a substituted word does not kill
 * the rest of a copied paragraph.
 *
 * 32-bit hash collisions die here: if the seed's tokens don't actually match,
 * there is nothing to extend and the seed is dropped.
 */
function extendSeed(
	query: string[],
	source: string[],
	queryPos: number,
	sourcePos: number,
	k: number,
): TokenSpan | null {
	for (let i = 0; i < k; i++) {
		if (query[queryPos + i] !== source[sourcePos + i]) return null;
	}

	let qStart = queryPos;
	let sStart = sourcePos;
	let qEnd = queryPos + k - 1;
	let sEnd = sourcePos + k - 1;

	({ qStart, sStart, qEnd, sEnd } = exactGrow(
		query,
		source,
		qStart,
		sStart,
		qEnd,
		sEnd,
	));

	for (let round = 0; round < MAX_TOLERANT_ROUNDS; round++) {
		const before = `${qStart},${sStart},${qEnd},${sEnd}`;
		const right = tryTolerant(query, source, qEnd, sEnd, 1);
		if (right) {
			qEnd = right.q;
			sEnd = right.s;
		}
		const left = tryTolerant(query, source, qStart, sStart, -1);
		if (left) {
			qStart = left.q;
			sStart = left.s;
		}
		({ qStart, sStart, qEnd, sEnd } = exactGrow(
			query,
			source,
			qStart,
			sStart,
			qEnd,
			sEnd,
		));
		if (`${qStart},${sStart},${qEnd},${sEnd}` === before) break;
	}

	// Lookahead windows can land on a mismatch; keep interior edits (they are
	// part of the copied passage) but don't start or end the highlight on one.
	while (qStart < qEnd && query[qStart] !== source[sStart]) {
		qStart++;
		sStart++;
	}
	while (qEnd > qStart && query[qEnd] !== source[sEnd]) {
		qEnd--;
		sEnd--;
	}

	return {
		queryStart: qStart,
		queryEnd: qEnd,
		sourceStart: sStart,
		sourceEnd: sEnd,
	};
}

function exactGrow(
	query: string[],
	source: string[],
	qStart: number,
	sStart: number,
	qEnd: number,
	sEnd: number,
): { qStart: number; sStart: number; qEnd: number; sEnd: number } {
	while (qStart > 0 && sStart > 0 && query[qStart - 1] === source[sStart - 1]) {
		qStart--;
		sStart--;
	}
	while (
		qEnd + 1 < query.length &&
		sEnd + 1 < source.length &&
		query[qEnd + 1] === source[sEnd + 1]
	) {
		qEnd++;
		sEnd++;
	}
	return { qStart, sStart, qEnd, sEnd };
}

function tryTolerant(
	query: string[],
	source: string[],
	qAt: number,
	sAt: number,
	direction: 1 | -1,
): { q: number; s: number } | null {
	const qNext = qAt + direction;
	const sNext = sAt + direction;
	if (
		qNext < 0 ||
		sNext < 0 ||
		qNext >= query.length ||
		sNext >= source.length
	) {
		return null;
	}

	const remaining =
		direction === 1
			? Math.min(query.length - 1 - qAt, source.length - 1 - sAt)
			: Math.min(qAt, sAt);
	const n = Math.min(EXTEND_LOOKAHEAD, remaining);
	if (n < EXTEND_LOOKAHEAD) return null;

	let matches = 0;
	for (let i = 1; i <= n; i++) {
		if (query[qAt + direction * i] === source[sAt + direction * i]) matches++;
	}
	if (matches / n < EXTEND_TOLERANCE) return null;

	return { q: qAt + direction * n, s: sAt + direction * n };
}

/**
 * Stitch exact runs that are separated by a short edit in *both* documents.
 *
 * Two genuinely separate passages stay separate: a large gap on either side
 * means they are not one copied run. Different source locations of the same
 * query phrase also stay separate (the source gap is large).
 */
export function mergeTokenSpans(spans: TokenSpan[]): TokenSpan[] {
	if (spans.length === 0) return [];
	const sorted = [...spans].sort(
		(a, b) => a.queryStart - b.queryStart || a.sourceStart - b.sourceStart,
	);
	const bare = (span: TokenSpan): TokenSpan => ({
		queryStart: span.queryStart,
		queryEnd: span.queryEnd,
		sourceStart: span.sourceStart,
		sourceEnd: span.sourceEnd,
	});

	const merged: TokenSpan[] = [
		{ ...bare(sorted[0]), parts: [bare(sorted[0])] },
	];
	for (const current of sorted.slice(1)) {
		const last = merged[merged.length - 1];
		const qGap = current.queryStart - last.queryEnd - 1;
		const sGap = current.sourceStart - last.sourceEnd - 1;
		const diagDiff = Math.abs(
			current.sourceStart -
				current.queryStart -
				(last.sourceStart - last.queryStart),
		);
		if (
			qGap <= MAX_MERGE_GAP &&
			sGap <= MAX_MERGE_GAP &&
			diagDiff <= MAX_MERGE_GAP
		) {
			last.queryStart = Math.min(last.queryStart, current.queryStart);
			last.queryEnd = Math.max(last.queryEnd, current.queryEnd);
			last.sourceStart = Math.min(last.sourceStart, current.sourceStart);
			last.sourceEnd = Math.max(last.sourceEnd, current.sourceEnd);
			last.parts = [...(last.parts ?? []), bare(current)];
		} else {
			merged.push({ ...bare(current), parts: [bare(current)] });
		}
	}
	return merged;
}

/**
 * Repeated phrases produce several source alignments over the same query
 * region. Keep the longest and drop later spans that mostly overlap it.
 */
function dedupeQueryOverlaps(spans: TokenSpan[]): TokenSpan[] {
	const byLength = [...spans].sort(
		(a, b) => b.queryEnd - b.queryStart - (a.queryEnd - a.queryStart),
	);
	const kept: TokenSpan[] = [];
	for (const current of byLength) {
		const currentLen = current.queryEnd - current.queryStart + 1;
		if (currentLen <= 0) continue;
		const subsumed = kept.some((existing) => {
			const overlap =
				Math.min(current.queryEnd, existing.queryEnd) -
				Math.max(current.queryStart, existing.queryStart) +
				1;
			return overlap > 0 && overlap / currentLen > 0.5;
		});
		if (!subsumed) kept.push(current);
	}
	return kept.sort((a, b) => a.queryStart - b.queryStart);
}

/**
 * All passages shared between two documents.
 *
 * Seeds are deduplicated by diagonal (queryPos - sourcePos): once a run has been
 * extended, every other seed lying inside that same run is redundant, which is
 * what keeps this near-linear instead of quadratic on heavily repeated text.
 */
export function findMatches(
	query: NormalizedDoc,
	source: NormalizedDoc,
	options: MatchOptions = defaultMatchOptions,
	queryFingerprints?: Fingerprint[],
	sourceFingerprints?: Fingerprint[],
): TokenSpan[] {
	const qf =
		queryFingerprints && queryFingerprints.length > 0
			? queryFingerprints
			: fingerprintDoc(query, options.k, options.w);
	const sf =
		sourceFingerprints && sourceFingerprints.length > 0
			? sourceFingerprints
			: fingerprintDoc(source, options.k, options.w);
	const sourceIndex = indexByHash(sf);

	const coveredByDiagonal = new Map<number, number>();
	const spans: TokenSpan[] = [];

	for (const { hash, position: queryPos } of qf) {
		const sourcePositions = sourceIndex.get(hash);
		if (!sourcePositions) continue;

		for (const sourcePos of sourcePositions) {
			const diagonal = queryPos - sourcePos;
			const coveredUpTo = coveredByDiagonal.get(diagonal);
			if (coveredUpTo !== undefined && queryPos <= coveredUpTo) continue;

			const span = extendSeed(
				query.tokens,
				source.tokens,
				queryPos,
				sourcePos,
				options.k,
			);
			if (!span) continue;

			coveredByDiagonal.set(diagonal, span.queryEnd);
			spans.push(span);
		}
	}

	// Merge first, then apply the length floor: two 6-word fragments around a
	// one-word edit should become one 13-word match, not two discarded scraps.
	return dedupeQueryOverlaps(mergeTokenSpans(spans)).filter(
		(span) => span.queryEnd - span.queryStart + 1 >= options.minMatchWords,
	);
}

/**
 * Split one detected passage into its maximal verbatim runs.
 *
 * Tolerant extension and gap stitching deliberately reach across a substituted
 * word so that a lightly edited paragraph is still detected as one passage.
 * That is right for *detection* and wrong for *reporting*: a highlight covering
 * a word the student actually wrote, and a score counting it as matched, are
 * both claims the report cannot support. Detection keeps the whole passage; the
 * report gets only the parts that are genuinely identical.
 *
 * Callers pass the individual runs, each of which holds a constant
 * query-to-source offset, so walking both at the same offset is sound here.
 */
function verbatimRuns(
	query: NormalizedDoc,
	source: NormalizedDoc,
	span: TokenSpan,
): TokenSpan[] {
	const length = Math.min(
		span.queryEnd - span.queryStart,
		span.sourceEnd - span.sourceStart,
	);
	const runs: TokenSpan[] = [];
	let runStart = -1;

	const flush = (endOffset: number) => {
		if (runStart === -1) return;
		runs.push({
			queryStart: span.queryStart + runStart,
			queryEnd: span.queryStart + endOffset,
			sourceStart: span.sourceStart + runStart,
			sourceEnd: span.sourceStart + endOffset,
		});
		runStart = -1;
	};

	for (let offset = 0; offset <= length; offset++) {
		const identical =
			query.tokens[span.queryStart + offset] ===
			source.tokens[span.sourceStart + offset];
		if (identical && runStart === -1) runStart = offset;
		if (!identical) flush(offset - 1);
	}
	flush(length);

	return runs;
}

export function toCharSpans(
	query: NormalizedDoc,
	source: NormalizedDoc,
	spans: TokenSpan[],
): CharSpan[] {
	return spans
		.flatMap((span) => span.parts ?? [span])
		.flatMap((run) => verbatimRuns(query, source, run))
		.sort((a, b) => a.queryStart - b.queryStart)
		.map((s) => ({
			startChar: query.tokenStart[s.queryStart],
			endChar: query.tokenEnd[s.queryEnd],
			matchedStartChar: source.tokenStart[s.sourceStart],
			matchedEndChar: source.tokenEnd[s.sourceEnd],
			words: s.queryEnd - s.queryStart + 1,
		}));
}

// ---------------------------------------------------------------------------
// Exclusions
// ---------------------------------------------------------------------------

/**
 * Character ranges wrapped in double quotes (straight, curly, guillemets).
 *
 * Caps length and newlines so an unclosed opening quote that later meets an
 * unrelated closer cannot swallow half the document.
 */
const MAX_QUOTE_CHARS = 2000;
const MAX_QUOTE_NEWLINES = 8;

export function findQuotedRanges(text: string): Array<[number, number]> {
	const ranges: Array<[number, number]> = [];
	const pattern = new RegExp(
		`"([^"]{1,${MAX_QUOTE_CHARS}})"|“([^”]{1,${MAX_QUOTE_CHARS}})”|«([^»]{1,${MAX_QUOTE_CHARS}})»|„([^”]{1,${MAX_QUOTE_CHARS}})”`,
		"g",
	);
	let match: RegExpExecArray | null = pattern.exec(text);
	while (match !== null) {
		const newlines = (match[0].match(/\n/g) ?? []).length;
		if (newlines <= MAX_QUOTE_NEWLINES) {
			ranges.push([match.index, match.index + match[0].length]);
		}
		match = pattern.exec(text);
	}
	return ranges;
}

/** Offset of a trailing reference list, or null if there isn't one. */
export function findBibliographyStart(text: string): number | null {
	const heading =
		/^[ \t]*(references|bibliography|works\s+cited|literature\s+cited|works\s+consulted|reference\s+list|cited\s+works)[ \t]*:?[ \t]*$/gim;
	let last: number | null = null;
	let match: RegExpExecArray | null = heading.exec(text);
	while (match !== null) {
		last = match.index;
		match = heading.exec(text);
	}
	// A "References" heading in the first half of a document is a section title
	// or a contents entry, not the start of the reference list.
	if (last !== null && last < text.length * 0.5) return null;
	return last;
}

export function applyExclusions(
	spans: CharSpan[],
	text: string,
	options: MatchOptions,
): CharSpan[] {
	const quoted = options.excludeQuotes ? findQuotedRanges(text) : [];
	const biblioStart = options.excludeBibliography
		? findBibliographyStart(text)
		: null;

	return spans.filter((span) => {
		if (biblioStart !== null && span.startChar >= biblioStart) return false;
		// Drop a span only when a quotation swallows it whole; a long passage
		// with one quoted sentence inside it is still a real match.
		return !quoted.some(
			([from, to]) => span.startChar >= from && span.endChar <= to,
		);
	});
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function mergeCharSpans(
	spans: CharSpan[],
): Array<{ start: number; end: number }> {
	if (spans.length === 0) return [];
	const sorted = [...spans].sort((a, b) => a.startChar - b.startChar);
	const merged: Array<{ start: number; end: number }> = [
		{ start: sorted[0].startChar, end: sorted[0].endChar },
	];
	for (const span of sorted.slice(1)) {
		const last = merged[merged.length - 1];
		if (span.startChar <= last.end) last.end = Math.max(last.end, span.endChar);
		else merged.push({ start: span.startChar, end: span.endChar });
	}
	return merged;
}

/**
 * Fraction of the document's *words* that appear in at least one match.
 *
 * Word-based scoring is the right unit here: character scoring would let
 * punctuation, whitespace, and a few long technical terms swing the headline
 * percentage, and overlapping sources would still need a union pass. Matched
 * character counts are kept as a separate display figure.
 *
 * Overlapping matches from several sources are unioned first, so the overall
 * score is unique coverage, not the sum of per-source percentages.
 */
export function coverage(
	doc: NormalizedDoc,
	spans: CharSpan[],
): { score: number; matchedWords: number; matchedChars: number } {
	const merged = mergeCharSpans(spans);
	let matchedWords = 0;
	let cursor = 0;
	for (let t = 0; t < doc.tokens.length; t++) {
		const start = doc.tokenStart[t];
		while (cursor < merged.length && merged[cursor].end <= start) cursor++;
		if (
			cursor < merged.length &&
			start >= merged[cursor].start &&
			start < merged[cursor].end
		) {
			matchedWords++;
		}
	}
	const matchedChars = merged.reduce((sum, r) => sum + (r.end - r.start), 0);
	return {
		score: doc.tokens.length === 0 ? 0 : matchedWords / doc.tokens.length,
		matchedWords,
		matchedChars,
	};
}
