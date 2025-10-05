"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const triggerAnimation = () => {
    setIsAnimating(true);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setIsAnimating(false);
      timeoutRef.current = null;
    }, 240);
  };

  const handleToggle = () => {
    if (preference === "system") {
      setPreference(resolvedTheme === "dark" ? "light" : "dark");
      triggerAnimation();
      return;
    }

    setPreference(preference === "dark" ? "light" : "dark");
    triggerAnimation();
  };

  const icon = resolvedTheme === "dark" ? "☼" : "☾";

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Toggle theme"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <span
        aria-hidden="true"
        className={`font-mono text-lg transition-transform duration-300 ease-out ${isAnimating ? "rotate-180 scale-110" : ""}`}
      >
        {icon}
      </span>
    </button>
  );
}
