import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/auto:free";
const MAX_CHUNK_LENGTH = 4000; // characters
const MAX_CHUNK_COUNT = 8;
const MAX_FOCUS_AREAS = 6;

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

type QARequestBody = {
	question?: unknown;
	chunks?: unknown;
	model?: unknown;
	documentTitle?: unknown;
	options?: unknown;
};

const DEFAULT_OPTIONS: NoteOptions = {
	depth: "intermediate",
	length: "standard",
	tone: "formal",
	template: "default",
	focusAreas: [],
};

const DEPTH_GUIDANCE: Record<NoteDepth, string> = {
	surface: "Provide a brief overview that hits only the most essential facts.",
	intermediate: "Offer balanced detail with concise explanations and supporting examples.",
	deep: "Deliver an in-depth explanation that explores nuances, edge cases, and implications.",
};

const LENGTH_GUIDANCE: Record<NoteLength, string> = {
	brief: "Keep answers to 1-2 sentences.",
	standard: "Keep answers to roughly 3-4 sentences.",
	comprehensive: "Provide multi-paragraph answers when helpful, but avoid filler.",
};

const TONE_GUIDANCE: Record<NoteTone, string> = {
	formal: "Use an academic tone with precise terminology.",
	casual: "Use a friendly tone with plain language explanations.",
	technical: "Adopt a technical tone with domain-specific vocabulary and equations where relevant.",
	beginner: "Explain concepts gently, defining unfamiliar terms before using them.",
};

const TEMPLATE_GUIDANCE: Record<NoteTemplate, string> = {
	default: "Structure answers in the most logical order for clarity.",
	stem: "Emphasize definitions, formulas, derivations, and procedural steps.",
	humanities: "Emphasize arguments, historical context, perspectives, and thematic significance.",
};

export async function POST(request: NextRequest) {
	const apiKey = request.headers.get("x-openrouter-key")?.trim();

	if (!apiKey) {
		return NextResponse.json(
			{ error: "Missing OpenRouter API key in request headers." },
			{ status: 401 },
		);
	}

	let parsed: QARequestBody;
	try {
		parsed = (await request.json()) as QARequestBody;
	} catch (error) {
		return NextResponse.json(
			{
				error: "Invalid JSON payload.",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 400 },
		);
	}

	const question = typeof parsed.question === "string" ? parsed.question.trim() : "";
	if (question.length === 0) {
		return NextResponse.json(
			{ error: "A question prompt is required." },
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

	const options = sanitizeOptions(parsed.options);

	const messages = [
		{
			role: "system",
			content:
				"You are DevStudy's retrieval QA assistant. Answer the learner's question using only the provided document chunks. Cite chunk numbers in parentheses when referencing specific evidence.",
		},
		{
			role: "user",
			content: buildUserPrompt(question, documentTitle, chunks, options),
		},
	];

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
			body: JSON.stringify({
				model,
				stream: true,
				temperature: 0.1,
				messages,
			}),
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

function sanitizeOptions(input: unknown): NoteOptions {
	if (!input || typeof input !== "object") {
		return DEFAULT_OPTIONS;
	}

	const raw = input as Record<string, unknown>;

	const depth = isNoteDepth(raw.depth) ? raw.depth : DEFAULT_OPTIONS.depth;
	const length = isNoteLength(raw.length) ? raw.length : DEFAULT_OPTIONS.length;
	const tone = isNoteTone(raw.tone) ? raw.tone : DEFAULT_OPTIONS.tone;
	const template = isNoteTemplate(raw.template) ? raw.template : DEFAULT_OPTIONS.template;

	const focusAreas = Array.isArray(raw.focusAreas)
		? Array.from(
				new Set(
					raw.focusAreas
						.map((entry) => (typeof entry === "string" ? entry.trim() : ""))
						.filter((entry) => entry.length > 0),
				),
			)
			.slice(0, MAX_FOCUS_AREAS)
		: DEFAULT_OPTIONS.focusAreas;

	return {
		depth,
		length,
		tone,
		template,
		focusAreas,
	};
}

function buildUserPrompt(question: string, title: string, chunks: string[], options: NoteOptions): string {
	const joined = chunks
		.map((chunk, index) => `Chunk ${index + 1} (length: ${chunk.length} chars)\n${chunk}`)
		.join("\n\n");

	const directives = buildOptionDirective(options);

	return [
		`Document title: ${title}`,
		`Learner question: ${question}`,
		"Answer using the supplied chunks and do not invent facts.",
		"Cite supporting chunks in parentheses, e.g., (Chunk 2).",
		directives,
		"Content to ground the answer:",
		joined,
	]
		.filter(Boolean)
		.join("\n\n");
}

function buildOptionDirective(options: NoteOptions): string {
	const lines = [
		`Depth guidance: ${DEPTH_GUIDANCE[options.depth]}`,
		`Length guidance: ${LENGTH_GUIDANCE[options.length]}`,
		`Tone guidance: ${TONE_GUIDANCE[options.tone]}`,
		`Template guidance: ${TEMPLATE_GUIDANCE[options.template]}`,
	];

	if (options.focusAreas.length > 0) {
		lines.push(`Prioritize these focus areas: ${formatFocusAreas(options.focusAreas)}.`);
	}

	return lines.join("\n");
}

function formatFocusAreas(areas: string[]): string {
	if (areas.length === 1) {
		return `"${areas[0]}"`;
	}

	if (areas.length === 2) {
		return `"${areas[0]}" and "${areas[1]}"`;
	}

	const rest = areas.slice(0, -1).map((area) => `"${area}"`).join(", ");
	const last = `"${areas[areas.length - 1]}"`;
	return `${rest}, and ${last}`;
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
