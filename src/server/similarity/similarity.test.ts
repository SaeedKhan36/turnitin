import { describe, expect, it } from "vitest";
import { analyseWritingStyle } from "./ai-heuristic.ts";
import { rankCandidates } from "./candidates.ts";
import {
	applyExclusions,
	coverage,
	defaultMatchOptions,
	findBibliographyStart,
	findMatches,
	findQuotedRanges,
	mergeCharSpans,
	mergeTokenSpans,
	toCharSpans,
} from "./compare.ts";
import { fingerprintTokens, hashKgram, K, W, winnow } from "./fingerprint.ts";
import { foldToken, normalize } from "./normalize.ts";

const LIFTED = `The mitochondrion is often described as the powerhouse of the cell because it generates most of the chemical energy needed to power the cell's biochemical reactions. Energy produced by the mitochondria is stored in a small molecule called adenosine triphosphate, which is then transported throughout the cell to fuel the various processes that sustain life.`;

const ORIGINAL_ESSAY = `Cellular respiration remains one of the most studied processes in modern biology. Researchers across many decades have refined our understanding of how organisms convert nutrients into usable energy. ${LIFTED} Later investigations expanded on these findings by examining how different tissue types vary in their metabolic demands and how those demands shift under stress.`;

const STUDENT_ESSAY = `In this essay I will examine how cells produce and manage their energy supply over time. ${LIFTED} My own view is that the textbook framing understates how much variation exists between organisms, and further study of comparative physiology would help clarify the picture considerably.`;

const UNRELATED_ESSAY = `Coastal erosion along the North Sea has accelerated markedly since the middle of the twentieth century. Sea defences built during earlier decades were designed around assumptions about storm frequency that no longer hold, and local authorities now face difficult decisions about managed retreat versus continued investment in hard engineering.`;

const COASTAL_PASSAGE = `Managed retreat is increasingly discussed as a realistic alternative to ever-higher sea walls, particularly where the long-term cost of hard defences exceeds the value of the land being protected. Local communities remain divided, because abandoning a shoreline also means abandoning the roads, utilities, and housing that were built on the assumption that the coast would stay put.`;

function compare(
	queryText: string,
	sourceText: string,
	options = defaultMatchOptions,
) {
	const query = normalize(queryText);
	const source = normalize(sourceText);
	const spans = toCharSpans(query, source, findMatches(query, source, options));
	const kept = applyExclusions(spans, queryText, options);
	return { query, source, spans: kept, ...coverage(query, kept) };
}

function assertRoundTrip(
	original: string,
	start: number,
	end: number,
	needle: string,
) {
	const highlighted = original.slice(start, end);
	expect(highlighted).toContain(needle);
	expect(start).toBeGreaterThanOrEqual(0);
	expect(end).toBeLessThanOrEqual(original.length);
	expect(end).toBeGreaterThan(start);
}

