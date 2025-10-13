"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { ChatMarkdown } from "@/app/_components/chat-markdown";
import { useSettings } from "@/app/_components/settings-context";

type ToolCategory =
  | "code-ai"
  | "text-processing"
  | "encoders"
  | "design"
  | "data-conversion";

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
    id: "api-docs",
    name: "API Documentation",
    summary: "Generate API documentation from code definitions.",
    category: "code-ai",
    keywords: ["ai", "api", "documentation", "endpoints"],
    icon: "📚",
    accent: "from-teal-500/90 to-cyan-500/80",
  },
  {
    id: "base64-converter",
    name: "Base64 Converter",
    summary: "Encode text to Base64 or decode existing strings.",
    category: "encoders",
    keywords: ["base64", "encode", "decode"],
    icon: "�",
    accent: "from-sky-500/90 to-cyan-400/80",
  },
  {
    id: "box-shadow-generator",
    name: "Box Shadow Generator",
    summary: "Generate CSS box-shadow properties with live preview.",
    category: "design",
    keywords: ["css", "box-shadow", "shadow", "design"],
    icon: "�",
    accent: "from-slate-500/90 to-zinc-600/80",
  },
  {
    id: "code-explainer",
    name: "Code Explainer",
    summary: "Send snippets to the chatbot with an explanation prompt.",
    category: "code-ai",
    keywords: ["ai", "explain", "code"],
    icon: "�",
    accent: "from-indigo-500/90 to-purple-500/80",
  },
  {
    id: "code-generator",
    name: "Code Generation",
    summary: "Generate code from natural language descriptions.",
    category: "code-ai",
    keywords: ["ai", "generate", "code", "create"],
    icon: "⚡",
    accent: "from-yellow-500/90 to-orange-500/80",
  },
  {
    id: "code-refactor",
    name: "Code Refactoring",
    summary: "Suggest and apply code improvements for better maintainability.",
    category: "code-ai",
    keywords: ["ai", "refactor", "improve", "optimize"],
    icon: "�",
    accent: "from-blue-500/90 to-cyan-500/80",
  },
  {
    id: "code-review",
    name: "Code Review",
    summary: "Analyze code for bugs, security issues, and best practices.",
    category: "code-ai",
    keywords: ["ai", "review", "bugs", "security", "analysis"],
    icon: "�",
    accent: "from-red-500/90 to-pink-500/80",
  },
  {
    id: "color-palette-generator",
    name: "Color Palette Generator",
    summary: "Create harmonious color schemes for your design projects.",
    category: "design",
    keywords: ["color", "palette", "design", "scheme"],
    icon: "🎨",
    accent: "from-pink-400/90 to-rose-500/80",
  },
  {
    id: "color-picker",
    name: "Color Picker & Converter",
    summary: "Convert between HEX, RGB, HSL, and other color formats.",
    category: "design",
    keywords: ["color", "picker", "hex", "rgb", "hsl"],
    icon: "🌈",
    accent: "from-violet-500/90 to-purple-500/80",
  },
  {
    id: "css-gradient-generator",
    name: "CSS Gradient Generator",
    summary: "Create beautiful CSS linear and radial gradients visually.",
    category: "design",
    keywords: ["css", "gradient", "linear", "radial"],
    icon: "🎨",
    accent: "from-blue-400/90 to-purple-500/80",
  },
  {
    id: "csv-json-converter",
    name: "CSV to JSON Converter",
    summary: "Convert between CSV and JSON data formats seamlessly.",
    category: "data-conversion",
    keywords: ["csv", "json", "convert", "data"],
    icon: "�",
    accent: "from-green-500/90 to-teal-500/80",
  },
  {
    id: "doc-generator",
    name: "Documentation Generator",
    summary: "Auto-generate comments and documentation for your code.",
    category: "code-ai",
    keywords: ["ai", "documentation", "comments", "docs"],
    icon: "�",
    accent: "from-purple-500/90 to-indigo-500/80",
  },
  {
    id: "favicon-generator",
    name: "Favicon Generator",
    summary: "Create favicons from images with multiple size exports.",
    category: "design",
    keywords: ["favicon", "icon", "image", "png"],
    icon: "🖼️",
    accent: "from-cyan-500/90 to-blue-500/80",
  },
  {
    id: "hash-generator",
    name: "Hash Generator",
    summary: "Generate MD5, SHA1, SHA256, SHA512 hashes from text.",
    category: "encoders",
    keywords: ["hash", "md5", "sha", "crypto"],
    icon: "�",
    accent: "from-purple-500/90 to-fuchsia-500/80",
  },
  {
    id: "json-formatter",
    name: "JSON Formatter",
    summary: "Prettify or minify JSON payloads with syntax validation.",
    category: "text-processing",
    keywords: ["json", "formatter", "minify", "pretty"],
    icon: "🧾",
    accent: "from-amber-400/90 to-orange-500/80",
  },
  {
    id: "language-translator",
    name: "Language Translation",
    summary: "Convert code between programming languages seamlessly.",
    category: "code-ai",
    keywords: ["ai", "translate", "convert", "language"],
    icon: "🌐",
    accent: "from-green-500/90 to-emerald-500/80",
  },
  {
    id: "lorem-ipsum-generator",
    name: "Lorem Ipsum Generator",
    summary: "Generate placeholder text for mockups and prototypes.",
    category: "design",
    keywords: ["lorem", "ipsum", "placeholder", "text"],
    icon: "�",
    accent: "from-amber-500/90 to-yellow-500/80",
  },
  {
    id: "markdown-html-converter",
    name: "Markdown ⇄ HTML",
    summary: "Convert markdown to HTML and vice versa with preview.",
    category: "data-conversion",
    keywords: ["markdown", "html", "convert", "preview"],
    icon: "�",
    accent: "from-purple-400/90 to-pink-500/80",
  },
  {
    id: "password-generator",
    name: "Password Generator",
    summary: "Generate secure passwords with strength meter and customization.",
    category: "encoders",
    keywords: ["password", "secure", "random", "generator"],
    icon: "🛡️",
    accent: "from-red-500/90 to-orange-500/80",
  },
  {
    id: "qr-code-generator",
    name: "QR Code Generator",
    summary: "Create QR codes for URLs, text, and contact information.",
    category: "encoders",
    keywords: ["qr", "code", "barcode", "scan"],
    icon: "�",
    accent: "from-pink-500/90 to-rose-500/80",
  },
  {
    id: "regex-builder",
    name: "Regex Builder",
    summary: "Create and explain regular expressions with examples.",
    category: "code-ai",
    keywords: ["ai", "regex", "pattern", "expression"],
    icon: "🎯",
    accent: "from-fuchsia-500/90 to-purple-500/80",
  },
  {
    id: "regex-tester",
    name: "RegEx Tester",
    summary: "Test regular expressions with live feedback and matches.",
    category: "text-processing",
    keywords: ["regex", "test", "pattern", "match"],
    icon: "🎯",
    accent: "from-rose-500/90 to-red-500/80",
  },
  {
    id: "sql-builder",
    name: "SQL Query Builder",
    summary: "Translate natural language into SQL with optional schema hints.",
    category: "code-ai",
    keywords: ["ai", "sql", "database", "query"],
    icon: "🗃️",
    accent: "from-violet-500/90 to-pink-500/80",
  },
  {
    id: "sql-formatter",
    name: "SQL Formatter",
    summary: "Format and beautify SQL queries with syntax highlighting.",
    category: "text-processing",
    keywords: ["sql", "formatter", "beautify", "query"],
    icon: "🗄️",
    accent: "from-cyan-500/90 to-blue-500/80",
  },
  {
    id: "test-generator",
    name: "Unit Test Generator",
    summary: "Create comprehensive test cases for functions and classes.",
    category: "code-ai",
    keywords: ["ai", "test", "unit", "testing"],
    icon: "🧪",
    accent: "from-pink-500/90 to-rose-500/80",
  },
  {
    id: "url-encoder",
    name: "URL Encoder/Decoder",
    summary: "Encode and decode URL components and query strings.",
    category: "encoders",
    keywords: ["url", "encode", "decode", "uri"],
    icon: "🔗",
    accent: "from-indigo-500/90 to-blue-500/80",
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    summary: "Create RFC 4122 v4 identifiers and copy them instantly.",
    category: "encoders",
    keywords: ["uuid", "id", "random"],
    icon: "�",
    accent: "from-emerald-500/90 to-teal-400/80",
  },
  {
    id: "xml-formatter",
    name: "XML Formatter",
    summary: "Pretty-print and validate XML documents with syntax checking.",
    category: "text-processing",
    keywords: ["xml", "formatter", "pretty", "validate"],
    icon: "�",
    accent: "from-orange-500/90 to-red-500/80",
  },
  {
    id: "yaml-formatter",
    name: "YAML Formatter",
    summary: "Format and validate YAML configuration files.",
    category: "text-processing",
    keywords: ["yaml", "formatter", "config", "validate"],
    icon: "�",
    accent: "from-blue-400/90 to-indigo-500/80",
  },
];

