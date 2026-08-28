/**
 * Tokenisation that remembers where every token came from.
 *
 * Matching happens on normalised tokens, but the report has to highlight the
 * *original* document, so each token carries the character range it occupied in
 * the source text. Keeping offsets per token (rather than a per-character map)
 * makes the round trip exact and cheap.
 */
export interface NormalizedDoc {
	/** Original, untouched text. */
	text: string;
	/** Lowercased, compatibility-folded word tokens. */
	tokens: string[];
	/** `tokenStart[i]` — index in `text` where token `i` begins. */
	tokenStart: number[];
	/** `tokenEnd[i]` — exclusive index in `text` where token `i` ends. */
	tokenEnd: number[];
}

/**
 * Word tokens, plus:
 * - apostrophes so "don't" stays one token
 * - dotted decimals so "3.14" stays one token
 * - soft hyphens / zero-width format chars so PDF/OCR artefacts don't split a word
 *
 * Hyphens still split ("well-known" → well, known) so hyphenated and spaced
 * forms of the same phrase can match. Periods between letters still split, so
 * "end.Next" from a lost space does not glue two sentences together.
 */
const TOKEN_RE =
	/(?:\d+(?:\.\d+)+|[\p{L}\p{N}\u00AD\u200B-\u200D\uFEFF]+(?:['’][\p{L}\p{N}\u00AD\u200B-\u200D\uFEFF]+)*)/gu;

export function normalize(text: string): NormalizedDoc {
	const tokens: string[] = [];
	const tokenStart: number[] = [];
	const tokenEnd: number[] = [];

	TOKEN_RE.lastIndex = 0;
	let match: RegExpExecArray | null = TOKEN_RE.exec(text);
	while (match !== null) {
		const raw = match[0];
		const start = match.index;
		const end = start + raw.length;
		const folded = foldToken(raw);
		// A run of format characters on its own folds away to nothing. Keeping it
		// would put an empty token in the stream, and empty tokens compare equal
		// to each other — which both invents matches between blank documents and,
		// far worse, shatters every k-gram in a document whose extractor emits a
		// zero-width space at each word boundary, so a verbatim copy scores zero.
		if (folded !== "" && !isCitationMarker(text, start, end, raw)) {
			tokens.push(folded);
			tokenStart.push(start);
			tokenEnd.push(end);
		}
		match = TOKEN_RE.exec(text);
	}

	return { text, tokens, tokenStart, tokenEnd };
}

/**
 * Bracketed footnote markers ("[12]", "[3]") are not words. Leaving them in
 * poisons every k-gram that straddles the citation, so a verbatim paste from a
 * rendered page fails to match the marker-free source.
 */
function isCitationMarker(
	text: string,
	start: number,
	end: number,
	raw: string,
): boolean {
	if (!/^\d{1,4}$/.test(raw)) return false;
	return text[start - 1] === "[" && text[end] === "]";
}

/**
 * Compatibility-fold then strip combining marks so ligatures, fullwidth
 * letters, and accented characters compare equal to their ASCII forms.
 * Apostrophes drop so "dont" == "don't". Format chars drop so a soft-hyphenated
 * word is still one token.
 */
export function foldToken(raw: string): string {
	return raw
		.normalize("NFKC")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[\u00AD\u200B-\u200D\uFEFF]/g, "")
		.replace(/['’]/g, "")
		.toLowerCase();
}

/** Character range in the original text covered by inclusive tokens [from, to]. */
export function tokenRangeToChars(
	doc: NormalizedDoc,
	from: number,
	to: number,
): { start: number; end: number } {
	return { start: doc.tokenStart[from], end: doc.tokenEnd[to] };
}
