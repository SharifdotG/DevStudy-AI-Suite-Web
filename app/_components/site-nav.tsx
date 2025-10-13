"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Lineicons } from "@lineiconshq/react-lineicons";
import {
  Home2Outlined,
  Comment1Outlined,
  Hammer1Outlined,
  Notebook1Outlined,
  Key1Outlined,
  CheckCircle1Outlined,
  XmarkCircleOutlined,
  User4Outlined,
  ExitOutlined,
  EnterOutlined,
} from "@lineiconshq/free-icons";
import { useSettings } from "./settings-context";
import { ThemeToggle } from "./theme-toggle";
import { useSupabase } from "./supabase-provider";
import { signOut } from "@/app/(auth)/actions";

const navItems = [
  { href: "/", label: "Home", icon: Home2Outlined },
  { href: "/chat", label: "Chatbot", icon: Comment1Outlined },
  { href: "/tools", label: "Tools", icon: Hammer1Outlined },
  { href: "/notes", label: "Notes", icon: Notebook1Outlined },
];

function isActive(pathname: string, target: string) {
  if (target === "/") {
    return pathname === "/";
  }

  return pathname === target || pathname.startsWith(`${target}/`);
}

export function SiteNav() {
  const pathname = usePathname();
  const { apiKey } = useSettings();
  const { supabase, session, setSession } = useSupabase();
  const router = useRouter();
  const [isSigningOut, startTransition] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const hasKey = Boolean(apiKey);
  const user = session?.user ?? null;
  const displayName = useMemo(() => {
    if (!user) {
      return null;
    }

    const metaName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : null;
    const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
    return metaName || fullName || user.email || "Account";
  }, [user]);

  const initials = useMemo(() => {
    if (!displayName) {
      return "";
    }

    return displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [displayName]);

  useEffect(() => {
    let active = true;
    const currentUser = user;

    if (!currentUser) {
      setAvatarUrl(null);
      return () => {
        active = false;
      };
    }

    const userId = currentUser.id;
    const metadataAvatar =
      typeof currentUser.user_metadata?.avatar_url === "string"
        ? (currentUser.user_metadata.avatar_url as string)
        : null;

    if (metadataAvatar) {
      setAvatarUrl(metadataAvatar);
    }

    async function loadAvatar() {
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
  .eq("id", userId)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (error) {
        console.error("Failed to load profile avatar", error);
        if (!metadataAvatar) {
          setAvatarUrl(null);
        }
        return;
      }

      const nextUrl = (data?.avatar_url as string | null | undefined) ?? null;
      setAvatarUrl(nextUrl ?? metadataAvatar ?? null);
    }

    loadAvatar();

    return () => {
      active = false;
    };
  }, [supabase, user]);

  const handleSignOut = () => {
    if (isSigningOut) {
      return;
    }

    startTransition(async () => {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error("Failed to sign out in browser", error);
      }

      try {
        await signOut();
      } catch (error) {
        console.error("Failed to sign out on server", error);
      }

      setSession(null);
      router.replace("/");
      router.refresh();
    });
  };

  return (
    <>
      <header className="group relative overflow-hidden rounded-2xl border border-border/60 bg-surface/90 px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.14)] backdrop-blur transition hover:border-accent/40 sm:px-6">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition group-hover:opacity-100">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/15 via-transparent to-rose-400/10" />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3 text-left">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-background/70 text-base font-semibold text-accent ring-1 ring-border shadow-inner shadow-background/30">
              DS
            </span>
            <span className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-[0.42em] text-foreground/60">
                DevStudy
              </span>
              <span className="text-base font-semibold text-foreground">AI Suite</span>
            </span>
          </Link>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-3 sm:flex-none">
            <nav className="hidden items-center gap-2 text-sm font-medium sm:flex">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 ${
                      active
                        ? "bg-foreground text-background shadow"
                        : "text-foreground/70 hover:bg-foreground/10"
                    }`}
                  >
                    <Lineicons icon={item.icon} size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <ThemeToggle />
            <div
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide sm:inline-flex ${
                hasKey
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-amber-500/10 text-amber-500"
              }`}
            >
              <Lineicons icon={hasKey ? CheckCircle1Outlined : XmarkCircleOutlined} size={14} />
              {hasKey ? "Key linked" : "Key needed"}
            </div>
            {user ? (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:border-accent hover:text-accent"
                >
                  <span className="relative h-8 w-8 overflow-hidden rounded-full border border-border bg-foreground/10">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={displayName ?? "Profile avatar"}
                        fill
                        sizes="32px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center">
                        <Lineicons icon={User4Outlined} size={16} className="text-foreground" />
                      </span>
                    )}
                  </span>
                  <span className="truncate max-w-[120px]">{displayName}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-foreground/70 transition hover:bg-foreground/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Lineicons icon={ExitOutlined} size={16} />
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:bg-foreground/90 sm:inline-flex"
              >
                <Lineicons icon={EnterOutlined} size={16} />
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-4 z-50 px-4 sm:hidden">
        <div className="mx-auto flex max-w-sm items-center justify-between gap-1 rounded-full border border-border bg-background/95 px-3 py-2 shadow-lg shadow-background/20 backdrop-blur">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-1 rounded-full px-2 py-2 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 ${
                  active
                    ? "bg-foreground text-background"
                    : "text-foreground/70 hover:bg-foreground/10"
                }`}
              >
                <Lineicons icon={item.icon} size={18} />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
          {user ? (
            <Link
              href="/profile"
              aria-label="Profile"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-xs font-semibold text-foreground transition hover:border-accent hover:text-accent"
            >
              <span className="relative block h-9 w-9 overflow-hidden rounded-full">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName ?? "Profile avatar"}
                    fill
                    sizes="40px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center">
                    <Lineicons icon={User4Outlined} size={18} className="text-foreground" />
                  </span>
                )}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold text-foreground/70 transition hover:border-accent hover:text-accent"
            >
              <Lineicons icon={EnterOutlined} size={14} />
              Log in
            </Link>
          )}
          <Link
            href="/profile"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 ${
              hasKey
                ? "bg-foreground text-background"
                : "text-foreground/70 hover:bg-foreground/10"
            }`}
          >
            <Lineicons icon={hasKey ? User4Outlined : Key1Outlined} size={14} />
            {hasKey ? "Profile" : "Add key"}
          </Link>
        </div>
      </nav>
    </>
  );
}