describe("normalize", () => {
	it("maps every token back to its exact position in the original text", () => {
		const text = "The  café's WI-FI, naïve? Yes!";
		const doc = normalize(text);
		expect(doc.tokens).toEqual(["the", "cafes", "wi", "fi", "naive", "yes"]);
		for (let i = 0; i < doc.tokens.length; i++) {
			const slice = text.slice(doc.tokenStart[i], doc.tokenEnd[i]);
			expect(foldToken(slice)).toBe(doc.tokens[i]);
		}
	});

	it("produces no tokens for text with no words", () => {
		expect(normalize("   ---  !!  ").tokens).toEqual([]);
		expect(normalize("").tokens).toEqual([]);
	});

	it("keeps dotted decimals as one token", () => {
		expect(normalize("pi is 3.14159 exactly").tokens).toEqual([
			"pi",
			"is",
			"3.14159",
			"exactly",
		]);
	});

	it("keeps contractions as one token and folds the apostrophe", () => {
		expect(normalize("don't won’t can't").tokens).toEqual([
			"dont",
			"wont",
			"cant",
		]);
	});

	it("splits hyphenated compounds so spaced and hyphenated forms can match", () => {
		expect(normalize("well-known method").tokens).toEqual([
			"well",
			"known",
			"method",
		]);
		expect(normalize("well known method").tokens).toEqual([
			"well",
			"known",
			"method",
		]);
	});

	it("folds ligatures and fullwidth letters", () => {
		expect(normalize("ﬁsh").tokens).toEqual(["fish"]);
		expect(normalize("ＣＡＦＥ").tokens).toEqual(["cafe"]);
	});

	it("does not split a word on a soft hyphen or zero-width space", () => {
		expect(normalize("cell\u00ADular").tokens).toEqual(["cellular"]);
		expect(normalize("power\u200Bhouse").tokens).toEqual(["powerhouse"]);
	});

	it("drops bracketed citation markers so they cannot poison k-grams", () => {
		const withCite = normalize("energy needed to power[12] the cell");
		const clean = normalize("energy needed to power the cell");
		expect(withCite.tokens).toEqual(clean.tokens);
	});

	it("collapses repeated whitespace and line breaks without shifting offsets", () => {
		const text = "Hello,\n\n\tworld.";
		const doc = normalize(text);
		expect(doc.tokens).toEqual(["hello", "world"]);
		expect(text.slice(doc.tokenStart[1], doc.tokenEnd[1])).toBe("world");
	});
});

describe("winnowing", () => {
	it("keeps roughly one hash per window", () => {
		const hashes = Array.from({ length: 400 }, (_, i) => (i * 2654435761) | 0);
		const kept = winnow(hashes, W);
		expect(kept.length).toBeLessThan(hashes.length);
		expect(kept.length).toBeGreaterThan(hashes.length / (W + 1));
	});

	it("selects the same fingerprints for a passage wherever it appears", () => {
		const passage = normalize(LIFTED).tokens;
		const prefixed = normalize(
			`Some unrelated preamble here. ${LIFTED}`,
		).tokens;
		const offset = prefixed.length - passage.length;

		const direct = fingerprintTokens(passage);
		const shifted = fingerprintTokens(prefixed)
			.filter((f) => f.position >= offset)
			.map((f) => ({ hash: f.hash, position: f.position - offset }));

		const shiftedHashes = new Set(shifted.map((f) => f.hash));
		const interior = direct.filter(
			(f) => f.position > W && f.position < passage.length - K - W,
		);
		expect(interior.length).toBeGreaterThan(0);
		for (const f of interior) expect(shiftedHashes.has(f.hash)).toBe(true);
	});

	it("hashes ['ab','c'] differently from ['a','bc']", () => {
		expect(hashKgram(["ab", "c", "d", "e", "f"], 0, 5)).not.toBe(
			hashKgram(["a", "bc", "d", "e", "f"], 0, 5),
		);
	});

	it("is deterministic", () => {
		const tokens = normalize(LIFTED).tokens;
		expect(fingerprintTokens(tokens)).toEqual(fingerprintTokens(tokens));
	});
});

