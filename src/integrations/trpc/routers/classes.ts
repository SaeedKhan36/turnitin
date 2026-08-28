import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "#/server/db.ts";
import {
	createTRPCRouter,
	instructorProcedure,
	protectedProcedure,
} from "../init.ts";

/** Ambiguous characters (0/O, 1/I) left out so codes can be read aloud. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateJoinCode(): string {
	let code = "";
	for (let i = 0; i < 6; i++) {
		code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
	}
	return code;
}

export const classesRouter = createTRPCRouter({
	/** Classes taught (instructor) or enrolled in (student). */
	list: protectedProcedure.query(async ({ ctx }) => {
		if (ctx.user.role === "INSTRUCTOR") {
			return await db.class.findMany({
				where: { instructorId: ctx.user.id },
				orderBy: { createdAt: "desc" },
				include: {
					_count: { select: { enrollments: true, assignments: true } },
				},
			});
		}
		const enrollments = await db.enrollment.findMany({
			where: { userId: ctx.user.id },
			orderBy: { joinedAt: "desc" },
			include: {
				class: {
					include: {
						instructor: { select: { name: true } },
						_count: { select: { enrollments: true, assignments: true } },
					},
				},
			},
		});
		return enrollments.map((e) => e.class);
	}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const found = await db.class.findUnique({
				where: { id: input.id },
				include: {
					instructor: { select: { id: true, name: true, email: true } },
					assignments: {
						orderBy: { createdAt: "desc" },
						include: { _count: { select: { submissions: true } } },
					},
					enrollments: {
						include: {
							user: { select: { id: true, name: true, email: true } },
						},
					},
				},
			});
			if (!found) throw new TRPCError({ code: "NOT_FOUND" });

			const isInstructor = found.instructorId === ctx.user.id;
			const isEnrolled = found.enrollments.some(
				(e) => e.userId === ctx.user.id,
			);
			if (!isInstructor && !isEnrolled)
				throw new TRPCError({ code: "FORBIDDEN" });

			return { ...found, isInstructor };
		}),

	create: instructorProcedure
		.input(
			z.object({
				title: z.string().min(1).max(120),
				description: z.string().max(1000).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Retry on the (unlikely) chance of a duplicate code.
			for (let attempt = 0; attempt < 5; attempt++) {
				try {
					return await db.class.create({
						data: {
							title: input.title,
							description: input.description,
							joinCode: generateJoinCode(),
							instructorId: ctx.user.id,
						},
					});
				} catch (error) {
					if (attempt === 4) throw error;
				}
			}
			throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
		}),

	join: protectedProcedure
		.input(z.object({ joinCode: z.string().min(4).max(12) }))
		.mutation(async ({ ctx, input }) => {
			const target = await db.class.findUnique({
				where: { joinCode: input.joinCode.toUpperCase().trim() },
			});
			if (!target) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No class matches that code.",
				});
			}
			if (target.instructorId === ctx.user.id) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You already teach this class.",
				});
			}
			await db.enrollment.upsert({
				where: { userId_classId: { userId: ctx.user.id, classId: target.id } },
				create: { userId: ctx.user.id, classId: target.id },
				update: {},
			});
			return target;
		}),
});
