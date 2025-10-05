"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginWithEmail, signInWithGoogle, type AuthState } from "../actions";
import { PasswordField } from "../_components/password-field";

const INITIAL_STATE: AuthState = { status: "idle" };

type LoginFormProps = {
  initialMessage?: string;
};

export function LoginForm({ initialMessage }: LoginFormProps) {
  const [state, formAction] = useActionState(loginWithEmail, INITIAL_STATE);
  const [feedback, setFeedback] = useState<string | null>(initialMessage ?? null);

  useEffect(() => {
    if (state.status === "error" && state.message) {
      setFeedback(state.message);
    }
  }, [state]);

  useEffect(() => {
    if (initialMessage) {
      setFeedback(initialMessage);
    }
  }, [initialMessage]);

  const inputClasses =
    "w-full rounded-xl border border-border/70 bg-background/95 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40";

  return (
    <div className="mt-8 space-y-6">
      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-semibold text-foreground/80">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={`${inputClasses}`}
            placeholder="you@example.com"
            inputMode="email"
          />
        </div>
        <PasswordField
          id="password"
          name="password"
          label="Password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
        <LoginSubmitButton />
        {feedback ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-500"
          >
            {feedback}
          </div>
        ) : null}
      </form>
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-foreground/40">
        <span className="flex-1 border-t border-border/60" aria-hidden />
        <span>Or</span>
        <span className="flex-1 border-t border-border/60" aria-hidden />
      </div>
      <form action={signInWithGoogle}>
        <OAuthButton label="Continue with Google" />
      </form>
    </div>
  );
}

function LoginSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-accent/50"
    >
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

function OAuthButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const text = useMemo(() => (pending ? "Redirecting..." : label), [pending, label]);

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 py-2 text-sm font-semibold text-foreground/80 shadow-sm transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span aria-hidden>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
        >
          <path d="M21.6 12.23c0-.74-.07-1.45-.19-2.14H12v4.05h5.38a4.58 4.58 0 0 1-1.98 3 4.85 4.85 0 0 1-3.4 1.24 5.92 5.92 0 0 1-3.75-1.33 6 6 0 0 1-2.12-3.25 6.46 6.46 0 0 1 .35-4.13 5.95 5.95 0 0 1 2.78-3.19 5.55 5.55 0 0 1 3.14-.87c1.53 0 2.82.5 3.87 1.49l2.8-2.75A9.27 9.27 0 0 0 12.34 3a9.77 9.77 0 0 0-6.46 2.3 9.93 9.93 0 0 0-3.26 6.75 9.63 9.63 0 0 0 3.26 6.73 9.93 9.93 0 0 0 6.46 2.28c1.9 0 3.6-.47 5.07-1.4a9.51 9.51 0 0 0 3.31-3.56 10.4 10.4 0 0 0 1.28-4.87Z" fill="currentColor" />
        </svg>
      </span>
      {text}
    </button>
  );
}