describe("findMatches", () => {
	it("scores an identical document at effectively 100%", () => {
		const { score } = compare(ORIGINAL_ESSAY, ORIGINAL_ESSAY);
		expect(score).toBeGreaterThan(0.98);
	});

	it("scores unrelated documents at zero", () => {
		const { score, spans } = compare(UNRELATED_ESSAY, ORIGINAL_ESSAY);
		expect(spans).toHaveLength(0);
		expect(score).toBe(0);
	});

	it("finds a lifted passage and reports it as the right share of the document", () => {
		const { score, spans, matchedWords } = compare(
			STUDENT_ESSAY,
			ORIGINAL_ESSAY,
		);
		const liftedWords = normalize(LIFTED).tokens.length;
		const totalWords = normalize(STUDENT_ESSAY).tokens.length;

		expect(spans.length).toBeGreaterThan(0);
		expect(matchedWords).toBeGreaterThanOrEqual(liftedWords - 2);
		expect(matchedWords).toBeLessThanOrEqual(liftedWords + 4);
		expect(score).toBeCloseTo(liftedWords / totalWords, 1);
	});

	it("highlights the actual copied text, not an offset window", () => {
		const { spans } = compare(STUDENT_ESSAY, ORIGINAL_ESSAY);
		assertRoundTrip(
			STUDENT_ESSAY,
			spans[0].startChar,
			spans[0].endChar,
			"powerhouse of the cell",
		);
		expect(
			STUDENT_ESSAY.slice(spans[0].startChar, spans[0].endChar),
		).not.toContain("In this essay I will examine");

		assertRoundTrip(
			ORIGINAL_ESSAY,
			spans[0].matchedStartChar,
			spans[0].matchedEndChar,
			"powerhouse of the cell",
		);
	});

	it("still matches after punctuation is changed", () => {
		const punctuated = LIFTED.replaceAll(",", " —").replaceAll(".", "!");
		const { spans, matchedWords } = compare(
			`Intro sentence here. ${punctuated} Closing thought.`,
			ORIGINAL_ESSAY,
		);
		expect(spans.length).toBeGreaterThan(0);
		expect(matchedWords).toBeGreaterThan(normalize(LIFTED).tokens.length - 4);
	});

	it("still matches after whitespace is changed", () => {
		const messy = LIFTED.replaceAll(" ", "  \n");
		const { spans } = compare(
			`Intro sentence here. ${messy} Closing thought.`,
			ORIGINAL_ESSAY,
		);
		expect(spans.length).toBeGreaterThan(0);
		assertRoundTrip(
			`Intro sentence here. ${messy} Closing thought.`,
			spans[0].startChar,
			spans[0].endChar,
			"powerhouse",
		);
	});

	it("still matches a copied paragraph with a single substituted word", () => {
		const edited = LIFTED.replace("powerhouse", "engine");
		const { spans, matchedWords } = compare(
			`Intro sentence here. ${edited} Closing thought.`,
			ORIGINAL_ESSAY,
		);
		expect(spans.length).toBeGreaterThan(0);
		expect(matchedWords).toBeGreaterThan(normalize(LIFTED).tokens.length * 0.6);
	});

	it("still matches a copied paragraph with a short inserted phrase", () => {
		const inserted = LIFTED.replace(
			"powerhouse of the cell",
			"powerhouse of the living cell",
		);
		const text = `Intro sentence here. ${inserted} Closing thought.`;
		const { spans } = compare(text, ORIGINAL_ESSAY);

		expect(spans.length).toBeGreaterThan(0);
		const highlighted = spans.map((s) => text.slice(s.startChar, s.endChar));

		// The insertion shifts the alignment, so the passage is reported as the
		// runs on either side of it — crucially, the text after the insertion is
		// still found rather than being lost with it.
		expect(highlighted.some((h) => h.includes("powerhouse of the"))).toBe(true);
		expect(highlighted.some((h) => h.includes("biochemical reactions"))).toBe(
			true,
		);
		// The inserted word is the student's, not the source's; never claim it.
		expect(highlighted.every((h) => !h.includes("living"))).toBe(true);
	});

	it("ignores shared phrases shorter than the minimum match length", () => {
		const a =
			"One of the most studied processes in modern biology is worth noting.";
		const b =
			"Scholars agree that one of the most studied processes in modern chemistry differs.";
		const strict = compare(a, b, { ...defaultMatchOptions, minMatchWords: 12 });
		const loose = compare(a, b, { ...defaultMatchOptions, minMatchWords: 5 });
		expect(strict.spans).toHaveLength(0);
		expect(loose.spans.length).toBeGreaterThan(0);
	});

	it("does not treat 1–3 common words as a match at the default threshold", () => {
		const a =
			"The cat sat on the unusually specific velvet cushion near the window.";
		const b =
			"The dog sat on the unusually specific marble staircase near the door.";
		expect(compare(a, b).spans).toHaveLength(0);
	});

	it("returns zero for an empty query", () => {
		const { score, spans } = compare("", ORIGINAL_ESSAY);
		expect(spans).toHaveLength(0);
		expect(score).toBe(0);
	});

	it("returns zero for a very short query that cannot seed a k-gram", () => {
		const { score, spans } = compare("Too short.", ORIGINAL_ESSAY);
		expect(spans).toHaveLength(0);
		expect(score).toBe(0);
	});
});

