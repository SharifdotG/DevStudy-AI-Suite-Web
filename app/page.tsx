import Image from "next/image";
import Link from "next/link";
import { Lineicons } from "@lineiconshq/react-lineicons";
import {
  Comment1Outlined,
  Hammer1Outlined,
  Notebook1Outlined,
  Rocket5Outlined,
  ChevronDownOutlined,
  CheckCircle1Outlined,
  Bulb2Outlined,
  ArrowRightOutlined,
  Bolt2Outlined,
  UserMultiple4Outlined,
} from "@lineiconshq/free-icons";
import { SiteNav } from "./_components/site-nav";
import { SettingsProvider } from "./_components/settings-context";

const modules = [
  {
    href: "/chat",
    title: "DevStudy Chatbot",
    description:
      "Stream Markdown answers, compare models, and copy responses straight into your assignments.",
    cta: "Open Chatbot",
    icon: Comment1Outlined,
    accent: "from-indigo-500/90 to-sky-500/80",
  },
  {
    href: "/tools",
    title: "DevStudy Tools",
    description:
      "Run instant utilities or lean on AI explainers, all organized with favorites and search.",
    cta: "Explore Tools",
    icon: Hammer1Outlined,
    accent: "from-emerald-500/90 to-teal-400/80",
  },
  {
    href: "/notes",
    title: "DevStudy Notes",
    description:
      "Ingest PDFs and text, then spin up summaries or flashcards tailored to your study plan.",
    cta: "Visit Notes",
    icon: Notebook1Outlined,
    accent: "from-violet-500/90 to-rose-500/80",
  },
];

const highlights = [
  "Bring-your-own OpenRouter key with streaming responses and usage tracking.",
  "Client-side utilities keep sensitive code on your device.",
  "Responsive shell adapts from lecture hall tablets to desktop monitors.",
];

const stats = [
  {
    value: "3 modules",
    label: "Chatbot, Tools, and Notes in one flow",
  },
  {
    value: "Client-side",
    label: "Utilities and parsing happen in-browser",
  },
  {
    value: "OpenRouter ready",
    label: "Unlock AI with your free-tier key",
  },
];

const teamMembers = [
  {
    name: "Sharif Md. Yousuf",
    role: "Product Lead",
    focus: "Aligns the roadmap with coursework milestones and stakeholder demos.",
    image: "/Sharif.jpg",
  },
  {
    name: "Noor Mohammed Priom",
    role: "Frontend Engineer",
    focus: "Polishes the App Router UI, accessibility, and responsive interactions.",
    image: "/Priom.jpg",
  },
  {
    name: "Shornali Akter",
    role: "Tester",
    focus: "Ensures the quality and reliability of the application through rigorous testing.",
    image: "/Shorna.jpg",
  },
];

const footerLinks = [
  { label: "Chatbot", href: "/chat" },
  { label: "Tools", href: "/tools" },
  { label: "Notes", href: "/notes" },
  { label: "Roadmap", href: "#modules" },
];

