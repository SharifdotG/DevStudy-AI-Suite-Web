"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { ChatMarkdown } from "@/app/_components/chat-markdown";
import { useSettings } from "@/app/_components/settings-context";

type ToolCategory = "utility" | "ai";

type ToolDefinition = {
  id: string;
  name: string;
  summary: string;
  category: ToolCategory;
  keywords: string[];
  icon: string;
  accent: string;
};

const TOOL_LIBRARY: ToolDefinition[] = [
  {
    id: "json-formatter",
    name: "JSON Formatter",
    summary: "Prettify or minify JSON payloads with syntax validation.",
    category: "utility",
    keywords: ["json", "formatter", "minify", "pretty"],
    icon: "🧾",
    accent: "from-amber-400/90 to-orange-500/80",
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    summary: "Create RFC 4122 v4 identifiers and copy them instantly.",
    category: "utility",
    keywords: ["uuid", "id", "random"],
    icon: "🔑",
    accent: "from-emerald-500/90 to-teal-400/80",
  },
  {
    id: "base64-converter",
    name: "Base64 Converter",
    summary: "Encode text to Base64 or decode existing strings.",
    category: "utility",
    keywords: ["base64", "encode", "decode"],
    icon: "🔁",
    accent: "from-sky-500/90 to-cyan-400/80",
  },
  {
    id: "code-explainer",
    name: "Code Explainer",
    summary: "Send snippets to the chatbot with an explanation prompt.",
    category: "ai",
    keywords: ["ai", "explain", "code"],
    icon: "💡",
    accent: "from-indigo-500/90 to-purple-500/80",
  },
  {
    id: "sql-builder",
    name: "SQL Query Builder",
    summary: "Translate natural language into SQL with optional schema hints.",
    category: "ai",
    keywords: ["ai", "sql", "database", "query"],
    icon: "🗃️",
    accent: "from-violet-500/90 to-pink-500/80",
  },
];

const FAVORITES_KEY = "devstudy-tool-favorites";

type CategoryFilter = {
  id: "all" | "utility" | "ai" | "favorites";
  label: string;
};

const CATEGORY_FILTERS: CategoryFilter[] = [
  { id: "all", label: "All" },
  { id: "favorites", label: "Favorites" },
  { id: "utility", label: "Utilities" },
  { id: "ai", label: "AI Prompts" },
];