describe("multiple sources", () => {
	it("attributes each copied passage to the document it came from", () => {
		const query = `Opening thoughts. ${LIFTED} A bridging paragraph of original analysis goes here. ${COASTAL_PASSAGE} Closing thoughts.`;
		const againstCell = compare(query, ORIGINAL_ESSAY);
		const againstCoast = compare(
			query,
			`${UNRELATED_ESSAY} ${COASTAL_PASSAGE}`,
		);

		expect(againstCell.spans.length).toBeGreaterThan(0);
		expect(againstCoast.spans.length).toBeGreaterThan(0);
		expect(
			query.slice(againstCell.spans[0].startChar, againstCell.spans[0].endChar),
		).toContain("powerhouse");
		expect(
			query.slice(
				againstCoast.spans[0].startChar,
				againstCoast.spans[0].endChar,
			),
		).toContain("Managed retreat");
	});

	it("does not double-count overlapping sources in the overall score", () => {
		const query = `Intro. ${LIFTED} Outro of original writing to pad the document out.`;
		const sourceA = `Alpha unique preamble. ${LIFTED} Alpha unique ending.`;
		const sourceB = `Beta unique preamble. ${LIFTED} Beta unique ending.`;

		const queryDoc = normalize(query);
		const spansA = toCharSpans(
			queryDoc,
			normalize(sourceA),
			findMatches(queryDoc, normalize(sourceA)),
		);
		const spansB = toCharSpans(
			queryDoc,
			normalize(sourceB),
			findMatches(queryDoc, normalize(sourceB)),
		);

		const scoreA = coverage(queryDoc, spansA).score;
		const scoreB = coverage(queryDoc, spansB).score;
		const overall = coverage(queryDoc, [...spansA, ...spansB]).score;

		expect(scoreA).toBeGreaterThan(0.3);
		expect(scoreB).toBeGreaterThan(0.3);
		expect(overall).toBeLessThan(scoreA + scoreB - 0.05);
		expect(overall).toBeCloseTo(Math.max(scoreA, scoreB), 2);
	});
});

describe("match merging", () => {
	it("merges overlapping token runs into one passage", () => {
		const merged = mergeTokenSpans([
			{ queryStart: 0, queryEnd: 4, sourceStart: 0, sourceEnd: 4 },
			{ queryStart: 2, queryEnd: 8, sourceStart: 2, sourceEnd: 8 },
			{ queryStart: 6, queryEnd: 12, sourceStart: 6, sourceEnd: 12 },
		]);
		expect(
			merged.map(({ queryStart, queryEnd, sourceStart, sourceEnd }) => ({
				queryStart,
				queryEnd,
				sourceStart,
				sourceEnd,
			})),
		).toEqual([{ queryStart: 0, queryEnd: 12, sourceStart: 0, sourceEnd: 12 }]);
	});

	it("does not merge genuinely separate passages", () => {
		const merged = mergeTokenSpans([
			{ queryStart: 0, queryEnd: 10, sourceStart: 0, sourceEnd: 10 },
			{ queryStart: 40, queryEnd: 55, sourceStart: 80, sourceEnd: 95 },
		]);
		expect(merged).toHaveLength(2);
	});

	it("reports a copied paragraph as one span, not overlapping fragments", () => {
		const { spans } = compare(STUDENT_ESSAY, ORIGINAL_ESSAY);
		expect(spans.length).toBe(1);
	});
});

