"use client";

import { useState } from "react";

export type SummaryMode = "concise" | "outline" | "flashcards";

export const DEFAULT_SUMMARY_MODE: SummaryMode = "concise";

const MODES: Array<{ id: SummaryMode; label: string; description: string }> = [
  {
    id: "concise",
    label: "Concise",
    description: "5-7 bullet recap for quick review.",
  },
  {
    id: "outline",
    label: "Outline",
    description: "Hierarchical structure of major points.",
  },
  {
    id: "flashcards",
    label: "Flashcards",
    description: "6 Q/A pairs to drill the key ideas.",
  },
];

export function ModeToggle({ value, onChange }: { value: SummaryMode; onChange: (mode: SummaryMode) => void }) {
  const [focused, setFocused] = useState<SummaryMode | null>(null);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {MODES.map((mode) => {
        const active = mode.id === value;
        const isFocused = focused === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onFocus={() => setFocused(mode.id)}
            onBlur={() => setFocused(null)}
            onMouseEnter={() => setFocused(mode.id)}
            onMouseLeave={() => setFocused(null)}
            onClick={() => onChange(mode.id)}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              active
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border bg-background text-foreground/80 hover:border-accent/60 hover:text-foreground"
            } ${isFocused && !active ? "border-accent/60" : ""}`}
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
  );
}
