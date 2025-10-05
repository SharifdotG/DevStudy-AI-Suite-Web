import type { ReactNode } from "react";
import { SiteNav } from "../_components/site-nav";
import { SettingsProvider } from "../_components/settings-context";

export default function SuiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SettingsProvider>
      <div className="relative min-h-screen bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-background/10 via-transparent to-transparent" />
          <div className="absolute left-[12%] top-28 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute right-[8%] top-10 h-48 w-48 rounded-full bg-purple-400/20 blur-3xl" />
        </div>
  <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-32 pt-8 sm:px-10 sm:pb-16 xl:max-w-7xl xl:px-12 2xl:max-w-[110rem] 2xl:px-16">
          <SiteNav />
          <main className="flex-1 pb-8 pt-10 sm:pb-16 sm:pt-14">{children}</main>
        </div>
      </div>
    </SettingsProvider>
  );
}