const FAVORITES_KEY = "devstudy-tool-favorites";

type CategoryFilter = {
  id: "all" | "favorites" | "code-ai" | "text-processing" | "encoders" | "design" | "data-conversion";
  label: string;
};

const CATEGORY_FILTERS: CategoryFilter[] = [
  { id: "all", label: "All Tools" },
  { id: "favorites", label: "Favorites" },
  { id: "code-ai", label: "Code AI" },
  { id: "text-processing", label: "Text Processing" },
  { id: "encoders", label: "Encoders & Generators" },
  { id: "design", label: "Design & Frontend" },
  { id: "data-conversion", label: "Data Conversion" },
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
          <div className="flex max-h-[calc(100vh-28rem)] flex-col gap-3 overflow-y-auto pr-2 lg:max-h-[calc(100vh-20rem)]">
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
                        <span className="text-xs uppercase tracking-wide text-foreground/50">
                          {tool.category.replace(/-/g, " ")}
                        </span>
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
    case "url-encoder":
      return <UrlEncoderTool />;
    case "hash-generator":
      return <HashGeneratorTool />;
    case "qr-code-generator":
      return <QrCodeGeneratorTool />;
    case "password-generator":
      return <PasswordGeneratorTool />;
    case "xml-formatter":
      return <XmlFormatterTool />;
    case "yaml-formatter":
      return <YamlFormatterTool />;
    case "csv-json-converter":
      return <CsvJsonConverterTool />;
    case "markdown-html-converter":
      return <MarkdownHtmlConverterTool />;
    case "sql-formatter":
      return <SqlFormatterTool />;
    case "regex-tester":
      return <RegexTesterTool />;
    case "code-explainer":
      return <CodeExplainerTool />;
    case "sql-builder":
      return <SqlBuilderTool />;
    case "code-generator":
      return <CodeGeneratorTool />;
    case "code-review":
      return <CodeReviewTool />;
    case "code-refactor":
      return <CodeRefactorTool />;
    case "language-translator":
      return <LanguageTranslatorTool />;
    case "doc-generator":
      return <DocGeneratorTool />;
    case "api-docs":
      return <ApiDocsTool />;
    case "test-generator":
      return <TestGeneratorTool />;
    case "regex-builder":
      return <RegexBuilderTool />;
    case "color-palette-generator":
      return <ColorPaletteGeneratorTool />;
    case "color-picker":
      return <ColorPickerTool />;
    case "css-gradient-generator":
      return <CssGradientGeneratorTool />;
    case "box-shadow-generator":
      return <BoxShadowGeneratorTool />;
    case "lorem-ipsum-generator":
      return <LoremIpsumGeneratorTool />;
    case "favicon-generator":
      return <FaviconGeneratorTool />;
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

function UrlEncoderTool() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("https://example.com/search?query=hello world&lang=en");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleEncode() {
    try {
      const encoded = encodeURIComponent(input);
      setOutput(encoded);
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to encode URL.";
      setError(message);
    }
  }

  function handleDecode() {
    try {
      const decoded = decodeURIComponent(input.trim());
      setOutput(decoded);
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to decode URL.";
      setError(message);
    }
  }

  function handleConvert() {
    if (mode === "encode") {
      handleEncode();
    } else {
      handleDecode();
    }
  }

  async function copyOutput() {
    if (!output.trim()) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch (error) {
      console.error("Failed to copy URL", error);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode("encode")}
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
          onClick={() => setMode("decode")}
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
        {mode === "encode" ? "URL to Encode" : "Encoded URL"}
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="min-h-[120px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          spellCheck={false}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={handleConvert}
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
        {mode === "encode" ? "Encoded URL" : "Decoded URL"}
        <textarea
          value={output}
          onChange={(event) => setOutput(event.target.value)}
          className="min-h-[120px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          spellCheck={false}
        />
      </label>
    </div>
  );
}

