const roadmap = [
  {
    label: "Chatbot",
    title: "Streaming Markdown replies with copy-friendly code blocks.",
    status: "In progress",
  },
  {
    label: "Tools",
    title: "Utilities and AI prompts organized with favorites and search.",
    status: "Ready today",
  },
  {
    label: "Notes",
    title: "Upload, preview, and summarize course material in minutes.",
    status: "Alpha",
  },
];

export default function OverviewPage() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-10 text-center sm:gap-12">
      <div className="space-y-5">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.42em] text-foreground/60">
          DevStudy Shell
        </p>
        <h1 className="text-4xl font-semibold sm:text-5xl">
          Your shared workspace for chats, quick utilities, and living notes.
        </h1>
        <p className="mx-auto max-w-2xl text-base text-foreground/70 sm:text-lg">
          This suite keeps navigation, theming, and OpenRouter settings in one place. Jump into a module knowing your context follows along.
        </p>
      </div>

      <div className="grid gap-4 text-left sm:grid-cols-2">
        {roadmap.map((item) => (
          <div
            key={item.label}
            className="group relative overflow-hidden rounded-3xl border border-border/60 bg-surface/90 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.16)] transition hover:border-accent/60"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="relative flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                {item.label}
              </span>
              <p className="text-lg font-semibold text-foreground">{item.title}</p>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/60">
                <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
                {item.status}
              </span>
            </div>
          </div>
        ))}
        <div className="rounded-3xl border border-dashed border-border/70 bg-surface/50 p-6 text-left text-sm text-foreground/60 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
          <p className="font-semibold text-foreground/80">What’s next</p>
          <p className="mt-2">
            Tie Supabase auth into stored sessions, polish mobile bottom sheets, and add quick actions that bridge modules.
          </p>
          <p className="mt-4 text-xs text-foreground/50">
            Follow the roadmap above as we iterate through each sprint.
          </p>
        </div>
      </div>
    </section>
  );
}
