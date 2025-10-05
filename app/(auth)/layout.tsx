import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 text-foreground">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(129,140,248,0.18),transparent_65%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute top-1/3 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-accent/20 blur-[160px]" aria-hidden />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
