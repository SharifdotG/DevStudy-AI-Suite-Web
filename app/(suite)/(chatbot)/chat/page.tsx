"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Lineicons } from "@lineiconshq/react-lineicons";
import {
  PlusOutlined,
  ClipboardOutlined,
  RefreshCircle1ClockwiseOutlined,
  ChevronDownOutlined,
  EnterOutlined,
  Comment1Outlined,
  CheckCircle1Outlined,
  Pencil1Outlined,
  Trash3Outlined,
  XmarkCircleOutlined,
} from "@lineiconshq/free-icons";
import { ChatMarkdown } from "../../../_components/chat-markdown";
import { DEFAULT_MODEL, useSettings, type ModelOption } from "../../../_components/settings-context";
import { useTheme } from "../../../_components/theme-provider";
import { useSupabase } from "../../../_components/supabase-provider";
import type { ChatSessionRow, Database } from "@/lib/supabase/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status?: "streaming" | "error";
};

type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  usage?: SessionUsage;
};

type SessionUsage = {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
};

const SESSION_STORAGE_KEY_PREFIX = "devstudy-chat-sessions";

function getSessionStorageKey(userId: string | null): string {
  return userId ? `${SESSION_STORAGE_KEY_PREFIX}:${userId}` : SESSION_STORAGE_KEY_PREFIX;
}
type ChatSessionInsert = Database["public"]["Tables"]["chat_sessions"]["Insert"];

function parseMessages(json: unknown): ChatMessage[] {
  if (!json || !Array.isArray(json)) {
    return [];
  }

  const mapped = json
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const candidate = entry as Partial<ChatMessage>;
      if (!candidate.id || !candidate.role) {
        return null;
      }

      if (candidate.content === undefined || candidate.content === null) {
        return null;
      }

      const parsed: ChatMessage = {
        id: String(candidate.id),
        role:
          candidate.role === "assistant"
            ? "assistant"
            : candidate.role === "system"
              ? "system"
              : "user",
        content: String(candidate.content),
      };

      if (candidate.status === "streaming" || candidate.status === "error") {
        parsed.status = candidate.status;
      }

      return parsed;
    })
    .filter((message): message is ChatMessage => message !== null);

  return mapped;
}

function mapRowToSession(row: ChatSessionRow): ChatSession {
  return {
    id: row.id,
    title: row.title,
    messages: parseMessages(row.messages),
    updatedAt: new Date(row.updated_at ?? Date.now()).getTime(),
    usage:
      row.usage_total_tokens !== null ||
      row.usage_prompt_tokens !== null ||
      row.usage_completion_tokens !== null ||
      row.usage_cost !== null
        ? {
            totalTokens: toSafeNumber(row.usage_total_tokens),
            promptTokens: toSafeNumber(row.usage_prompt_tokens),
            completionTokens: toSafeNumber(row.usage_completion_tokens),
            cost: toSafeNumber(row.usage_cost),
          }
        : undefined,
  } satisfies ChatSession;
}

function mapSessionToInsert(session: ChatSession, userId: string): ChatSessionInsert {
  return {
    id: session.id,
    user_id: userId,
    title: session.title,
    messages: session.messages,
    updated_at: new Date(session.updatedAt).toISOString(),
    usage_total_tokens: session.usage?.totalTokens ?? null,
    usage_prompt_tokens: session.usage?.promptTokens ?? null,
    usage_completion_tokens: session.usage?.completionTokens ?? null,
    usage_cost: session.usage?.cost ?? null,
  } satisfies ChatSessionInsert;
}

function createEmptySession(): ChatSession {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    updatedAt: Date.now(),
    usage: undefined,
  };
}

function deriveSessionTitle(text: string): string {
  const singleLine = text.split("\n")[0]?.trim() ?? "";
  if (!singleLine) {
    return "New chat";
  }

  if (singleLine.length <= 48) {
    return singleLine;
  }

  return `${singleLine.slice(0, 45)}…`;
}

function toSafeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringifyLimited(value: unknown, maxLength = 400): string | null {
  try {
    const serialized = JSON.stringify(value);
    if (!serialized) {
      return null;
    }

    return serialized.length <= maxLength ? serialized : `${serialized.slice(0, maxLength - 3)}...`;
  } catch {
    return null;
  }
}

