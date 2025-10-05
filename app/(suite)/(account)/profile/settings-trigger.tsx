"use client";

import { useCallback, type ReactNode } from "react";

type SettingsTriggerProps = {
  className?: string;
  children: ReactNode;
};

export function SettingsTrigger({ className, children }: SettingsTriggerProps) {
  const handleClick = useCallback(() => {
    const settingsButton = document.querySelector<HTMLButtonElement>("button[aria-label='Open settings']");
    settingsButton?.click();
  }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
    >
      {children}
    </button>
  );
}
