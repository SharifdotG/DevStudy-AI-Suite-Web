import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { getDocument, GlobalWorkerOptions, version } from "pdfjs-dist";

const WORKER_SRC = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.js`;

let workerConfigured = false;

function ensureWorkerConfigured() {
	if (workerConfigured) {
		return;
	}

	if (typeof window !== "undefined") {
		GlobalWorkerOptions.workerSrc = WORKER_SRC;
		workerConfigured = true;
	}
}

export async function extractTextFromPdf(file: File): Promise<string> {
	ensureWorkerConfigured();

	const arrayBuffer = await file.arrayBuffer();
	const pdf = await getDocument({ data: arrayBuffer }).promise;

	const textContent: string[] = [];

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

	await pdf.destroy();

	return textContent.join("\n\n");
}

	function isTextItem(item: unknown): item is TextItem {
		return Boolean(item && typeof item === "object" && "str" in item);
	}
