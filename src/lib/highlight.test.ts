import { describe, expect, it } from "vitest";
import { buildSegments } from "./highlight.ts";

describe("buildSegments", () => {
	it("returns one unmatched run when there are no spans", () => {
		expect(buildSegments(100, [])).toEqual([
			{ start: 0, end: 100, sources: [] },
		]);
	});

	it("splits a document around a single match", () => {
		expect(
			buildSegments(100, [{ start: 20, end: 40, sourceIndex: 0 }]),
		).toEqual([
			{ start: 0, end: 20, sources: [] },
			{ start: 20, end: 40, sources: [0] },
			{ start: 40, end: 100, sources: [] },
		]);
	});

	it("labels an overlap with both sources instead of dropping one", () => {
		const segments = buildSegments(100, [
			{ start: 10, end: 50, sourceIndex: 0 },
			{ start: 30, end: 70, sourceIndex: 1 },
		]);
		expect(segments).toEqual([
			{ start: 0, end: 10, sources: [] },
			{ start: 10, end: 30, sources: [0] },
			{ start: 30, end: 50, sources: [0, 1] },
			{ start: 50, end: 70, sources: [1] },
			{ start: 70, end: 100, sources: [] },
		]);
	});

	it("merges neighbouring runs that carry the same sources", () => {
		const segments = buildSegments(60, [
			{ start: 10, end: 30, sourceIndex: 0 },
			{ start: 30, end: 50, sourceIndex: 0 },
		]);
		expect(segments).toEqual([
			{ start: 0, end: 10, sources: [] },
			{ start: 10, end: 50, sources: [0] },
			{ start: 50, end: 60, sources: [] },
		]);
	});

	it("covers the whole document with no gaps or overlaps", () => {
		const segments = buildSegments(200, [
			{ start: 5, end: 60, sourceIndex: 0 },
			{ start: 40, end: 120, sourceIndex: 1 },
			{ start: 150, end: 200, sourceIndex: 2 },
		]);
		expect(segments[0].start).toBe(0);
		expect(segments[segments.length - 1].end).toBe(200);
		for (let i = 1; i < segments.length; i++) {
			expect(segments[i].start).toBe(segments[i - 1].end);
		}
	});

	it("clamps spans that run past the end of the text", () => {
		const segments = buildSegments(50, [
			{ start: 30, end: 900, sourceIndex: 0 },
		]);
		expect(segments[segments.length - 1]).toEqual({
			start: 30,
			end: 50,
			sources: [0],
		});
	});
});
