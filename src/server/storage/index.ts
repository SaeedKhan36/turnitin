import { env, hasR2Credentials } from "../env.ts";
import { createLocalDriver } from "./local.ts";
import { createR2Driver } from "./r2.ts";

export interface StorageDriver {
	readonly name: "r2" | "local";
	put(
		key: string,
		body: Uint8Array | string,
		contentType?: string,
	): Promise<void>;
	get(key: string): Promise<Uint8Array>;
	getText(key: string): Promise<string>;
	delete(key: string): Promise<void>;
	/** Time-limited direct URL. Undefined for drivers that can't issue one. */
	signedUrl(
		key: string,
		expiresInSeconds?: number,
	): Promise<string | undefined>;
}

let driver: StorageDriver | undefined;

/**
 * R2 when credentials are present, local disk otherwise, so a fresh clone runs
 * with no cloud account. Override with STORAGE_DRIVER=r2|local.
 */
export function getStorage(): StorageDriver {
	if (!driver) {
		const useR2 =
			env.STORAGE_DRIVER === "r2" ||
			(env.STORAGE_DRIVER === "auto" && hasR2Credentials());
		if (useR2 && !hasR2Credentials()) {
			throw new Error(
				"STORAGE_DRIVER=r2 but the R2 settings are incomplete. Needs " +
					"R2_ENDPOINT (or R2_ACCOUNT_ID), R2_BUCKET_NAME (or R2_BUCKET), " +
					"R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.",
			);
		}
		driver = useR2 ? createR2Driver() : createLocalDriver();
	}
	return driver;
}

/** Storage keys are opaque; these just keep the bucket browsable. */
export const storageKeys = {
	original: (submissionId: string, filename: string) =>
		`submissions/${submissionId}/original/${sanitize(filename)}`,
	text: (submissionId: string) => `submissions/${submissionId}/extracted.txt`,
};

function sanitize(filename: string): string {
	return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
}
