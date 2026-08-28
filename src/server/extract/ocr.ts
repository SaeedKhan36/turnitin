import { createWorker, type Worker } from "tesseract.js";

/**
 * One Tesseract worker, reused across pages and requests.
 *
 * Worker startup dominates OCR cost (it loads a ~15MB language model), so
 * creating one per page — the obvious implementation — makes scanned documents
 * many times slower than they need to be.
 */
let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
	if (!workerPromise) {
		workerPromise = createWorker("eng").catch((error) => {
			workerPromise = null;
			throw error;
		});
	}
	return workerPromise;
}

export async function ocrImage(image: Uint8Array | Buffer): Promise<string> {
	const worker = await getWorker();
	const { data } = await worker.recognize(Buffer.from(image));
	return data.text ?? "";
}

/** Frees the model. Called on shutdown; not needed per request. */
export async function disposeOcrWorker(): Promise<void> {
	if (!workerPromise) return;
	const worker = await workerPromise;
	workerPromise = null;
	await worker.terminate();
}
