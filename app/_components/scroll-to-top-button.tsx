"use client";

import { useEffect, useState } from "react";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleScroll = () => {
      setVisible(window.scrollY > 240);
    };

    handleScroll();
  window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!visible) {
    return null;
  }

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Scroll to top"
      className="fixed bottom-24 right-4 z-[900] inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 text-sm font-semibold text-foreground shadow-lg shadow-background/20 transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:bottom-8 sm:right-8"
    >
      <span aria-hidden="true">↑</span>
      <span className="hidden sm:inline">Top</span>
    </button>
  );
}
