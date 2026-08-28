import mammoth from "mammoth";
import { ocrImage } from "./ocr.ts";
import { extractPdf } from "./pdf.ts";

export interface ExtractionResult {
	text: string;
	pageCount?: number;
	usedOcr: boolean;
	/** Pages skipped because the OCR page budget ran out. */
	truncatedPages?: number;
}

export const ACCEPTED_MIME_TYPES = [
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"text/plain",
	"text/markdown",
	"image/png",
	"image/jpeg",
	"image/webp",
] as const;

export const ACCEPTED_EXTENSIONS = ".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp";

export class UnsupportedFileError extends Error {}

/** Some browsers send an empty or generic type; fall back to the extension. */
export function resolveMimeType(filename: string, reported: string): string {
	if (reported && reported !== "application/octet-stream") return reported;
	const ext = filename.toLowerCase().split(".").pop() ?? "";
	const byExtension: Record<string, string> = {
		pdf: "application/pdf",
		docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		txt: "text/plain",
		md: "text/markdown",
		png: "image/png",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		webp: "image/webp",
	};
	return byExtension[ext] ?? reported ?? "application/octet-stream";
}

export async function extractDocument(
	bytes: Uint8Array,
	mimeType: string,
): Promise<ExtractionResult> {
	if (mimeType === "application/pdf") {
		return await extractPdf(bytes);
	}

	if (
		mimeType ===
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	) {
		const { value } = await mammoth.extractRawText({
			buffer: Buffer.from(bytes),
		});
		return { text: value, usedOcr: false };
	}

	if (mimeType === "text/plain" || mimeType === "text/markdown") {
		return { text: new TextDecoder().decode(bytes), usedOcr: false };
	}

	if (mimeType.startsWith("image/")) {
		return { text: await ocrImage(bytes), usedOcr: true, pageCount: 1 };
	}

	throw new UnsupportedFileError(
		`Cannot read ${mimeType}. Upload a PDF, DOCX, TXT, MD, or an image.`,
	);
}
