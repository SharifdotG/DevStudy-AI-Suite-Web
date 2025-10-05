"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const credentialsSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long." })
    .max(72, { message: "Password must be 72 characters or less." }),
  displayName: z.string().max(60).optional(),
});

export type AuthState = {
  status: "idle" | "error";
  message?: string;
};

export async function registerWithEmail(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check your details and try again.",
    };
  }

  const { email, password, displayName } = parsed.data;
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  if (data.user) {
    const profileInsert: Database["public"]["Tables"]["profiles"]["Insert"] = {
      id: data.user.id,
      display_name: displayName ?? data.user.email ?? "",
      api_key_status: "absent",
    };

    await supabase.from("profiles").upsert(profileInsert);
  }

  revalidatePath("/", "layout");
  redirect("/profile");
}

export async function loginWithEmail(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.pick({ email: true, password: true }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check your details and try again.",
    };
  }

  const { email, password } = parsed.data;
  const supabase = getServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/profile");
}

export async function signInWithGoogle() {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
      scopes: "profile email",
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.url) {
    redirect(data.url);
  }

  redirect("/login");
}

export async function signOut() {
  const supabase = getServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { success: true } as const;
}
