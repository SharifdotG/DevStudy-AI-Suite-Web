import { extractTextFromPdf } from "@/lib/pdf";

export type SupportedFile =
  | "pdf"
  | "markdown"
  | "text"
  | "docx"
  | "pptx"
  | "xlsx"
  | "csv";

const EXTENSION_ALIASES: Record<SupportedFile, string[]> = {
  pdf: ["pdf"],
  markdown: ["md", "markdown"],
  text: ["txt"],
  docx: ["docx"],
  pptx: ["pptx"],
  xlsx: ["xlsx", "xlsm", "xlsb"],
  csv: ["csv"],
};

const MIME_ALIASES: Record<SupportedFile, string[]> = {
  pdf: ["application/pdf"],
  markdown: ["text/markdown"],
  text: ["text/plain"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
  ],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ],
  csv: ["text/csv", "application/csv", "application/vnd.ms-excel"],
};

export const FILE_INPUT_ACCEPT = [
  ".pdf",
  ".md",
  ".markdown",
  ".txt",
  ".docx",
  ".pptx",
  ".csv",
  ".xlsx",
  ".xlsm",
  ".xlsb",
  "application/pdf",
  "text/markdown",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/csv",
  "application/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
].join(",");

export function resolveKind(file: File): SupportedFile | null {
  const extension = getExtension(file.name);
  const mimeType = (file.type || "").toLowerCase();

  for (const kind of Object.keys(EXTENSION_ALIASES) as SupportedFile[]) {
    if (EXTENSION_ALIASES[kind].includes(extension)) {
      return kind;
    }

    if (mimeType && MIME_ALIASES[kind]?.some((candidate) => candidate.toLowerCase() === mimeType)) {
      return kind;
    }
  }

  if (mimeType === "" && extension === "") {
    return "text";
  }

  return null;
}

export async function extractContent(file: File, kind: SupportedFile): Promise<string> {
  switch (kind) {
    case "pdf": {
      const text = await extractTextFromPdf(file);
      return normalizeOutput(text);
    }
    case "markdown": {
      const text = await file.text();
      return normalizeOutput(text);
    }
    case "text": {
      const text = await file.text();
      return normalizeOutput(text);
    }
    case "csv": {
      const text = await file.text();
      return normalizeOutput(convertCsvToMarkdown(text));
    }
    case "docx": {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = await import("mammoth/mammoth.browser");
      const { value } = await mammoth.convertToMarkdown({ arrayBuffer });
      return normalizeOutput(value);
    }
    case "pptx": {
      const buffer = await file.arrayBuffer();
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(buffer);
      const slideEntries = Object.keys(zip.files)
        .filter((path) => path.startsWith("ppt/slides/slide") && path.endsWith(".xml"))
        .sort();

      const parser = new DOMParser();
      const slides: string[] = [];

      for (const entry of slideEntries) {
        const fileRef = zip.file(entry);
        if (!fileRef) {
          continue;
        }
        const rawXml = await fileRef.async("text");
        const doc = parser.parseFromString(rawXml, "application/xml");
        const elements = Array.from(doc.getElementsByTagName("a:t"));
        const content = elements
          .map((element) => element.textContent ?? "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (content) {
          slides.push(content);
        }
      }

      return normalizeOutput(slides.join("\n\n"));
    }
    case "xlsx": {
      const buffer = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "array" });
      const segments: string[] = [];

      workbook.SheetNames.forEach((sheetName: string) => {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          return;
        }

        const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: "\t" });
        const trimmed = csv.trim();
        if (!trimmed) {
          return;
        }
        segments.push(`Sheet: ${sheetName}\n${trimmed}`);
      });

      return normalizeOutput(segments.join("\n\n"));
    }
    default: {
      const exhaustiveCheck: never = kind;
      throw new Error(`Unsupported file kind: ${exhaustiveCheck}`);
    }
  }
}

function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) {
    return "";
  }

  return fileName.slice(lastDot + 1).toLowerCase();
}

function normalizeOutput(value: string): string {
  return value.replace(/\u0000/g, " ").replace(/\r\n?|\u2028|\u2029/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function convertCsvToMarkdown(csv: string): string {
  const rows = csv
    .split(/\r?\n/g)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g).map((cell) => cell.replace(/^"|"$/g, "")));

  if (!rows.length) {
    return "";
  }

  const header = rows[0];
  const divider = header.map(() => "---");
  const body = rows.slice(1);

  const markdownRows = [header, divider, ...body]
    .map((cells) => `| ${cells.map((cell) => cell || " ").join(" | ")} |`)
    .join("\n");

  return markdownRows;
}