describe("exclusions", () => {
	it("drops a passage that is fully quoted", () => {
		const quoting = `As the source puts it, "${LIFTED}" That framing is useful but incomplete.`;
		const included = compare(quoting, ORIGINAL_ESSAY, {
			...defaultMatchOptions,
			excludeQuotes: false,
		});
		const excluded = compare(quoting, ORIGINAL_ESSAY, {
			...defaultMatchOptions,
			excludeQuotes: true,
		});
		expect(included.spans.length).toBeGreaterThan(0);
		expect(excluded.spans).toHaveLength(0);
	});

	it("does not drop an unquoted match just because a short quote sits nearby", () => {
		const mixed = `${LIFTED} See also "a short quote".`;
		const { spans } = compare(mixed, ORIGINAL_ESSAY, {
			...defaultMatchOptions,
			excludeQuotes: true,
		});
		expect(spans.length).toBeGreaterThan(0);
		assertRoundTrip(mixed, spans[0].startChar, spans[0].endChar, "powerhouse");
	});

	it("handles a multiline quotation", () => {
		const quoted = `"hello there this is a quoted\nsentence that wraps."`;
		expect(findQuotedRanges(quoted)).toHaveLength(1);
	});

	it("does not treat an unclosed quote as a licence to exclude the rest of the document", () => {
		const runaway = `"unclosed opening ${"word ".repeat(80)}${LIFTED}`;
		expect(findQuotedRanges(runaway)).toHaveLength(0);
		const { spans } = compare(runaway, ORIGINAL_ESSAY, {
			...defaultMatchOptions,
			excludeQuotes: true,
		});
		expect(spans.length).toBeGreaterThan(0);
	});

	it("drops matches inside a trailing reference list", () => {
		const body = `${"An extended discussion of the topic, developed over several paragraphs. ".repeat(12)}`;
		const withBiblio = `${body}\n\nReferences\n\n${LIFTED}`;
		expect(findBibliographyStart(withBiblio)).not.toBeNull();
		const excluded = compare(withBiblio, ORIGINAL_ESSAY, {
			...defaultMatchOptions,
			excludeBibliography: true,
		});
		expect(excluded.spans).toHaveLength(0);
	});

	it("detects a Works Cited heading", () => {
		const body = `${"Filler sentence for length. ".repeat(40)}\n\nWorks Cited\n\nSmith, A. 2020.`;
		expect(findBibliographyStart(body)).not.toBeNull();
	});

	it("does not treat a 'References' heading in an introduction as a bibliography", () => {
		const early = `References\n\n${LIFTED}\n\n${"Filler sentence for length. ".repeat(60)}`;
		expect(findBibliographyStart(early)).toBeNull();
	});

	it("does not exclude the body when there is no bibliography heading", () => {
		const { spans } = compare(STUDENT_ESSAY, ORIGINAL_ESSAY, {
			...defaultMatchOptions,
			excludeBibliography: true,
		});
		expect(spans.length).toBeGreaterThan(0);
	});

	it("finds quoted ranges", () => {
		expect(findQuotedRanges('He said "hello there" loudly.')).toEqual([
			[8, 21],
		]);
	});
});

describe("coverage", () => {
	it("merges overlapping spans instead of double counting", () => {
		const merged = mergeCharSpans([
			{
				startChar: 0,
				endChar: 50,
				matchedStartChar: 0,
				matchedEndChar: 50,
				words: 9,
			},
			{
				startChar: 40,
				endChar: 90,
				matchedStartChar: 200,
				matchedEndChar: 250,
				words: 9,
			},
			{
				startChar: 120,
				endChar: 140,
				matchedStartChar: 300,
				matchedEndChar: 320,
				words: 4,
			},
		]);
		expect(merged).toEqual([
			{ start: 0, end: 90 },
			{ start: 120, end: 140 },
		]);
	});

	it("does not let punctuation-heavy text inflate the word score", () => {
		const plain = compare(STUDENT_ESSAY, ORIGINAL_ESSAY);
		const punctuated = compare(
			STUDENT_ESSAY.replaceAll(" ", " , "),
			ORIGINAL_ESSAY,
		);
		expect(punctuated.score).toBeCloseTo(plain.score, 1);
	});
});

