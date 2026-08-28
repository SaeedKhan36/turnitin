/**
 * Candidate ranking for fingerprint-index retrieval.
 *
 * Noplag scores candidates by *set intersection cardinality* (distinct shared
 * fingerprints), not by raw posting-list row counts. Counting rows lets a
 * document that repeats a common phrase at many positions outrank a document
 * that genuinely shares a long copied passage.
 */

/** At least this many distinct shared hashes to enter the candidate pool. */
export const MIN_SHARED_HASHES = 1;

export function distinctSharedHashCount(
	queryHashes: ReadonlySet<number>,
	candidateHashes: Iterable<number>,
): number {
	let shared = 0;
	const seen = new Set<number>();
	for (const hash of candidateHashes) {
		if (queryHashes.has(hash) && !seen.has(hash)) {
			seen.add(hash);
			shared++;
		}
	}
	return shared;
}

export interface RankedCandidate {
	submissionId: string;
	shared: number;
}

/**
 * Rank corpus documents by distinct fingerprint overlap with a query.
 * Deterministic tie-break on submissionId.
 */
export function rankCandidates(
	queryHashes: readonly number[],
	candidates: ReadonlyArray<{
		submissionId: string;
		hashes: readonly number[];
	}>,
	limit: number,
	minShared = MIN_SHARED_HASHES,
): RankedCandidate[] {
	const querySet = new Set(queryHashes);
	return candidates
		.map(({ submissionId, hashes }) => ({
			submissionId,
			shared: distinctSharedHashCount(querySet, hashes),
		}))
		.filter((row) => row.shared >= minShared)
		.sort(
			(a, b) =>
				b.shared - a.shared || a.submissionId.localeCompare(b.submissionId),
		)
		.slice(0, limit);
}
