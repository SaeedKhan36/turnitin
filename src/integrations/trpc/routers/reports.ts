import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "#/server/db.ts";
import { getStorage } from "#/server/storage/index.ts";
import { createTRPCRouter, protectedProcedure } from "../init.ts";

/** Bound so start=0,end=N cannot dump another student's whole document. */
const MAX_EXCERPT_MATCH_CHARS = 4000;
const EXCERPT_PAD = 300;

export const reportsRouter = createTRPCRouter({
	/**
	 * Everything the report viewer renders: the submitted text, the highlighted
	 * spans, and one excerpt per matching source.
	 */
	get: protectedProcedure
		.input(z.object({ submissionId: z.string() }))
		.query(async ({ ctx, input }) => {
			const submission = await db.submission.findUnique({
				where: { id: input.submissionId },
				include: {
					student: { select: { id: true, name: true, email: true } },
					assignment: {
						include: {
							class: { select: { id: true, title: true, instructorId: true } },
						},
					},
					report: {
						include: {
							sources: {
								orderBy: { score: "desc" },
								include: {
									spans: { orderBy: { startChar: "asc" } },
									matchedSubmission: {
										select: {
											id: true,
											filename: true,
											sourceLabel: true,
											isReference: true,
											createdAt: true,
											studentId: true,
											student: { select: { name: true } },
											assignment: {
												select: {
													title: true,
													class: { select: { title: true } },
												},
											},
										},
									},
								},
							},
						},
					},
				},
			});
			if (!submission) throw new TRPCError({ code: "NOT_FOUND" });

			const isOwner = submission.studentId === ctx.user.id;
			const isInstructor =
				submission.assignment?.class.instructorId === ctx.user.id;
			if (!isOwner && !isInstructor) throw new TRPCError({ code: "FORBIDDEN" });

			const text = submission.textKey
				? await getStorage().getText(submission.textKey)
				: null;

			if (!isInstructor && submission.report) {
				for (const source of submission.report.sources) {
					const matched = source.matchedSubmission;
					if (!matched.isReference && matched.studentId !== ctx.user.id) {
						matched.student = null;
					}
				}
			}

			return { submission, text, isInstructor: Boolean(isInstructor) };
		}),

	/** The matched passage as it appears in the source document. */
	sourceExcerpt: protectedProcedure
		.input(
			z.object({
				matchedSubmissionId: z.string(),
				start: z.number().int().min(0),
				end: z.number().int().min(0),
			}),
		)
		.query(async ({ ctx, input }) => {
			if (input.end < input.start) {
				throw new TRPCError({ code: "BAD_REQUEST" });
			}

			const source = await db.submission.findUnique({
				where: { id: input.matchedSubmissionId },
				select: {
					textKey: true,
					studentId: true,
					isReference: true,
					assignment: {
						select: { class: { select: { instructorId: true } } },
					},
				},
			});
			if (!source?.textKey) throw new TRPCError({ code: "NOT_FOUND" });

			const ownsSource = source.studentId === ctx.user.id;
			const instructsSource =
				source.assignment?.class.instructorId === ctx.user.id;
			if (!ownsSource && !instructsSource && !source.isReference) {
				const citedByInstructor = await db.matchSource.findFirst({
					where: {
						matchedSubmissionId: input.matchedSubmissionId,
						report: {
							submission: {
								assignment: { class: { instructorId: ctx.user.id } },
							},
						},
					},
					select: { id: true },
				});
				if (!citedByInstructor) throw new TRPCError({ code: "FORBIDDEN" });
			}

			const text = await getStorage().getText(source.textKey);
			const matchEnd = Math.min(
				input.end,
				input.start + MAX_EXCERPT_MATCH_CHARS,
			);
			const from = Math.max(0, input.start - EXCERPT_PAD);
			const to = Math.min(text.length, matchEnd + EXCERPT_PAD);
			return {
				excerpt: text.slice(from, to),
				matchStart: input.start - from,
				matchLength: matchEnd - input.start,
			};
		}),
});
