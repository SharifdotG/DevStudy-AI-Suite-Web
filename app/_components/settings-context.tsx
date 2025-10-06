"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { MODEL_GROUPS as RAW_MODEL_GROUPS } from "../_data/free-model-groups";
import { useSupabase } from "./supabase-provider";
import { updateApiKeyStatus } from "@/app/(suite)/(account)/profile/actions";

const STORAGE_KEY = "devstudy-openrouter-key";
const MODEL_STORAGE_KEY = "devstudy-default-model";

export type ModelOption = {
  id: string;
  label: string;
  description: string;
};

export type ModelGroup = {
  id: string;
  label: string;
  options: ModelOption[];
};

const FALLBACK_MODEL_GROUPS: ModelGroup[] = RAW_MODEL_GROUPS.map((group) => ({
  id: group.id,
  label: group.label,
  options: group.options.map((option) => ({
    id: option.id,
    label: option.label,
    description: option.description,
  })),
}));

export const MODEL_GROUPS = FALLBACK_MODEL_GROUPS;

function cloneGroups(groups: ModelGroup[]): ModelGroup[] {
  return groups.map((group) => ({
    id: group.id,
    label: group.label,
    options: group.options.map((option) => ({
      id: option.id,
      label: option.label,
      description: option.description,
    })),
  }));
}

function flattenOptions(groups: ModelGroup[]): ModelOption[] {
  return groups.flatMap((group) => group.options.map((option) => ({ ...option })));
}

const FALLBACK_MODEL_OPTIONS = flattenOptions(FALLBACK_MODEL_GROUPS);

const DEFAULT_MODEL_ID = "openrouter/auto:free";

export const DEFAULT_MODEL = DEFAULT_MODEL_ID;

type FetchModelsOptions = {
  signal?: AbortSignal;
  suppressMissingKeyError?: boolean;
};

function deriveDefaultModelId(options: ModelOption[]): string {
  if (!options.length) {
    return DEFAULT_MODEL_ID;
  }

  return options.find((option) => option.id === DEFAULT_MODEL_ID)?.id ?? options[0]!.id;
}

function sanitizeRemoteGroups(value: unknown): ModelGroup[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const sanitized: ModelGroup[] = [];

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const group = candidate as Partial<ModelGroup>;
    if (typeof group.id !== "string" || !group.id.trim() || typeof group.label !== "string" || !group.label.trim()) {
      continue;
    }

    if (!Array.isArray(group.options)) {
      continue;
    }

    const options: ModelOption[] = [];
    for (const rawOption of group.options) {
      if (!rawOption || typeof rawOption !== "object") {
        continue;
      }

      const option = rawOption as Partial<ModelOption>;
      if (typeof option.id !== "string" || !option.id.trim()) {
        continue;
      }

      if (typeof option.label !== "string" || !option.label.trim()) {
        continue;
      }

      if (typeof option.description !== "string" || !option.description.trim()) {
        continue;
      }

      options.push({
        id: option.id,
        label: option.label,
        description: option.description,
      });
    }

    if (!options.length) {
      continue;
    }

    sanitized.push({
      id: group.id,
      label: group.label,
      options,
    });
  }

  return sanitized.length ? sanitized : null;
}

