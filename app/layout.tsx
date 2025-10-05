import type { Metadata } from "next";
import { Bricolage_Grotesque, Google_Sans_Code } from "next/font/google";
import "./globals.css";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { SupabaseProvider } from "./_components/supabase-provider";
import { ThemeProvider } from "./_components/theme-provider";
import { ScrollToTopButton } from "./_components/scroll-to-top-button";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

const googleSansCode = Google_Sans_Code({
  subsets: ["latin"],
  variable: "--font-google-sans-code",
});

export const metadata: Metadata = {
  title: "DevStudy AI Suite",
  description: "AI-assisted study companion with chat, tools, and notes",
};

const themeInitScript = `(() => {
  const storageKey = "devstudy-theme-preference";
  const mediaQuery = "(prefers-color-scheme: dark)";
  const root = document.documentElement;

  const getPreference = () => {
    const stored = window.localStorage.getItem(storageKey);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  };

  const detect = () => {
    if (typeof window.matchMedia !== "function") {
      return "light";
    }

    return window.matchMedia(mediaQuery).matches ? "dark" : "light";
  };

  const resolve = (preference) => {
    if (preference === "light" || preference === "dark") {
      return preference;
    }

    return detect();
  };

  try {
    const preference = getPreference();
    const resolved = resolve(preference);
    root.dataset.theme = resolved;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
  } catch (error) {
    const fallback = detect();
    root.dataset.theme = fallback;
    root.classList.toggle("dark", fallback === "dark");
    root.style.colorScheme = fallback;
  }
})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = getServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${bricolageGrotesque.variable} ${googleSansCode.variable} antialiased`}
      >
        <ThemeProvider>
          <SupabaseProvider initialSession={session}>
            {children}
            <ScrollToTopButton />
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
