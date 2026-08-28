export interface HighlightSpan {
	start: number;
	end: number;
	sourceIndex: number;
}

export interface Segment {
	start: number;
	end: number;
	/** Indices of every source whose match covers this segment, ascending. */
	sources: number[];
}

/**
 * Split a document into non-overlapping runs, each labelled with the sources
 * covering it.
 *
 * Two sources can match the same sentence, so spans overlap in practice and
 * naive rendering either drops one or nests tags that don't close cleanly.
 * Cutting at every boundary first makes the render a flat list.
 */
export function buildSegments(
	textLength: number,
	spans: HighlightSpan[],
): Segment[] {
	if (textLength <= 0) return [];

	const clipped = spans
		.map((span) => ({
			start: Math.max(0, Math.min(span.start, textLength)),
			end: Math.max(0, Math.min(span.end, textLength)),
			sourceIndex: span.sourceIndex,
		}))
		.filter((span) => span.end > span.start);

	if (clipped.length === 0) {
		return [{ start: 0, end: textLength, sources: [] }];
	}

	const boundaries = new Set<number>([0, textLength]);
	for (const span of clipped) {
		boundaries.add(span.start);
		boundaries.add(span.end);
	}
	const ordered = [...boundaries].sort((a, b) => a - b);

	const segments: Segment[] = [];
	for (let i = 0; i < ordered.length - 1; i++) {
		const start = ordered[i];
		const end = ordered[i + 1];
		if (end <= start) continue;

		const sources = clipped
			.filter((span) => span.start <= start && span.end >= end)
			.map((span) => span.sourceIndex);
		const unique = [...new Set(sources)].sort((a, b) => a - b);

		// Fold into the previous run when the labelling is identical, so a
		// paragraph matched by one source renders as one node, not fifty.
		const previous = segments[segments.length - 1];
		if (previous && sameSources(previous.sources, unique)) {
			previous.end = end;
		} else {
			segments.push({ start, end, sources: unique });
		}
	}
	return segments;
}

function sameSources(a: number[], b: number[]): boolean {
	return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** CSS variables defined in styles.css, one colour per source. */
export const HIGHLIGHT_COLORS = 6;

export function highlightColor(sourceIndex: number): string {
	return `var(--hl-${(sourceIndex % HIGHLIGHT_COLORS) + 1})`;
}