describe("large documents", () => {
	it("finds a lifted passage in a long unique document and maps offsets", () => {
		const filler = Array.from({ length: 8000 }, (_, i) => `zxqv${i}`).join(" ");
		const query = `${filler} ${LIFTED} ${filler}`;
		const started = Date.now();
		const { spans, score } = compare(query, ORIGINAL_ESSAY);
		expect(Date.now() - started).toBeLessThan(15_000);
		expect(spans.length).toBeGreaterThan(0);
		assertRoundTrip(query, spans[0].startChar, spans[0].endChar, "powerhouse");
		expect(score).toBeLessThan(0.05);
	});

	it("fingerprints a long document without retaining every k-gram", () => {
		const tokens = Array.from({ length: 20_000 }, (_, i) => `t${i}`);
		const fps = fingerprintTokens(tokens);
		expect(fps.length).toBeGreaterThan(tokens.length / (W + 2));
		expect(fps.length).toBeLessThan(tokens.length);
		expect(fps.every((f) => Number.isInteger(f.position))).toBe(true);
	});
});

describe("ocr-like noise", () => {
	it("still detects a passage after a typical single-word OCR substitution", () => {
		const noisy = LIFTED.replace("mitochondrion", "mitochondrlon");
		const { spans } = compare(
			`Intro sentence here. ${noisy} Closing thought.`,
			ORIGINAL_ESSAY,
		);
		expect(spans.length).toBeGreaterThan(0);
	});

	it("still detects a passage after two consecutive substituted words", () => {
		const noisy = LIFTED.replace(
			"powerhouse of the cell",
			"engine in the cell",
		);
		const { spans, matchedWords } = compare(
			`Intro sentence here. ${noisy} Closing thought.`,
			ORIGINAL_ESSAY,
		);
		expect(spans.length).toBeGreaterThan(0);
		expect(matchedWords).toBeGreaterThan(normalize(LIFTED).tokens.length * 0.5);
	});
});

describe("near duplicate", () => {
	it("scores lightly edited copies very high", () => {
		const near = ORIGINAL_ESSAY.replaceAll("studied", "examined").replaceAll(
			"energy",
			"power",
		);
		const { score } = compare(near, ORIGINAL_ESSAY, {
			...defaultMatchOptions,
			minMatchWords: 6,
		});
		expect(score).toBeGreaterThan(0.5);
	});
});

describe("repeated common phrases", () => {
	it("does not match unrelated essays that only share a short idiom", () => {
		const idiom = "in modern science today";
		const a = `${idiom}. ${"Unique alpha content here. ".repeat(20)}`;
		const b = `${idiom}. ${"Distinct beta material instead. ".repeat(20)}`;
		const { spans, score } = compare(a, b);
		expect(spans).toHaveLength(0);
		expect(score).toBe(0);
	});
});

