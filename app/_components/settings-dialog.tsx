"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSettings } from "./settings-context";

type SettingsDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
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
  const [status, setStatus] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setInput(apiKey);
      setSelectedModel(defaultModel);
      setStatus(null);
    }
  }, [open, apiKey, defaultModel]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!modelOptions.some((option) => option.id === selectedModel) && modelOptions.length) {
      setSelectedModel(modelOptions[0]!.id);
    }
  }, [modelOptions, selectedModel]);

  const modelDescriptions = useMemo(() => {
    return new Map(modelOptions.map((option) => [option.id, option.description]));
  }, [modelOptions]);

  if (!open) {
    return null;
  }

  function handleOverlayClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === overlayRef.current) {
      onClose();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim()) {
      setStatus("Enter your OpenRouter API key before saving.");
      return;
    }

    setApiKey(input.trim());
    setDefaultModel(selectedModel);
    setStatus("Saved. You can update or clear it anytime.");
  }

  function handleClear() {
    clearApiKey();
    setInput("");
    setStatus("Key removed. AI features will stay locked until you add one.");
  }
  return (
    <div
      ref={overlayRef}
      role="presentation"
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/30 px-4 backdrop-blur"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl"
      >
        <header className="flex items-start justify-between">
          <div>
            <h2 id="settings-title" className="text-xl font-semibold">
              Settings
            </h2>
            <p className="mt-1 text-sm text-foreground/70">
              Store your personal OpenRouter API key locally to unlock AI features.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-semibold text-foreground/60 hover:bg-foreground/10"
          >
            Close
          </button>
        </header>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            OpenRouter API key
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="sk-or-v1-..."
              className="rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              type="password"
              autoComplete="off"
            />
          </label>
          <p className="text-xs text-foreground/60">
            Keys stay in your browser only. Rotate them in OpenRouter settings if they get compromised.
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
              className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/60 hover:bg-foreground/10"
            >
              Remove key
            </button>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Default model
            <select
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
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
        {status ? (
          <p className="mt-4 text-xs text-foreground/60" role="status">
            {status}
          </p>
        ) : null}
      </div>
    </div>
  );
}
