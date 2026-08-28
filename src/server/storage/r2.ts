import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, r2Bucket, r2Endpoint } from "../env.ts";
import type { StorageDriver } from "./index.ts";

/** Cloudflare R2 over its S3-compatible API. */
export function createR2Driver(): StorageDriver {
	const bucket = r2Bucket() as string;
	const client = new S3Client({
		region: "auto",
		endpoint: r2Endpoint() as string,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID as string,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
		},
	});

	async function getBytes(key: string): Promise<Uint8Array> {
		const res = await client.send(
			new GetObjectCommand({ Bucket: bucket, Key: key }),
		);
		if (!res.Body) throw new Error(`Empty object at ${key}`);
		return new Uint8Array(await res.Body.transformToByteArray());
	}

	return {
		name: "r2",
		async put(key, body, contentType) {
			await client.send(
				new PutObjectCommand({
					Bucket: bucket,
					Key: key,
					Body: typeof body === "string" ? body : Buffer.from(body),
					ContentType: contentType,
				}),
			);
		},
		get: getBytes,
		async getText(key) {
			return new TextDecoder().decode(await getBytes(key));
		},
		async delete(key) {
			await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
		},
		async signedUrl(key, expiresInSeconds = 300) {
			return await getSignedUrl(
				client,
				new GetObjectCommand({ Bucket: bucket, Key: key }),
				{ expiresIn: expiresInSeconds },
			);
		},
	};
}
