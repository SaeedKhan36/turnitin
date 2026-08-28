import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 keeps the connection URL out of schema.prisma. The CLI (migrate,
 * studio) reads it from here; the runtime client gets it via a driver adapter
 * in src/server/db.ts instead.
 */
export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
		seed: "tsx prisma/seed.ts",
	},
	datasource: {
		url: process.env.DATABASE_URL as string,
	},
});
