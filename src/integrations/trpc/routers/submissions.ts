import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "#/server/db.ts";
import { processSubmission } from "#/server/pipeline.ts";
import { getStorage } from "#/server/storage/index.ts";
import { createTRPCRouter, protectedProcedure } from "../init.ts";

/** Loads a submission the caller is allowed to see, or throws. */
async function loadVisible(submissionId: string, userId: string) {
	const submission = await db.submission.findUnique({
		where: { id: submissionId },
		include: {
			student: { select: { id: true, name: true, email: true } },
			assignment: {
				include: {
					class: { select: { id: true, title: true, instructorId: true } },
				},
			},
		},
	});
	if (!submission) throw new TRPCError({ code: "NOT_FOUND" });

	const isOwner = submission.studentId === userId;
	const isInstructor = submission.assignment?.class.instructorId === userId;
	if (!isOwner && !isInstructor) throw new TRPCError({ code: "FORBIDDEN" });

	return { submission, isInstructor: Boolean(isInstructor) };
}

export const submissionsRouter = createTRPCRouter({
	/** Everything the signed-in student has submitted. */
	mine: protectedProcedure.query(async ({ ctx }) => {
		return await db.submission.findMany({
			where: { studentId: ctx.user.id },
			orderBy: { createdAt: "desc" },
			include: {
				assignment: {
					select: { id: true, title: true, class: { select: { title: true } } },
				},
				report: { select: { similarityScore: true, aiScore: true } },
			},
		});
	}),

	/** Cheap poll target while the pipeline runs. */
	status: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const { submission } = await loadVisible(input.id, ctx.user.id);
			return {
				id: submission.id,
				status: submission.status,
				error: submission.error,
			};
		}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const { submission, isInstructor } = await loadVisible(
				input.id,
				ctx.user.id,
			);
			return { ...submission, isInstructor };
		}),

	/** Re-run the pipeline, e.g. after new documents joined the corpus. */
	reprocess: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const { submission } = await loadVisible(input.id, ctx.user.id);
			void processSubmission(submission.id);
			return { ok: true };
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const { submission, isInstructor } = await loadVisible(
				input.id,
				ctx.user.id,
			);
			if (submission.studentId !== ctx.user.id && !isInstructor) {
				throw new TRPCError({ code: "FORBIDDEN" });
			}
			const storage = getStorage();
			await storage.delete(submission.storageKey).catch(() => {});
			if (submission.textKey) {
				await storage.delete(submission.textKey).catch(() => {});
			}
			await db.submission.delete({ where: { id: submission.id } });
			return { ok: true };
		}),
});
