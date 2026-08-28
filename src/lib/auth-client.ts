import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "#/server/auth.ts";

/**
 * `inferAdditionalFields` carries the server's extra `role` field into the
 * client's types. The import above is type-only, so no server code ships.
 */
export const authClient = createAuthClient({
	plugins: [inferAdditionalFields<typeof auth>()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

export type AppRole = "INSTRUCTOR" | "STUDENT";