export default function ToolsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter["id"]>("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>(TOOL_LIBRARY[0]!.id);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
          setFavorites(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to restore tool favorites", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error("Failed to persist tool favorites", error);
    }
  }, [favorites]);

  const filteredTools = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return TOOL_LIBRARY.filter((tool) => {
      if (activeCategory === "favorites" && !favorites.includes(tool.id)) {
        return false;
      }

      if (activeCategory !== "all" && activeCategory !== "favorites" && tool.category !== activeCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        tool.name.toLowerCase().includes(normalizedQuery) ||
        tool.summary.toLowerCase().includes(normalizedQuery) ||
        tool.keywords.some((keyword) => keyword.includes(normalizedQuery))
      );
    });
  }, [search, activeCategory, favorites]);

  useEffect(() => {
    if (filteredTools.length === 0) {
      return;
    }

    if (!filteredTools.some((tool) => tool.id === selectedToolId)) {
      setSelectedToolId(filteredTools[0]!.id);
    }
  }, [filteredTools, selectedToolId]);

  function toggleFavorite(toolId: string) {
    setFavorites((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId],
    );
  }

  const selectedTool = TOOL_LIBRARY.find((tool) => tool.id === selectedToolId) ?? TOOL_LIBRARY[0]!;

  return (
    <section className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-surface/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.18)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_90%_at_0%_0%,rgba(129,140,248,0.18),transparent),radial-gradient(110%_110%_at_100%_0%,rgba(45,212,191,0.18),transparent)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-foreground/60">DevStudy Tools</p>
            <h1 className="text-3xl font-semibold sm:text-4xl">Utilities and AI helpers, purpose-built for quick study wins.</h1>
            <p className="max-w-2xl text-sm text-foreground/70 sm:text-base">
              Search, favorite, and launch streamlined utilities without losing your place. AI-backed prompts reuse the same OpenRouter settings as the chatbot.
            </p>
          </div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground/60">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
            {favorites.length ? `${favorites.length} favorite${favorites.length === 1 ? "" : "s"}` : "No favorites yet"}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border/70 bg-surface/95 p-6 shadow-[0_18px_46px_rgba(15,23,42,0.18)] sm:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full max-w-xl">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">🔍</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tools by name or keyword..."
              className="w-full rounded-2xl border border-border/70 bg-background/80 px-11 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              type="search"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((filter) => {
              const isActive = activeCategory === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveCategory(filter.id)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-accent text-accent-foreground shadow"
                      : "border border-border/70 bg-background/70 text-foreground/70 hover:border-accent/50"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
          <div className="flex flex-col gap-3">
            {filteredTools.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 px-5 py-8 text-center text-sm text-foreground/60">
                No tools match your filters yet. Try clearing the search or switching categories.
              </div>
            ) : (
              filteredTools.map((tool) => {
                const isActive = tool.id === selectedTool.id;
                const isFavorite = favorites.includes(tool.id);
                return (
                  <div
                    key={tool.id}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                      isActive
                        ? "border-accent bg-accent/10"
                        : "border-border/70 bg-background/70 hover:border-accent/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedToolId(tool.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-lg ${tool.accent}`}>
                        {tool.icon}
                      </span>
                      <span className="flex flex-1 flex-col">
                        <span className="text-sm font-semibold text-foreground">{tool.name}</span>
                        <span className="text-xs uppercase tracking-wide text-foreground/50">{tool.category}</span>
                        <span className="mt-1 text-xs text-foreground/70">{tool.summary}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(tool.id)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        isFavorite
                          ? "bg-accent/20 text-accent"
                          : "bg-background/80 text-foreground/60 hover:text-accent"
                      }`}
                      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      {isFavorite ? "★" : "☆"}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex min-h-[360px] flex-col gap-4 rounded-2xl border border-border/70 bg-background/80 p-4 sm:p-6">
            <div className={`rounded-2xl border border-border/60 bg-gradient-to-br ${selectedTool.accent} p-5 text-white shadow-lg`}>
              <p className="text-xs uppercase tracking-wide text-white/70">Selected tool</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl">
                  {selectedTool.icon}
                </span>
                <div>
                  <h2 className="text-2xl font-semibold leading-tight">{selectedTool.name}</h2>
                  <p className="text-sm text-white/80">{selectedTool.summary}</p>
                </div>
              </div>
            </div>
            <ToolBody toolId={selectedTool.id} />
          </div>
        </div>
      </div>
    </section>
  );
}

type ToolBodyProps = {
  toolId: string;
};

function ToolBody({ toolId }: ToolBodyProps) {
  switch (toolId) {
    case "json-formatter":
      return <JsonFormatterTool />;
    case "uuid-generator":
      return <UuidGeneratorTool />;
    case "base64-converter":
      return <Base64ConverterTool />;
    case "code-explainer":
      return <CodeExplainerTool />;
    case "sql-builder":
      return <SqlBuilderTool />;
    default:
      return (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border p-6 text-sm text-foreground/60">
          AI-powered helpers will plug in soon. Pick a utility to get started.
        </div>
      );
  }
}

function CodeExplainerTool() {
  const { apiKey, defaultModel } = useSettings();
  const sanitizedKey = apiKey.trim();
  const hasKey = sanitizedKey.length > 0;

  const [source, setSource] = useState("function add(a, b) {\n  return a + b;\n}");
  const [context, setContext] = useState("JavaScript helper used in assignments.");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const disabled = status === "pending";

  async function explain() {
    if (!hasKey) {
      setError("Add your OpenRouter API key in Settings before running explanations.");
      return;
    }

    if (!source.trim()) {
      setError("Paste the code you want explained.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("pending");
    setError(null);
    setOutput("");

    try {
      const response = await fetch("/api/tools/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openrouter-key": sanitizedKey,
        },
        body: JSON.stringify({
          model: defaultModel,
          code: source,
          context,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = "Failed to reach the explanation service.";
        try {
          const data = await response.json();
          if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // swallow JSON parse errors
        }
        throw new Error(message);
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
            abortRef.current = null;
            setStatus("idle");
            return;
          }

          try {
            const json = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
            };
            const chunk = json.choices?.[0]?.delta?.content ?? "";
            if (chunk) {
              setOutput((prev) => prev + chunk);
            }

            if (json.choices?.[0]?.finish_reason) {
              abortRef.current = null;
              setStatus("idle");
              return;
            }
          } catch (caught) {
            console.error("Failed to parse stream chunk", caught);
          }
        }
      }

      setStatus("idle");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setStatus("idle");
        setError("Explanation canceled.");
        return;
      }

      const message = caught instanceof Error ? caught.message : "Unexpected error during explanation.";
      setStatus("error");
      setError(message);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Code snippet
          <textarea
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="min-h-[180px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            spellCheck={false}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Additional context (optional)
          <textarea
            value={context}
            onChange={(event) => setContext(event.target.value)}
            className="min-h-[180px] rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={explain}
          disabled={disabled}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            disabled ? "bg-accent/40 text-accent-foreground/70" : "bg-accent text-accent-foreground hover:bg-accent/90"
          }`}
        >
          {disabled ? "Explaining…" : "Explain code"}
        </button>
        {disabled ? (
          <button
            type="button"
            onClick={cancel}
            className="rounded-full border border-border px-4 py-2 font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
          >
            Stop
          </button>
        ) : null}
        {error ? <span className="text-red-500">{error}</span> : null}
        {!hasKey ? (
          <span className="text-foreground/60">
            Enter your OpenRouter API key via Settings before running AI helpers.
          </span>
        ) : null}
      </div>

      <div className="flex-1 rounded-2xl border border-dashed border-border bg-surface/60 p-4">
        {output ? (
          <ChatMarkdown content={output} className="prose prose-invert max-w-none text-sm" />
        ) : (
          <p className="text-sm text-foreground/60">
            {hasKey
              ? "Run the explainer to receive a Markdown breakdown with pitfalls and improvements."
              : "Provide your OpenRouter key to unlock AI-powered explanations."}
          </p>
        )}
      </div>
    </div>
  );
}