export default function Home() {
  return (
    <SettingsProvider>
      <div className="relative min-h-screen bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[42rem] bg-grid-soft opacity-40 mask-radial-fade" />
          <div className="absolute left-1/2 top-[-18rem] h-[48rem] w-[48rem] -translate-x-1/2 rounded-full bg-[conic-gradient(from_120deg_at_50%_50%,rgba(99,102,241,0.45),rgba(236,72,153,0.18),rgba(14,165,233,0.25),rgba(99,102,241,0.45))] blur-3xl animate-hero-glow" />
          <div className="absolute left-[8%] top-[26%] h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/35 via-sky-400/20 to-transparent blur-3xl animate-blob" />
          <div className="absolute right-[6%] top-[18%] h-52 w-52 rounded-full border border-accent/30 opacity-70 animate-tilt" />
          <div className="absolute left-1/2 top-[32%] h-28 w-28 -translate-x-1/2 rounded-full border border-accent/20 opacity-50 animate-spark" />
          <div className="absolute inset-x-0 bottom-[-12rem] h-[24rem] bg-gradient-to-t from-background via-background/60 to-transparent blur-3xl" />
        </div>
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-32 pt-8 sm:px-10 xl:max-w-7xl xl:px-12 2xl:max-w-[110rem] 2xl:px-16">
          <SiteNav />
          <main className="flex flex-1 flex-col gap-14 pb-16 pt-10 sm:gap-20 sm:pt-14">
            <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-surface/90 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.18)] sm:p-12">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_100%_at_0%_0%,rgba(99,102,241,0.18),transparent),radial-gradient(120%_120%_at_100%_0%,rgba(236,72,153,0.16),transparent)]" />
              <div className="relative flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
                <div className="flex-1 space-y-6">
                  <p className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.42em] text-foreground/60">
                    <Lineicons icon={Bolt2Outlined} size={14} className="text-accent" />
                    DevStudy
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                    AI Suite
                  </p>
                  <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
                    A polished study companion for labs, lectures, and late-night debugging.
                  </h1>
                  <p className="max-w-2xl text-base text-foreground/70 sm:text-lg">
                    Switch between the Chatbot, Tools, and Notes experiences without losing context. Every interaction rides a soft layer of motion so the interface feels alive, yet stays focused on clarity.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Link
                      href="/chat"
                      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-accent/20 bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground shadow-[0_12px_30px_rgba(99,102,241,0.32)] transition hover:shadow-[0_16px_40px_rgba(99,102,241,0.45)]"
                    >
                      <span
                        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.45)_50%,rgba(255,255,255,0)_100%)] animate-shimmer opacity-70"
                        aria-hidden
                      />
                      <Lineicons icon={Rocket5Outlined} size={18} className="relative" />
                      <span className="relative">Launch the suite</span>
                      <Lineicons icon={ArrowRightOutlined} size={16} className="relative transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                      href="#modules"
                      className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-5 py-2 text-sm font-semibold text-foreground/80 transition hover:border-accent/60 hover:text-foreground"
                    >
                      Tour the modules
                      <Lineicons icon={ChevronDownOutlined} size={16} />
                    </Link>
                  </div>
                  <div className="grid gap-3 pt-6 sm:grid-cols-3">
                    {stats.map((stat) => (
                      <div
                        key={stat.value}
                        className="group relative overflow-hidden rounded-2xl border border-border/60 bg-background/60 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition hover:border-accent/50 hover:shadow-[0_14px_36px_rgba(15,23,42,0.12)]"
                      >
                        <span
                          className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,rgba(99,102,241,0.18),transparent_55%)] opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden
                        />
                        <div className="relative flex flex-col gap-1">
                          <span className="text-xl font-semibold text-foreground">{stat.value}</span>
                          <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                            {stat.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative flex flex-col gap-5 sm:max-w-sm">
                  <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-background/75 p-5 text-sm text-foreground/70 shadow-[0_18px_46px_rgba(15,23,42,0.16)] backdrop-blur-sm">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(99,102,241,0.2),transparent_60%),radial-gradient(140%_140%_at_100%_10%,rgba(236,72,153,0.18),transparent_65%)] opacity-80" />
                    <div className="relative flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Why students pick DevStudy</p>
                      <span className="inline-flex items-center gap-1 rounded-full border border-foreground/15 bg-background/60 px-2 py-0.5 text-[10px] font-semibold text-foreground/50">
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-spark" aria-hidden />
                        Always on
                      </span>
                    </div>
                    <ul className="relative mt-4 space-y-3">
                      {highlights.map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <Lineicons icon={CheckCircle1Outlined} size={18} className="mt-0.5 flex-none text-accent" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="relative mt-5 flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-foreground/60">
                      <Lineicons icon={Bulb2Outlined} size={16} className="flex-none text-emerald-400" />
                      <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400" aria-hidden />
                      Fast path to demo-ready flows in under a semester.
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 via-background/60 to-background/50 p-5 text-sm text-foreground/70 shadow-[0_20px_48px_rgba(99,102,241,0.22)] backdrop-blur-sm animate-float-slow">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_15%_10%,rgba(129,140,248,0.3),transparent_60%),radial-gradient(120%_120%_at_85%_110%,rgba(236,72,153,0.22),transparent_75%)] opacity-90" />
                    <div className="relative flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.32em] text-foreground/60">
                      <span>Live preview</span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-foreground/15 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-foreground/60">
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" aria-hidden />
                        Streaming
                      </span>
                    </div>
                    <div className="relative mt-4 space-y-3 text-xs text-foreground/70">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/75 px-3 py-2">
                        <span className="font-medium text-foreground">Chatbot</span>
                        <span className="text-foreground/60">openrouter/auto:free</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/75 px-3 py-2">
                        <span className="font-medium text-foreground">Tools</span>
                        <span className="text-foreground/60">Utilities ready</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/75 px-3 py-2">
                        <span className="font-medium text-foreground">Notes</span>
                        <span className="text-foreground/60">PDF → Flashcards</span>
                      </div>
                    </div>
                    <div className="pointer-events-none absolute -right-12 top-10 h-32 w-32 rounded-full border border-accent/35 opacity-50 blur-sm animate-blob" aria-hidden />
                  </div>
                </div>
              </div>
            </section>

            <section id="modules" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {modules.map((module, index) => (
                <Link
                  key={module.href}
                  href={module.href}
                  style={{ animationDelay: `${index * 120}ms` }}
                  className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-border/60 bg-surface/95 p-6 shadow-[0_14px_40px_rgba(15,23,42,0.16)] transition duration-300 hover:-translate-y-1.5 hover:border-accent/60 hover:shadow-[0_20px_54px_rgba(15,23,42,0.26)] animate-module-rise"
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${module.accent} opacity-0 transition duration-300 group-hover:opacity-100`} />
                  <div className="pointer-events-none absolute inset-x-10 top-0 h-24 -translate-y-[60%] rounded-full bg-white/10 blur-3xl transition-opacity group-hover:opacity-80" aria-hidden />
                  <div className="relative flex flex-col gap-4">
                    <span className={`relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-[0_12px_30px_rgba(15,23,42,0.16)] ${module.accent}`}>
                      <Lineicons icon={module.icon} size={24} className="text-white relative z-10" />
                      <span
                        className="pointer-events-none absolute -right-2 -top-2 h-3 w-3 rounded-full bg-white/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100 animate-spark"
                        aria-hidden
                      />
                    </span>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold text-foreground">{module.title}</h2>
                      <p className="text-sm text-foreground/70">{module.description}</p>
                    </div>
                  </div>
                  <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                    {module.cta}
                    <Lineicons icon={ArrowRightOutlined} size={16} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </section>

            <section className="space-y-6">
              <div className="flex flex-col gap-2">
                <h2 className="flex items-center gap-3 text-3xl font-semibold">
                  <Lineicons icon={UserMultiple4Outlined} size={32} className="text-accent" />
                  Meet the DevStudy crew
                </h2>
                <p className="text-sm text-foreground/70 sm:text-base">
                  Our team is dedicated to building the best AI tools for developers.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {teamMembers.map((member, index) => (
                  <div
                    key={member.name}
                    style={{ animationDelay: `${index * 90}ms` }}
                    className="rounded-3xl border border-border/60 bg-surface/95 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.14)] transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_16px_40px_rgba(15,23,42,0.2)] animate-module-rise"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative h-12 w-12 overflow-hidden rounded-full border border-border/70 bg-background/50">
                        <Image
                          src={member.image}
                          alt={`Portrait of ${member.name}`}
                          fill
                          sizes="48px"
                          className="object-cover"
                          priority={index === 0}
                        />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{member.name}</p>
                        <p className="text-sm text-foreground/60">{member.role}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-foreground/70">{member.focus}</p>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <footer className="mt-auto rounded-2xl border border-border/60 bg-surface/90 px-6 py-10 text-sm text-foreground/70 shadow-[0_16px_40px_rgba(15,23,42,0.16)] sm:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex max-w-xs flex-col gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.42em] text-foreground/60">DevStudy</span>
                <p>
                  A student-built AI suite covering chat, utilities, and note workflows—tuned for OpenRouter free tiers and Supabase-ready storage.
                </p>
              </div>
              <div className="grid gap-2 sm:text-right">
                {footerLinks.map((item) => (
                  <Link key={item.href} href={item.href} className="transition hover:text-foreground">
                    {item.label}
                  </Link>
                ))}
                <Link href="mailto:team@devstudy.app" className="transition hover:text-foreground">
                  team@devstudy.app
                </Link>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 text-xs text-foreground/50 sm:flex-row sm:items-center sm:justify-between">
              <span>© {new Date().getFullYear()} DevStudy AI Suite. Built with Next.js and Tailwind CSS.</span>
              <span>OpenRouter keys stay client-side—rotate them anytime.</span>
            </div>
          </footer>
        </div>
      </div>
    </SettingsProvider>
  );
}
