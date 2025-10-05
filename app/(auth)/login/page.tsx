import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in · DevStudy AI Suite",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = getServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/profile");
  }

  const error = typeof searchParams.error === "string" ? decodeURIComponent(searchParams.error) : undefined;

  return (
    <div className="rounded-3xl border border-border/60 bg-surface/90 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.28)] backdrop-blur-xl backdrop-saturate-150">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.42em] text-foreground/50">DevStudy</p>
        <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
        <p className="text-sm text-foreground/70">Sign in with Google or your email to sync chats and notes.</p>
      </div>
      <Suspense fallback={null}>
        <LoginForm initialMessage={error} />
      </Suspense>
      <div className="mt-6 space-y-2 text-center text-sm text-foreground/60">
        <p>
          Need an account?{' '}
          <Link href="/register" className="font-semibold text-accent transition hover:text-accent/80">
            Create one
          </Link>
          .
        </p>
        <p>
          Just exploring?{' '}
          <Link href="/" className="font-semibold text-foreground transition hover:text-foreground/80">
            Continue as guest
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
