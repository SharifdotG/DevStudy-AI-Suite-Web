import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function getServerSupabaseClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase environment variables are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async getAll() {
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        return allCookies.map(({ name, value }) => ({ name, value }));
      },
      async setAll(cookiesToSet) {
        const cookieStore = await cookies();
        const mutableStore = cookieStore as unknown as {
          set?: (...args: unknown[]) => void;
        };

        const setter = mutableStore.set;
        if (typeof setter !== "function") {
          return;
        }

        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            setter.call(cookieStore, name, value, options ?? {});
          } catch (error) {
            try {
              setter.call(cookieStore, { name, value, ...(options ?? {}) });
            } catch (secondaryError) {
              console.error("Failed to set Supabase cookie", { name, error, secondaryError });
            }
          }
        });
      },
    },
  });
}
