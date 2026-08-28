import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Session } from "#/server/auth.ts";

export type TRPCContext = {
	/** Better Auth's `{ user, session }`, or null when signed out. */
	auth: Session | null;
	headers: Headers;
};

const t = initTRPC.context<TRPCContext>().create({
	transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

/** Requires a signed-in user; narrows `ctx.auth` to non-null downstream. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.auth) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Sign in to continue.",
		});
	}
	return next({ ctx: { ...ctx, auth: ctx.auth, user: ctx.auth.user } });
});

/** Requires the signed-in user to be an instructor. */
export const instructorProcedure = protectedProcedure.use(({ ctx, next }) => {
	if (ctx.user.role !== "INSTRUCTOR") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "This action is only available to instructors.",
		});
	}
	return next({ ctx });
});
