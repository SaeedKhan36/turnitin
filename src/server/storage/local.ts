import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { env } from "../env.ts";
import type { StorageDriver } from "./index.ts";

/** Filesystem stand-in for R2 so development needs no cloud credentials. */
export function createLocalDriver(): StorageDriver {
	const root = resolve(process.cwd(), env.LOCAL_STORAGE_DIR);

	function pathFor(key: string): string {
		const full = resolve(root, key);
		// Refuse anything that escapes the storage root via `..` in a key.
		if (full !== root && !full.startsWith(root + sep)) {
			throw new Error(`Invalid storage key: ${key}`);
		}
		return full;
	}

	return {
		name: "local",
		async put(key, body) {
			const file = pathFor(key);
			await mkdir(dirname(file), { recursive: true });
			await writeFile(
				file,
				typeof body === "string" ? body : Buffer.from(body),
			);
		},
		async get(key) {
			return new Uint8Array(await readFile(pathFor(key)));
		},
		async getText(key) {
			return await readFile(pathFor(key), "utf8");
		},
		async delete(key) {
			await rm(pathFor(key), { force: true });
		},
		async signedUrl() {
			// Local files have no public URL; they're served via /api/files/:id.
			return undefined;
		},
	};
}
