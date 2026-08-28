/**
 * A writing-style *signal*, not a detector.
 *
 * There is no reliable way to tell machine-written prose from human prose, and
 * published detectors have repeatedly misfired on non-native English writers and
 * on heavily edited drafts. What this computes is a handful of surface
 * statistics that machine-generated text often (not always) exhibits: unusually
 * even sentence lengths, flat vocabulary, and a heavy transition-word habit.
 *
 * It is surfaced in the UI as an observation with its inputs shown, never as a
 * verdict, and it must never be used on its own to accuse anyone.
 */
export interface AiSignal {
	/** 0–1. Higher means "more stylistically uniform", not "guilty". */
	score: number;
	confidence: "insufficient" | "low" | "moderate";
	signals: {
		sentenceCount: number;
		wordCount: number;
		meanSentenceWords: number;
		/** Coefficient of variation of sentence length. Lower = more uniform. */
		burstiness: number;
		/** Distinct words / total words over the sampled window. */
		vocabularyRichness: number;
		/** Transition-phrase occurrences per 100 words. */
		transitionDensity: number;
	};
}

const TRANSITIONS = [
	"moreover",
	"furthermore",
	"additionally",
	"consequently",
	"therefore",
	"however",
	"nevertheless",
	"nonetheless",
	"in conclusion",
	"in summary",
	"overall",
	"it is important to note",
	"it is worth noting",
	"firstly",
	"secondly",
	"in addition",
	"as a result",
	"on the other hand",
];

export function analyseWritingStyle(text: string): AiSignal {
	const sentences = text
		.split(/(?<=[.!?])\s+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	const words = text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
	const wordCount = words.length;

	const lengths = sentences.map(
		(s) => (s.match(/[\p{L}\p{N}']+/gu) ?? []).length,
	);
	const mean =
		lengths.length === 0
			? 0
			: lengths.reduce((a, b) => a + b, 0) / lengths.length;
	const variance =
		lengths.length < 2
			? 0
			: lengths.reduce((sum, n) => sum + (n - mean) ** 2, 0) /
				(lengths.length - 1);
	const burstiness = mean === 0 ? 0 : Math.sqrt(variance) / mean;

	const sample = words.slice(0, 1000);
	const vocabularyRichness =
		sample.length === 0 ? 0 : new Set(sample).size / sample.length;

	const haystack = ` ${text.toLowerCase()} `;
	const transitionHits = TRANSITIONS.reduce(
		(sum, phrase) => sum + countOccurrences(haystack, phrase),
		0,
	);
	const transitionDensity =
		wordCount === 0 ? 0 : (transitionHits / wordCount) * 100;

	// Each component is mapped to 0–1 and averaged. The weights are judgement,
	// not calibration against a labelled corpus — hence the capped confidence.
	const uniformity = clamp01(1 - burstiness / 0.9);
	const flatVocabulary = clamp01((0.62 - vocabularyRichness) / 0.25);
	const transitionHeavy = clamp01(transitionDensity / 2.5);
	const score = clamp01(
		uniformity * 0.5 + flatVocabulary * 0.25 + transitionHeavy * 0.25,
	);

	const confidence: AiSignal["confidence"] =
		wordCount < 300 ? "insufficient" : wordCount < 900 ? "low" : "moderate";

	return {
		score,
		confidence,
		signals: {
			sentenceCount: sentences.length,
			wordCount,
			meanSentenceWords: round2(mean),
			burstiness: round2(burstiness),
			vocabularyRichness: round2(vocabularyRichness),
			transitionDensity: round2(transitionDensity),
		},
	};
}

function countOccurrences(haystack: string, needle: string): number {
	let count = 0;
	let index = haystack.indexOf(needle);
	while (index !== -1) {
		count++;
		index = haystack.indexOf(needle, index + needle.length);
	}
	return count;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round2 = (n: number) => Math.round(n * 100) / 100;
