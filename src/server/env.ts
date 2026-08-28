import "dotenv/config";
import { z } from "zod";

/**
 * Server environment. Deliberately lenient at import time: the marketing site
 * must render on a fresh clone with no `.env` at all. Anything required is
 * asserted at the point of use instead (see `requireDatabaseUrl`).
 */
const schema = z.object({
	DATABASE_URL: z.string().optional(),
	BETTER_AUTH_SECRET: z.string().optional(),
	/** Pin only when the public URL differs from the request host. */
	BETTER_AUTH_URL: z.string().optional(),
	APP_URL: z.string().default("http://localhost:3000"),

	STORAGE_DRIVER: z.enum(["auto", "r2", "local"]).default("auto"),
	// Cloudflare hands you an S3 endpoint URL and a bucket name; both spellings
	// are accepted so the values can be pasted straight from the R2 dashboard.
	R2_ENDPOINT: z.string().optional(),
	R2_ACCOUNT_ID: z.string().optional(),
	R2_ACCESS_KEY_ID: z.string().optional(),
	R2_SECRET_ACCESS_KEY: z.string().optional(),
	R2_BUCKET_NAME: z.string().optional(),
	R2_BUCKET: z.string().optional(),
	LOCAL_STORAGE_DIR: z.string().default(".data/blobs"),

	MAX_UPLOAD_BYTES: z.coerce
		.number()
		.int()
		.positive()
		.default(25 * 1024 * 1024),
});

export const env = schema.parse(process.env);

export function requireDatabaseUrl(): string {
	if (!env.DATABASE_URL) {
		throw new Error(
			"DATABASE_URL is not set. Copy .env.example to .env and add your Neon " +
				"(or Postgres) connection string, then run `pnpm db:push`.",
		);
	}
	return env.DATABASE_URL;
}

/** Endpoint as given, or derived from the account id. */
export function r2Endpoint(): string | undefined {
	if (env.R2_ENDPOINT) return env.R2_ENDPOINT.replace(/\/+$/, "");
	if (env.R2_ACCOUNT_ID)
		return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
	return undefined;
}

export function r2Bucket(): string | undefined {
	return env.R2_BUCKET_NAME ?? env.R2_BUCKET;
}

export function hasR2Credentials(): boolean {
	return Boolean(
		r2Endpoint() &&
			r2Bucket() &&
			env.R2_ACCESS_KEY_ID &&
			env.R2_SECRET_ACCESS_KEY,
	);
}

export const authSecret =
	env.BETTER_AUTH_SECRET ?? "dev-only-insecure-secret-change-me";
