"use client";

import { useMemo, useState } from "react";

export type SummaryMode =
  | "academic"
  | "bullets"
  | "outline"
  | "mindmap"
  | "qa"
  | "comparison"
  | "flashcards"
  | "roadmap"
  | "quiz";

export const DEFAULT_SUMMARY_MODE: SummaryMode = "academic";

const MODE_DEFINITIONS: Array<{ id: SummaryMode; label: string; description: string; category: "notes" | "study" }>
  = [
    {
      id: "academic",
      label: "Academic",
      description: "Formal prose with inline citations and key terms defined.",
      category: "notes",
    },
    {
      id: "bullets",
      label: "Bullets",
      description: "Concise bullet list highlighting takeaways and action items.",
      category: "notes",
    },
    {
      id: "outline",
      label: "Outline",
      description: "Hierarchical outline with headings and supporting points.",
      category: "notes",
    },
    {
      id: "mindmap",
      label: "Mind Map",
      description: "Indented tree showing relationships between core ideas.",
      category: "notes",
    },
    {
      id: "qa",
      label: "Q&A",
      description: "List of likely exam questions with model answers.",
      category: "notes",
    },
    {
      id: "comparison",
      label: "Comparison",
      description: "Markdown table comparing related concepts side-by-side.",
      category: "notes",
    },
    {
      id: "flashcards",
      label: "Flashcards",
      description: "Six spaced-repetition flashcards formatted as Q/A pairs.",
      category: "study",
    },
    {
      id: "roadmap",
      label: "Roadmap",
      description: "Step-by-step study roadmap with estimated focus time.",
      category: "study",
    },
    {
      id: "quiz",
      label: "Quiz",
      description: "Mixed-format quiz (MCQ, short answer, essay prompts).",
      category: "study",
    },
  ];

export function ModeToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: SummaryMode;
  onChange: (mode: SummaryMode) => void;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState<SummaryMode | null>(null);

  const groupedModes = useMemo(() => {
    return MODE_DEFINITIONS.reduce(
      (acc, mode) => {
        acc[mode.category].push(mode);
        return acc;
      },
      {
        notes: [] as Array<(typeof MODE_DEFINITIONS)[number]>,
        study: [] as Array<(typeof MODE_DEFINITIONS)[number]>,
      },
    );
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {(["notes", "study"] as const).map((section) => (
        <div key={section} className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
            {section === "notes" ? "Note formats" : "Study boosters"}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {groupedModes[section].map((mode) => {
              const active = mode.id === value;
              const isFocused = focused === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  disabled={disabled}
                  onFocus={() => setFocused(mode.id)}
                  onBlur={() => setFocused(null)}
                  onMouseEnter={() => setFocused(mode.id)}
                  onMouseLeave={() => setFocused(null)}
                  onClick={() => onChange(mode.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border bg-background text-foreground/80 hover:border-accent/60 hover:text-foreground"
                  } ${
                    isFocused && !active ? "border-accent/60" : ""
                  } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{mode.label}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        active ? "bg-accent" : isFocused ? "bg-foreground/40" : "bg-border"
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-2 text-xs text-foreground/60">{mode.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
