"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSettings } from "@/app/_components/settings-context";

type ApiKeySettingsCardProps = {
  initialStatus: "present" | "absent";
};

export function ApiKeySettingsCard({ initialStatus }: ApiKeySettingsCardProps) {
  const {
    apiKey,
    setApiKey,
    clearApiKey,
    defaultModel,
    setDefaultModel,
    modelGroups,
    modelOptions,
    modelsLoading,
    modelsError,
    refreshModels,
  } = useSettings();
  const [input, setInput] = useState(apiKey);
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"present" | "absent">(initialStatus);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput(apiKey);
    setSelectedModel(defaultModel);
  }, [apiKey, defaultModel]);

  useEffect(() => {
    setStatus(apiKey.trim() ? "present" : "absent");
  }, [apiKey]);

  useEffect(() => {
    if (!modelOptions.some((option) => option.id === selectedModel) && modelOptions.length) {
      setSelectedModel(modelOptions[0]!.id);
    }
  }, [modelOptions, selectedModel]);

  const modelDescriptions = useMemo(
    () => new Map(modelOptions.map((option) => [option.id, option.description])),
    [modelOptions],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();

    if (!trimmed) {
      setMessage("Add your OpenRouter key before saving.");
      return;
    }

    setApiKey(trimmed);
    setDefaultModel(selectedModel);
    setMessage("Key saved for this browser. You can update or clear it anytime.");
  }

  function handleClear() {
    clearApiKey();
    setInput("");
    setMessage("Key removed. Paste a new key to unlock AI features.");
    inputRef.current?.focus();
  }

  return (
    <div className="rounded-3xl border border-border/60 bg-surface/95 p-6 text-sm text-foreground/70 shadow-[0_12px_28px_rgba(15,23,42,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">API key & defaults</h2>
          <p className="mt-2 text-foreground/60">
            Store your personal OpenRouter key locally. We only sync a presence flag to Supabase so you know this device is
            ready.
          </p>
        </div>
        <span
          className={
            status === "present"
              ? "rounded-full border border-emerald-400 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-400"
              : "rounded-full border border-amber-400 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-500"
          }
        >
          {status === "present" ? "Key linked" : "Key missing"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          OpenRouter API key
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="sk-or-v1-..."
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            type="password"
            autoComplete="off"
          />
        </label>
        <p className="text-xs text-foreground/60">
          The suite never stores your key on the server. Rotate or revoke it from your OpenRouter dashboard anytime.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90"
          >
            Save key
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/60 transition hover:bg-foreground/10"
          >
            Remove key
          </button>
        </div>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Default model
          <select
            value={selectedModel}
            onChange={(event) => setSelectedModel(event.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          >
            {modelGroups.length ? (
              modelGroups.map((group) => (
                <optgroup key={group.id} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))
            ) : (
              <option value="">No models available</option>
            )}
          </select>
        </label>
        <p className="text-xs text-foreground/60">
          {modelDescriptions.get(selectedModel) ?? "Select a model to view its description."}
        </p>
        {modelsLoading ? (
          <p className="text-xs text-foreground/50">Syncing free models from OpenRouter...</p>
        ) : null}
        {modelsError ? (
          <div className="rounded-xl border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <p>{modelsError}</p>
            <button
              type="button"
              onClick={() => {
                void refreshModels();
              }}
              className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-400 px-3 py-1 font-semibold text-amber-700 transition hover:border-amber-500 hover:text-amber-800"
            >
              Retry
            </button>
          </div>
        ) : null}
      </form>

      {message ? (
        <p className="mt-4 text-xs text-foreground/60" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
