"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatMarkdown } from "@/app/_components/chat-markdown";
import { useTheme } from "@/app/_components/theme-provider";
import { useSettings } from "@/app/_components/settings-context";
import {
  DEFAULT_SUMMARY_MODE,
  ModeToggle,
  type SummaryMode,
} from "../_components/mode-toggle";

type SupportedFile = "pdf" | "markdown" | "text";

type IngestedDocument = {
  id: string;
  name: string;
  size: number;
  kind: SupportedFile;
  content: string;
  wordCount: number;
  charCount: number;
  estimatedTokens: number;
  createdAt: number;
};

type StatusMessage = {
  type: "idle" | "processing" | "error" | "success";
  message: string | null;
};

type SummaryDetails = {
  status: "idle" | "pending" | "error" | "success";
  content: string;
  errorMessage: string | null;
  updatedAt: number | null;
};

type SummaryMap = Record<string, Record<SummaryMode, SummaryDetails>>;

const STORAGE_KEY = "devstudy-notes-documents";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit per PRD
const CHARS_PER_CHUNK = 3200;
const MAX_CHUNKS = 6;

function createSummaryDetails(overrides?: Partial<SummaryDetails>): SummaryDetails {
  return {
    status: "idle",
    content: "",
    errorMessage: null,
    updatedAt: null,
    ...overrides,
  };
}

