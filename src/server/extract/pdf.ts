import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";
import type { ExtractionResult } from "./index.ts";
import { ocrImage } from "./ocr.ts";

/** Below this, a page is treated as having no usable text layer. */
const MIN_CHARS_PER_PAGE = 24;
/** OCR is slow; refuse to grind through an unbounded scan. */
const MAX_OCR_PAGES = 40;

export async function extractPdf(bytes: Uint8Array): Promise<ExtractionResult> {
	// unpdf/pdf.js takes ownership of the buffer, so hand it a private copy.
	const pdf = await getDocumentProxy(new Uint8Array(bytes));
	const { totalPages, text } = await extractText(pdf, { mergePages: false });
	const pages = Array.isArray(text) ? text : [text];

	const layerChars = pages.join("").replace(/\s+/g, "").length;
	const needsOcr = layerChars < MIN_CHARS_PER_PAGE * Math.max(1, totalPages);

	if (!needsOcr) {
		return {
			text: pages.join("\n\n"),
			pageCount: totalPages,
			usedOcr: false,
		};
	}

	// No text layer: this is a scan. Rasterise each page and read it.
	const ocrPages: string[] = [];
	const limit = Math.min(totalPages, MAX_OCR_PAGES);
	for (let page = 1; page <= limit; page++) {
		const image = await renderPageAsImage(new Uint8Array(bytes), page, {
			scale: 2,
			canvasImport: () => import("@napi-rs/canvas"),
		});
		ocrPages.push(await ocrImage(new Uint8Array(image)));
	}

	return {
		text: ocrPages.join("\n\n"),
		pageCount: totalPages,
		usedOcr: true,
		truncatedPages: totalPages > limit ? totalPages - limit : 0,
	};
}
