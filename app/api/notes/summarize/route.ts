import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/auto:free";

const SUMMARY_PROMPTS: Record<SummaryMode, string> = {
  academic:
    "Write a cohesive Markdown summary in an academic tone. Organize content into short sections with descriptive headings, weave in inline citations using parenthetical references when source names are available, and define critical terminology before using it. Highlight equations or code snippets using fenced code blocks when present.",
  bullets:
    "Return 8-10 Markdown bullet points grouped under short bolded labels. Each point should contain one actionable insight, data point, or key argument. Use nested bullets sparingly for sub-points and prefer precise language over filler.",
  outline:
    "Return a structured Markdown outline with level-2 and level-3 headings highlighting major sections and key supporting details. Use nested bullet points for specifics and avoid introductory or closing prose.",
  mindmap:
    "Return a mind map expressed as a nested Markdown list. Start with a single top-level bullet named after the core concept, then create child bullets for major themes and further nested bullets for supporting ideas. Keep each label under 12 words and emphasize relationships or cause/effect where relevant.",
  qa:
    "Return 6-8 study questions with answers in Markdown. For each item, place the question in bold followed by the answer on the next line in normal text. Include a mix of definition, explanation, and application questions, and ensure answers are grounded in the source material.",
  comparison:
    "Return a Markdown table comparing 3-5 closely related concepts, methods, or perspectives that appear in the material. Columns should include 'Concept', 'Core Idea', 'Strengths / Use Cases', and 'Caveats'. Keep cells concise but specific.",
  flashcards:
    "Return exactly 6 Markdown flashcards suitable for spaced repetition. For each flashcard, format as a numbered list item where the question is bold and the answer appears on the next line in italics. Capture definitions, processes, or code snippets as needed.",
  roadmap:
    "Return a numbered Markdown list outlining a study roadmap. Each step should include the focus activity, estimated time in minutes, and a measurable outcome. Close with a recap step that suggests review cadence or reflection prompts.",
  quiz:
    "Return a Markdown quiz with three sections: (1) Multiple Choice — provide 3 questions with four options each and bold the correct answer, (2) Short Answer — provide 2 prompts expecting 2-3 sentence responses, and (3) Extended Response — provide 1 essay-style prompt outlining what to cover.",
  concise:
    "Return 5-7 concise Markdown bullet points summarizing the essential concepts, definitions, and actionable takeaways. Keep each bullet to a single sentence and include inline code or formulas when present.",
};

const MAX_CHUNK_LENGTH = 4000; // characters
const MAX_CHUNK_COUNT = 8;
const MAX_FOCUS_AREAS = 6;

type SummaryMode =
  | "academic"
  | "bullets"
  | "outline"
  | "mindmap"
  | "qa"
  | "comparison"
  | "flashcards"
  | "roadmap"
  | "quiz"
  | "concise";

type NoteDepth = "surface" | "intermediate" | "deep";
type NoteLength = "brief" | "standard" | "comprehensive";
type NoteTone = "formal" | "casual" | "technical" | "beginner";
type NoteTemplate = "default" | "stem" | "humanities";

type NoteOptions = {
  depth: NoteDepth;
  length: NoteLength;
  tone: NoteTone;
  template: NoteTemplate;
  focusAreas: string[];
};

const DEFAULT_NOTE_OPTIONS: NoteOptions = {
  depth: "intermediate",
  length: "standard",
  tone: "formal",
  template: "default",
  focusAreas: [],
};

const DEPTH_GUIDANCE: Record<NoteDepth, string> = {
  surface: "Keep the treatment high-level and focus on the big picture without dense detail.",
  intermediate: "Balance key ideas with supporting evidence or examples to explain why they matter.",
  deep: "Deliver comprehensive coverage including nuances, edge cases, and implications.",
};

const LENGTH_GUIDANCE: Record<NoteLength, string> = {
  brief: "Aim for roughly 200 words or less.",
  standard: "Aim for roughly 350-450 words.",
  comprehensive: "Aim for roughly 650-750 words without repeating yourself.",
};

const TONE_GUIDANCE: Record<NoteTone, string> = {
  formal: "Use an academic, citation-friendly tone.",
  casual: "Use a friendly tone with plain language explanations.",
  technical: "Adopt a technical tone with precise terminology and symbols.",
  beginner: "Explain concepts gently as if tutoring someone encountering them for the first time.",
};

