"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import { updateProfile, type ProfileActionState } from "./actions";

const INITIAL_STATE: ProfileActionState = { status: "idle" };

type ProfileFormProps = {
  displayName: string;
  avatarUrl: string | null;
};

export function ProfileForm({ displayName, avatarUrl }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfile, INITIAL_STATE);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(avatarUrl ?? null);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (state.status === "error" || state.status === "success") {
      setFeedback(state.message ?? null);
    }
  }, [state]);

  useEffect(() => {
    if (state.status === "success") {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setRemoveAvatar(false);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    }
  }, [state.status]);

  useEffect(() => {
    setLocalPreview(avatarUrl ?? null);
  }, [avatarUrl]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const initials = useMemo(() => {
    if (!displayName) {
      return "?";
    }

    const parts = displayName.trim().split(/\s+/);
    const first = parts[0]?.charAt(0);
    const second = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) : "";
    return `${first ?? ""}${second ?? ""}`.toUpperCase() || "?";
  }, [displayName]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setLocalPreview(nextUrl);
    setRemoveAvatar(false);
  };

  const handleRemoveAvatar = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setLocalPreview(null);
    setRemoveAvatar(true);
  };

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-3xl border border-border/60 bg-surface/95 p-6 shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
    >
      <div>
        <h2 className="text-base font-semibold text-foreground">Profile details</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Update your display name and upload a photo so your study spaces feel personal across devices.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-accent/25 via-accent/15 to-transparent text-lg font-semibold text-foreground/80">
          {localPreview ? (
            <Image
              src={localPreview}
              alt="Current avatar preview"
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-background/60">
              {initials}
            </div>
          )}
        </div>
        <div className="flex-1 space-y-3 text-sm">
          <input
            ref={fileInputRef}
            id="avatarFile"
            name="avatarFile"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="avatarFile"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/70 px-4 py-2 font-semibold text-foreground/80 transition hover:border-accent hover:text-accent"
            >
              Upload new
            </label>
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="inline-flex items-center gap-2 rounded-full border border-transparent px-4 py-2 font-semibold text-foreground/60 transition hover:text-rose-500"
              disabled={!localPreview}
            >
              Remove photo
            </button>
          </div>
          <p className="text-xs text-foreground/50">PNG, JPG, AVIF, or WebP up to 2MB.</p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="displayName" className="block text-sm font-semibold text-foreground/80">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={displayName}
          required
          className="w-full rounded-xl border border-border/70 bg-background/95 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
        />
      </div>

      <input type="hidden" name="removeAvatar" value={removeAvatar ? "true" : "false"} />

      <div className="flex items-center justify-between gap-3">
        {feedback ? (
          <div
            role="status"
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${
              state.status === "error"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
            }`}
          >
            {feedback}
          </div>
        ) : (
          <span className="text-xs text-foreground/50">Changes sync to Supabase instantly.</span>
        )}
        <ProfileSubmitButton />
      </div>
    </form>
  );
}

function ProfileSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-accent/50"
    >
      {pending ? "Saving..." : "Save changes"}
    </button>
  );
}