export default function NotesPage() {
  const { apiKey, defaultModel } = useSettings();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const sanitizedKey = apiKey.trim();
  const hasKey = sanitizedKey.length > 0;

  const [documents, setDocuments] = useState<IngestedDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMessage>({ type: "idle", message: null });
  const [summaryMode, setSummaryMode] = useState<SummaryMode>(DEFAULT_SUMMARY_MODE);
  const [summaries, setSummaries] = useState<SummaryMap>({});
  const [isSummarizing, setIsSummarizing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as IngestedDocument[];
        if (Array.isArray(parsed)) {
          setDocuments(parsed);
          setSelectedId(parsed[0]?.id ?? null);
        }
      }
    } catch (error) {
      console.error("Failed to restore notes", error);
      setStatus({ type: "error", message: "Could not restore saved notes from this device." });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch (error) {
      console.error("Failed to persist notes", error);
      setStatus({ type: "error", message: "Unable to persist notes locally." });
    }
  }, [documents]);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedId) ?? null,
    [documents, selectedId],
  );

  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => b.createdAt - a.createdAt),
    [documents],
  );

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    setStatus({ type: "processing", message: "Processing uploads..." });

    const results: IngestedDocument[] = [];
    let encounteredError = false;

    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_SIZE) {
        encounteredError = true;
        setStatus({
          type: "error",
          message: `${file.name} exceeds the 5MB limit. Please choose a smaller file.`,
        });
        continue;
      }

      const kind = resolveKind(file);
      if (!kind) {
        encounteredError = true;
        setStatus({
          type: "error",
          message: `${file.name} is not a supported format. Use PDF, Markdown, or plain text.`,
        });
        continue;
      }

      try {
        const content = await extractContent(file, kind);
        const trimmed = content.trim();

        if (!trimmed) {
          encounteredError = true;
          setStatus({ type: "error", message: `${file.name} did not contain readable text.` });
          continue;
        }

        const stats = computeStats(trimmed);
        results.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          kind,
          content: trimmed,
          ...stats,
          createdAt: Date.now(),
        });
      } catch (error) {
        encounteredError = true;
        console.error(`Failed to process ${file.name}`, error);
        setStatus({
          type: "error",
          message: `Unable to process ${file.name}. Try again with a different file.`,
        });
      }
    }

    if (results.length > 0) {
      setDocuments((prev) => [...results, ...prev]);
      setSelectedId(results[0]!.id);
      const baseMessage = results.length === 1 ? "File added to your notes." : "Files added to your notes.";
      setStatus({
        type: encounteredError ? "error" : "success",
        message: encounteredError ? `${baseMessage} Some files could not be processed.` : baseMessage,
      });
    } else if (!encounteredError) {
      setStatus({ type: "idle", message: null });
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => {
      const next = prev.filter((document) => document.id !== id);
      setSelectedId((current) => {
        if (next.length === 0) {
          return null;
        }
        return current === id ? next[0]!.id : current;
      });
      return next;
    });

    setSummaries((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    setStatus({ type: "idle", message: null });
  }, []);

  const handleCancelSummary = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleSummarize = useCallback(async () => {
    const document = selectedDocument;
    if (!document) {
      return;
    }

    const docId = document.id;

    if (!hasKey) {
      setSummaries((prev) => ({
        ...prev,
        [docId]: {
          ...(prev[docId] ?? {}),
          [summaryMode]: createSummaryDetails({
            status: "error",
            errorMessage: "Add your OpenRouter API key in Settings to generate summaries.",
          }),
        },
      }));
      return;
    }

    const chunks = chunkContent(document.content);
    if (chunks.length === 0) {
      setSummaries((prev) => ({
        ...prev,
        [docId]: {
          ...(prev[docId] ?? {}),
          [summaryMode]: createSummaryDetails({
            status: "error",
            errorMessage: "No readable content available to summarize.",
          }),
        },
      }));
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSummarizing(true);
    setSummaries((prev) => ({
      ...prev,
      [docId]: {
        ...(prev[docId] ?? {}),
        [summaryMode]: {
          status: "pending",
          content: "",
          errorMessage: null,
          updatedAt: prev[docId]?.[summaryMode]?.updatedAt ?? null,
        },
      },
    }));

    try {
      const response = await fetch("/api/notes/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openrouter-key": sanitizedKey,
        },
        body: JSON.stringify({
          mode: summaryMode,
          chunks,
          model: defaultModel,
          documentTitle: document.name,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = "Failed to generate summary.";
        try {
          const data = await response.json();
          if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore JSON parsing errors
        }

        setSummaries((prev) => ({
          ...prev,
          [docId]: {
            ...(prev[docId] ?? {}),
            [summaryMode]: createSummaryDetails({
              status: "error",
              errorMessage: message,
            }),
          },
        }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split("\n");
        buffer = segments.pop() ?? "";

        for (const segment of segments) {
          const line = segment.trim();
          if (!line || !line.startsWith("data:")) {
            continue;
          }

          const data = line.slice(5).trim();
          if (!data) {
            continue;
          }

          if (data === "[DONE]") {
            setSummaries((prev) => {
              const docSummaries = prev[docId] ?? {};
              const existing = docSummaries[summaryMode] ?? createSummaryDetails();
              return {
                ...prev,
                [docId]: {
                  ...docSummaries,
                  [summaryMode]: {
                    ...existing,
                    status: "success",
                    errorMessage: null,
                    updatedAt: Date.now(),
                  },
                },
              };
            });
            abortControllerRef.current = null;
            setIsSummarizing(false);
            return;
          }

          try {
            const json = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
            };

            const chunk = json.choices?.[0]?.delta?.content ?? "";
            if (chunk) {
              setSummaries((prev) => {
                const docSummaries = prev[docId] ?? {};
                const existing = docSummaries[summaryMode] ?? createSummaryDetails({ status: "pending" });
                return {
                  ...prev,
                  [docId]: {
                    ...docSummaries,
                    [summaryMode]: {
                      ...existing,
                      status: "pending",
                      errorMessage: null,
                      content: `${existing.content}${chunk}`,
                    },
                  },
                };
              });
            }

            if (json.choices?.[0]?.finish_reason) {
              setSummaries((prev) => {
                const docSummaries = prev[docId] ?? {};
                const existing = docSummaries[summaryMode] ?? createSummaryDetails();
                return {
                  ...prev,
                  [docId]: {
                    ...docSummaries,
                    [summaryMode]: {
                      ...existing,
                      status: "success",
                      errorMessage: null,
                      updatedAt: Date.now(),
                    },
                  },
                };
              });
              abortControllerRef.current = null;
              setIsSummarizing(false);
              return;
            }
          } catch (error) {
            console.error("Failed to parse summary chunk", error);
          }
        }
      }

      setSummaries((prev) => {
        const docSummaries = prev[docId] ?? {};
        const existing = docSummaries[summaryMode] ?? createSummaryDetails();
        return {
          ...prev,
          [docId]: {
            ...docSummaries,
            [summaryMode]: {
              ...existing,
              status: "success",
              errorMessage: null,
              updatedAt: Date.now(),
            },
          },
        };
      });
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError";

      setSummaries((prev) => {
        const docSummaries = prev[docId] ?? {};
        const existing = docSummaries[summaryMode] ?? createSummaryDetails();
        return {
          ...prev,
          [docId]: {
            ...docSummaries,
            [summaryMode]: {
              ...existing,
              status: isAbort ? "idle" : "error",
              errorMessage: isAbort ? "Summary canceled." : getErrorMessage(error),
              updatedAt: isAbort ? existing.updatedAt : Date.now(),
            },
          },
        };
      });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsSummarizing(false);
      }
    }
  }, [defaultModel, hasKey, sanitizedKey, selectedDocument, summaryMode]);

  const summaryDetails = selectedId ? summaries[selectedId]?.[summaryMode] : undefined;
  const isFlashcardsMode = summaryMode === "flashcards";
  const generateLabel = isFlashcardsMode ? "Generate flashcards" : "Generate summary";
  const pendingLabel = isFlashcardsMode ? "Generating flashcards…" : "Generating summary…";
  const idleHelper = hasKey
    ? isFlashcardsMode
      ? "Run flashcards to create a quick Q/A drill set."
      : "Choose a mode above and generate an AI summary."
    : "Enter your OpenRouter API key in Settings to enable AI summaries and flashcards.";

  return (
    <section className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-surface/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.18)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_90%_at_0%_0%,rgba(79,70,229,0.18),transparent),radial-gradient(110%_110%_at_100%_0%,rgba(236,72,153,0.18),transparent)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-foreground/60">DevStudy Notes</p>
            <h1 className="text-3xl font-semibold sm:text-4xl">Turn lecture materials into tailored summaries and flashcards.</h1>
            <p className="max-w-2xl text-sm text-foreground/70 sm:text-base">
              Upload PDFs, Markdown, or text files, keep them on-device, and generate targeted outputs powered by your OpenRouter key.
            </p>
          </div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground/60">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
            {documents.length ? `${documents.length} note${documents.length === 1 ? "" : "s"} saved` : "No uploads yet"}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border/70 bg-surface/95 p-6 shadow-[0_18px_46px_rgba(15,23,42,0.18)] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <label
            htmlFor="notes-upload"
            className="flex flex-1 cursor-pointer flex-col justify-center gap-3 rounded-3xl border border-dashed border-border/70 bg-background/70 px-6 py-10 text-center text-sm text-foreground/60 transition hover:border-accent/50 hover:bg-background/80"
          >
            <span className="text-base font-semibold text-foreground">Drop files or click to upload</span>
            <span>Supports PDF, Markdown (.md), and plain text (.txt) up to 5MB each.</span>
            <input
              ref={inputRef}
              id="notes-upload"
              type="file"
              accept=".pdf,.md,.txt,text/plain,text/markdown,application/pdf"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </label>
          <div className="mt-2 flex w-full max-w-sm flex-col gap-3 rounded-3xl border border-border/70 bg-background/80 px-5 py-6 text-sm text-foreground/70 lg:mt-0">
            <p className="text-sm font-semibold text-foreground/80">Upload tips</p>
            <ul className="space-y-2 text-xs text-foreground/60">
              <li>Keep files under 5MB for fast parsing.</li>
              <li>Multi-page PDFs are supported; text is extracted client-side.</li>
              <li>Flashcards mode works best with concise sections.</li>
            </ul>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-1 inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90"
            >
              Choose files
            </button>
            {status.message ? (
              <div
                role="status"
                className={`rounded-2xl px-3 py-2 text-xs ${
                  status.type === "error"
                    ? isDarkMode
                      ? "bg-red-900/30 text-red-200"
                      : "bg-red-100 text-red-700"
                    : status.type === "success"
                      ? isDarkMode
                        ? "bg-emerald-900/30 text-emerald-200"
                        : "bg-emerald-100 text-emerald-700"
                      : "bg-background text-foreground/70"
                }`}
              >
                {status.message}
              </div>
            ) : (
              <p className="text-xs text-foreground/50">Files stay local unless you opt into Supabase sync later.</p>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.85fr)]">
          <aside className="flex max-h-[520px] flex-col gap-3 overflow-y-auto pr-1">
            {sortedDocuments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/70 px-5 py-8 text-center text-sm text-foreground/60">
                No notes yet. Upload a PDF, Markdown, or text file to get started.
              </div>
            ) : (
              sortedDocuments.map((document) => {
                const isActive = document.id === selectedId;
                return (
                  <div
                    key={document.id}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                      isActive
                        ? "border-accent bg-accent/10"
                        : "border-border/70 bg-background/70 hover:border-accent/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(document.id)}
                      className="flex flex-1 flex-col text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{document.name}</p>
                          <p className="text-xs uppercase tracking-wide text-foreground/50">
                            {document.kind.toUpperCase()} · {formatBytes(document.size)}
                          </p>
                        </div>
                        {isActive ? (
                          <span className="text-[11px] font-semibold uppercase text-accent">Active</span>
                        ) : null}
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-foreground/70">{document.content}</p>
                      <p className="mt-2 text-[11px] text-foreground/50">
                        {document.wordCount.toLocaleString()} words · ~{document.estimatedTokens.toLocaleString()} tokens
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDocument(document.id)}
                      className="rounded-full px-3 py-1 text-[11px] font-semibold text-foreground/60 transition hover:bg-foreground/10"
                      aria-label="Remove note"
                    >
                      Remove
                    </button>
                  </div>
                );
              })
            )}
          </aside>

          <article className="flex min-h-[420px] flex-col gap-5">
            {selectedDocument ? (
              <>
                <section className="rounded-3xl border border-border/70 bg-background/80 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] sm:p-6">
                  <header className="flex flex-col gap-1">
                    <p className="text-xs uppercase tracking-wide text-foreground/50">Preview</p>
                    <h2 className="text-2xl font-semibold text-foreground">{selectedDocument.name}</h2>
                    <p className="text-xs text-foreground/60">
                      {selectedDocument.wordCount.toLocaleString()} words · ~
                      {selectedDocument.estimatedTokens.toLocaleString()} tokens · imported {new Date(selectedDocument.createdAt).toLocaleString()}
                    </p>
                  </header>
                  <section className="mt-4 max-h-[320px] overflow-auto rounded-2xl border border-border/60 bg-surface/80 p-4 text-sm leading-relaxed text-foreground/80">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{selectedDocument.content}</pre>
                  </section>
                </section>

                <section className="rounded-3xl border border-border/70 bg-background/80 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">AI Summary</h3>
                      <p className="text-xs text-foreground/60">Powered by your OpenRouter key.</p>
                    </div>
                    <div className="flex gap-2">
                      {isSummarizing ? (
                        <button
                          type="button"
                          onClick={handleCancelSummary}
                          className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-foreground/10"
                        >
                          Stop
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSummarize}
                          className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition hover:bg-accent/90"
                        >
                          {generateLabel}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <ModeToggle
                      value={summaryMode}
                      onChange={(mode) => {
                        if (!isSummarizing) {
                          setSummaryMode(mode);
                        }
                      }}
                    />
                  </div>
                  <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-surface/70 p-4">
                    {summaryDetails?.status === "error" ? (
                      <p className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                        {summaryDetails.errorMessage ?? "Unable to generate summary."}
                      </p>
                    ) : null}

                    {summaryDetails?.status === "pending" ? (
                      <p className="text-sm font-semibold text-foreground/70">{pendingLabel}</p>
                    ) : null}

                    {summaryDetails?.content ? (
                      <ChatMarkdown content={summaryDetails.content} className="mt-3 space-y-3 text-sm leading-relaxed" />
                    ) : null}

                    {!summaryDetails || (summaryDetails.status === "idle" && !summaryDetails.content) ? (
                      <p className="text-sm text-foreground/60">{idleHelper}</p>
                    ) : null}

                    {summaryDetails?.updatedAt && summaryDetails.status === "success" ? (
                      <p className="mt-3 text-xs text-foreground/50">
                        Generated {new Date(summaryDetails.updatedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </section>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-border/70 p-6 text-sm text-foreground/60">
                Select a note to view its extracted content.
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}

function resolveKind(file: File): SupportedFile | null {
  const extension = file.name.toLowerCase().split(".").pop();
  if (file.type === "application/pdf" || extension === "pdf") {
    return "pdf";
  }
  if (file.type === "text/markdown" || extension === "md") {
    return "markdown";
  }
  if (file.type === "text/plain" || extension === "txt") {
    return "text";
  }
  return null;
}

async function extractContent(file: File, kind: SupportedFile): Promise<string> {
  if (kind === "pdf") {
    const pdfModule = await import("@/lib/pdf");
    return pdfModule.extractTextFromPdf(file);
  }

  const text = await file.text();
  return text.replace(/\u0000/g, "");
}

function computeStats(content: string) {
  const words = content.split(/\s+/g).filter(Boolean);
  const chars = content.length;
  const estimatedTokens = Math.max(1, Math.round(chars / 4));

  return {
    wordCount: words.length,
    charCount: chars,
    estimatedTokens,
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function chunkContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return [];
  }

  const chunks: string[] = [];
  let index = 0;

  while (index < trimmed.length && chunks.length < MAX_CHUNKS) {
    const slice = trimmed.slice(index, index + CHARS_PER_CHUNK);
    chunks.push(slice);
    index += CHARS_PER_CHUNK;
  }

  return chunks;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === "string" ? error : "Unknown error occurred.";
}