describe("candidate retrieval", () => {
	it("ranks by distinct shared hashes, not repeated positions of one hash", () => {
		const queryDoc = normalize(`Intro. ${LIFTED} Outro.`);
		const queryHashes = fingerprintTokens(queryDoc.tokens).map((f) => f.hash);
		const trueSourceHashes = fingerprintTokens(
			normalize(ORIGINAL_ESSAY).tokens,
		).map((f) => f.hash);
		const noisyHash = trueSourceHashes[0];
		const decoys = Array.from({ length: 30 }, (_, i) => ({
			submissionId: `decoy-${i}`,
			hashes: Array.from({ length: 40 }, () => noisyHash),
		}));

		const ranked = rankCandidates(
			queryHashes,
			[...decoys, { submissionId: "true-source", hashes: trueSourceHashes }],
			25,
		);

		expect(ranked[0]?.submissionId).toBe("true-source");
		expect(ranked[0]?.shared).toBeGreaterThan(decoys[0]?.hashes.length ? 1 : 0);
	});

	it("keeps the true source inside the top-25 pool among many documents", () => {
		const queryDoc = normalize(`Question framing. ${LIFTED} Conclusion.`);
		const queryHashes = fingerprintTokens(queryDoc.tokens).map((f) => f.hash);
		const corpus = Array.from({ length: 100 }, (_, d) => ({
			submissionId: `doc-${d}`,
			hashes: fingerprintTokens(
				normalize(
					Array.from({ length: 80 }, (_, i) => `unique${d}term${i}`).join(" "),
				).tokens,
			).map((f) => f.hash),
		}));
		corpus[42] = {
			submissionId: "true-source",
			hashes: fingerprintTokens(normalize(ORIGINAL_ESSAY).tokens).map(
				(f) => f.hash,
			),
		};

		const ranked = rankCandidates(queryHashes, corpus, 25);
		expect(ranked.some((row) => row.submissionId === "true-source")).toBe(true);
	});
});

describe("performance", () => {
	it("compares a query against 100 in-memory documents in well under a second", () => {
		const corpus = Array.from({ length: 100 }, (_, d) =>
			Array.from({ length: 120 }, (_, i) => `w${d}x${i}`).join(" "),
		);
		corpus[7] = `${corpus[7]} ${LIFTED}`;
		const query = `Student original framing of the question. ${LIFTED} And a closing remark.`;
		const queryDoc = normalize(query);

		const started = Date.now();
		let hits = 0;
		for (const doc of corpus) {
			if (findMatches(queryDoc, normalize(doc)).length > 0) hits++;
		}
		expect(Date.now() - started).toBeLessThan(5_000);
		expect(hits).toBe(1);
	});
});

describe("format characters from PDF and OCR extraction", () => {
	// Regression: format characters live inside the token pattern and then fold
	// away. A run of them on its own used to become an empty token, and empty
	// tokens compare equal — which shattered every k-gram in a document whose
	// extractor separates words with zero-width spaces, so a verbatim copy
	// scored zero. This is the worst failure this engine can have, and it is
	// silent, so it gets pinned from several angles.
	const ZWSP = "\u200B";
	const SOFT_HYPHEN = "\u00AD";
	const BOM = "\uFEFF";

	it("never emits a token that folds away to nothing", () => {
		const doc = normalize(
			`alpha ${ZWSP} beta ${SOFT_HYPHEN} gamma ${BOM} delta`,
		);
		expect(doc.tokens).toEqual(["alpha", "beta", "gamma", "delta"]);
		expect(doc.tokens.some((t) => t === "")).toBe(false);
	});

	it("keeps offsets pointing at real words after dropping them", () => {
		const text = `alpha ${ZWSP} beta gamma`;
		const doc = normalize(text);
		for (let i = 0; i < doc.tokens.length; i++) {
			expect(text.slice(doc.tokenStart[i], doc.tokenEnd[i])).toBe(
				doc.tokens[i],
			);
		}
	});

	it("still detects a verbatim copy separated by zero-width spaces", () => {
		const pasted = LIFTED.split(" ").join(` ${ZWSP} `);
		const { score, spans } = compare(pasted, ORIGINAL_ESSAY);
		expect(spans.length).toBeGreaterThan(0);
		expect(score).toBeGreaterThan(0.95);
	});

	it("still detects a verbatim copy broken by soft hyphens inside words", () => {
		const hyphenated = LIFTED.replace(/(\w{4})(\w)/g, `$1${SOFT_HYPHEN}$2`);
		expect(compare(hyphenated, ORIGINAL_ESSAY).score).toBeGreaterThan(0.95);
	});

	it("does not match two documents that contain only invisible characters", () => {
		const blank = `${ZWSP} ${ZWSP} ${ZWSP} ${ZWSP} ${ZWSP} ${ZWSP} ${ZWSP} ${ZWSP}`;
		const { spans, score } = compare(blank, blank);
		expect(spans).toHaveLength(0);
		expect(score).toBe(0);
	});
});

