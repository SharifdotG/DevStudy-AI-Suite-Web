"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatMarkdown } from "@/app/_components/chat-markdown";
import { useTheme } from "@/app/_components/theme-provider";
import { useSettings } from "@/app/_components/settings-context";
import { useSupabase } from "@/app/_components/supabase-provider";
import { FILE_INPUT_ACCEPT, extractContent, resolveKind, type SupportedFile } from "./ingestion";
import {
  DEFAULT_SUMMARY_MODE,
  ModeToggle,
  type SummaryMode,
} from "../_components/mode-toggle";

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
  source?: "upload" | "url";
  url?: string | null;
};

type StatusMessage = {
  type: "idle" | "processing" | "error" | "success";
  message: string | null;
};

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

type SummaryDetails = {
  status: "idle" | "pending" | "error" | "success";
  content: string;
  errorMessage: string | null;
  updatedAt: number | null;
  optionsSnapshot: NoteOptions | null;
  model: string | null;
};

type QAMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "error";
};

type CrossReference = {
  id: string;
  title: string;
  similarity: number;
  excerpt: string;
};

type ProgressStats = {
  documents: number;
  totalWords: number;
  completedSummaries: number;
  flashcards: number;
  quiz: number;
  roadmap: number;
};

type SummaryMap = Record<string, Record<SummaryMode, SummaryDetails>>;

type AnnotationMap = Record<string, string>;
type QAMap = Record<string, QAMessage[]>;

const STORAGE_KEY = "devstudy-notes-documents";
const ANNOTATIONS_STORAGE_KEY = "devstudy-notes-annotations";
const OPTIONS_STORAGE_KEY = "devstudy-notes-options";
const QA_STORAGE_KEY = "devstudy-notes-qa";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit per PRD
const CHARS_PER_CHUNK = 3200;
const MAX_CHUNKS = 6;
const MAX_FOCUS_AREAS = 6;
const URL_INPUT_MIN_LENGTH = 8;

type StudyMode = "focus" | "shortBreak" | "longBreak";

type AiPanel = "summary" | "qa" | "annotations";

const DEFAULT_NOTE_OPTIONS: NoteOptions = {
  depth: "intermediate",
  length: "standard",
  tone: "formal",
  template: "default",
  focusAreas: [],
};

const DEPTH_OPTIONS: Array<{ id: NoteDepth; label: string; helper: string }> = [
  { id: "surface", label: "Surface", helper: "High-level recap for quick brushing." },
  { id: "intermediate", label: "Intermediate", helper: "Balanced detail with key explanations." },
  { id: "deep", label: "Deep", helper: "Comprehensive analysis with nuances." },
];

const LENGTH_OPTIONS: Array<{ id: NoteLength; label: string; helper: string }> = [
  { id: "brief", label: "Brief", helper: "~200 words" },
  { id: "standard", label: "Standard", helper: "~400 words" },
  { id: "comprehensive", label: "Comprehensive", helper: "~700 words" },
];

const TONE_OPTIONS: Array<{ id: NoteTone; label: string; helper: string }> = [
  { id: "formal", label: "Formal", helper: "Academic tone with citations." },
  { id: "casual", label: "Casual", helper: "Conversational and student-friendly." },
  { id: "technical", label: "Technical", helper: "Dense with jargon and formulas." },
  { id: "beginner", label: "Beginner", helper: "Gentle explanations for first-time learners." },
];

const TEMPLATE_OPTIONS: Array<{ id: NoteTemplate; label: string; helper: string }> = [
  { id: "default", label: "General", helper: "Works for most topics." },
  { id: "stem", label: "STEM", helper: "Focus on proofs, derivations, step-by-step logic." },
  { id: "humanities", label: "Humanities", helper: "Emphasize arguments, perspectives, timelines." },
];

const AI_PANEL_DEFINITIONS: Array<{ id: AiPanel; label: string; helper: string }> = [
  {
    id: "summary",
    label: "AI summary",
    helper: "Generate structured notes, outlines, flashcards, and more.",
  },
  {
    id: "qa",
    label: "Ask your notes",
    helper: "Chat with the document and stream grounded answers.",
  },
  {
    id: "annotations",
    label: "Annotations",
    helper: "Capture your own reminders and highlights while you read.",
  },
];

function createSummaryDetails(overrides?: Partial<SummaryDetails>): SummaryDetails {
  return {
    status: "idle",
    content: "",
    errorMessage: null,
    updatedAt: null,
    optionsSnapshot: null,
    model: null,
    ...overrides,
  };
}

