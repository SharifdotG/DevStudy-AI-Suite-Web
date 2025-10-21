import { NextResponse } from "next/server";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export const runtime = "nodejs";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const MAX_HTML_LENGTH = 600_000; // limit input processed from upstream response
const MAX_MARKDOWN_LENGTH = 50_000; // keep stored notes manageable per PRD scope

type WebIngestRequest = {
  url?: unknown;
};

export async function POST(request: Request) {
  let payload: WebIngestRequest;
  try {
    payload = (await request.json()) as WebIngestRequest;
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid JSON payload.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }

  const rawUrl = typeof payload.url === "string" ? payload.url.trim() : "";
  if (!rawUrl) {
    return NextResponse.json({ error: "Enter a URL to import." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Enter a valid http(s) URL." }, { status: 400 });
  }

  if (!ALLOWED_PROTOCOLS.has(target.protocol)) {
    return NextResponse.json({ error: "Only http and https URLs are supported." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
      },
      redirect: "follow",
      cache: "no-store",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to reach that URL.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const details = await summarizeUpstreamError(upstream);
    return NextResponse.json(
      {
        error: "The requested page returned an error response.",
        details,
      },
      { status: upstream.status },
    );
  }

  let rawBody: string;
  try {
    rawBody = await upstream.text();
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to read the page contents.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }

  if (!rawBody.trim()) {
    return NextResponse.json({ error: "No readable text was found at that link." }, { status: 422 });
  }

  const truncatedBody = rawBody.slice(0, MAX_HTML_LENGTH);
  const contentType = upstream.headers.get("content-type") ?? "";
  const isHtml = /text\/html|application\/xhtml\+xml/i.test(contentType);
  const isPlainText = /^text\/plain/i.test(contentType);

  let extractedTitle = sanitizeTitle(target.hostname);
  let markdown = "";

  if (isHtml || !isPlainText) {
    try {
      const dom = new JSDOM(truncatedBody, { url: target.toString() });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (article) {
        if (article.title) {
          extractedTitle = sanitizeTitle(article.title);
        } else if (dom.window.document.title) {
          extractedTitle = sanitizeTitle(dom.window.document.title);
        }

        if (article.content && article.content.trim()) {
          markdown = basicHtmlToMarkdown(article.content);
        } else if (article.textContent && article.textContent.trim()) {
          markdown = normalizePlainText(article.textContent);
        }
      } else {
        if (dom.window.document.title) {
          extractedTitle = sanitizeTitle(dom.window.document.title);
        }
        const main =
          dom.window.document.querySelector("main") ??
          dom.window.document.querySelector("article") ??
          dom.window.document.body;
        if (main) {
          markdown = basicHtmlToMarkdown(main.innerHTML);
        }
      }
    } catch (error) {
      return NextResponse.json(
        {
          error: "Failed to extract readable content from that page.",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 502 },
      );
    }
  } else {
    extractedTitle = sanitizeTitle(deriveTitleFromPath(target) ?? extractedTitle);
    markdown = normalizePlainText(truncatedBody);
  }

  if (!markdown.trim()) {
    markdown = normalizePlainText(truncatedBody);
  }

  if (!markdown) {
    return NextResponse.json({ error: "No readable text was found at that link." }, { status: 422 });
  }

  if (markdown.length > MAX_MARKDOWN_LENGTH) {
    markdown = markdown.slice(0, MAX_MARKDOWN_LENGTH);
  }

  return NextResponse.json({
    title: extractedTitle || target.hostname,
    content: markdown,
  });
}

function sanitizeTitle(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}

function deriveTitleFromPath(url: URL): string | null {
  const segments = url.pathname.split("/").filter(Boolean);
  if (!segments.length) {
    return null;
  }
  const last = decodeURIComponent(segments[segments.length - 1] ?? "");
  if (!last) {
    return null;
  }
  return last.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizePlainText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00a0]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function basicHtmlToMarkdown(html: string): string {
  const sanitized = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  const converted = sanitized
    .replace(/<(h[1-6])[^>]*>/gi, (_, tag: string) => `\n\n${"#".repeat(Number(tag[1]))} `)
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/?(p|div)>/gi, "\n\n")
    .replace(/<br\s*\/?/gi, "\n")
    .replace(/<\/?(strong|b)>/gi, "**")
    .replace(/<\/?(em|i)>/gi, "_")
    .replace(/<blockquote[^>]*>/gi, "\n\n> ")
    .replace(/<\/blockquote>/gi, "\n\n")
    .replace(/<pre[^>]*>/gi, "\n\n```\n")
    .replace(/<\/pre>/gi, "\n```\n\n")
    .replace(/<code[^>]*>/gi, "`")
    .replace(/<\/code>/gi, "`")
    .replace(/<(ul|ol)[^>]*>/gi, "\n")
    .replace(/<\/(ul|ol)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_, href: string, text: string) => {
      const cleanedText = normalizeInlineText(text);
      const cleanedHref = href.trim();
      if (!cleanedHref) {
        return cleanedText;
      }
      if (!cleanedText) {
        return cleanedHref;
      }
      return `[${cleanedText}](${cleanedHref})`;
    })
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ");

  return normalizePlainText(converted);
}

function normalizeInlineText(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function summarizeUpstreamError(response: Response): Promise<string | null> {
  try {
    const data = await response.clone().json();
    if (data && typeof data === "object") {
      if (typeof (data as Record<string, unknown>).error === "string") {
        return (data as Record<string, unknown>).error as string;
      }
      if (typeof (data as Record<string, unknown>).message === "string") {
        return (data as Record<string, unknown>).message as string;
      }
    }
  } catch {
    // ignore json parse errors
  }

  try {
    const text = await response.text();
    return text.slice(0, 250) || null;
  } catch {
    return null;
  }
}