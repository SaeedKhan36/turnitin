import { createFileRoute } from "@tanstack/react-router";
import { honoApp } from "#/server/hono.ts";

const handler = ({ request }: { request: Request }) => honoApp.fetch(request);

export const Route = createFileRoute("/api/$")({
	server: {
		handlers: {
			GET: handler,
			POST: handler,
			PUT: handler,
			PATCH: handler,
			DELETE: handler,
			OPTIONS: handler,
		},
	},
});
