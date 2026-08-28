import type { NormalizedDoc } from "./normalize.ts";

/**
 * k-gram length in tokens. Kept at 5: shorter k raises false positives on
 * common academic phrasing; longer k misses the 8-word floor used by reports.
 */
export const K = 5;
/**
 * Winnowing window. Guarantees any shared run of >= K + W - 1 tokens is seen.
 * With K=5 this is 8 tokens, which is also the default minMatchWords.
 */
export const W = 4;

export interface Fingerprint {
	/** Signed 32-bit FNV-1a hash of the k-gram. */
	hash: number;
	/** Index of the k-gram's first token within the document. */
	position: number;
}

/**
 * FNV-1a over the k-gram's tokens. Returned signed so it fits a Postgres `int`.
 *
 * 32 bits will collide across a large corpus. That is deliberate and safe here:
 * a collision only promotes a candidate for inspection, and `compare.ts`
 * re-checks every seed against the actual token text before reporting it.
 */
export function hashKgram(tokens: string[], start: number, k: number): number {
	let hash = 0x811c9dc5;
	for (let t = start; t < start + k; t++) {
		const token = tokens[t];
		for (let i = 0; i < token.length; i++) {
			hash ^= token.charCodeAt(i);
			hash = Math.imul(hash, 0x01000193);
		}
		// Separator, so ["ab","c"] and ["a","bc"] hash differently.
		hash ^= 0x20;
		hash = Math.imul(hash, 0x01000193);
	}
	return hash | 0;
}

export function kgramHashes(tokens: string[], k = K): number[] {
	if (tokens.length < k) return [];
	const out = new Array<number>(tokens.length - k + 1);
	for (let i = 0; i <= tokens.length - k; i++) out[i] = hashKgram(tokens, i, k);
	return out;
}

/**
 * Winnowing (Schleimer, Wilkerson & Aiken): in each window of `w` consecutive
 * hashes keep the minimum, breaking ties toward the rightmost so that the same
 * passage selects the same fingerprints wherever it appears. Keeps ~1/w of the
 * hashes without losing any sufficiently long shared run.
 */
export function winnow(hashes: number[], w = W): Fingerprint[] {
	if (hashes.length === 0) return [];
	if (hashes.length < w) {
		let best = 0;
		for (let i = 1; i < hashes.length; i++) {
			if (hashes[i] <= hashes[best]) best = i;
		}
		return [{ hash: hashes[best], position: best }];
	}

	const out: Fingerprint[] = [];
	let lastSelected = -1;

	for (let start = 0; start + w <= hashes.length; start++) {
		let min = start;
		for (let i = start + 1; i < start + w; i++) {
			if (hashes[i] <= hashes[min]) min = i;
		}
		if (min !== lastSelected) {
			out.push({ hash: hashes[min], position: min });
			lastSelected = min;
		}
	}
	return out;
}

export function fingerprintTokens(
	tokens: string[],
	k = K,
	w = W,
): Fingerprint[] {
	return winnow(kgramHashes(tokens, k), w);
}

export function fingerprintDoc(
	doc: NormalizedDoc,
	k = K,
	w = W,
): Fingerprint[] {
	return fingerprintTokens(doc.tokens, k, w);
}
