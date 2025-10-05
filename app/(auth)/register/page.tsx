import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RegisterForm } from "./register-form";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create account · DevStudy AI Suite",
};

export default async function RegisterPage() {
  const supabase = getServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/profile");
  }

  return (
    <div className="rounded-3xl border border-border/60 bg-surface/90 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.28)] backdrop-blur-xl backdrop-saturate-150">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.42em] text-foreground/50">DevStudy</p>
        <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
        <p className="text-sm text-foreground/70">Register to sync chats, notes, and tool usage across devices.</p>
      </div>
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
      <div className="mt-6 space-y-2 text-center text-sm text-foreground/60">
        <p>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-accent transition hover:text-accent/80">
            Sign in
          </Link>
          .
        </p>
        <p>
          Prefer not to sign up?{' '}
          <Link href="/" className="font-semibold text-foreground transition hover:text-foreground/80">
            Continue as guest
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
