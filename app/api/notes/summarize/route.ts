import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/auto:free";

const SUMMARY_PROMPTS: Record<SummaryMode, string> = {
  concise:
    "Return 5-7 concise Markdown bullet points summarizing the essential concepts, definitions, and actionable takeaways. Keep each bullet to a single sentence and include inline code or formulas when present.",
  outline:
    "Return a structured Markdown outline with level-2 and level-3 headings highlighting major sections and key supporting details. Use nested bullet points for specifics and avoid introductory or closing prose.",
  flashcards:
    "Return exactly 6 Markdown flashcards suitable for spaced repetition. For each flashcard, format as a numbered list item where the question is bold and the answer appears on the next line in italics. Capture definitions, processes, or code snippets as needed.",
};

const MAX_CHUNK_LENGTH = 4000; // characters
const MAX_CHUNK_COUNT = 8;

type SummaryMode = "concise" | "outline" | "flashcards";

type SummarizeRequest = {
  mode?: unknown;
  chunks?: unknown;
  model?: unknown;
  documentTitle?: unknown;
};

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-openrouter-key")?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OpenRouter API key in request headers." },
      { status: 401 },
    );
  }

  let parsed: SummarizeRequest;
  try {
    parsed = (await request.json()) as SummarizeRequest;
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid JSON payload.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }

  const modeValue = typeof parsed.mode === "string" ? parsed.mode.trim() : "";
  if (!isSummaryMode(modeValue)) {
    return NextResponse.json(
      { error: "Unsupported summary mode." },
      { status: 400 },
    );
  }

  const chunks = sanitizeChunks(parsed.chunks);
  if (chunks.length === 0) {
    return NextResponse.json(
      { error: "No valid document chunks were provided." },
      { status: 400 },
    );
  }

  const model = typeof parsed.model === "string" && parsed.model.trim().length ? parsed.model.trim() : DEFAULT_MODEL;
  const documentTitle =
    typeof parsed.documentTitle === "string" && parsed.documentTitle.trim().length
      ? parsed.documentTitle.trim().slice(0, 120)
      : "Untitled document";

  const messages = [
    {
      role: "system",
      content:
        "You are DevStudy's note companion. Summarize accurately without inventing facts and ensure the output is student-friendly and ready to review.",
    },
    {
      role: "user",
      content: buildUserPrompt(modeValue, chunks, documentTitle),
    },
  ];

  const upstreamBody = JSON.stringify({
    model,
    stream: true,
    temperature: 0.2,
    max_tokens: 900,
    messages,
  });

  const originHeader =
    request.headers.get("origin") ??
    request.headers.get("referer") ??
    request.nextUrl.origin;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": originHeader,
        "X-Title": "DevStudy AI Suite",
      },
      body: upstreamBody,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to reach OpenRouter.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    let details: unknown = null;
    try {
      details = await upstreamResponse.clone().json();
    } catch {
      const text = await upstreamResponse.text();
      details = text || null;
    }

    return NextResponse.json(
      {
        error: "OpenRouter returned an error response.",
        details,
      },
      { status: upstreamResponse.status },
    );
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstreamResponse.headers.get("Content-Type") ?? "text/event-stream; charset=utf-8",
  );
  headers.set("Cache-Control", "no-store, no-transform");

  if (upstreamResponse.headers.has("x-request-id")) {
    headers.set("x-openrouter-request-id", upstreamResponse.headers.get("x-request-id") as string);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
}

function sanitizeChunks(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const cleaned: string[] = [];

  for (const raw of input) {
    if (typeof raw !== "string") {
      continue;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }

    const truncated = trimmed.slice(0, MAX_CHUNK_LENGTH);
    cleaned.push(truncated);

    if (cleaned.length >= MAX_CHUNK_COUNT) {
      break;
    }
  }

  return cleaned;
}

function buildUserPrompt(mode: SummaryMode, chunks: string[], title: string): string {
  const instructions = SUMMARY_PROMPTS[mode];
  const joined = chunks
    .map((chunk, index) => `Chunk ${index + 1} (length: ${chunk.length} chars)\n${chunk}`)
    .join("\n\n");

  return [
    `Document title: ${title}`,
    "Follow the instructions for the requested summary format:",
    instructions,
    "Use every chunk when forming the summary and avoid speculation.",
    "Content to summarize:",
    joined,
  ].join("\n\n");
}

function isSummaryMode(value: string): value is SummaryMode {
  return value === "concise" || value === "outline";
}
