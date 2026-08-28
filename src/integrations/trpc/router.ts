import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "./init.ts";
import { assignmentsRouter } from "./routers/assignments.ts";
import { classesRouter } from "./routers/classes.ts";
import { reportsRouter } from "./routers/reports.ts";
import { submissionsRouter } from "./routers/submissions.ts";

export const trpcRouter = createTRPCRouter({
	health: publicProcedure.query(() => ({ ok: true })),
	me: protectedProcedure.query(({ ctx }) => ctx.user),
	classes: classesRouter,
	assignments: assignmentsRouter,
	submissions: submissionsRouter,
	reports: reportsRouter,
});

export type TRPCRouter = typeof trpcRouter;
