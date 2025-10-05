"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

type PasswordFieldProps = {
  label: string;
  message?: string;
  inputClassName?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordField({
  id,
  name,
  label,
  message,
  inputClassName,
  ...props
}: PasswordFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [isVisible, setIsVisible] = useState(false);
  const { autoComplete = "current-password", ...rest } = props;

  const toggleVisibility = () => {
    setIsVisible((prev) => !prev);
  };

  const baseInputClasses =
    "w-full rounded-xl border border-border/70 bg-background/95 px-3 py-2 pr-20 text-sm text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40";

  const mergedClasses = inputClassName ? `${baseInputClasses} ${inputClassName}` : baseInputClasses;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-semibold text-foreground/80">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={isVisible ? "text" : "password"}
          autoComplete={autoComplete}
          className={mergedClasses}
          {...rest}
        />
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/60 transition hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-pressed={isVisible}
          aria-label={`${isVisible ? "Hide" : "Show"} password`}
        >
          {isVisible ? "Hide" : "Show"}
        </button>
      </div>
      {message ? <p className="text-xs text-foreground/60">{message}</p> : null}
    </div>
  );
}