describe("reports only claim text that genuinely matches", () => {
	// Regression: tolerant extension and gap stitching reach across an edited
	// word so the passage is still detected. Reporting must not inherit that
	// reach — a highlight over a word the student wrote, counted as matched, is
	// a claim the report cannot defend.
	const SOURCE_WORDS = Array.from({ length: 40 }, (_, i) => `alpha${i}`).join(
		" ",
	);

	function withSubstitutions(count: number): string {
		const words = SOURCE_WORDS.split(" ");
		for (let i = 0; i < count; i++) words[18 + i] = `ZZZ${i}`;
		return words.join(" ");
	}

	it("does not count substituted words as matched", () => {
		for (const substitutions of [1, 2, 3]) {
			const query = withSubstitutions(substitutions);
			const { matchedWords } = compare(query, SOURCE_WORDS);
			expect(matchedWords).toBe(40 - substitutions);
		}
	});

	it("never highlights a word that is absent from the source", () => {
		const query = withSubstitutions(2);
		const { spans } = compare(query, SOURCE_WORDS);
		expect(spans.length).toBeGreaterThan(0);
		for (const span of spans) {
			const highlighted = query.slice(span.startChar, span.endChar);
			expect(highlighted).not.toContain("ZZZ");
		}
	});

	it("every highlighted passage is verbatim identical to its source excerpt", () => {
		// The guard that was missing: earlier tests used `toContain`, which passes
		// even when a span over-reaches its source.
		const query = withSubstitutions(2);
		const q = normalize(query);
		const s = normalize(SOURCE_WORDS);
		for (const span of toCharSpans(q, s, findMatches(q, s))) {
			expect(query.slice(span.startChar, span.endChar)).toBe(
				SOURCE_WORDS.slice(span.matchedStartChar, span.matchedEndChar),
			);
		}
	});

	it("holds for the realistic lifted-passage case too", () => {
		const q = normalize(STUDENT_ESSAY);
		const s = normalize(ORIGINAL_ESSAY);
		const spans = toCharSpans(q, s, findMatches(q, s));
		expect(spans.length).toBeGreaterThan(0);
		for (const span of spans) {
			expect(STUDENT_ESSAY.slice(span.startChar, span.endChar)).toBe(
				ORIGINAL_ESSAY.slice(span.matchedStartChar, span.matchedEndChar),
			);
		}
	});
});

describe("writing-style heuristic", () => {
	it("refuses to express confidence on short texts", () => {
		expect(analyseWritingStyle("Too short to say anything.").confidence).toBe(
			"insufficient",
		);
	});

	it("rates uniform, transition-heavy prose higher than varied prose", () => {
		const uniform = Array.from(
			{ length: 40 },
			(_, i) =>
				`Furthermore, the committee reviewed the relevant evidence carefully and reached conclusion number ${i}.`,
		).join(" ");
		const varied =
			"Rain. " +
			"It had been raining for three days when the survey team finally reached the ridge, tired, soaked, and quietly certain that the equipment would fail again before nightfall. " +
			"They were right. " +
			"The barometer packed in first, then the radio, and by the time anyone thought to check the spare batteries it was already dark enough that searching for them felt pointless. " +
			"Nobody complained much. ".repeat(8);

		const u = analyseWritingStyle(uniform);
		const v = analyseWritingStyle(varied);
		expect(u.score).toBeGreaterThan(v.score);
		expect(u.signals.burstiness).toBeLessThan(v.signals.burstiness);
	});
});