function extractReadableError(value: unknown, depth = 0): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (depth >= 4) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractReadableError(item, depth + 1);
      if (nested) {
        return nested;
      }
    }

    return null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = ["message", "error", "detail", "details", "reason", "cause", "status", "code"];
    for (const key of keys) {
      if (key in record) {
        const nested = extractReadableError(record[key], depth + 1);
        if (nested) {
          return nested;
        }
      }
    }

    return stringifyLimited(record);
  }

  return null;
}

function deriveOpenRouterErrorMessage(fallback: unknown, statusCode: number): string {
  const readable = extractReadableError(fallback);
  if (readable) {
    return `OpenRouter error (HTTP ${statusCode}): ${readable}`;
  }

  return `OpenRouter returned an error response (HTTP ${statusCode}).`;
}

function normalizeDeltaContent(value: unknown, depth = 0): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (!value || depth > 4) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeDeltaContent(item, depth + 1)).join("");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.text !== undefined) {
      const text = normalizeDeltaContent(record.text, depth + 1);
      if (text) {
        return text;
      }
    }

    if (record.content !== undefined) {
      const nested = normalizeDeltaContent(record.content, depth + 1);
      if (nested) {
        return nested;
      }
    }

    if (record.value !== undefined) {
      const valueText = normalizeDeltaContent(record.value, depth + 1);
      if (valueText) {
        return valueText;
      }
    }

    let aggregated = "";
    for (const key of Object.keys(record)) {
      if (key === "type" || key === "role" || key === "reasoning" || key === "reasoning_details") {
        continue;
      }

      aggregated += normalizeDeltaContent(record[key], depth + 1);
    }

    return aggregated;
  }

  return "";
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const delta = Math.max(0, now - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (delta < minute) {
    return "moments ago";
  }
  if (delta < hour) {
    const minutes = Math.floor(delta / minute);
    return `${minutes} min ago`;
  }
  if (delta < day) {
    const hours = Math.floor(delta / hour);
    return `${hours} hr ago`;
  }

  const days = Math.floor(delta / day);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function logSupabaseError(label: string, error: unknown) {
  const readable = extractReadableError(error);
  if (readable) {
    console.error(`${label}: ${readable}`, error);
  } else {
    console.error(label, error);
  }
}

export default function ChatbotPage() {
  const {
    apiKey,
    defaultModel,
    setDefaultModel,
    modelGroups,
    modelOptions,
    modelsLoading,
    modelsError,
    refreshModels,
  } = useSettings();
  const { supabase, session: authSession } = useSupabase();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const authUserId = authSession?.user?.id ?? null;
  const storageKey = useMemo(() => getSessionStorageKey(authUserId), [authUserId]);
  const sanitizedKey = apiKey.trim();
  const hasKey = sanitizedKey.length > 0;
  const activeModel = defaultModel || DEFAULT_MODEL;
  const activeModelOption = useMemo<ModelOption>(() => {
    if (!modelOptions.length) {
      return {
        id: activeModel,
        label: activeModel,
        description: "Model selected while the catalog is unavailable.",
      };
    }

    return modelOptions.find((option) => option.id === activeModel) ?? modelOptions[0]!;
  }, [activeModel, modelOptions]);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const sessionsRef = useRef<ChatSession[]>([]);
  const lastStreamSessionIdRef = useRef<string | null>(null);
  const setSessionsWithRef = useCallback(
    (updater: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => {
      if (typeof updater === "function") {
        setSessions((prev) => {
          const next = (updater as (prev: ChatSession[]) => ChatSession[])(prev);
          sessionsRef.current = next;
          return next;
        });
      } else {
        sessionsRef.current = updater;
        setSessions(updater);
      }
    },
    [],
  );
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    persistQueueRef.current = Promise.resolve();
  }, [authUserId]);

  const persistSession = useCallback(
    (sessionToPersist: ChatSession) => {
      if (!authUserId) {
        return Promise.resolve();
      }

      const payload = mapSessionToInsert(sessionToPersist, authUserId);

      const run = async () => {
        const { error } = await supabase
          .from("chat_sessions")
          .upsert(payload, { onConflict: "id" });

        if (error) {
          logSupabaseError("Failed to persist chat session", error);
        }
      };

      persistQueueRef.current = persistQueueRef.current
        .catch(() => undefined)
        .then(() => run());

      return persistQueueRef.current;
    },
    [authUserId, supabase],
  );

  const persistSessionSnapshot = useCallback(
    async (sessionId: string, candidate?: ChatSession | null) => {
      const snapshot =
        candidate ??
        sessionsRef.current.find((session) => session.id === sessionId) ??
        null;

      if (!snapshot) {
        return;
      }

      await persistSession(snapshot);
    },
    [persistSession],
  );

  const deleteSessionFromSupabase = useCallback(
    async (sessionId: string) => {
      if (!authUserId) {
        return;
      }

      const { error } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", authUserId);

      if (error) {
        logSupabaseError("Failed to delete chat session", error);
      }
    },
    [authUserId, supabase],
  );

  useEffect(() => {
    let cancelled = false;

    const applyLocalSessions = () => {
      if (typeof window === "undefined") {
        return false;
      }

      try {
        const stored = window.localStorage.getItem(storageKey);
        if (!stored) {
          return false;
        }

        const parsed = JSON.parse(stored) as {
          sessions?: ChatSession[];
          activeSessionId?: string;
        } | null;

        if (!parsed?.sessions || parsed.sessions.length === 0) {
          return false;
        }

        if (cancelled) {
          return true;
        }

  setSessionsWithRef(parsed.sessions);
        setActiveSessionId(
          parsed.activeSessionId && parsed.sessions.some((session) => session.id === parsed.activeSessionId)
            ? parsed.activeSessionId
            : parsed.sessions[0]!.id,
        );
        return true;
      } catch (error) {
        console.error("Failed to restore chat sessions from local storage", error);
        return false;
      }
    };

    async function restoreSessions() {
      if (typeof window === "undefined") {
        return;
      }

      if (authUserId) {
        try {
          const { data, error } = await supabase
            .from("chat_sessions")
            .select("*")
            .eq("user_id", authUserId)
            .order("updated_at", { ascending: false })
            .returns<ChatSessionRow[]>();

          if (cancelled) {
            return;
          }

          if (error) {
            console.error("Failed to load chat sessions from Supabase", error);
            logSupabaseError("Failed to load chat sessions from Supabase", error);
            if (!applyLocalSessions() && !cancelled) {
              setSessionsWithRef([]);
              setActiveSessionId("");
            }
            setHasHydrated(true);
            return;
          }

          const mapped = (data ?? []).map((row) => mapRowToSession(row));
          setSessionsWithRef(mapped);
          setActiveSessionId((currentId) => {
            if (mapped.length === 0) {
              return "";
            }

            if (currentId && mapped.some((session) => session.id === currentId)) {
              return currentId;
            }

            return mapped[0]!.id;
          });
          setHasHydrated(true);
          return;
        } catch (error) {
          if (!cancelled) {
            logSupabaseError("Unexpected error while syncing sessions", error);
            if (!applyLocalSessions()) {
              setSessionsWithRef([]);
              setActiveSessionId("");
            }
            setHasHydrated(true);
          }
          return;
        }
      }

      if (!applyLocalSessions() && !cancelled) {
  setSessionsWithRef([]);
        setActiveSessionId("");
      }
      if (!cancelled) {
        setHasHydrated(true);
      }
    }

    restoreSessions();

    return () => {
      cancelled = true;
    };
  }, [authUserId, setSessionsWithRef, storageKey, supabase]);

  useEffect(() => {
    if (!hasHydrated || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ sessions, activeSessionId }),
      );
    } catch (error) {
      console.error("Failed to persist chat sessions", error);
      logSupabaseError("Failed to persist chat sessions", error);
    }
  }, [sessions, activeSessionId, hasHydrated, storageKey]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );
  const messages = useMemo(() => activeSession?.messages ?? [], [activeSession]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [messages, activeSessionId]);

  useEffect(() => {
    if (isStreaming) {
      return;
    }

    const sessionId = lastStreamSessionIdRef.current;
    if (!sessionId) {
      return;
    }

    lastStreamSessionIdRef.current = null;
    void persistSessionSnapshot(sessionId);
  }, [isStreaming, persistSessionSnapshot]);

  useEffect(() => {
    if (!modelMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!modelMenuRef.current) {
        return;
      }

      if (!modelMenuRef.current.contains(event.target as Node)) {
        setModelMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [modelMenuOpen]);

  const updateSessionById = useCallback(
    (sessionId: string, updater: (session: ChatSession) => ChatSession, options?: { persist?: boolean }) => {
      let updatedSession: ChatSession | null = null;

      setSessionsWithRef((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId) {
            return session;
          }

          const next = { ...updater({ ...session, messages: [...session.messages] }), updatedAt: Date.now() };
          updatedSession = next;
          return next;
        }),
      );

      if (options?.persist ?? true) {
        void persistSessionSnapshot(sessionId, updatedSession);
      }

      return updatedSession;
    },
    [persistSessionSnapshot, setSessionsWithRef],
  );

  const updateActiveSession = useCallback(
    (updater: (session: ChatSession) => ChatSession, options?: { persist?: boolean }) => {
      if (!activeSessionId) {
        return;
      }

      updateSessionById(activeSessionId, updater, options);
    },
    [activeSessionId, updateSessionById],
  );

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessions]);

  const handlePromptKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.nativeEvent.isComposing
      ) {
        return;
      }

      event.preventDefault();
      const currentValue = event.currentTarget.value;
      if (!hasKey || isStreaming || !currentValue.trim()) {
        return;
      }

      event.currentTarget.form?.requestSubmit();
    },
    [hasKey, isStreaming],
  );

  async function streamAssistantResponse(
    sessionId: string,
    requestMessages: ChatMessage[],
    assistantMessageId: string,
    modelId: string,
  ) {
    if (!sessionId) {
      setIsStreaming(false);
      return;
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openrouter-key": sanitizedKey,
        },
        body: JSON.stringify({
          model: modelId,
          messages: requestMessages
            .filter((message) => message.role === "user" || message.role === "assistant")
            .map((message) => ({ role: message.role, content: message.content })),
          usage: {
            include: true,
          },
        }),
      });

      if (!response.body) {
        throw new Error("Stream response missing body.");
      }

      if (!response.ok) {
        let fallback: unknown = null;
        try {
          fallback = await response.clone().json();
        } catch {
          try {
            fallback = await response.clone().text();
          } catch {
            fallback = null;
          }
        }

        const message = deriveOpenRouterErrorMessage(fallback, response.status);
        console.error("OpenRouter chat request failed", { status: response.status, fallback });
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let usageRecorded = false;

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
            const finalSession = updateSessionById(
              sessionId,
              (session) => ({
                ...session,
                messages: session.messages.map((message) =>
                  message.id === assistantMessageId ? { ...message, status: undefined } : message,
                ),
              }),
              { persist: false },
            );

            await persistSessionSnapshot(sessionId, finalSession);
            return;
          }

          try {
            const json = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
              usage?: {
                total_tokens?: number;
                prompt_tokens?: number;
                completion_tokens?: number;
                cost?: number | string;
              };
            };
            if (json.usage && !usageRecorded) {
              const addition = {
                totalTokens: toSafeNumber(json.usage.total_tokens),
                promptTokens: toSafeNumber(json.usage.prompt_tokens),
                completionTokens: toSafeNumber(json.usage.completion_tokens),
                cost: toSafeNumber(json.usage.cost),
              };

              updateSessionById(sessionId, (session) => {
                const existing = session.usage ?? {
                  totalTokens: 0,
                  promptTokens: 0,
                  completionTokens: 0,
                  cost: 0,
                };

                return {
                  ...session,
                  usage: {
                    totalTokens: existing.totalTokens + addition.totalTokens,
                    promptTokens: existing.promptTokens + addition.promptTokens,
                    completionTokens: existing.completionTokens + addition.completionTokens,
                    cost: existing.cost + addition.cost,
                  },
                };
              });

              usageRecorded = true;
            }

            const delta = json.choices?.[0]?.delta ?? {};
            const deltaContent =
              (delta as { content?: unknown; text?: unknown }).content ??
              (delta as { text?: unknown }).text ??
              null;
            let chunkText = normalizeDeltaContent(deltaContent);
            if (!chunkText) {
              chunkText = normalizeDeltaContent(delta);
            }
            if (chunkText) {
              updateSessionById(
                sessionId,
                (session) => ({
                  ...session,
                  messages: session.messages.map((message) =>
                    message.id === assistantMessageId
                      ? { ...message, content: message.content + chunkText }
                      : message,
                  ),
                }),
                { persist: false },
              );
            }

            if (json.choices?.[0]?.finish_reason) {
              const finalSession = updateSessionById(
                sessionId,
                (session) => ({
                  ...session,
                  messages: session.messages.map((message) =>
                    message.id === assistantMessageId
                      ? { ...message, status: undefined }
                      : message,
                  ),
                }),
                { persist: false },
              );

              await persistSessionSnapshot(sessionId, finalSession);
              return;
            }
          } catch (error) {
            console.error("Failed to parse stream chunk", error);
          }
        }
      }

      const finalSession = updateSessionById(
        sessionId,
        (session) => ({
          ...session,
          messages: session.messages.map((message) =>
            message.id === assistantMessageId ? { ...message, status: undefined } : message,
          ),
        }),
        { persist: false },
      );

      await persistSessionSnapshot(sessionId, finalSession);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unexpected error while streaming response.";
      setRequestError(errorMessage);
      const erroredSession = updateSessionById(
        sessionId,
        (session) => ({
          ...session,
          messages: session.messages.map((message) =>
            message.id === assistantMessageId
              ? { ...message, status: "error", content: errorMessage }
              : message,
          ),
        }),
        { persist: false },
      );

      await persistSessionSnapshot(sessionId, erroredSession);
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasKey || !input.trim() || isStreaming) {
      return;
    }

    const trimmedInput = input.trim();
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedInput,
    };

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      status: "streaming",
    };

    const requestConversation = [...messages, userMessage];
    let targetSessionId = activeSession?.id ?? "";

    if (!activeSession) {
      const baseSession = createEmptySession();
      const newSession: ChatSession = {
        ...baseSession,
        title: deriveSessionTitle(trimmedInput),
        messages: [userMessage, assistantMessage],
        updatedAt: Date.now(),
      };

      targetSessionId = newSession.id;
  setSessionsWithRef((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      void persistSession(newSession);
    } else {
      targetSessionId = activeSession.id;
      const nextSession: ChatSession = {
        ...activeSession,
        title: activeSession.messages.length === 0 ? deriveSessionTitle(trimmedInput) : activeSession.title,
        messages: [...activeSession.messages, userMessage, assistantMessage],
        updatedAt: Date.now(),
      };

      updateSessionById(activeSession.id, () => nextSession, { persist: false });
      void persistSession(nextSession);
    }

    setInput("");
    setRequestError(null);
    setCopiedMessageId(null);
    setIsStreaming(true);
    lastStreamSessionIdRef.current = targetSessionId;

    await streamAssistantResponse(targetSessionId, requestConversation, assistantMessage.id, activeModel);
  }

  async function handleRegenerate(assistantId: string) {
    if (isStreaming || !activeSession) {
      return;
    }

    const assistantIndex = messages.findIndex((message) => message.id === assistantId);
    if (assistantIndex === -1 || assistantIndex !== messages.length - 1) {
      return;
    }

    const conversationBeforeAssistant = messages.slice(0, assistantIndex);
    const lastMessage = conversationBeforeAssistant.at(-1);
    if (!lastMessage || lastMessage.role !== "user") {
      return;
    }

    const newAssistant: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      status: "streaming",
    };

    const nextSession: ChatSession = {
      ...activeSession,
      messages: [...activeSession.messages.slice(0, assistantIndex), newAssistant],
      updatedAt: Date.now(),
    };

    updateActiveSession(() => nextSession, { persist: false });
    void persistSession(nextSession);

    setRequestError(null);
    setCopiedMessageId(null);
    setIsStreaming(true);
    lastStreamSessionIdRef.current = activeSession.id;

    await streamAssistantResponse(activeSession.id, conversationBeforeAssistant, newAssistant.id, activeModel);
  }

  async function handleCopyResponse(assistantId: string, content: string) {
    if (!content.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(assistantId);
      window.setTimeout(() => {
        setCopiedMessageId((current) => (current === assistantId ? null : current));
      }, 2000);
    } catch (error) {
      console.error("Failed to copy response", error);
    }
  }

  function handleCreateSession() {
    if (isStreaming) {
      return;
    }

    setActiveSessionId("");
    setInput("");
    setRequestError(null);
    setCopiedMessageId(null);
  }

  function handleSelectSession(sessionId: string) {
    if (sessionId === activeSessionId || (isStreaming && sessionId !== activeSessionId)) {
      return;
    }

    setActiveSessionId(sessionId);
    setInput("");
    setRequestError(null);
    setCopiedMessageId(null);
  }

  function handleDeleteSession(sessionId: string) {
    if (isStreaming) {
      return;
    }

    setSessionsWithRef((prev) => {
      const remaining = prev.filter((session) => session.id !== sessionId);
      if (remaining.length === 0) {
        setActiveSessionId("");
        setRequestError(null);
        setCopiedMessageId(null);
        setInput("");
        return [];
      }

      if (sessionId === activeSessionId) {
        setActiveSessionId(remaining[0]!.id);
        setRequestError(null);
        setCopiedMessageId(null);
        setInput("");
      }

      return remaining;
    });

    void deleteSessionFromSupabase(sessionId);
  }

  function handleRenameSession(sessionId: string) {
    if (isStreaming) {
      return;
    }

    const target = sessions.find((session) => session.id === sessionId);
    if (!target) {
      return;
    }

    const nextTitle = window.prompt("Rename chat", target.title);
    if (nextTitle === null) {
      return;
    }

    const trimmed = nextTitle.trim();
    if (!trimmed || trimmed === target.title) {
      return;
    }

    updateSessionById(sessionId, (session) => ({
      ...session,
      title: trimmed,
    }));
  }

  const latestStatus = requestError ?? (isStreaming ? "Streaming response..." : null);
  return (
    <section className="flex min-h-screen flex-1 flex-col gap-6">
      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/40 via-indigo-500/30 to-purple-500/40 p-6 text-white shadow-[0_18px_44px_rgba(56,116,203,0.35)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(255,255,255,0.22),transparent),radial-gradient(120%_140%_at_100%_0%,rgba(32,213,236,0.18),transparent)] mix-blend-screen" />
            <div className="relative space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-white/70">DevStudy Chatbot</p>
              <h1 className="text-xl font-semibold leading-snug">
                Stream answers, compare models, and move fast on assignments without leaving the suite.
              </h1>
              <p className="text-sm text-white/75">
                Bring your own OpenRouter key, queue multiple sessions, and copy Markdown-friendly responses in seconds.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-surface/95 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.12)]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Chat sessions</h2>
                <p className="text-xs text-foreground/60">Switch contexts without losing history.</p>
              </div>
              <button
                type="button"
                onClick={handleCreateSession}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-xs font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
                disabled={isStreaming}
              >
                <Lineicons icon={PlusOutlined} size={14} />
                New
              </button>
            </div>
            <div className="mt-4 space-y-2">
                {sortedSessions.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/70 px-3 py-4 text-xs text-foreground/50">
                    <Lineicons icon={Comment1Outlined} size={16} className="flex-shrink-0" />
                    <p>Your chats appear here after you send the first message.</p>
                  </div>
                ) : (
                  sortedSessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    return (
                      <div
                        key={session.id}
                        className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-3 text-left transition ${
                          isActive
                            ? "border-accent bg-accent/10"
                            : "border-border bg-background/70 hover:border-accent/50"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectSession(session.id)}
                          className="flex-1 min-w-0 text-left"
                          disabled={isStreaming && session.id !== activeSessionId}
                        >
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <span className="block truncate text-sm font-semibold text-foreground">{session.title}</span>
                            {isActive ? (
                              <span className="flex-shrink-0 text-[11px] font-semibold uppercase text-accent">Active</span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-xs text-foreground/50">{formatRelativeTime(session.updatedAt)}</p>
                        </button>
                        {sessions.length > 1 ? (
                          <SessionMenu
                            sessionId={session.id}
                            onRename={handleRenameSession}
                            onDelete={handleDeleteSession}
                            disabled={isStreaming}
                          />
                        ) : null}
                      </div>
                    );
                  })
                )}
            </div>
          </div>
        </aside>

  <div className="flex flex-1 flex-col gap-5">
          <div className="relative h-[550px] overflow-hidden rounded-3xl border border-border/60 bg-surface/95 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.16)] sm:p-6">
            <div ref={scrollRef} className="h-full overflow-y-auto pr-1 sm:pr-2">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/70 p-6 text-sm text-foreground/60">
                  <Lineicons icon={Comment1Outlined} size={32} className="text-foreground/40" />
                  <p className="text-center">Ask about your current assignment, paste a function to review, or regenerate a previous answer.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pb-2">
                  {messages.map((message, index) => {
                    const isAssistant = message.role === "assistant";
                    const isError = message.status === "error";
                    const assistantErrorClassName = isDarkMode
                      ? "self-start border border-red-500/40 bg-red-900/30 text-red-200"
                      : "self-start border border-red-200/70 bg-red-50/80 text-red-700";
                    const assistantNormalClassName =
                      "self-start border border-border/70 bg-background/85 text-foreground shadow-[0_8px_24px_rgba(15,23,42,0.12)]";
                    const userClassName =
                      "self-end bg-gradient-to-br from-foreground to-foreground/90 text-background shadow-[0_14px_34px_rgba(99,102,241,0.35)]";
                    const bubbleClassName = isAssistant
                      ? isError
                        ? assistantErrorClassName
                        : assistantNormalClassName
                      : userClassName;
                    const isLatestAssistant =
                      isAssistant && index === messages.length - 1 && message.status !== "streaming" && !isError;
                    const widthClassName = isAssistant
                      ? "max-w-[94%] sm:max-w-[80%] xl:max-w-[68%]"
                      : "max-w-[82%] sm:max-w-[65%]";

                    return (
                      <div
                        key={message.id}
                        className={`${widthClassName} rounded-[1.75rem] px-4 py-3 text-sm leading-relaxed ${bubbleClassName}`}
                      >
                        {isAssistant ? (
                          <ChatMarkdown
                            content={message.content || (isError ? message.content : "")}
                            className="markdown-body space-y-3"
                          />
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}

                        {message.status === "streaming" ? (
                          <span className="mt-2 inline-flex items-center gap-2 text-xs text-foreground/60">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
                            <Lineicons icon={RefreshCircle1ClockwiseOutlined} size={12} className="animate-spin" />
                            Streaming
                          </span>
                        ) : null}

                        {isAssistant && !isError && message.status !== "streaming" ? (
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground/60">
                            <button
                              type="button"
                              onClick={() => handleCopyResponse(message.id, message.content)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 font-semibold transition hover:border-accent hover:text-accent"
                            >
                              <Lineicons icon={copiedMessageId === message.id ? CheckCircle1Outlined : ClipboardOutlined} size={14} />
                              {copiedMessageId === message.id ? "Copied" : "Copy Markdown"}
                            </button>
                            {isLatestAssistant ? (
                              <button
                                type="button"
                                onClick={() => handleRegenerate(message.id)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 font-semibold transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isStreaming}
                              >
                                <Lineicons icon={RefreshCircle1ClockwiseOutlined} size={14} />
                                Regenerate
                              </button>
                            ) : null}
                          </div>
                        ) : null}

                        {isError && index === messages.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => handleRegenerate(message.id)}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 transition hover:border-red-400 hover:text-red-500"
                          >
                            <Lineicons icon={RefreshCircle1ClockwiseOutlined} size={14} />
                            Retry last response
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="sticky bottom-3 left-0 right-0 z-20 rounded-3xl border border-border/70 bg-surface/95 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.22)] backdrop-blur-sm sm:bottom-6 sm:p-6"
          >
            <label className="sr-only" htmlFor="chat-prompt">
              Chat prompt
            </label>
            <textarea
              id="chat-prompt"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handlePromptKeyDown}
              placeholder={hasKey ? "Ask anything about your DevStudy work..." : "Add your API key to enable chat."}
              className="max-h-44 min-h-[72px] w-full resize-y rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              disabled={!hasKey || isStreaming}
            />
            <div className="mt-3 flex flex-col gap-3 text-xs text-foreground/60 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
              {latestStatus ? <span role="status">{latestStatus}</span> : <span>Ready for your next prompt.</span>}
              <div className="flex items-center gap-2">
                <div ref={modelMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setModelMenuOpen((open) => !open)}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/80 transition hover:border-accent hover:text-accent sm:text-sm"
                    aria-haspopup="menu"
                    aria-expanded={modelMenuOpen}
                  >
                    <span>Model</span>
                    <span className="hidden sm:inline">· {activeModelOption.label}</span>
                    <Lineicons
                      icon={ChevronDownOutlined}
                      size={12}
                      className={`transition-transform ${modelMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {modelMenuOpen ? (
                    <div className="absolute bottom-full right-0 z-30 mb-2 w-72 rounded-2xl border border-black/70 bg-black p-3 text-left text-white shadow-[0_20px_40px_rgba(15,23,42,0.32)] ring-1 ring-white/10">
                      <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                        Available models
                      </p>
                      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                        {modelsLoading ? (
                          <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                            Syncing free models...
                          </p>
                        ) : null}

                        {modelsError ? (
                          <div className="space-y-2 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-xs text-amber-200">
                            <div className="flex items-start gap-2">
                              <Lineicons icon={XmarkCircleOutlined} size={16} className="mt-0.5 flex-shrink-0" />
                              <p>{modelsError}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                void refreshModels();
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 px-3 py-1 font-semibold text-amber-200 transition hover:border-amber-200 hover:text-amber-100"
                            >
                              <Lineicons icon={RefreshCircle1ClockwiseOutlined} size={14} />
                              Retry
                            </button>
                          </div>
                        ) : null}

                        {modelGroups.length
                          ? modelGroups.map((group) => (
                              <div key={group.id} className="space-y-1">
                                <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-white/45">
                                  {group.label}
                                </p>
                                {group.options.map((option) => {
                                  const isActiveModel = option.id === activeModel;
                                  return (
                                    <button
                                      key={option.id}
                                      type="button"
                                      onClick={() => {
                                        setDefaultModel(option.id);
                                        setModelMenuOpen(false);
                                      }}
                                      className={`w-full rounded-xl px-3 py-2 text-left transition ${
                                        isActiveModel
                                          ? "bg-white/15 text-white"
                                          : "text-white/80 hover:bg-white/10 hover:text-white"
                                      }`}
                                    >
                                      <span className="block text-sm font-semibold">{option.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            ))
                          : !modelsLoading && !modelsError
                            ? (
                                <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-white/50">
                                  No models available. Add your API key or retry.
                                </p>
                              )
                            : null}
                      </div>
                    </div>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={!hasKey || isStreaming || !input.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-accent/40"
                >
                  <Lineicons icon={EnterOutlined} size={16} />
                  {isStreaming ? "Waiting" : "Send"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

type SessionMenuProps = {
  sessionId: string;
  onRename: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  disabled?: boolean;
};

function SessionMenu({ sessionId, onRename, onDelete, disabled }: SessionMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-full border border-border bg-background/70 p-1.5 text-foreground/60 transition hover:border-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Session options"
        disabled={disabled}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-40 rounded-xl border border-border/70 bg-background/95 p-1 text-sm shadow-[0_14px_30px_rgba(15,23,42,0.18)]">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onRename(sessionId);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-foreground/80 transition hover:bg-foreground/10"
          >
            <Lineicons icon={Pencil1Outlined} size={14} />
            <span>Rename chat</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete(sessionId);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-rose-500 transition hover:bg-rose-500/10"
          >
            <Lineicons icon={Trash3Outlined} size={14} />
            <span>Delete chat</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
