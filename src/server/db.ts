import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.ts";
import { requireDatabaseUrl } from "./env.ts";

/**
 * Prisma 7 takes its connection from a driver adapter rather than the schema.
 * Neon-hosted URLs go over the Neon serverless driver; anything else (a local
 * or self-hosted Postgres) falls back to node-postgres, so development does not
 * hard-require a Neon account.
 */
function createClient(): PrismaClient {
	const connectionString = requireDatabaseUrl();
	const isNeon = /\.neon\.tech(?::|\/|$)/.test(new URL(connectionString).host);
	const adapter = isNeon
		? new PrismaNeon({ connectionString })
		: new PrismaPg({ connectionString });
	return new PrismaClient({ adapter });
}

// Cached across HMR reloads so dev doesn't leak a connection pool per edit.
const globalForPrisma = globalThis as unknown as { __db?: PrismaClient };

let cached: PrismaClient | undefined = globalForPrisma.__db;

export function getDb(): PrismaClient {
	if (!cached) {
		cached = createClient();
		globalForPrisma.__db = cached;
	}
	return cached;
}

/** Lazy proxy so importing this module never opens a connection by itself. */
export const db = new Proxy({} as PrismaClient, {
	get(_target, prop, receiver) {
		return Reflect.get(getDb() as object, prop, receiver);
	},
});
