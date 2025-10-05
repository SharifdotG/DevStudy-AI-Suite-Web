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

export const MODEL_GROUPS: ModelGroup[] = RAW_MODEL_GROUPS.map((group) => ({
  id: group.id,
  label: group.label,
  options: group.options.map((option) => ({
    id: option.id,
    label: option.label,
    description: option.description,
  })),
}));

export const MODEL_OPTIONS: ModelOption[] = MODEL_GROUPS.flatMap((group) => group.options);

const DEFAULT_MODEL_ID = "openrouter/auto:free";

export const DEFAULT_MODEL =
  MODEL_OPTIONS.find((option) => option.id === DEFAULT_MODEL_ID)?.id ?? MODEL_OPTIONS[0]!.id;

export type SettingsContextValue = {
  apiKey: string;
  defaultModel: string;
  setApiKey: (key: string) => void;
  setDefaultModel: (modelId: string) => void;
  clearApiKey: () => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState("");
  const [defaultModel, setDefaultModelState] = useState(DEFAULT_MODEL);
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

    if (storedModel && MODEL_OPTIONS.some((option) => option.id === storedModel)) {
      setDefaultModelState(storedModel);
    } else {
      setDefaultModelState(DEFAULT_MODEL);
    }
  }, [apiKeyStorageKey, modelStorageKey, storageNamespace]);

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

  const setDefaultModel = useCallback((modelId: string) => {
    const fallback = MODEL_OPTIONS.some((option) => option.id === modelId)
      ? modelId
      : DEFAULT_MODEL;
    setDefaultModelState(fallback);

    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(modelStorageKey, fallback);
  }, [modelStorageKey]);

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

  const value = useMemo<SettingsContextValue>(
    () => ({
      apiKey,
      defaultModel,
      setApiKey,
      setDefaultModel,
      clearApiKey,
    }),
    [apiKey, defaultModel, setApiKey, setDefaultModel, clearApiKey],
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
