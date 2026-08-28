import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db.ts";
import { authSecret, env } from "./env.ts";

export const auth = betterAuth({
	database: prismaAdapter(db, { provider: "postgresql" }),
	secret: authSecret,
	...(env.BETTER_AUTH_URL ? { baseURL: env.BETTER_AUTH_URL } : {}),
	basePath: "/api/auth",
	emailAndPassword: {
		enabled: true,
		// No mail transport is wired up, so verification would lock users out.
		requireEmailVerification: false,
		minPasswordLength: 8,
	},
	user: {
		additionalFields: {
			// Chosen at sign-up. A production deployment would issue instructor
			// accounts through an institution rather than trusting this input.
			role: {
				type: "string",
				required: false,
				defaultValue: "STUDENT",
				input: true,
			},
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 30,
		updateAge: 60 * 60 * 24,
	},
});

export type Session = typeof auth.$Infer.Session;
