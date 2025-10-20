import type { TextItem } from "pdfjs-dist/types/src/display/api";

async function loadPdfJs() {
	if (typeof window === "undefined") {
		throw new Error("PDF extraction is only supported in the browser.");
	}

	const pdfjs = await import("pdfjs-dist/webpack.mjs");

	return pdfjs;
}

export async function extractTextFromPdf(file: File): Promise<string> {
	const { getDocument } = await loadPdfJs();
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await getDocument({ data: arrayBuffer }).promise;

	const textContent: string[] = [];

	try {
		for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
			const page = await pdf.getPage(pageNumber);
			const content = await page.getTextContent();
			const pageText = content.items
				.map((item: unknown) => (isTextItem(item) ? item.str : ""))
				.join(" ")
				.trim();
			if (pageText) {
				textContent.push(pageText);
			}
		}
	} finally {
		await pdf.destroy();
	}

	return textContent.join("\n\n");
}

function isTextItem(item: unknown): item is TextItem {
	return Boolean(item && typeof item === "object" && "str" in item);
}
