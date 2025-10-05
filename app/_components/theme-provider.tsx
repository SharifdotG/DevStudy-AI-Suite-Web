"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "devstudy-theme-preference";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

type ThemePreference = "light" | "dark" | "system";
type Theme = "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: Theme;
  setPreference: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
function normalizePreference(preference: ThemePreference | null | undefined): ThemePreference {
  if (preference === "light" || preference === "dark" || preference === "system") {
    return preference;
  }
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<Theme>("light");

  const syncTheme = useCallback((nextPreference: ThemePreference) => {
    if (typeof window === "undefined") {
      return nextPreference === "dark" ? "dark" : "light";
    }

    const prefersDark =
      typeof window.matchMedia === "function" && window.matchMedia(MEDIA_QUERY).matches;
    const resolved = nextPreference === "system" ? (prefersDark ? "dark" : "light") : nextPreference;

    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;

    return resolved;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let stored: ThemePreference | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    } catch {
      stored = null;
    }

    const normalized = normalizePreference(stored);
    setPreferenceState(normalized);
    setResolvedTheme(syncTheme(normalized));
  }, [syncTheme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia(MEDIA_QUERY);
    const handleChange = () => {
      if (preference === "system") {
        setResolvedTheme(syncTheme("system"));
      }
    };

    media.addEventListener("change", handleChange);
    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, [preference, syncTheme]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      if (typeof window !== "undefined") {
        try {
          if (next === "system") {
            window.localStorage.removeItem(STORAGE_KEY);
          } else {
            window.localStorage.setItem(STORAGE_KEY, next);
          }
        } catch {
          // Ignore storage access failures (e.g., private browsing restrictions).
        }
      }

      setResolvedTheme(syncTheme(next));
    },
    [syncTheme],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
    }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}

export type { ThemePreference };