function SqlBuilderTool() {
  const { apiKey, defaultModel } = useSettings();
  const sanitizedKey = apiKey.trim();
  const hasKey = sanitizedKey.length > 0;

  const [request, setRequest] = useState("Total spend per customer this month.");
  const [schema, setSchema] = useState(
    "Tables:\ncustomers(id, name)\norders(id, customer_id, total_amount, created_at)\n",
  );
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const disabled = status === "pending";

  async function buildQuery() {
    if (!hasKey) {
      setError("Add your OpenRouter API key in Settings before building queries.");
      return;
    }

    const trimmed = request.trim();
    if (!trimmed) {
      setError("Describe the SQL you need first.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("pending");
    setError(null);
    setOutput("");

    try {
      const response = await fetch("/api/tools/sql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openrouter-key": sanitizedKey,
        },
        body: JSON.stringify({
          model: defaultModel,
          request: trimmed,
          schema,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = "Failed to generate SQL.";
        try {
          const data = await response.json();
          if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore parsing errors
        }
        throw new Error(message);
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
            abortRef.current = null;
            setStatus("idle");
            return;
          }

          try {
            const json = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
            };
            const chunk = json.choices?.[0]?.delta?.content ?? "";
            if (chunk) {
              setOutput((prev) => prev + chunk);
            }

            if (json.choices?.[0]?.finish_reason) {
              abortRef.current = null;
              setStatus("idle");
              return;
            }
          } catch (caught) {
            console.error("Failed to parse SQL stream chunk", caught);
          }
        }
      }

      setStatus("idle");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setStatus("idle");
        setError("Query generation canceled.");
        return;
      }

      const message = caught instanceof Error ? caught.message : "Unexpected error while building SQL.";
      setStatus("error");
      setError(message);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Describe the query
          <textarea
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            className="min-h-[160px] rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Schema context (optional)
          <textarea
            value={schema}
            onChange={(event) => setSchema(event.target.value)}
            className="min-h-[160px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            spellCheck={false}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={buildQuery}
          disabled={disabled}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            disabled ? "bg-accent/40 text-accent-foreground/70" : "bg-accent text-accent-foreground hover:bg-accent/90"
          }`}
        >
          {disabled ? "Building…" : "Build SQL"}
        </button>
        {disabled ? (
          <button
            type="button"
            onClick={cancel}
            className="rounded-full border border-border px-4 py-2 font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
          >
            Stop
          </button>
        ) : null}
        {error ? <span className="text-red-500">{error}</span> : null}
        {!hasKey ? (
          <span className="text-foreground/60">
            Provide your OpenRouter key in Settings to unlock AI query helpers.
          </span>
        ) : null}
      </div>

      <div className="flex-1 rounded-2xl border border-dashed border-border bg-surface/60 p-4">
        {output ? (
          <ChatMarkdown content={output} className="prose prose-invert max-w-none text-sm" />
        ) : (
          <p className="text-sm text-foreground/60">
            {hasKey
              ? "Generate SQL with explanations tailored to your schema."
              : "Enter an OpenRouter key to build SQL from plain language."}
          </p>
        )}
      </div>
    </div>
  );
}

function JsonFormatterTool() {
  const sample = '{\n  "sample": true\n}';
  const [input, setInput] = useState(sample);
  const [output, setOutput] = useState(sample);
  const [error, setError] = useState<string | null>(null);

  function format(pretty: boolean) {
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, pretty ? 2 : undefined);
      setOutput(formatted);
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Invalid JSON payload.";
      setError(message);
    }
  }

  async function copyOutput() {
    if (!output.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
    } catch (caught) {
      console.error("Unable to copy formatted JSON", caught);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        Input JSON
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="min-h-[120px] flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          spellCheck={false}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => format(true)}
          className="rounded-full bg-accent px-4 py-2 font-semibold text-accent-foreground transition hover:bg-accent/90"
        >
          Prettify
        </button>
        <button
          type="button"
          onClick={() => format(false)}
          className="rounded-full border border-border px-4 py-2 font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
        >
          Minify
        </button>
        <button
          type="button"
          onClick={copyOutput}
          className="rounded-full border border-border px-4 py-2 font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
        >
          Copy output
        </button>
        {error ? <span className="text-red-500">{error}</span> : null}
      </div>
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        Output JSON
        <textarea
          value={output}
          onChange={(event) => setOutput(event.target.value)}
          className="min-h-[120px] flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          spellCheck={false}
        />
      </label>
    </div>
  );
}

function UuidGeneratorTool() {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>(() => generateIds(5));

  function handleGenerate() {
    setUuids(generateIds(count));
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.error("Failed to copy UUID", error);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Count
          <input
            value={count}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              if (!Number.isFinite(next)) {
                setCount(1);
                return;
              }
              const clamped = Math.min(Math.max(next, 1), 20);
              setCount(clamped);
            }}
            type="number"
            min={1}
            max={20}
            className="w-20 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90"
        >
          Generate
        </button>
      </div>
      <div className="grid gap-2">
        {uuids.map((value) => (
          <div
            key={value}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono"
          >
            <span className="truncate">{value}</span>
            <button
              type="button"
              onClick={() => copyValue(value)}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
            >
              Copy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Base64ConverterTool() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function runConversion(direction: "encode" | "decode") {
    setMode(direction);
    if (!input) {
      setOutput("");
      setError(null);
      return;
    }

    try {
      if (direction === "encode") {
        const bytes = new TextEncoder().encode(input);
        const binary = Array.from(bytes)
          .map((value) => String.fromCharCode(value))
          .join("");
        setOutput(btoa(binary));
      } else {
        const binary = atob(input.trim());
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        setOutput(new TextDecoder().decode(bytes));
      }
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to convert value.";
      setError(message);
      setOutput("");
    }
  }

  async function copyOutput() {
    if (!output) {
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
    } catch (error) {
      console.error("Failed to copy Base64 result", error);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => runConversion("encode")}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            mode === "encode"
              ? "bg-accent text-accent-foreground"
              : "border border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent"
          }`}
        >
          Encode
        </button>
        <button
          type="button"
          onClick={() => runConversion("decode")}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            mode === "decode"
              ? "bg-accent text-accent-foreground"
              : "border border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent"
          }`}
        >
          Decode
        </button>
        {error ? <span className="text-red-500">{error}</span> : null}
      </div>
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        {mode === "encode" ? "Plain text" : "Base64 input"}
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="min-h-[140px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          spellCheck={false}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => runConversion(mode)}
          className="rounded-full border border-border px-4 py-2 font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
        >
          Convert
        </button>
        <button
          type="button"
          onClick={copyOutput}
          className="rounded-full border border-border px-4 py-2 font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
        >
          Copy output
        </button>
      </div>
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        {mode === "encode" ? "Base64 output" : "Decoded text"}
        <textarea
          value={output}
          onChange={(event) => setOutput(event.target.value)}
          className="min-h-[140px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          spellCheck={false}
        />
      </label>
    </div>
  );
}

function generateIds(count: number) {
  return Array.from({ length: Math.min(Math.max(count, 1), 20) }, () => crypto.randomUUID());
}