export default function NotesPage() {
  const { apiKey, defaultModel } = useSettings();
  const { resolvedTheme } = useTheme();
  const { supabase, session } = useSupabase();
  const isDarkMode = resolvedTheme === "dark";
  const sanitizedKey = apiKey.trim();
  const hasKey = sanitizedKey.length > 0;
  const userId = session?.user?.id ?? null;

  const [documents, setDocuments] = useState<IngestedDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMessage>({ type: "idle", message: null });
  const [summaryMode, setSummaryMode] = useState<SummaryMode>(DEFAULT_SUMMARY_MODE);
  const [summaries, setSummaries] = useState<SummaryMap>({});
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [noteOptions, setNoteOptions] = useState<NoteOptions>(DEFAULT_NOTE_OPTIONS);
  const [annotations, setAnnotations] = useState<AnnotationMap>({});
  const [focusDraft, setFocusDraft] = useState("");
  const [qaMessages, setQaMessages] = useState<QAMap>({});
  const [qaInput, setQaInput] = useState("");
  const [qaStatus, setQaStatus] = useState<StatusMessage>({ type: "idle", message: null });
  const [qaStreamingId, setQaStreamingId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<AiPanel>("summary");
  const [urlInput, setUrlInput] = useState("");
  const [syncStatus, setSyncStatus] = useState<StatusMessage>({ type: "idle", message: null });
  const [studyMode, setStudyMode] = useState<StudyMode>("focus");
  const [studySecondsRemaining, setStudySecondsRemaining] = useState(getDurationForMode("focus"));
  const [studyRunning, setStudyRunning] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const qaAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedDocs = window.localStorage.getItem(STORAGE_KEY);
      if (storedDocs) {
        const parsedDocs = JSON.parse(storedDocs) as IngestedDocument[];
        if (Array.isArray(parsedDocs)) {
          setDocuments(parsedDocs);
          setSelectedId(parsedDocs[0]?.id ?? null);
        }
      }

      const storedAnnotations = window.localStorage.getItem(ANNOTATIONS_STORAGE_KEY);
      if (storedAnnotations) {
        const parsedAnnotations = JSON.parse(storedAnnotations) as AnnotationMap;
        if (parsedAnnotations && typeof parsedAnnotations === "object") {
          setAnnotations(parsedAnnotations);
        }
      }

      const storedOptions = window.localStorage.getItem(OPTIONS_STORAGE_KEY);
      if (storedOptions) {
        const parsedOptions = JSON.parse(storedOptions) as Partial<NoteOptions>;
        if (parsedOptions && typeof parsedOptions === "object") {
          setNoteOptions((prev) => ({
            ...prev,
            ...parsedOptions,
            focusAreas: Array.isArray(parsedOptions.focusAreas)
              ? dedupeFocusAreas(parsedOptions.focusAreas as string[])
              : prev.focusAreas,
          }));
        }
      }

      const storedQa = window.localStorage.getItem(QA_STORAGE_KEY);
      if (storedQa) {
        const parsedQa = JSON.parse(storedQa) as QAMap;
        if (parsedQa && typeof parsedQa === "object") {
          setQaMessages(parsedQa);
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(ANNOTATIONS_STORAGE_KEY, JSON.stringify(annotations));
    } catch (error) {
      console.error("Failed to persist annotations", error);
    }
  }, [annotations]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(noteOptions));
    } catch (error) {
      console.error("Failed to persist note options", error);
    }
  }, [noteOptions]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(qaMessages));
    } catch (error) {
      console.error("Failed to persist Q&A history", error);
    }
  }, [qaMessages]);

  useEffect(() => {
    if (typeof window === "undefined" || !studyRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setStudySecondsRemaining((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          setStudyRunning(false);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [studyRunning]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setStudySecondsRemaining(getDurationForMode(studyMode));
  }, [studyMode]);

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
          message: `${file.name} is not a supported format. Supported: PDF, Markdown/MD, TXT, DOCX, PPTX, CSV, XLSX.`,
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

  const handleAddFocusArea = useCallback(() => {
    const normalized = normalizeFocusArea(focusDraft);
    if (!normalized) {
      return;
    }

    setNoteOptions((prev) => {
      if (prev.focusAreas.some((area) => normalizeFocusArea(area) === normalized) || prev.focusAreas.length >= MAX_FOCUS_AREAS) {
        return prev;
      }

      return {
        ...prev,
        focusAreas: [...prev.focusAreas, focusDraft.trim()],
      };
    });
    setFocusDraft("");
  }, [focusDraft]);

  const handleRemoveFocusArea = useCallback((label: string) => {
    setNoteOptions((prev) => ({
      ...prev,
      focusAreas: prev.focusAreas.filter((area) => area !== label),
    }));
  }, []);

  const handleAnnotationChange = useCallback((docId: string, value: string) => {
    setAnnotations((prev) => ({
      ...prev,
      [docId]: value,
    }));
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

    setAnnotations((prev) => {
      if (!(id in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });

    setQaMessages((prev) => {
      if (!(id in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });

    setStatus({ type: "idle", message: null });
  }, []);

  const handleImportFromUrl = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      if (event) {
        event.preventDefault();
      }

      const trimmed = urlInput.trim();
      if (trimmed.length < URL_INPUT_MIN_LENGTH) {
        setStatus({ type: "error", message: "Enter a full URL to import." });
        return;
      }

      setStatus({ type: "processing", message: "Fetching link contents..." });

      try {
        const response = await fetch("/api/notes/web", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });

        if (!response.ok) {
          const details = await safeParseError(response);
          setStatus({
            type: "error",
            message: details ?? "Unable to ingest that link. Ensure it is shared publicly.",
          });
          return;
        }

        const payload = (await response.json()) as {
          title?: string;
          content?: string;
        };

        const extracted = (payload.content ?? "").trim();
        if (!extracted) {
          setStatus({ type: "error", message: "No readable text was found at that link." });
          return;
        }

        const stats = computeStats(extracted);
        const document: IngestedDocument = {
          id: crypto.randomUUID(),
          name: payload.title?.trim() || trimmed,
          size: extracted.length,
          kind: "markdown",
          content: extracted,
          ...stats,
          createdAt: Date.now(),
          source: "url",
          url: trimmed,
        };

        setDocuments((prev) => [document, ...prev]);
        setSelectedId(document.id);
        setStatus({ type: "success", message: "Web page added to your notes." });
        setUrlInput("");
      } catch (error) {
        console.error("Failed to import URL", error);
        setStatus({ type: "error", message: "Unable to fetch that URL. Check the link and try again." });
      }
    },
    [urlInput],
  );

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
    const optionsSnapshot = cloneNoteOptions(noteOptions);
    const optionsPayload = buildOptionsPayload(noteOptions);

    if (!hasKey) {
      setSummaries((prev) => ({
        ...prev,
        [docId]: {
          ...(prev[docId] ?? {}),
          [summaryMode]: createSummaryDetails({
            status: "error",
            errorMessage: "Add your OpenRouter API key in Settings to generate summaries.",
            optionsSnapshot,
            model: defaultModel,
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
            optionsSnapshot,
            model: defaultModel,
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
          optionsSnapshot,
          model: defaultModel,
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
          options: optionsPayload,
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
              optionsSnapshot,
              model: defaultModel,
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
              const snapshot = existing.optionsSnapshot ?? optionsSnapshot;
              return {
                ...prev,
                [docId]: {
                  ...docSummaries,
                  [summaryMode]: {
                    ...existing,
                    status: "success",
                    errorMessage: null,
                    updatedAt: Date.now(),
                    optionsSnapshot: snapshot,
                    model: existing.model ?? defaultModel,
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
                const existing = docSummaries[summaryMode] ?? createSummaryDetails({
                  status: "pending",
                  optionsSnapshot,
                  model: defaultModel,
                });
                const snapshot = existing.optionsSnapshot ?? optionsSnapshot;
                const modelUsed = existing.model ?? defaultModel;
                return {
                  ...prev,
                  [docId]: {
                    ...docSummaries,
                    [summaryMode]: {
                      ...existing,
                      status: "pending",
                      errorMessage: null,
                      content: `${existing.content}${chunk}`,
                      optionsSnapshot: snapshot,
                      model: modelUsed,
                    },
                  },
                };
              });
            }

            if (json.choices?.[0]?.finish_reason) {
              setSummaries((prev) => {
                const docSummaries = prev[docId] ?? {};
                const existing = docSummaries[summaryMode] ?? createSummaryDetails();
                const snapshot = existing.optionsSnapshot ?? optionsSnapshot;
                return {
                  ...prev,
                  [docId]: {
                    ...docSummaries,
                    [summaryMode]: {
                      ...existing,
                      status: "success",
                      errorMessage: null,
                      updatedAt: Date.now(),
                      optionsSnapshot: snapshot,
                      model: existing.model ?? defaultModel,
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
        const snapshot = existing.optionsSnapshot ?? optionsSnapshot;
        return {
          ...prev,
          [docId]: {
            ...docSummaries,
            [summaryMode]: {
              ...existing,
              status: "success",
              errorMessage: null,
              updatedAt: Date.now(),
              optionsSnapshot: snapshot,
              model: existing.model ?? defaultModel,
            },
          },
        };
      });
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError";

      setSummaries((prev) => {
        const docSummaries = prev[docId] ?? {};
        const existing = docSummaries[summaryMode] ?? createSummaryDetails();
        const snapshot = existing.optionsSnapshot ?? optionsSnapshot;
        return {
          ...prev,
          [docId]: {
            ...docSummaries,
            [summaryMode]: {
              ...existing,
              status: isAbort ? "idle" : "error",
              errorMessage: isAbort ? "Summary canceled." : getErrorMessage(error),
              updatedAt: isAbort ? existing.updatedAt : Date.now(),
              optionsSnapshot: snapshot,
              model: existing.model ?? defaultModel,
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
  }, [defaultModel, hasKey, sanitizedKey, selectedDocument, summaryMode, noteOptions]);

  const handleCopySummary = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setSyncStatus({ type: "success", message: "Copied Markdown to clipboard." });
    } catch (error) {
      console.error("Failed to copy summary", error);
      setSyncStatus({ type: "error", message: "Copy failed. Try manually selecting the text." });
    }
  }, []);

  const handleDownloadSummary = useCallback((filename: string, content: string) => {
    try {
      downloadMarkdown(filename, content);
      setSyncStatus({ type: "success", message: "Markdown downloaded." });
    } catch (error) {
      console.error("Failed to download summary", error);
      setSyncStatus({ type: "error", message: "Download failed. Try again." });
    }
  }, []);

  const handleSyncToSupabase = useCallback(async () => {
    if (!supabase || !userId) {
      setSyncStatus({ type: "error", message: "Sign in to sync notes with Supabase." });
      return;
    }

    const document = selectedDocument;
    const summary = selectedId ? summaries[selectedId]?.[summaryMode] : undefined;

    if (!document || !summary?.content) {
      setSyncStatus({ type: "error", message: "Generate a summary first." });
      return;
    }

    setSyncStatus({ type: "processing", message: "Syncing with Supabase..." });

    try {
      const createdAtIso = new Date(document.createdAt).toISOString();
      const { error: docError } = await supabase.from("note_documents").upsert({
        id: document.id,
        user_id: userId,
        title: document.name,
        source_type: mapSupportedFileToSourceKind(document.kind),
        size_bytes: document.size,
        created_at: createdAtIso,
      });

      if (docError) {
        throw docError;
      }

      await supabase
        .from("note_summaries")
        .delete()
        .eq("document_id", document.id)
        .eq("summary_type", mapSummaryModeToSupabase(summaryMode));

      const { error: summaryError } = await supabase.from("note_summaries").insert({
        document_id: document.id,
        summary_type: mapSummaryModeToSupabase(summaryMode),
        content: {
          markdown: summary.content,
          mode: summaryMode,
          model: summary.model,
          options: summary.optionsSnapshot,
          synced_at: new Date().toISOString(),
        },
      });

      if (summaryError) {
        throw summaryError;
      }

      setSyncStatus({ type: "success", message: "Saved to Supabase." });
    } catch (error) {
      console.error("Failed to sync with Supabase", error);
      setSyncStatus({
        type: "error",
        message: "Sync failed. Check your Supabase quota and connection.",
      });
    }
  }, [selectedDocument, selectedId, summaries, supabase, summaryMode, userId]);

  const summaryDetails = selectedId ? summaries[selectedId]?.[summaryMode] : undefined;
  const generateLabel = getGenerateLabel(summaryMode);
  const pendingLabel = getPendingLabel(summaryMode);
  const idleHelper = hasKey
    ? getIdleHelper(summaryMode)
    : "Enter your OpenRouter API key in Settings to enable AI summaries, flashcards, and study tools.";
  const annotationValue = selectedDocument ? annotations[selectedDocument.id] ?? "" : "";
  const qaHistory = selectedDocument ? qaMessages[selectedDocument.id] ?? [] : [];
  const crossReferences = useMemo(
    () => computeCrossReferences(selectedDocument, documents),
    [selectedDocument, documents],
  );
  const progressStats = useMemo(() => computeProgressStats(documents, summaries), [documents, summaries]);

  const handleAskQuestion = useCallback(async () => {
    const document = selectedDocument;
    const question = qaInput.trim();

    if (!document || !question) {
      return;
    }

    if (!hasKey) {
      setQaStatus({ type: "error", message: "Add your OpenRouter key in Settings to ask questions." });
      return;
    }

    const docId = document.id;
    const assistantId = crypto.randomUUID();

    setQaMessages((prev) => {
      const history = prev[docId] ?? [];
      return {
        ...prev,
        [docId]: [
          ...history,
          { id: crypto.randomUUID(), role: "user", content: question },
          { id: assistantId, role: "assistant", content: "", status: "streaming" },
        ],
      };
    });

    setQaInput("");
    setQaStatus({ type: "processing", message: "Retrieving answer from your notes..." });

    qaAbortControllerRef.current?.abort();
    const controller = new AbortController();
    qaAbortControllerRef.current = controller;
    setQaStreamingId(assistantId);

    const chunks = selectRelevantChunks(document.content, question, noteOptions.focusAreas);

    try {
      const response = await fetch("/api/notes/qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openrouter-key": sanitizedKey,
        },
        body: JSON.stringify({
          question,
          chunks,
          model: defaultModel,
          documentTitle: document.name,
          options: buildOptionsPayload(noteOptions),
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const details = await safeParseError(response);
        throw new Error(details ?? "OpenRouter did not return an answer.");
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

          const payload = line.slice(5).trim();
          if (!payload) {
            continue;
          }

          if (payload === "[DONE]") {
            setQaMessages((prev) => {
              const history = prev[docId] ?? [];
              return {
                ...prev,
                [docId]: history.map((message) =>
                  message.id === assistantId
                    ? { ...message, status: undefined }
                    : message,
                ),
              };
            });
            setQaStatus({ type: "success", message: "Answer ready." });
            qaAbortControllerRef.current = null;
            setQaStreamingId(null);
            return;
          }

          try {
            const json = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
            };
            const contentChunk = json.choices?.[0]?.delta?.content ?? "";
            if (contentChunk) {
              setQaMessages((prev) => {
                const history = prev[docId] ?? [];
                return {
                  ...prev,
                  [docId]: history.map((message) =>
                    message.id === assistantId
                      ? {
                          ...message,
                          content: `${message.content}${contentChunk}`,
                        }
                      : message,
                  ),
                };
              });
            }

            if (json.choices?.[0]?.finish_reason) {
              setQaMessages((prev) => {
                const history = prev[docId] ?? [];
                return {
                  ...prev,
                  [docId]: history.map((message) =>
                    message.id === assistantId
                      ? { ...message, status: undefined }
                      : message,
                  ),
                };
              });
              setQaStatus({ type: "success", message: "Answer ready." });
              qaAbortControllerRef.current = null;
              setQaStreamingId(null);
              return;
            }
          } catch (error) {
            console.error("Failed to parse Q&A chunk", error);
          }
        }
      }

      setQaMessages((prev) => {
        const history = prev[docId] ?? [];
        return {
          ...prev,
          [docId]: history.map((message) =>
            message.id === assistantId ? { ...message, status: undefined } : message,
          ),
        };
      });
      setQaStatus({ type: "success", message: "Answer ready." });
      qaAbortControllerRef.current = null;
      setQaStreamingId(null);
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      console.error("Q&A failed", error);
      setQaStatus({
        type: isAbort ? "idle" : "error",
        message: isAbort ? "Question canceled." : getErrorMessage(error),
      });
      setQaMessages((prev) => {
        const history = prev[docId] ?? [];
        return {
          ...prev,
          [docId]: history.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  status: isAbort ? undefined : "error",
                  content: message.content || (isAbort ? "" : "Unable to answer."),
                }
              : message,
          ),
        };
      });
      qaAbortControllerRef.current = null;
      setQaStreamingId(null);
    }
  }, [defaultModel, hasKey, noteOptions, qaInput, sanitizedKey, selectedDocument]);

  const handleCancelQuestion = useCallback(() => {
    if (qaAbortControllerRef.current) {
      qaAbortControllerRef.current.abort();
    }
  }, []);

  const switchStudyMode = useCallback((mode: StudyMode) => {
    setStudyMode(mode);
    setStudySecondsRemaining(getDurationForMode(mode));
    setStudyRunning(false);
  }, []);

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
            <span>Supports PDF, Markdown, DOCX, PPTX, CSV, XLSX, and TXT up to 5MB each.</span>
            <input
              ref={inputRef}
              id="notes-upload"
              type="file"
              accept={FILE_INPUT_ACCEPT}
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
              <li>Flashcards, quizzes, and roadmaps work best with concise sections.</li>
            </ul>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-1 inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90"
            >
              Choose files
            </button>
            <form
              onSubmit={handleImportFromUrl}
              className="mt-2 flex flex-col gap-2 rounded-2xl border border-border/70 bg-background/70 p-3"
            >
              <label htmlFor="notes-url" className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
                Or import from URL
              </label>
              <input
                id="notes-url"
                type="url"
                placeholder="https://example.com/article"
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
                className="rounded-xl border border-border/60 bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full border border-border/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-foreground/70 transition hover:border-accent hover:text-foreground"
              >
                Fetch page
              </button>
            </form>
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
          <aside className="flex max-h-[calc(100vh-220px)] flex-col gap-4 overflow-y-auto pr-1 xl:sticky xl:top-32">
            <div className="rounded-3xl border border-border/70 bg-background/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Study stats</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <dt className="text-foreground/50">Documents</dt>
                  <dd className="text-sm font-semibold text-foreground">{progressStats.documents}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-foreground/50">Words ingested</dt>
                  <dd className="text-sm font-semibold text-foreground">{progressStats.totalWords.toLocaleString()}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-foreground/50">Notes generated</dt>
                  <dd className="text-sm font-semibold text-foreground">{progressStats.completedSummaries}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-foreground/50">Flashcards</dt>
                  <dd className="text-sm font-semibold text-foreground">{progressStats.flashcards}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-foreground/50">Quizzes</dt>
                  <dd className="text-sm font-semibold text-foreground">{progressStats.quiz}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-foreground/50">Roadmaps</dt>
                  <dd className="text-sm font-semibold text-foreground">{progressStats.roadmap}</dd>
                </div>
              </dl>
            </div>
            {sortedDocuments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/70 px-5 py-8 text-center text-sm text-foreground/60">
                No notes yet. Upload a PDF/MD/TXT, DOCX, PPTX, CSV/XLSX, or paste a public URL to get started.
              </div>
            ) : (
              sortedDocuments.map((document) => {
                const isActive = document.id === selectedId;
                return (
                  <div
                    key={document.id}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition duration-150 hover:-translate-y-0.5 hover:shadow-lg/15 ${
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
                            {document.source === "url" ? " · Link" : ""}
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
                      disabled={isSummarizing}
                    />
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50" htmlFor="notes-depth">
                        Depth level
                      </label>
                      <select
                        id="notes-depth"
                        value={noteOptions.depth}
                        onChange={(event) =>
                          setNoteOptions((prev) => ({
                            ...prev,
                            depth: event.target.value as NoteDepth,
                          }))
                        }
                        className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                      >
                        {DEPTH_OPTIONS.map((option) => (
                          <option value={option.id} key={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-foreground/50">
                        {DEPTH_OPTIONS.find((option) => option.id === noteOptions.depth)?.helper}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50" htmlFor="notes-length">
                        Length
                      </label>
                      <select
                        id="notes-length"
                        value={noteOptions.length}
                        onChange={(event) =>
                          setNoteOptions((prev) => ({
                            ...prev,
                            length: event.target.value as NoteLength,
                          }))
                        }
                        className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                      >
                        {LENGTH_OPTIONS.map((option) => (
                          <option value={option.id} key={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-foreground/50">
                        {LENGTH_OPTIONS.find((option) => option.id === noteOptions.length)?.helper}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50" htmlFor="notes-tone">
                        Tone
                      </label>
                      <select
                        id="notes-tone"
                        value={noteOptions.tone}
                        onChange={(event) =>
                          setNoteOptions((prev) => ({
                            ...prev,
                            tone: event.target.value as NoteTone,
                          }))
                        }
                        className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                      >
                        {TONE_OPTIONS.map((option) => (
                          <option value={option.id} key={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-foreground/50">
                        {TONE_OPTIONS.find((option) => option.id === noteOptions.tone)?.helper}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50" htmlFor="notes-template">
                        Template
                      </label>
                      <select
                        id="notes-template"
                        value={noteOptions.template}
                        onChange={(event) =>
                          setNoteOptions((prev) => ({
                            ...prev,
                            template: event.target.value as NoteTemplate,
                          }))
                        }
                        className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                      >
                        {TEMPLATE_OPTIONS.map((option) => (
                          <option value={option.id} key={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-foreground/50">
                        {TEMPLATE_OPTIONS.find((option) => option.id === noteOptions.template)?.helper}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">Focus areas (optional)</p>
                    <div className="flex flex-wrap gap-2">
                      {noteOptions.focusAreas.length === 0 ? (
                        <span className="rounded-full bg-foreground/5 px-3 py-1 text-[11px] text-foreground/50">
                          Add topics like &ldquo;runtime analysis&rdquo; or &ldquo;key proofs&rdquo;.
                        </span>
                      ) : null}
                      {noteOptions.focusAreas.map((area) => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => handleRemoveFocusArea(area)}
                          className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] font-semibold text-foreground/70 transition hover:border-red-400 hover:text-red-500"
                        >
                          <span>{area}</span>
                          <span aria-hidden className="rounded-full bg-foreground/10 px-1 text-[10px]">
                            ×
                          </span>
                          <span className="sr-only">Remove focus area</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={focusDraft}
                        onChange={(event) => setFocusDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddFocusArea();
                          }
                        }}
                        placeholder="Add a concept to emphasize"
                        className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddFocusArea}
                        className="inline-flex items-center justify-center rounded-full border border-border/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/70 transition hover:border-accent hover:text-foreground"
                      >
                        Add focus
                      </button>
                    </div>
                    <p className="text-[11px] text-foreground/50">
                      Up to {MAX_FOCUS_AREAS} focus tags. Click a tag to remove it.
                    </p>
                  </div>
                  <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-surface/70 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => summaryDetails?.content && handleCopySummary(summaryDetails.content)}
                          disabled={!summaryDetails?.content}
                          className={`inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                            summaryDetails?.content
                              ? "text-foreground/80 hover:border-accent hover:text-foreground"
                              : "cursor-not-allowed text-foreground/40"
                          }`}
                        >
                          Copy Markdown
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            summaryDetails?.content &&
                            handleDownloadSummary(`${selectedDocument.name.replace(/\W+/g, "-")}-${summaryMode}.md`, summaryDetails.content)
                          }
                          disabled={!summaryDetails?.content}
                          className={`inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                            summaryDetails?.content
                              ? "text-foreground/80 hover:border-accent hover:text-foreground"
                              : "cursor-not-allowed text-foreground/40"
                          }`}
                        >
                          Download .md
                        </button>
                        <button
                          type="button"
                          onClick={handleSyncToSupabase}
                          disabled={!summaryDetails?.content || !userId || syncStatus.type === "processing"}
                          className={`inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                            summaryDetails?.content && userId
                              ? "text-foreground/80 hover:border-accent hover:text-foreground"
                              : "cursor-not-allowed text-foreground/40"
                          }`}
                        >
                          {syncStatus.type === "processing" ? "Syncing…" : "Sync to Supabase"}
                        </button>
                      </div>
                      {syncStatus.message ? (
                        <p
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                            syncStatus.type === "success"
                              ? isDarkMode
                                ? "bg-emerald-900/30 text-emerald-200"
                                : "bg-emerald-100 text-emerald-700"
                              : syncStatus.type === "error"
                                ? isDarkMode
                                  ? "bg-red-900/30 text-red-200"
                                  : "bg-red-100 text-red-700"
                                : "bg-background/80 text-foreground/70"
                          }`}
                        >
                          {syncStatus.message}
                        </p>
                      ) : null}
                    </div>

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

                <section className="rounded-3xl border border-border/70 bg-background/80 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] sm:p-6">
                  <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Ask your notes</h3>
                      <p className="text-xs text-foreground/60">Run Q&A with retrieval grounded in the current document.</p>
                    </div>
                    {qaStatus.message ? (
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          qaStatus.type === "success"
                            ? isDarkMode
                              ? "bg-emerald-900/30 text-emerald-200"
                              : "bg-emerald-100 text-emerald-700"
                            : qaStatus.type === "error"
                              ? isDarkMode
                                ? "bg-red-900/30 text-red-200"
                                : "bg-red-100 text-red-700"
                              : "bg-background/80 text-foreground/70"
                        }`}
                      >
                        {qaStatus.message}
                      </span>
                    ) : null}
                  </header>

                  <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-border/60 bg-surface/70 p-4">
                    {qaHistory.length === 0 ? (
                      <p className="text-sm text-foreground/60">
                        Ask things like &ldquo;summarize section&nbsp;2&rdquo; or &ldquo;explain the theorem in simpler terms.&rdquo; Answers stream in real-time.
                      </p>
                    ) : (
                      qaHistory.map((message) => {
                        const isUser = message.role === "user";
                        const bubbleBase = `max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm`;
                        const bubbleClass = isUser
                          ? `${bubbleBase} bg-accent text-accent-foreground`
                          : `${bubbleBase} bg-background/90 text-foreground`;
                        return (
                          <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                            <div className={bubbleClass}>
                              {isUser ? (
                                <p>{message.content}</p>
                              ) : message.status === "error" ? (
                                <p className="text-sm text-red-500">{message.content || "Unable to answer."}</p>
                              ) : (
                                <ChatMarkdown content={message.content || ""} className="space-y-2 text-sm leading-relaxed" />
                              )}
                              {message.status === "streaming" ? (
                                <p className="mt-2 text-[10px] uppercase tracking-wide text-foreground/60">Streaming…</p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    <label htmlFor="qa-input" className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
                      Ask a question
                    </label>
                    <textarea
                      id="qa-input"
                      value={qaInput}
                      onChange={(event) => setQaInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          handleAskQuestion();
                        }
                      }}
                      placeholder="What concept needs clarification?"
                      className="min-h-[90px] rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] text-foreground/50">
                        Answer quality improves when you add focus tags above.
                      </p>
                      <div className="flex gap-2">
                        {qaStreamingId ? (
                          <button
                            type="button"
                            onClick={handleCancelQuestion}
                            className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-foreground/10"
                          >
                            Stop
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleAskQuestion}
                            disabled={!qaInput.trim() || !hasKey}
                            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                              qaInput.trim() && hasKey
                                ? "bg-accent text-accent-foreground hover:bg-accent/90"
                                : "cursor-not-allowed bg-border text-foreground/40"
                            }`}
                          >
                            Ask
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-border/70 bg-background/80 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] sm:p-6">
                  <header className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Personal annotations</h3>
                      <p className="text-xs text-foreground/60">Notes stay on this device and sync when you choose.</p>
                    </div>
                    <span className="text-[11px] uppercase tracking-wide text-foreground/50">Autosaves</span>
                  </header>
                  <textarea
                    value={annotationValue}
                    onChange={(event) => handleAnnotationChange(selectedDocument.id, event.target.value)}
                    placeholder="Capture takeaways, study reminders, or highlight confusing steps."
                    className="mt-4 min-h-[140px] rounded-2xl border border-border/60 bg-background px-3 py-3 text-sm leading-relaxed text-foreground focus:border-accent focus:outline-none"
                  />
                </section>

                <section className="rounded-3xl border border-border/70 bg-background/80 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] sm:p-6">
                  <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Cross references</h3>
                      <p className="text-xs text-foreground/60">Other notes that cover similar ideas.</p>
                    </div>
                    <span className="text-[11px] uppercase tracking-wide text-foreground/50">{crossReferences.length} match{crossReferences.length === 1 ? "" : "es"}</span>
                  </header>
                  <div className="mt-4 space-y-3">
                    {crossReferences.length === 0 ? (
                      <p className="text-sm text-foreground/60">Add more documents to surface overlaps and study links.</p>
                    ) : (
                      crossReferences.map((reference) => (
                        <button
                          key={reference.id}
                          type="button"
                          onClick={() => setSelectedId(reference.id)}
                          className="w-full rounded-2xl border border-border/60 bg-surface/60 p-4 text-left transition hover:border-accent/50 hover:bg-surface/80"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-foreground">{reference.title}</p>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">{Math.round(reference.similarity * 100)}% match</span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs text-foreground/60">{reference.excerpt}</p>
                        </button>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-border/70 bg-background/80 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] sm:p-6">
                  <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Study timer</h3>
                      <p className="text-xs text-foreground/60">Alternate focus and breaks with a Pomodoro cadence.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/60 px-4 py-1 text-[11px] uppercase tracking-wide text-foreground/60">
                      <span>{studyMode === "focus" ? "Focus" : studyMode === "shortBreak" ? "Short break" : "Long break"}</span>
                    </div>
                  </header>
                  <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-5xl font-semibold tabular-nums text-foreground">
                        {formatDuration(studySecondsRemaining)}
                      </p>
                      <p className="text-xs text-foreground/60">{studyRunning ? "Counting down" : "Paused"}</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStudySecondsRemaining((prev) => (prev === 0 ? getDurationForMode(studyMode) : prev));
                          setStudyRunning((prev) => !prev);
                        }}
                        className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                          studyRunning
                            ? "border border-border/70 text-foreground hover:bg-foreground/10"
                            : "bg-accent text-accent-foreground hover:bg-accent/90"
                        }`}
                      >
                        {studyRunning ? "Pause" : "Start"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStudyRunning(false);
                          setStudySecondsRemaining(getDurationForMode(studyMode));
                        }}
                        className="rounded-full border border-border/70 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/70 transition hover:border-accent hover:text-foreground"
                      >
                        Reset
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => switchStudyMode("focus")}
                          className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-wide transition ${
                            studyMode === "focus"
                              ? "bg-foreground text-background"
                              : "border border-border/70 text-foreground/70 hover:border-accent hover:text-foreground"
                          }`}
                        >
                          Focus
                        </button>
                        <button
                          type="button"
                          onClick={() => switchStudyMode("shortBreak")}
                          className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-wide transition ${
                            studyMode === "shortBreak"
                              ? "bg-foreground text-background"
                              : "border border-border/70 text-foreground/70 hover:border-accent hover:text-foreground"
                          }`}
                        >
                          Short break
                        </button>
                        <button
                          type="button"
                          onClick={() => switchStudyMode("longBreak")}
                          className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-wide transition ${
                            studyMode === "longBreak"
                              ? "bg-foreground text-background"
                              : "border border-border/70 text-foreground/70 hover:border-accent hover:text-foreground"
                          }`}
                        >
                          Long break
                        </button>
                      </div>
                    </div>
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

function normalizeFocusArea(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/\s+/g, " ").toLowerCase();
}

function dedupeFocusAreas(focusAreas: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const area of focusAreas) {
    const normalized = normalizeFocusArea(area);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(area.trim());
    }
  }

  return result.slice(0, MAX_FOCUS_AREAS);
}

function cloneNoteOptions(options: NoteOptions): NoteOptions {
  return {
    ...options,
    focusAreas: [...options.focusAreas],
  };
}

function buildOptionsPayload(options: NoteOptions) {
  return {
    depth: options.depth,
    length: options.length,
    tone: options.tone,
    template: options.template,
    focusAreas: options.focusAreas,
  };
}

function mapSupportedFileToSourceKind(kind: SupportedFile): "pdf" | "markdown" | "text" {
  switch (kind) {
    case "pdf":
      return "pdf";
    case "text":
      return "text";
    default:
      return "markdown";
  }
}

function mapSummaryModeToSupabase(mode: SummaryMode): "concise" | "outline" | "flashcards" {
  switch (mode) {
    case "outline":
      return "outline";
    case "flashcards":
      return "flashcards";
    default:
      return "concise";
  }
}

function selectRelevantChunks(content: string, question: string, focusAreas: string[]) {
  const chunks = chunkContent(content);
  if (chunks.length <= 3) {
    return chunks;
  }

  const keywords = new Set(
    [
      ...question
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((word) => word.length > 3),
      ...focusAreas.map((area) => normalizeFocusArea(area) ?? ""),
    ].filter(Boolean),
  );

  const scored = chunks.map((chunk, index) => {
    const lowered = chunk.toLowerCase();
    let score = 0;
    keywords.forEach((keyword) => {
      if (lowered.includes(keyword)) {
        score += 1;
      }
    });
    return { chunk, score, index };
  });

  scored.sort((a, b) => {
    if (b.score === a.score) {
      return a.index - b.index;
    }
    return b.score - a.score;
  });

  const filtered = scored.filter((entry) => entry.score > 0).slice(0, 3);
  if (filtered.length > 0) {
    return filtered.map((entry) => entry.chunk);
  }

  return scored.slice(0, 3).map((entry) => entry.chunk);
}

function computeCrossReferences(selected: IngestedDocument | null, documents: IngestedDocument[]): CrossReference[] {
  if (!selected) {
    return [];
  }

  const baseTerms = new Set(extractKeywords(selected.content));
  if (baseTerms.size === 0) {
    return [];
  }

  const references = documents
    .filter((doc) => doc.id !== selected.id)
    .map((doc) => {
      const docTerms = new Set(extractKeywords(doc.content));
      if (docTerms.size === 0) {
        return null;
      }
      let overlap = 0;
      for (const term of docTerms) {
        if (baseTerms.has(term)) {
          overlap += 1;
        }
      }
      const similarity = overlap / baseTerms.size;
      return {
        id: doc.id,
        title: doc.name,
        similarity,
        excerpt: doc.content.slice(0, 220).replace(/\s+/g, " "),
      } satisfies CrossReference;
    })
    .filter((reference): reference is CrossReference => reference !== null && reference.similarity > 0.02)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  return references;
}

function extractKeywords(content: string) {
  return content
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((word) => word.length > 3);
}

function computeProgressStats(documents: IngestedDocument[], summaries: SummaryMap): ProgressStats {
  const stats: ProgressStats = {
    documents: documents.length,
    totalWords: documents.reduce((total, doc) => total + doc.wordCount, 0),
    completedSummaries: 0,
    flashcards: 0,
    quiz: 0,
    roadmap: 0,
  };

  for (const doc of documents) {
    const docSummaries = summaries[doc.id];
    if (!docSummaries) {
      continue;
    }
    for (const [mode, details] of Object.entries(docSummaries) as Array<[SummaryMode, SummaryDetails]>) {
      if (details.status === "success" && details.content) {
        stats.completedSummaries += 1;
        if (mode === "flashcards") {
          stats.flashcards += 1;
        }
        if (mode === "quiz") {
          stats.quiz += 1;
        }
        if (mode === "roadmap") {
          stats.roadmap += 1;
        }
      }
    }
  }

  return stats;
}

function getGenerateLabel(mode: SummaryMode) {
  switch (mode) {
    case "academic":
      return "Generate academic summary";
    case "bullets":
      return "Generate bullet notes";
    case "outline":
      return "Generate outline";
    case "mindmap":
      return "Generate mind map";
    case "qa":
      return "Generate Q&A";
    case "comparison":
      return "Generate comparison";
    case "flashcards":
      return "Generate flashcards";
    case "roadmap":
      return "Generate study roadmap";
    case "quiz":
      return "Generate quiz";
    default:
      return "Generate summary";
  }
}

function getPendingLabel(mode: SummaryMode) {
  switch (mode) {
    case "academic":
      return "Drafting academic summary…";
    case "bullets":
      return "Listing bullet highlights…";
    case "outline":
      return "Structuring outline…";
    case "mindmap":
      return "Mapping relationships…";
    case "qa":
      return "Generating question bank…";
    case "comparison":
      return "Comparing concepts…";
    case "flashcards":
      return "Building spaced repetition cards…";
    case "roadmap":
      return "Planning study roadmap…";
    case "quiz":
      return "Writing quiz prompts…";
    default:
      return "Working on it…";
  }
}

function getIdleHelper(mode: SummaryMode) {
  switch (mode) {
    case "flashcards":
      return "Generate flashcards to drill yourself with six quick prompts.";
    case "quiz":
      return "Generate a mixed-format quiz to test your understanding.";
    case "roadmap":
      return "Build a study roadmap with time estimates and milestones.";
    case "comparison":
      return "Compare similar concepts side-by-side for faster revision.";
    case "mindmap":
      return "Visualize relationships in a mind map formatted as nested bullets.";
    case "qa":
      return "Create exam-style Q&A pairs tailored to this document.";
    case "outline":
      return "Generate a structured outline with headings and subpoints.";
    case "bullets":
      return "Produce an actionable bullet summary for quick review.";
    case "academic":
    default:
      return "Generate a polished academic summary with citations and keywords.";
  }
}

function downloadMarkdown(filename: string, content: string) {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "notes.md";
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

async function safeParseError(response: Response) {
  try {
    const data = await response.clone().json();
    if (data && typeof data === "object") {
      if (typeof data.error === "string") {
        return data.error;
      }
      if (typeof data.message === "string") {
        return data.message;
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

function getDurationForMode(mode: StudyMode) {
  switch (mode) {
    case "focus":
      return 25 * 60;
    case "shortBreak":
      return 5 * 60;
    case "longBreak":
      return 15 * 60;
    default:
      return 25 * 60;
  }
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.max(totalSeconds % 60, 0)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}