const TEMPLATE_GUIDANCE: Record<NoteTemplate, string> = {
  default: "Structure sections in the most logical order for comprehension.",
  stem: "Prioritize formulas, derivations, proofs, and step-by-step procedures.",
  humanities: "Emphasize arguments, historical context, perspectives, and narrative flow.",
};

type SummarizeRequest = {
  mode?: unknown;
  chunks?: unknown;
  model?: unknown;
  documentTitle?: unknown;
  options?: unknown;
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

  const mode: SummaryMode = modeValue;

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

  const options = sanitizeNoteOptions(parsed.options);

  const messages = [
    {
      role: "system",
      content:
        "You are DevStudy's note companion. Summarize accurately without inventing facts and ensure the output is student-friendly and ready to review.",
    },
    {
      role: "user",
      content: buildUserPrompt(mode, chunks, documentTitle, options),
    },
  ];

  const upstreamBody = JSON.stringify({
    model,
    stream: true,
    temperature: 0.2,
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

function sanitizeNoteOptions(input: unknown): NoteOptions {
  if (!input || typeof input !== "object") {
    return DEFAULT_NOTE_OPTIONS;
  }

  const raw = input as Record<string, unknown>;

  const depth = isNoteDepth(raw.depth) ? raw.depth : DEFAULT_NOTE_OPTIONS.depth;
  const length = isNoteLength(raw.length) ? raw.length : DEFAULT_NOTE_OPTIONS.length;
  const tone = isNoteTone(raw.tone) ? raw.tone : DEFAULT_NOTE_OPTIONS.tone;
  const template = isNoteTemplate(raw.template) ? raw.template : DEFAULT_NOTE_OPTIONS.template;

  const focusAreas = Array.isArray(raw.focusAreas)
    ? Array.from(
        new Set(
          raw.focusAreas
            .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
            .filter((entry) => entry.length > 0),
        ),
      ).slice(0, MAX_FOCUS_AREAS)
    : DEFAULT_NOTE_OPTIONS.focusAreas;

  return {
    depth,
    length,
    tone,
    template,
    focusAreas,
  };
}

function isNoteDepth(value: unknown): value is NoteDepth {
  return value === "surface" || value === "intermediate" || value === "deep";
}

function isNoteLength(value: unknown): value is NoteLength {
  return value === "brief" || value === "standard" || value === "comprehensive";
}

function isNoteTone(value: unknown): value is NoteTone {
  return value === "formal" || value === "casual" || value === "technical" || value === "beginner";
}

function isNoteTemplate(value: unknown): value is NoteTemplate {
  return value === "default" || value === "stem" || value === "humanities";
}

function buildUserPrompt(mode: SummaryMode, chunks: string[], title: string, options: NoteOptions): string {
  const instructions = SUMMARY_PROMPTS[mode] ?? SUMMARY_PROMPTS.concise;
  const joined = chunks
    .map((chunk, index) => `Chunk ${index + 1} (length: ${chunk.length} chars)\n${chunk}`)
    .join("\n\n");

  const optionDirectives = buildOptionDirectives(options);

  return [
    `Document title: ${title}`,
    "Follow the instructions for the requested summary format:",
    instructions,
    optionDirectives,
    "Use every chunk when forming the summary and avoid speculation.",
    "Content to summarize:",
    joined,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildOptionDirectives(options: NoteOptions): string {
  const lines = [
    `Depth target: ${DEPTH_GUIDANCE[options.depth]}`,
    `Desired length: ${LENGTH_GUIDANCE[options.length]}`,
    `Tone: ${TONE_GUIDANCE[options.tone]}`,
    `Template preference: ${TEMPLATE_GUIDANCE[options.template]}`,
  ];

  if (options.focusAreas.length > 0) {
    lines.push(`Prioritize these focus areas: ${formatFocusAreas(options.focusAreas)}.`);
  }

  return lines.join("\n");
}

function formatFocusAreas(areas: string[]): string {
  if (areas.length === 1) {
    return `“${areas[0]}”`;
  }

  if (areas.length === 2) {
    return `“${areas[0]}” and “${areas[1]}”`;
  }

  const rest = areas.slice(0, -1).map((area) => `“${area}”`).join(", ");
  const last = `“${areas[areas.length - 1]}”`;
  return `${rest}, and ${last}`;
}

function isSummaryMode(value: string): value is SummaryMode {
  return (value as SummaryMode) in SUMMARY_PROMPTS;
}