function HashGeneratorTool() {
  const [input, setInput] = useState("Hello, DevStudy!");
  const [hashes, setHashes] = useState<Record<string, string>>({});

  async function generateHashes() {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const results: Record<string, string> = {};

    results.MD5 = simpleMD5(input);

    try {
      const sha1Buffer = await crypto.subtle.digest("SHA-1", data);
      results.SHA1 = bufferToHex(sha1Buffer);
    } catch {
      results.SHA1 = "Not supported";
    }

    try {
      const sha256Buffer = await crypto.subtle.digest("SHA-256", data);
      results.SHA256 = bufferToHex(sha256Buffer);
    } catch {
      results.SHA256 = "Not supported";
    }

    try {
      const sha512Buffer = await crypto.subtle.digest("SHA-512", data);
      results.SHA512 = bufferToHex(sha512Buffer);
    } catch {
      results.SHA512 = "Not supported";
    }

    setHashes(results);
  }

  function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function simpleMD5(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(32, "0");
  }

  async function copyHash(hash: string) {
    try {
      await navigator.clipboard.writeText(hash);
    } catch (error) {
      console.error("Failed to copy hash", error);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        Input Text
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="min-h-[100px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          spellCheck={false}
        />
      </label>
      <button
        type="button"
        onClick={generateHashes}
        className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition hover:bg-accent/90"
      >
        Generate Hashes
      </button>
      {Object.keys(hashes).length > 0 && (
        <div className="space-y-3">
          {Object.entries(hashes).map(([algorithm, hash]) => (
            <div key={algorithm} className="rounded-xl border border-border bg-surface/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  {algorithm}
                </span>
                <button
                  type="button"
                  onClick={() => copyHash(hash)}
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
                >
                  Copy
                </button>
              </div>
              <p className="break-all font-mono text-xs text-foreground/80">{hash}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QrCodeGeneratorTool() {
  const [input, setInput] = useState("https://devstudy.ai");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function generateQRCode() {
    if (!input.trim()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 256;
    const qrSize = 29;
    const moduleSize = Math.floor(size / qrSize);
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = "#000000";

    const data = input.trim();
    const hash = simpleHash(data);

    for (let y = 0; y < qrSize; y++) {
      for (let x = 0; x < qrSize; x++) {
        const isFinderPattern =
          (x < 7 && y < 7) ||
          (x >= qrSize - 7 && y < 7) ||
          (x < 7 && y >= qrSize - 7);

        const shouldFill = isFinderPattern || ((hash + x * y) % 3 === 0);

        if (shouldFill) {
          ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize - 1, moduleSize - 1);
        }
      }
    }

    const dataUrl = canvas.toDataURL("image/png");
    setQrCodeUrl(dataUrl);
  }

  function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async function downloadQRCode() {
    if (!qrCodeUrl) return;

    const link = document.createElement("a");
    link.download = "qrcode.png";
    link.href = qrCodeUrl;
    link.click();
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        URL or Text
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          placeholder="https://example.com"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={generateQRCode}
          className="rounded-full bg-accent px-4 py-2 font-semibold text-accent-foreground transition hover:bg-accent/90"
        >
          Generate QR Code
        </button>
        {qrCodeUrl && (
          <button
            type="button"
            onClick={downloadQRCode}
            className="rounded-full border border-border px-4 py-2 font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
          >
            Download
          </button>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {qrCodeUrl && (
        <div className="flex justify-center rounded-xl border border-border bg-surface/60 p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeUrl} alt="Generated QR Code" className="h-64 w-64 rounded-lg" />
        </div>
      )}
      <p className="text-xs text-foreground/50">
        Note: This is a simplified QR code generator for demonstration. For production use, consider using a dedicated library like `qrcode` for full QR code standard compliance.
      </p>
    </div>
  );
}

function PasswordGeneratorTool() {
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [password, setPassword] = useState("");
  const [strength, setStrength] = useState("");

  function generatePassword() {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    let charset = "";
    if (includeUppercase) charset += uppercase;
    if (includeLowercase) charset += lowercase;
    if (includeNumbers) charset += numbers;
    if (includeSymbols) charset += symbols;

    if (charset.length === 0) {
      setPassword("Please select at least one character type");
      setStrength("");
      return;
    }

    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    const generated = Array.from(array)
      .map((value) => charset[value % charset.length])
      .join("");

    setPassword(generated);
    calculateStrength(generated, charset.length);
  }

  function calculateStrength(pwd: string, charsetSize: number) {
    const entropy = pwd.length * Math.log2(charsetSize);

    if (entropy < 28) {
      setStrength("Weak");
    } else if (entropy < 36) {
      setStrength("Fair");
    } else if (entropy < 60) {
      setStrength("Good");
    } else if (entropy < 128) {
      setStrength("Strong");
    } else {
      setStrength("Very Strong");
    }
  }

  async function copyPassword() {
    if (!password || password.includes("Please select")) return;
    try {
      await navigator.clipboard.writeText(password);
    } catch (error) {
      console.error("Failed to copy password", error);
    }
  }

  function getStrengthColor() {
    switch (strength) {
      case "Weak":
        return "text-red-500";
      case "Fair":
        return "text-orange-500";
      case "Good":
        return "text-yellow-500";
      case "Strong":
        return "text-green-500";
      case "Very Strong":
        return "text-emerald-500";
      default:
        return "text-foreground/60";
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        Password Length: {length}
        <input
          type="range"
          min="8"
          max="64"
          value={length}
          onChange={(event) => setLength(Number(event.target.value))}
          className="w-full"
        />
      </label>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeUppercase}
            onChange={(event) => setIncludeUppercase(event.target.checked)}
            className="h-4 w-4"
          />
          <span>Uppercase (A-Z)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeLowercase}
            onChange={(event) => setIncludeLowercase(event.target.checked)}
            className="h-4 w-4"
          />
          <span>Lowercase (a-z)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeNumbers}
            onChange={(event) => setIncludeNumbers(event.target.checked)}
            className="h-4 w-4"
          />
          <span>Numbers (0-9)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeSymbols}
            onChange={(event) => setIncludeSymbols(event.target.checked)}
            className="h-4 w-4"
          />
          <span>Symbols (!@#$%)</span>
        </label>
      </div>

      <button
        type="button"
        onClick={generatePassword}
        className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition hover:bg-accent/90"
      >
        Generate Password
      </button>

      {password && (
        <div className="rounded-xl border border-border bg-surface/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
              Generated Password
            </span>
            {strength && (
              <span className={`text-xs font-semibold ${getStrengthColor()}`}>
                Strength: {strength}
              </span>
            )}
          </div>
          <div className="mb-3 break-all rounded-lg bg-background p-3 font-mono text-sm text-foreground">
            {password}
          </div>
          <button
            type="button"
            onClick={copyPassword}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
          >
            Copy Password
          </button>
        </div>
      )}
    </div>
  );
}

function ColorPaletteGeneratorTool() {
  const [baseColor, setBaseColor] = useState("#3b82f6");
  const [palette, setPalette] = useState<string[]>([]);
  const [scheme, setScheme] = useState<"monochromatic" | "complementary" | "analogous" | "triadic">("monochromatic");

  function hexToHSL(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const delta = max - min;
      s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / delta + 2) / 6;
          break;
        case b:
          h = ((r - g) / delta + 4) / 6;
          break;
      }
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r = 0;
    let g = 0;
    let b = 0;

    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
      r = c; g = 0; b = x;
    }

    const toHex = (val: number) => {
      const hex = Math.round((val + m) * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function generatePalette() {
    const hsl = hexToHSL(baseColor);
    const colors: string[] = [];

    switch (scheme) {
      case "monochromatic":
        for (let i = 0; i < 5; i++) {
          const l = 20 + (i * 15);
          colors.push(hslToHex(hsl.h, hsl.s, l));
        }
        break;

      case "complementary":
        colors.push(baseColor);
        colors.push(hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l));
        colors.push(hslToHex(hsl.h, hsl.s * 0.5, hsl.l * 1.2));
        colors.push(hslToHex((hsl.h + 180) % 360, hsl.s * 0.5, hsl.l * 1.2));
        colors.push(hslToHex(hsl.h, hsl.s * 0.3, hsl.l * 0.8));
        break;

      case "analogous":
        for (let i = -2; i <= 2; i++) {
          const newHue = (hsl.h + (i * 30) + 360) % 360;
          colors.push(hslToHex(newHue, hsl.s, hsl.l));
        }
        break;

      case "triadic":
        colors.push(baseColor);
        colors.push(hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l));
        colors.push(hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l));
        colors.push(hslToHex(hsl.h, hsl.s * 0.6, hsl.l * 1.1));
        colors.push(hslToHex(hsl.h, hsl.s * 0.4, hsl.l * 0.9));
        break;
    }

    setPalette(colors);
  }

  async function copyColor(color: string) {
    try {
      await navigator.clipboard.writeText(color);
    } catch (error) {
      console.error("Failed to copy color", error);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Base Color
          <input
            type="color"
            value={baseColor}
            onChange={(event) => setBaseColor(event.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-surface"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Color Scheme
          <select
            value={scheme}
            onChange={(event) => setScheme(event.target.value as typeof scheme)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          >
            <option value="monochromatic">Monochromatic</option>
            <option value="complementary">Complementary</option>
            <option value="analogous">Analogous</option>
            <option value="triadic">Triadic</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={generatePalette}
        className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition hover:bg-accent/90"
      >
        Generate Palette
      </button>

      {palette.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-5">
          {palette.map((color, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-xl border border-border"
            >
              <div
                className="h-24 w-full"
                style={{ backgroundColor: color }}
              />
              <div className="bg-surface/95 p-2 text-center">
                <p className="mb-1 font-mono text-xs font-semibold">{color}</p>
                <button
                  type="button"
                  onClick={() => copyColor(color)}
                  className="rounded-full border border-border px-2 py-1 text-xs font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
                >
                  Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ColorPickerTool() {
  const [hex, setHex] = useState("#3b82f6");
  const [rgb, setRgb] = useState({ r: 59, g: 130, b: 246 });
  const [hsl, setHsl] = useState({ h: 217, s: 91, l: 60 });

  function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1]!, 16),
          g: parseInt(result[2]!, 16),
          b: parseInt(result[3]!, 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const delta = max - min;
      s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / delta + 2) / 6;
          break;
        case b:
          h = ((r - g) / delta + 4) / 6;
          break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  function updateColor(newColor: string) {
    setHex(newColor);
    const rgbVal = hexToRgb(newColor);
    setRgb(rgbVal);
    setHsl(rgbToHsl(rgbVal.r, rgbVal.g, rgbVal.b));
  }

  async function copyFormat(format: string) {
    try {
      await navigator.clipboard.writeText(format);
    } catch (error) {
      console.error("Failed to copy color format", error);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-center rounded-xl border border-border bg-surface/60 p-8">
        <input
          type="color"
          value={hex}
          onChange={(event) => updateColor(event.target.value)}
          className="h-32 w-32 cursor-pointer rounded-xl border-2 border-border"
        />
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-surface/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">HEX</span>
            <button
              type="button"
              onClick={() => copyFormat(hex)}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
            >
              Copy
            </button>
          </div>
          <p className="font-mono text-sm font-semibold">{hex}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">RGB</span>
            <button
              type="button"
              onClick={() => copyFormat(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`)}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
            >
              Copy
            </button>
          </div>
          <p className="font-mono text-sm font-semibold">
            rgb({rgb.r}, {rgb.g}, {rgb.b})
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">HSL</span>
            <button
              type="button"
              onClick={() => copyFormat(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`)}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
            >
              Copy
            </button>
          </div>
          <p className="font-mono text-sm font-semibold">
            hsl({hsl.h}, {hsl.s}%, {hsl.l}%)
          </p>
        </div>
      </div>
    </div>
  );
}

function CssGradientGeneratorTool() {
  const [type, setType] = useState<"linear" | "radial">("linear");
  const [angle, setAngle] = useState(90);
  const [color1, setColor1] = useState("#3b82f6");
  const [color2, setColor2] = useState("#8b5cf6");
  const [cssCode, setCssCode] = useState("");

  function generateGradient() {
    let gradient = "";
    if (type === "linear") {
      gradient = `background: linear-gradient(${angle}deg, ${color1}, ${color2});`;
    } else {
      gradient = `background: radial-gradient(circle, ${color1}, ${color2});`;
    }
    setCssCode(gradient);
  }

  async function copyCss() {
    if (!cssCode) return;
    try {
      await navigator.clipboard.writeText(cssCode);
    } catch (error) {
      console.error("Failed to copy CSS", error);
    }
  }

  useEffect(() => {
    generateGradient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, angle, color1, color2]);

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setType("linear")}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            type === "linear"
              ? "bg-accent text-accent-foreground"
              : "border border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent"
          }`}
        >
          Linear
        </button>
        <button
          type="button"
          onClick={() => setType("radial")}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            type === "radial"
              ? "bg-accent text-accent-foreground"
              : "border border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent"
          }`}
        >
          Radial
        </button>
      </div>

      {type === "linear" && (
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Angle: {angle}°
          <input
            type="range"
            min="0"
            max="360"
            value={angle}
            onChange={(event) => setAngle(Number(event.target.value))}
            className="w-full"
          />
        </label>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Color 1
          <input
            type="color"
            value={color1}
            onChange={(event) => setColor1(event.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-surface"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Color 2
          <input
            type="color"
            value={color2}
            onChange={(event) => setColor2(event.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-surface"
          />
        </label>
      </div>

      <div
        className="h-32 rounded-xl border border-border"
        style={{
          background:
            type === "linear"
              ? `linear-gradient(${angle}deg, ${color1}, ${color2})`
              : `radial-gradient(circle, ${color1}, ${color2})`,
        }}
      />

      {cssCode && (
        <div className="rounded-xl border border-border bg-surface/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">CSS Code</span>
            <button
              type="button"
              onClick={copyCss}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
            >
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-background p-3 font-mono text-xs">
            {cssCode}
          </pre>
        </div>
      )}
    </div>
  );
}

function BoxShadowGeneratorTool() {
  const [hOffset, setHOffset] = useState(0);
  const [vOffset, setVOffset] = useState(4);
  const [blur, setBlur] = useState(6);
  const [spread, setSpread] = useState(0);
  const [opacity, setOpacity] = useState(0.1);
  const [cssCode, setCssCode] = useState("");

  function generateShadow() {
    const rgba = `rgba(0, 0, 0, ${opacity})`;
    const shadow = `box-shadow: ${hOffset}px ${vOffset}px ${blur}px ${spread}px ${rgba};`;
    setCssCode(shadow);
  }

  async function copyCss() {
    if (!cssCode) return;
    try {
      await navigator.clipboard.writeText(cssCode);
    } catch (error) {
      console.error("Failed to copy CSS", error);
    }
  }

  useEffect(() => {
    generateShadow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hOffset, vOffset, blur, spread, opacity]);

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="space-y-3">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Horizontal Offset: {hOffset}px
          <input
            type="range"
            min="-50"
            max="50"
            value={hOffset}
            onChange={(event) => setHOffset(Number(event.target.value))}
            className="w-full"
          />
        </label>

        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Vertical Offset: {vOffset}px
          <input
            type="range"
            min="-50"
            max="50"
            value={vOffset}
            onChange={(event) => setVOffset(Number(event.target.value))}
            className="w-full"
          />
        </label>

        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Blur Radius: {blur}px
          <input
            type="range"
            min="0"
            max="100"
            value={blur}
            onChange={(event) => setBlur(Number(event.target.value))}
            className="w-full"
          />
        </label>

        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Spread Radius: {spread}px
          <input
            type="range"
            min="-50"
            max="50"
            value={spread}
            onChange={(event) => setSpread(Number(event.target.value))}
            className="w-full"
          />
        </label>

        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Shadow Opacity: {opacity.toFixed(2)}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            onChange={(event) => setOpacity(Number(event.target.value))}
            className="w-full"
          />
        </label>
      </div>

      <div className="flex items-center justify-center rounded-xl border border-border bg-gradient-to-br from-slate-50 to-slate-100 p-12 dark:from-slate-900 dark:to-slate-800">
        <div
          className="h-24 w-24 rounded-xl bg-white dark:bg-slate-700"
          style={{
            boxShadow: `${hOffset}px ${vOffset}px ${blur}px ${spread}px rgba(0, 0, 0, ${opacity})`,
          }}
        />
      </div>

      {cssCode && (
        <div className="rounded-xl border border-border bg-surface/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">CSS Code</span>
            <button
              type="button"
              onClick={copyCss}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
            >
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-background p-3 font-mono text-xs">
            {cssCode}
          </pre>
        </div>
      )}
    </div>
  );
}

function LoremIpsumGeneratorTool() {
  const [paragraphs, setParagraphs] = useState(3);
  const [wordsPerParagraph, setWordsPerParagraph] = useState(50);
  const [output, setOutput] = useState("");

  const loremWords = [
    "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
    "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
    "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
    "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
    "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
    "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
    "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
    "deserunt", "mollit", "anim", "id", "est", "laborum",
  ];

  function generateLorem() {
    const result: string[] = [];

    for (let i = 0; i < paragraphs; i++) {
      const words: string[] = [];
      for (let j = 0; j < wordsPerParagraph; j++) {
        const word = loremWords[Math.floor(Math.random() * loremWords.length)]!;
        if (j === 0) {
          words.push(word.charAt(0).toUpperCase() + word.slice(1));
        } else {
          words.push(word);
        }
      }
      result.push(words.join(" ") + ".");
    }

    setOutput(result.join("\n\n"));
  }

  async function copyLorem() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch (error) {
      console.error("Failed to copy lorem ipsum", error);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        Number of Paragraphs: {paragraphs}
        <input
          type="range"
          min="1"
          max="10"
          value={paragraphs}
          onChange={(event) => setParagraphs(Number(event.target.value))}
          className="w-full"
        />
      </label>

      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        Words per Paragraph: {wordsPerParagraph}
        <input
          type="range"
          min="10"
          max="100"
          value={wordsPerParagraph}
          onChange={(event) => setWordsPerParagraph(Number(event.target.value))}
          className="w-full"
        />
      </label>

      <button
        type="button"
        onClick={generateLorem}
        className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition hover:bg-accent/90"
      >
        Generate Lorem Ipsum
      </button>

      {output && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Generated Text</span>
            <button
              type="button"
              onClick={copyLorem}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
            >
              Copy
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-border bg-surface p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {output}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function FaviconGeneratorTool() {
  const [text, setText] = useState("DS");
  const [bgColor, setBgColor] = useState("#3b82f6");
  const [textColor, setTextColor] = useState("#ffffff");
  const [faviconUrl, setFaviconUrl] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function generateFavicon() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = textColor;
    ctx.font = "bold 64px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.slice(0, 2).toUpperCase(), size / 2, size / 2);

    const dataUrl = canvas.toDataURL("image/png");
    setFaviconUrl(dataUrl);
  }

  async function downloadFavicon() {
    if (!faviconUrl) return;

    const link = document.createElement("a");
    link.download = "favicon.png";
    link.href = faviconUrl;
    link.click();
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        Text (1-2 characters)
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={2}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          placeholder="DS"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Background Color
          <input
            type="color"
            value={bgColor}
            onChange={(event) => setBgColor(event.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-surface"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Text Color
          <input
            type="color"
            value={textColor}
            onChange={(event) => setTextColor(event.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-surface"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={generateFavicon}
          className="rounded-full bg-accent px-4 py-2 font-semibold text-accent-foreground transition hover:bg-accent/90"
        >
          Generate Favicon
        </button>
        {faviconUrl && (
          <button
            type="button"
            onClick={downloadFavicon}
            className="rounded-full border border-border px-4 py-2 font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
          >
            Download (128x128)
          </button>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {faviconUrl && (
        <div className="rounded-xl border border-border bg-surface/60 p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/60">Preview</p>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={faviconUrl} alt="Favicon 128x128" className="h-32 w-32 rounded-lg border border-border" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={faviconUrl} alt="Favicon 64x64" className="h-16 w-16 rounded-lg border border-border" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={faviconUrl} alt="Favicon 32x32" className="h-8 w-8 rounded-lg border border-border" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={faviconUrl} alt="Favicon 16x16" className="h-4 w-4 rounded border border-border" />
          </div>
        </div>
      )}

      <p className="text-xs text-foreground/50">
        Note: For production use, generate multiple sizes (16x16, 32x32, 180x180, etc.) and convert to .ico format using online tools.
      </p>
    </div>
  );
}

function CodeGeneratorTool() {
  const { apiKey, defaultModel } = useSettings();
  const sanitizedKey = apiKey.trim();
  const hasKey = sanitizedKey.length > 0;

  const [description, setDescription] = useState("Create a function that validates email addresses");
  const [language, setLanguage] = useState("JavaScript");
  const [context, setContext] = useState("Use modern ES6+ syntax");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const disabled = status === "pending";

  async function generate() {
    if (!hasKey) {
      setError("Add your OpenRouter API key in Settings before generating code.");
      return;
    }

    if (!description.trim()) {
      setError("Describe what code you need.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("pending");
    setError(null);
    setOutput("");

    try {
      const response = await fetch("/api/tools/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openrouter-key": sanitizedKey,
        },
        body: JSON.stringify({
          model: defaultModel,
          description,
          language,
          context,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = "Failed to generate code.";
        try {
          const data = await response.json();
          if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split("\n");
        buffer = segments.pop() ?? "";

        for (const segment of segments) {
          const line = segment.trim();
          if (!line || !line.startsWith("data:")) continue;

          const data = line.slice(5).trim();
          if (!data) continue;

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
        setError("Generation canceled.");
        return;
      }

      const message = caught instanceof Error ? caught.message : "Unexpected error during generation.";
      setStatus("error");
      setError(message);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-3">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-[100px] rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="Describe the code you want to generate..."
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
            Language
            <input
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              placeholder="JavaScript, Python, etc."
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
            Additional context (optional)
            <input
              value={context}
              onChange={(event) => setContext(event.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              placeholder="Style preferences, constraints..."
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={generate}
          disabled={disabled}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            disabled ? "bg-accent/40 text-accent-foreground/70" : "bg-accent text-accent-foreground hover:bg-accent/90"
          }`}
        >
          {disabled ? "Generating…" : "Generate code"}
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
      </div>

      <div className="flex-1 rounded-2xl border border-dashed border-border bg-surface/60 p-4">
        {output ? (
          <ChatMarkdown content={output} className="prose prose-invert max-w-none text-sm" />
        ) : (
          <p className="text-sm text-foreground/60">
            {hasKey
              ? "Describe what you need and get production-ready code with explanations."
              : "Provide your OpenRouter key to generate code."}
          </p>
        )}
      </div>
    </div>
  );
}

function CodeReviewTool() {
  const { apiKey, defaultModel } = useSettings();
  const sanitizedKey = apiKey.trim();
  const hasKey = sanitizedKey.length > 0;

  const [code, setCode] = useState("function fetchData() {\n  return fetch('/api/data').then(r => r.json())\n}");
  const [focus, setFocus] = useState("bugs, security, best practices");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const disabled = status === "pending";

  async function review() {
    if (!hasKey) {
      setError("Add your OpenRouter API key in Settings before reviewing code.");
      return;
    }

    if (!code.trim()) {
      setError("Paste the code you want reviewed.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("pending");
    setError(null);
    setOutput("");

    try {
      const response = await fetch("/api/tools/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openrouter-key": sanitizedKey,
        },
        body: JSON.stringify({
          model: defaultModel,
          code,
          focus,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = "Failed to review code.";
        try {
          const data = await response.json();
          if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split("\n");
        buffer = segments.pop() ?? "";

        for (const segment of segments) {
          const line = segment.trim();
          if (!line || !line.startsWith("data:")) continue;

          const data = line.slice(5).trim();
          if (!data) continue;

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
        setError("Review canceled.");
        return;
      }

      const message = caught instanceof Error ? caught.message : "Unexpected error during review.";
      setStatus("error");
      setError(message);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-3">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Code to review
          <textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="min-h-[180px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            spellCheck={false}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Focus areas (optional)
          <input
            value={focus}
            onChange={(event) => setFocus(event.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="bugs, security, performance, readability..."
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={review}
          disabled={disabled}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            disabled ? "bg-accent/40 text-accent-foreground/70" : "bg-accent text-accent-foreground hover:bg-accent/90"
          }`}
        >
          {disabled ? "Reviewing…" : "Review code"}
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
      </div>

      <div className="flex-1 rounded-2xl border border-dashed border-border bg-surface/60 p-4">
        {output ? (
          <ChatMarkdown content={output} className="prose prose-invert max-w-none text-sm" />
        ) : (
          <p className="text-sm text-foreground/60">
            {hasKey
              ? "Get comprehensive code analysis with security checks and improvement suggestions."
              : "Provide your OpenRouter key to review code."}
          </p>
        )}
      </div>
    </div>
  );
}

function CodeRefactorTool() {
  const { apiKey, defaultModel } = useSettings();
  const sanitizedKey = apiKey.trim();
  const hasKey = sanitizedKey.length > 0;

  const [code, setCode] = useState("const x = [1,2,3,4,5];\nlet sum = 0;\nfor(let i = 0; i < x.length; i++) {\n  sum += x[i];\n}");
  const [goals, setGoals] = useState("improve readability and use modern syntax");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const disabled = status === "pending";

  async function refactor() {
    if (!hasKey) {
      setError("Add your OpenRouter API key in Settings before refactoring.");
      return;
    }

    if (!code.trim()) {
      setError("Paste the code you want to refactor.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("pending");
    setError(null);
    setOutput("");

    try {
      const response = await fetch("/api/tools/refactor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openrouter-key": sanitizedKey,
        },
        body: JSON.stringify({
          model: defaultModel,
          code,
          goals,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = "Failed to refactor code.";
        try {
          const data = await response.json();
          if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split("\n");
        buffer = segments.pop() ?? "";

        for (const segment of segments) {
          const line = segment.trim();
          if (!line || !line.startsWith("data:")) continue;

          const data = line.slice(5).trim();
          if (!data) continue;

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
        setError("Refactoring canceled.");
        return;
      }

      const message = caught instanceof Error ? caught.message : "Unexpected error during refactoring.";
      setStatus("error");
      setError(message);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-3">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Code to refactor
          <textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="min-h-[180px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            spellCheck={false}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Refactoring goals (optional)
          <input
            value={goals}
            onChange={(event) => setGoals(event.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="readability, performance, modularity..."
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={refactor}
          disabled={disabled}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            disabled ? "bg-accent/40 text-accent-foreground/70" : "bg-accent text-accent-foreground hover:bg-accent/90"
          }`}
        >
          {disabled ? "Refactoring…" : "Refactor code"}
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
      </div>

      <div className="flex-1 rounded-2xl border border-dashed border-border bg-surface/60 p-4">
        {output ? (
          <ChatMarkdown content={output} className="prose prose-invert max-w-none text-sm" />
        ) : (
          <p className="text-sm text-foreground/60">
            {hasKey
              ? "Improve code quality with AI-powered refactoring suggestions."
              : "Provide your OpenRouter key to refactor code."}
          </p>
        )}
      </div>
    </div>
  );
}

function LanguageTranslatorTool() {
  const { apiKey, defaultModel } = useSettings();
  const sanitizedKey = apiKey.trim();
  const hasKey = sanitizedKey.length > 0;

  const [code, setCode] = useState("def greet(name):\n    print(f'Hello, {name}!')");
  const [fromLang, setFromLang] = useState("Python");
  const [toLang, setToLang] = useState("JavaScript");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const disabled = status === "pending";

  async function translate() {
    if (!hasKey) {
      setError("Add your OpenRouter API key in Settings before translating.");
      return;
    }

    if (!code.trim()) {
      setError("Paste the code you want to translate.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("pending");
    setError(null);
    setOutput("");

    try {
      const response = await fetch("/api/tools/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openrouter-key": sanitizedKey,
        },
        body: JSON.stringify({
          model: defaultModel,
          code,
          fromLang,
          toLang,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = "Failed to translate code.";
        try {
          const data = await response.json();
          if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split("\n");
        buffer = segments.pop() ?? "";

        for (const segment of segments) {
          const line = segment.trim();
          if (!line || !line.startsWith("data:")) continue;

          const data = line.slice(5).trim();
          if (!data) continue;

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
        setError("Translation canceled.");
        return;
      }

      const message = caught instanceof Error ? caught.message : "Unexpected error during translation.";
      setStatus("error");
      setError(message);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-3">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Source code
          <textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="min-h-[180px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            spellCheck={false}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
            From language
            <input
              value={fromLang}
              onChange={(event) => setFromLang(event.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              placeholder="Python, JavaScript, etc."
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
            To language
            <input
              value={toLang}
              onChange={(event) => setToLang(event.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              placeholder="JavaScript, Python, etc."
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={translate}
          disabled={disabled}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            disabled ? "bg-accent/40 text-accent-foreground/70" : "bg-accent text-accent-foreground hover:bg-accent/90"
          }`}
        >
          {disabled ? "Translating…" : "Translate code"}
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
      </div>

      <div className="flex-1 rounded-2xl border border-dashed border-border bg-surface/60 p-4">
        {output ? (
          <ChatMarkdown content={output} className="prose prose-invert max-w-none text-sm" />
        ) : (
          <p className="text-sm text-foreground/60">
            {hasKey
              ? "Convert code between programming languages with idiomatic patterns."
              : "Provide your OpenRouter key to translate code."}
          </p>
        )}
      </div>
    </div>
  );
}

function DocGeneratorTool() {
  const { apiKey, defaultModel } = useSettings();
  const sanitizedKey = apiKey.trim();
  const hasKey = sanitizedKey.length > 0;

  const [code, setCode] = useState("function calculateDiscount(price, percentage) {\n  return price * (1 - percentage / 100);\n}");
  const [style, setStyle] = useState("JSDoc");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const disabled = status === "pending";

  async function generateDocs() {
    if (!hasKey) {
      setError("Add your OpenRouter API key in Settings before generating documentation.");
      return;
    }

    if (!code.trim()) {
      setError("Paste the code you want to document.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("pending");
    setError(null);
    setOutput("");

    try {
      const response = await fetch("/api/tools/document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openrouter-key": sanitizedKey,
        },
        body: JSON.stringify({
          model: defaultModel,
          code,
          style,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = "Failed to generate documentation.";
        try {
          const data = await response.json();
          if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split("\n");
        buffer = segments.pop() ?? "";

        for (const segment of segments) {
          const line = segment.trim();
          if (!line || !line.startsWith("data:")) continue;

          const data = line.slice(5).trim();
          if (!data) continue;

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
        setError("Documentation generation canceled.");
        return;
      }

      const message = caught instanceof Error ? caught.message : "Unexpected error during documentation generation.";
      setStatus("error");
      setError(message);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-3">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Code to document
          <textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="min-h-[180px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            spellCheck={false}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Documentation style (optional)
          <input
            value={style}
            onChange={(event) => setStyle(event.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="JSDoc, Python docstring, Javadoc..."
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={generateDocs}
          disabled={disabled}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            disabled ? "bg-accent/40 text-accent-foreground/70" : "bg-accent text-accent-foreground hover:bg-accent/90"
          }`}
        >
          {disabled ? "Generating…" : "Generate docs"}
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
      </div>

      <div className="flex-1 rounded-2xl border border-dashed border-border bg-surface/60 p-4">
        {output ? (
          <ChatMarkdown content={output} className="prose prose-invert max-w-none text-sm" />
        ) : (
          <p className="text-sm text-foreground/60">
            {hasKey
              ? "Auto-generate comprehensive documentation with parameter descriptions and examples."
              : "Provide your OpenRouter key to generate documentation."}
          </p>
        )}
      </div>
    </div>
  );
}

function ApiDocsTool() {
  const { apiKey, defaultModel } = useSettings();
  const sanitizedKey = apiKey.trim();
  const hasKey = sanitizedKey.length > 0;

  const [code, setCode] = useState("app.post('/api/users', (req, res) => {\n  // Create user endpoint\n})");
  const [format, setFormat] = useState("OpenAPI");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const disabled = status === "pending";

  async function generateApiDocs() {
    if (!hasKey) {
      setError("Add your OpenRouter API key in Settings before generating API docs.");
      return;
    }

    if (!code.trim()) {
      setError("Paste the API code you want to document.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("pending");
    setError(null);
    setOutput("");

    try {
      const response = await fetch("/api/tools/api-docs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openrouter-key": sanitizedKey,
        },
        body: JSON.stringify({
          model: defaultModel,
          code,
          format,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = "Failed to generate API documentation.";
        try {
          const data = await response.json();
          if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split("\n");
        buffer = segments.pop() ?? "";

        for (const segment of segments) {
          const line = segment.trim();
          if (!line || !line.startsWith("data:")) continue;

          const data = line.slice(5).trim();
          if (!data) continue;

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
        setError("API documentation generation canceled.");
        return;
      }

      const message = caught instanceof Error ? caught.message : "Unexpected error during API documentation generation.";
      setStatus("error");
      setError(message);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-3">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          API endpoints code
          <textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="min-h-[180px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            spellCheck={false}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Documentation format (optional)
          <input
            value={format}
            onChange={(event) => setFormat(event.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="OpenAPI, Markdown, Postman..."
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={generateApiDocs}
          disabled={disabled}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            disabled ? "bg-accent/40 text-accent-foreground/70" : "bg-accent text-accent-foreground hover:bg-accent/90"
          }`}
        >
          {disabled ? "Generating…" : "Generate API docs"}
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
      </div>

      <div className="flex-1 rounded-2xl border border-dashed border-border bg-surface/60 p-4">
        {output ? (
          <ChatMarkdown content={output} className="prose prose-invert max-w-none text-sm" />
        ) : (
          <p className="text-sm text-foreground/60">
            {hasKey
              ? "Generate comprehensive API documentation with endpoints, parameters, and examples."
              : "Provide your OpenRouter key to generate API documentation."}
          </p>
        )}
      </div>
    </div>
  );
}

function TestGeneratorTool() {
  const { apiKey, defaultModel } = useSettings();
  const sanitizedKey = apiKey.trim();
  const hasKey = sanitizedKey.length > 0;

  const [code, setCode] = useState("function add(a, b) {\n  return a + b;\n}");
  const [framework, setFramework] = useState("Jest");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const disabled = status === "pending";

  async function generateTests() {
    if (!hasKey) {
      setError("Add your OpenRouter API key in Settings before generating tests.");
      return;
    }

    if (!code.trim()) {
      setError("Paste the code you want to test.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("pending");
    setError(null);
    setOutput("");

    try {
      const response = await fetch("/api/tools/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openrouter-key": sanitizedKey,
        },
        body: JSON.stringify({
          model: defaultModel,
          code,
          framework,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = "Failed to generate tests.";
        try {
          const data = await response.json();
          if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split("\n");
        buffer = segments.pop() ?? "";

        for (const segment of segments) {
          const line = segment.trim();
          if (!line || !line.startsWith("data:")) continue;

          const data = line.slice(5).trim();
          if (!data) continue;

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
        setError("Test generation canceled.");
        return;
      }

      const message = caught instanceof Error ? caught.message : "Unexpected error during test generation.";
      setStatus("error");
      setError(message);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-3">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Code to test
          <textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="min-h-[180px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            spellCheck={false}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Testing framework (optional)
          <input
            value={framework}
            onChange={(event) => setFramework(event.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="Jest, Mocha, PyTest, JUnit..."
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={generateTests}
          disabled={disabled}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            disabled ? "bg-accent/40 text-accent-foreground/70" : "bg-accent text-accent-foreground hover:bg-accent/90"
          }`}
        >
          {disabled ? "Generating…" : "Generate tests"}
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
      </div>

      <div className="flex-1 rounded-2xl border border-dashed border-border bg-surface/60 p-4">
        {output ? (
          <ChatMarkdown content={output} className="prose prose-invert max-w-none text-sm" />
        ) : (
          <p className="text-sm text-foreground/60">
            {hasKey
              ? "Generate comprehensive unit tests with edge cases and assertions."
              : "Provide your OpenRouter key to generate tests."}
          </p>
        )}
      </div>
    </div>
  );
}

function RegexBuilderTool() {
  const { apiKey, defaultModel } = useSettings();
  const sanitizedKey = apiKey.trim();
  const hasKey = sanitizedKey.length > 0;

  const [description, setDescription] = useState("Match email addresses");
  const [examples, setExamples] = useState("test@example.com\nuser.name+tag@domain.co.uk");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const disabled = status === "pending";

  async function buildRegex() {
    if (!hasKey) {
      setError("Add your OpenRouter API key in Settings before building regex.");
      return;
    }

    if (!description.trim()) {
      setError("Describe what pattern you need to match.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("pending");
    setError(null);
    setOutput("");

    try {
      const response = await fetch("/api/tools/regex", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-openrouter-key": sanitizedKey,
        },
        body: JSON.stringify({
          model: defaultModel,
          description,
          examples,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = "Failed to build regex.";
        try {
          const data = await response.json();
          if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split("\n");
        buffer = segments.pop() ?? "";

        for (const segment of segments) {
          const line = segment.trim();
          if (!line || !line.startsWith("data:")) continue;

          const data = line.slice(5).trim();
          if (!data) continue;

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
        setError("Regex building canceled.");
        return;
      }

      const message = caught instanceof Error ? caught.message : "Unexpected error during regex building.";
      setStatus("error");
      setError(message);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-3">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Pattern description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-[100px] rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="Describe the pattern you want to match..."
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Example strings (optional, one per line)
          <textarea
            value={examples}
            onChange={(event) => setExamples(event.target.value)}
            className="min-h-[80px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="Provide examples of strings to match..."
            spellCheck={false}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={buildRegex}
          disabled={disabled}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            disabled ? "bg-accent/40 text-accent-foreground/70" : "bg-accent text-accent-foreground hover:bg-accent/90"
          }`}
        >
          {disabled ? "Building…" : "Build regex"}
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
      </div>

      <div className="flex-1 rounded-2xl border border-dashed border-border bg-surface/60 p-4">
        {output ? (
          <ChatMarkdown content={output} className="prose prose-invert max-w-none text-sm" />
        ) : (
          <p className="text-sm text-foreground/60">
            {hasKey
              ? "Create regular expressions with detailed explanations and test cases."
              : "Provide your OpenRouter key to build regex patterns."}
          </p>
        )}
      </div>
    </div>
  );
}

function XmlFormatterTool() {
  const [input, setInput] = useState('<?xml version="1.0"?>\n<root><item>test</item></root>');
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function formatXml() {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(input.trim(), "text/xml");

      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        throw new Error("Invalid XML: " + parserError.textContent);
      }

      const serializer = new XMLSerializer();
      const xmlString = serializer.serializeToString(xmlDoc);

      const formatted = xmlString
        .replace(/></g, ">\n<")
        .split("\n")
        .map((line, index, arr) => {
          const trimmed = line.trim();
          if (!trimmed) return "";

          let indent = 0;
          for (let i = 0; i < index; i++) {
            const prev = arr[i]?.trim() || "";
            if (prev.startsWith("<") && !prev.startsWith("</") && !prev.endsWith("/>")) {
              indent++;
            }
            if (prev.startsWith("</")) {
              indent--;
            }
          }

          if (trimmed.startsWith("</")) {
            indent--;
          }

          return "  ".repeat(Math.max(0, indent)) + trimmed;
        })
        .join("\n");

      setOutput(formatted);
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Invalid XML structure.";
      setError(message);
    }
  }

  function minifyXml() {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(input.trim(), "text/xml");

      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        throw new Error("Invalid XML: " + parserError.textContent);
      }

      const serializer = new XMLSerializer();
      const minified = serializer.serializeToString(xmlDoc).replace(/>\s+</g, "><");

      setOutput(minified);
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Invalid XML structure.";
      setError(message);
    }
  }

  async function copyOutput() {
    if (!output.trim()) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch (error) {
      console.error("Failed to copy XML", error);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        Input XML
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
          onClick={formatXml}
          className="rounded-full bg-accent px-4 py-2 font-semibold text-accent-foreground transition hover:bg-accent/90"
        >
          Prettify
        </button>
        <button
          type="button"
          onClick={minifyXml}
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
        Output XML
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

function YamlFormatterTool() {
  const [input, setInput] = useState("name: DevStudy\nversion: 1.0\nfeatures:\n  - chatbot\n  - tools");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function formatYaml() {
    try {
      const lines = input.trim().split("\n");
      const formatted = lines
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) return line;

          const indentMatch = line.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1].length : 0;
          const normalizedIndent = "  ".repeat(Math.floor(indent / 2));

          if (trimmed.includes(":")) {
            const [key, ...valueParts] = trimmed.split(":");
            const value = valueParts.join(":").trim();
            return normalizedIndent + key.trim() + ": " + (value || "");
          }

          return normalizedIndent + trimmed;
        })
        .join("\n");

      setOutput(formatted);
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Invalid YAML structure.";
      setError(message);
    }
  }

  function validateYaml() {
    try {
      const lines = input.trim().split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.trim().startsWith("#")) continue;

        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1].length : 0;

        if (indent % 2 !== 0) {
          throw new Error(`Line ${i + 1}: Indentation must be multiples of 2 spaces`);
        }

        const trimmed = line.trim();
        if (trimmed.includes(":") && !trimmed.startsWith("-")) {
          const colonIndex = trimmed.indexOf(":");
          if (colonIndex === 0) {
            throw new Error(`Line ${i + 1}: Key cannot be empty`);
          }
        }
      }

      setOutput("✓ YAML structure appears valid");
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Invalid YAML structure.";
      setError(message);
      setOutput("");
    }
  }

  async function copyOutput() {
    if (!output.trim()) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch (error) {
      console.error("Failed to copy YAML", error);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        Input YAML
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
          onClick={formatYaml}
          className="rounded-full bg-accent px-4 py-2 font-semibold text-accent-foreground transition hover:bg-accent/90"
        >
          Format
        </button>
        <button
          type="button"
          onClick={validateYaml}
          className="rounded-full border border-border px-4 py-2 font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
        >
          Validate
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
        Output
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

function CsvJsonConverterTool() {
  const [mode, setMode] = useState<"csv-to-json" | "json-to-csv">("csv-to-json");
  const [input, setInput] = useState("name,age,city\nAlice,30,NYC\nBob,25,LA");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function csvToJson() {
    try {
      const lines = input.trim().split("\n");
      if (lines.length < 2) {
        throw new Error("CSV must have at least a header row and one data row");
      }

      const headers = lines[0]!.split(",").map((h) => h.trim());
      const result = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]!.split(",").map((v) => v.trim());
        const obj: Record<string, string> = {};

        headers.forEach((header, index) => {
          obj[header] = values[index] ?? "";
        });

        result.push(obj);
      }

      setOutput(JSON.stringify(result, null, 2));
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Invalid CSV format.";
      setError(message);
    }
  }

  function jsonToCsv() {
    try {
      const data = JSON.parse(input.trim());
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("JSON must be a non-empty array of objects");
      }

      const headers = Object.keys(data[0] as Record<string, unknown>);
      const csvLines = [headers.join(",")];

      data.forEach((item) => {
        const values = headers.map((header) => {
          const value = (item as Record<string, unknown>)[header];
          const stringValue = String(value ?? "");
          return stringValue.includes(",") ? `"${stringValue}"` : stringValue;
        });
        csvLines.push(values.join(","));
      });

      setOutput(csvLines.join("\n"));
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Invalid JSON format.";
      setError(message);
    }
  }

  function handleConvert() {
    if (mode === "csv-to-json") {
      csvToJson();
    } else {
      jsonToCsv();
    }
  }

  async function copyOutput() {
    if (!output.trim()) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch (error) {
      console.error("Failed to copy converted data", error);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode("csv-to-json")}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            mode === "csv-to-json"
              ? "bg-accent text-accent-foreground"
              : "border border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent"
          }`}
        >
          CSV → JSON
        </button>
        <button
          type="button"
          onClick={() => setMode("json-to-csv")}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            mode === "json-to-csv"
              ? "bg-accent text-accent-foreground"
              : "border border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent"
          }`}
        >
          JSON → CSV
        </button>
      </div>
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        {mode === "csv-to-json" ? "CSV Input" : "JSON Input"}
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
          onClick={handleConvert}
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
        {error ? <span className="text-red-500">{error}</span> : null}
      </div>
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        {mode === "csv-to-json" ? "JSON Output" : "CSV Output"}
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

function MarkdownHtmlConverterTool() {
  const [mode, setMode] = useState<"md-to-html" | "html-to-md">("md-to-html");
  const [input, setInput] = useState("# Welcome to DevStudy\n\nThis is a **markdown** example with `code`.");
  const [output, setOutput] = useState("");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState<string | null>(null);

  function markdownToHtml() {
    try {
      let html = input
        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
        .replace(/\*(.*)\*/gim, "<em>$1</em>")
        .replace(/`([^`]+)`/gim, "<code>$1</code>")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
        .replace(/\n\n/gim, "</p><p>")
        .replace(/\n/gim, "<br>");

      html = "<p>" + html + "</p>";
      html = html.replace(/<p><h/g, "<h").replace(/<\/h([1-6])><\/p>/g, "</h$1>");

      setOutput(html);
      setPreview(html);
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Conversion failed.";
      setError(message);
    }
  }

  function htmlToMarkdown() {
    try {
      let md = input
        .replace(/<h1>(.*?)<\/h1>/gi, "# $1\n\n")
        .replace(/<h2>(.*?)<\/h2>/gi, "## $1\n\n")
        .replace(/<h3>(.*?)<\/h3>/gi, "### $1\n\n")
        .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
        .replace(/<b>(.*?)<\/b>/gi, "**$1**")
        .replace(/<em>(.*?)<\/em>/gi, "*$1*")
        .replace(/<i>(.*?)<\/i>/gi, "*$1*")
        .replace(/<code>(.*?)<\/code>/gi, "`$1`")
        .replace(/<a href="(.*?)">(.*?)<\/a>/gi, "[$2]($1)")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<p>/gi, "")
        .replace(/<[^>]+>/g, "");

      md = md.replace(/\n{3,}/g, "\n\n").trim();

      setOutput(md);
      setPreview("");
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Conversion failed.";
      setError(message);
    }
  }

  function handleConvert() {
    if (mode === "md-to-html") {
      markdownToHtml();
    } else {
      htmlToMarkdown();
    }
  }

  async function copyOutput() {
    if (!output.trim()) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch (error) {
      console.error("Failed to copy output", error);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode("md-to-html")}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            mode === "md-to-html"
              ? "bg-accent text-accent-foreground"
              : "border border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent"
          }`}
        >
          MD → HTML
        </button>
        <button
          type="button"
          onClick={() => setMode("html-to-md")}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            mode === "html-to-md"
              ? "bg-accent text-accent-foreground"
              : "border border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent"
          }`}
        >
          HTML → MD
        </button>
      </div>
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        Input
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="min-h-[120px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          spellCheck={false}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={handleConvert}
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
        {error ? <span className="text-red-500">{error}</span> : null}
      </div>
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        Output
        <textarea
          value={output}
          onChange={(event) => setOutput(event.target.value)}
          className="min-h-[120px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          spellCheck={false}
        />
      </label>
      {preview && (
        <div className="rounded-xl border border-border bg-surface/60 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">Preview</p>
          <div className="prose prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: preview }} />
        </div>
      )}
    </div>
  );
}

function SqlFormatterTool() {
  const [input, setInput] = useState("SELECT * FROM users WHERE age > 18 AND status='active' ORDER BY name");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function formatSql() {
    try {
      const keywords = [
        "SELECT", "FROM", "WHERE", "JOIN", "INNER", "LEFT", "RIGHT", "OUTER",
        "ON", "AND", "OR", "ORDER BY", "GROUP BY", "HAVING", "LIMIT", "OFFSET",
        "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "TABLE",
        "ALTER", "DROP", "INDEX", "VIEW", "UNION", "AS", "DISTINCT", "COUNT",
        "SUM", "AVG", "MIN", "MAX", "CASE", "WHEN", "THEN", "ELSE", "END"
      ];

      let formatted = input.trim();

      keywords.forEach((keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, "gi");
        formatted = formatted.replace(regex, keyword.toUpperCase());
      });

      formatted = formatted
        .replace(/\s+/g, " ")
        .replace(/,/g, ",\n  ")
        .replace(/\bFROM\b/gi, "\nFROM")
        .replace(/\bWHERE\b/gi, "\nWHERE")
        .replace(/\bAND\b/gi, "\n  AND")
        .replace(/\bOR\b/gi, "\n  OR")
        .replace(/\bJOIN\b/gi, "\nJOIN")
        .replace(/\bINNER JOIN\b/gi, "\nINNER JOIN")
        .replace(/\bLEFT JOIN\b/gi, "\nLEFT JOIN")
        .replace(/\bRIGHT JOIN\b/gi, "\nRIGHT JOIN")
        .replace(/\bON\b/gi, "\n  ON")
        .replace(/\bORDER BY\b/gi, "\nORDER BY")
        .replace(/\bGROUP BY\b/gi, "\nGROUP BY")
        .replace(/\bHAVING\b/gi, "\nHAVING")
        .replace(/\bLIMIT\b/gi, "\nLIMIT")
        .replace(/\bUNION\b/gi, "\nUNION");

      setOutput(formatted);
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "SQL formatting failed.";
      setError(message);
    }
  }

  function minifySql() {
    try {
      const minified = input
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\s*,\s*/g, ",")
        .replace(/\s*=\s*/g, "=")
        .replace(/\s*<\s*/g, "<")
        .replace(/\s*>\s*/g, ">")
        .replace(/\s*\(\s*/g, "(")
        .replace(/\s*\)\s*/g, ")");

      setOutput(minified);
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "SQL minification failed.";
      setError(message);
    }
  }

  async function copyOutput() {
    if (!output.trim()) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch (error) {
      console.error("Failed to copy SQL", error);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        Input SQL
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
          onClick={formatSql}
          className="rounded-full bg-accent px-4 py-2 font-semibold text-accent-foreground transition hover:bg-accent/90"
        >
          Format
        </button>
        <button
          type="button"
          onClick={minifySql}
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
        Output SQL
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

function RegexTesterTool() {
  const [pattern, setPattern] = useState("\\b[A-Z][a-z]+\\b");
  const [flags, setFlags] = useState("g");
  const [testString, setTestString] = useState("Hello World Test Example");
  const [matches, setMatches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function testRegex() {
    try {
      const regex = new RegExp(pattern, flags);
      const results = testString.match(regex);

      if (results) {
        setMatches(results);
        setError(null);
      } else {
        setMatches([]);
        setError("No matches found");
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Invalid regex pattern.";
      setError(message);
      setMatches([]);
    }
  }

  function getHighlightedText() {
    if (matches.length === 0) return testString;

    try {
      const regex = new RegExp(pattern, flags);
      return testString.replace(regex, (match) => `<mark class="bg-accent/30 px-1 rounded">${match}</mark>`);
    } catch {
      return testString;
    }
  }

  async function copyPattern() {
    try {
      await navigator.clipboard.writeText(`/${pattern}/${flags}`);
    } catch (error) {
      console.error("Failed to copy regex", error);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Regex Pattern
          <input
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="\b[A-Z][a-z]+\b"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Flags
          <input
            value={flags}
            onChange={(event) => setFlags(event.target.value)}
            className="w-20 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="gim"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
        Test String
        <textarea
          value={testString}
          onChange={(event) => setTestString(event.target.value)}
          className="min-h-[100px] rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={testRegex}
          className="rounded-full bg-accent px-4 py-2 font-semibold text-accent-foreground transition hover:bg-accent/90"
        >
          Test Regex
        </button>
        <button
          type="button"
          onClick={copyPattern}
          className="rounded-full border border-border px-4 py-2 font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
        >
          Copy Pattern
        </button>
        {error ? <span className="text-red-500">{error}</span> : null}
      </div>

      <div className="rounded-xl border border-border bg-surface/60 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Matches: {matches.length}
        </p>
        <div
          className="mb-3 text-sm font-mono leading-relaxed"
          dangerouslySetInnerHTML={{ __html: getHighlightedText() }}
        />
        {matches.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Match List:</p>
            <div className="flex flex-wrap gap-2">
              {matches.map((match, index) => (
                <span
                  key={index}
                  className="rounded-lg border border-accent/30 bg-accent/10 px-2 py-1 text-xs font-mono"
                >
                  {match}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function generateIds(count: number) {
  return Array.from({ length: Math.min(Math.max(count, 1), 20) }, () => crypto.randomUUID());
}
