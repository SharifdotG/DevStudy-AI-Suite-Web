import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/auto:free";

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-openrouter-key")?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OpenRouter API key in request headers." },
      { status: 401 },
    );
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload.", details: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }

  const payload = (parsed && typeof parsed === "object" ? parsed : {}) as {
    model?: unknown;
    messages?: unknown;
    [key: string]: unknown;
  };

  const { model, messages, ...rest } = payload;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Request must include at least one chat message." },
      { status: 400 },
    );
  }

  const upstreamBody = JSON.stringify({
    ...rest,
    model: typeof model === "string" && model.length ? model : DEFAULT_MODEL,
    messages,
    stream: true,
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
  headers.set("Content-Type", upstreamResponse.headers.get("Content-Type") ?? "text/event-stream; charset=utf-8");
  headers.set("Cache-Control", "no-store, no-transform");

  if (upstreamResponse.headers.has("x-request-id")) {
    headers.set("x-openrouter-request-id", upstreamResponse.headers.get("x-request-id") as string);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
}
