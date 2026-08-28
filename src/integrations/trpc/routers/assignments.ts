import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "#/server/db.ts";
import {
	createTRPCRouter,
	instructorProcedure,
	protectedProcedure,
} from "../init.ts";

/** Throws unless the caller teaches or is enrolled in the assignment's class. */
async function assertCanView(assignmentId: string, userId: string) {
	const assignment = await db.assignment.findUnique({
		where: { id: assignmentId },
		include: {
			class: {
				select: {
					id: true,
					title: true,
					instructorId: true,
					enrollments: { where: { userId }, select: { id: true } },
				},
			},
		},
	});
	if (!assignment) throw new TRPCError({ code: "NOT_FOUND" });

	const isInstructor = assignment.class.instructorId === userId;
	if (!isInstructor && assignment.class.enrollments.length === 0) {
		throw new TRPCError({ code: "FORBIDDEN" });
	}
	return { assignment, isInstructor };
}

export const assignmentsRouter = createTRPCRouter({
	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const { assignment, isInstructor } = await assertCanView(
				input.id,
				ctx.user.id,
			);

			// Instructors see the whole class; students see only their own work.
			const submissions = await db.submission.findMany({
				where: {
					assignmentId: assignment.id,
					...(isInstructor ? {} : { studentId: ctx.user.id }),
				},
				orderBy: { createdAt: "desc" },
				include: {
					student: { select: { id: true, name: true, email: true } },
					report: { select: { similarityScore: true, aiScore: true } },
				},
			});

			return { ...assignment, isInstructor, submissions };
		}),

	create: instructorProcedure
		.input(
			z.object({
				classId: z.string(),
				title: z.string().min(1).max(160),
				instructions: z.string().max(4000).optional(),
				dueAt: z.date().optional(),
				excludeQuotes: z.boolean().default(true),
				excludeBibliography: z.boolean().default(true),
				minMatchWords: z.number().int().min(4).max(50).default(8),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const owned = await db.class.findFirst({
				where: { id: input.classId, instructorId: ctx.user.id },
				select: { id: true },
			});
			if (!owned) throw new TRPCError({ code: "FORBIDDEN" });

			const { classId, ...rest } = input;
			return await db.assignment.create({ data: { ...rest, classId } });
		}),
});
