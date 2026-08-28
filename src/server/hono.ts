import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import type { TRPCContext } from "#/integrations/trpc/init.ts";
import { trpcRouter } from "#/integrations/trpc/router.ts";
import { auth } from "./auth.ts";
import { filesRoutes } from "./routes/files.ts";

/**
 * Every server endpoint lives here. TanStack Start's `/api/$` catch-all route
 * forwards the raw Request into this app, so auth, tRPC and binary file
 * handling share one middleware chain.
 */
export const honoApp = new Hono().basePath("/api");

async function createContext(request: Request): Promise<TRPCContext> {
	const session = await auth.api.getSession({ headers: request.headers });
	return { auth: session ?? null, headers: request.headers };
}

honoApp.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

honoApp.use(
	"/trpc/*",
	trpcServer({
		router: trpcRouter,
		endpoint: "/api/trpc",
		createContext: (_opts, c) => createContext(c.req.raw),
	}),
);

honoApp.route("/files", filesRoutes);

honoApp.get("/health", (c) => c.json({ ok: true }));

export type HonoApp = typeof honoApp;