export type SettingsContextValue = {
  apiKey: string;
  defaultModel: string;
  setApiKey: (key: string) => void;
  setDefaultModel: (modelId: string) => void;
  clearApiKey: () => void;
  modelGroups: ModelGroup[];
  modelOptions: ModelOption[];
  modelsLoading: boolean;
  modelsError: string | null;
  refreshModels: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState("");
  const [modelGroups, setModelGroups] = useState<ModelGroup[]>(() => cloneGroups(FALLBACK_MODEL_GROUPS));
  const modelOptions = useMemo(() => flattenOptions(modelGroups), [modelGroups]);
  const [defaultModel, setDefaultModelState] = useState(() => deriveDefaultModelId(FALLBACK_MODEL_OPTIONS));
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const { session } = useSupabase();
  const [, startTransition] = useTransition();
  const storageNamespace = session?.user?.id ?? "guest";
  const apiKeyStorageKey = useMemo(() => `${STORAGE_KEY}::${storageNamespace}`, [storageNamespace]);
  const modelStorageKey = useMemo(() => `${MODEL_STORAGE_KEY}::${storageNamespace}`, [storageNamespace]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let storedKey = window.localStorage.getItem(apiKeyStorageKey);
    if (!storedKey && storageNamespace === "guest") {
      storedKey = window.localStorage.getItem(STORAGE_KEY);
    }
    setApiKeyState(storedKey ?? "");

    let storedModel = window.localStorage.getItem(modelStorageKey);
    if (!storedModel && storageNamespace === "guest") {
      storedModel = window.localStorage.getItem(MODEL_STORAGE_KEY);
    }

    if (storedModel && modelOptions.some((option) => option.id === storedModel)) {
      setDefaultModelState(storedModel);
    } else {
      setDefaultModelState(deriveDefaultModelId(modelOptions));
    }
  }, [apiKeyStorageKey, modelStorageKey, storageNamespace, modelOptions]);

  useEffect(() => {
    if (!modelOptions.length) {
      return;
    }

    if (!modelOptions.some((option) => option.id === defaultModel)) {
      const fallback = deriveDefaultModelId(modelOptions);
      if (fallback !== defaultModel) {
        setDefaultModelState(fallback);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(modelStorageKey, fallback);
        }
      }
    }
  }, [modelOptions, defaultModel, modelStorageKey]);

  const setApiKey = useCallback(
    (value: string) => {
      setApiKeyState(value);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(apiKeyStorageKey, value);
      }

      if (session) {
        startTransition(() => {
          updateApiKeyStatus("present").catch((error) => {
            console.error("Failed to sync API key status", error);
          });
        });
      }
    },
    [apiKeyStorageKey, session, startTransition],
  );

  const setDefaultModel = useCallback(
    (modelId: string) => {
      const fallback = modelOptions.some((option) => option.id === modelId)
        ? modelId
        : deriveDefaultModelId(modelOptions);
      setDefaultModelState(fallback);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(modelStorageKey, fallback);
      }
    },
    [modelOptions, modelStorageKey],
  );

  const clearApiKey = useCallback(() => {
    setApiKeyState("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(apiKeyStorageKey);
    }

    if (session) {
      startTransition(() => {
        updateApiKeyStatus("absent").catch((error) => {
          console.error("Failed to sync API key status", error);
        });
      });
    }
  }, [apiKeyStorageKey, session, startTransition]);

  const fetchModels = useCallback(
    async ({ signal, suppressMissingKeyError }: FetchModelsOptions = {}) => {
      const trimmedKey = apiKey.trim();
      if (!trimmedKey) {
        if (!suppressMissingKeyError) {
          setModelsError("Add your OpenRouter key to load the latest model catalog.");
        } else {
          setModelsError(null);
        }
        setModelsLoading(false);
        setModelGroups(cloneGroups(FALLBACK_MODEL_GROUPS));
        return;
      }

      setModelsLoading(true);
      setModelsError(null);

      try {
        const response = await fetch("/api/openrouter/models", {
          method: "GET",
          headers: {
            "x-openrouter-key": trimmedKey,
          },
          cache: "no-store",
          signal,
        });

        if (!response.ok) {
          let details: string | null = null;
          try {
            const body = (await response.json()) as Record<string, unknown>;
            if (typeof body.error === "string" && body.error.trim()) {
              details = body.error.trim();
            } else if (typeof body.details === "string" && body.details.trim()) {
              details = body.details.trim();
            }
          } catch (parseError) {
            if (parseError instanceof Error) {
              details = parseError.message;
            }
          }

          const message = details
            ? `OpenRouter responded with ${response.status}: ${details}`
            : `OpenRouter responded with status ${response.status}.`;

          setModelsError(message);
          setModelGroups(cloneGroups(FALLBACK_MODEL_GROUPS));
          return;
        }

        const payload = (await response.json()) as { groups?: unknown };
        const sanitized = sanitizeRemoteGroups(payload.groups);
        if (sanitized && sanitized.length) {
          setModelGroups(sanitized);
        } else {
          setModelGroups(cloneGroups(FALLBACK_MODEL_GROUPS));
        }
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        setModelsError(`Unable to load OpenRouter models: ${message}`);
        setModelGroups(cloneGroups(FALLBACK_MODEL_GROUPS));
      } finally {
        if (!signal?.aborted) {
          setModelsLoading(false);
        }
      }
    },
    [apiKey],
  );

  const refreshModels = useCallback(async () => {
    await fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setModelGroups(cloneGroups(FALLBACK_MODEL_GROUPS));
      setModelsLoading(false);
      setModelsError(null);
      return;
    }

    const controller = new AbortController();
    fetchModels({ signal: controller.signal, suppressMissingKeyError: true }).catch(() => undefined);
    return () => {
      controller.abort();
    };
  }, [apiKey, fetchModels]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      apiKey,
      defaultModel,
      setApiKey,
      setDefaultModel,
      clearApiKey,
      modelGroups,
      modelOptions,
      modelsLoading,
      modelsError,
      refreshModels,
    }),
    [
      apiKey,
      defaultModel,
      setApiKey,
      setDefaultModel,
      clearApiKey,
      modelGroups,
      modelOptions,
      modelsLoading,
      modelsError,
      refreshModels,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }

  return context;
}
