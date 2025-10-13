import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { ApiKeySettingsCard } from "./api-key-settings-card";
import { ApiKeyStatusBadge } from "./api-key-status-badge";
import type { ChatSessionRow, ProfileRow, Database } from "@/lib/supabase/types";
import { Lineicons } from "@lineiconshq/react-lineicons";
import {
  ArrowRightOutlined,
  RefreshCircle1ClockwiseOutlined,
  Comment1Outlined,
  Notebook1Outlined,
  Hammer1Outlined,
} from "@lineiconshq/free-icons";

type SessionSummary = Pick<
  ChatSessionRow,
  "id" | "title" | "updated_at" | "usage_total_tokens" | "usage_prompt_tokens" | "usage_completion_tokens" | "usage_cost"
>;

type NoteDocumentRow = Database["public"]["Tables"]["note_documents"]["Row"];
type ToolActivityRow = Database["public"]["Tables"]["tool_activity"]["Row"];

type NoteDocumentSummary = Pick<NoteDocumentRow, "id" | "title" | "source_type" | "size_bytes" | "created_at">;
type ToolActivitySummary = Pick<ToolActivityRow, "id" | "tool_id" | "run_at" | "metadata">;

type ActivityItem = {
  id: string;
  kind: "chat" | "note" | "tool";
  title: string;
  timestamp: string;
  detail: string;
};

function toNumber(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const INTEGER_FORMATTER = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const CURRENCY_FORMATTER = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
});

const TOOL_LABELS: Record<string, string> = {
  "json-formatter": "JSON Formatter",
  "uuid-generator": "UUID Generator",
  "base64-converter": "Base64 Converter",
  "code-explainer": "Code Explainer",
  "sql-builder": "SQL Query Builder",
};

const ACTIVITY_ICONS: Record<ActivityItem["kind"], typeof Comment1Outlined> = {
  chat: Comment1Outlined,
  note: Notebook1Outlined,
  tool: Hammer1Outlined,
};

function formatInteger(value: number): string {
  return INTEGER_FORMATTER.format(value);
}

function formatCurrency(value: number): string {
  return CURRENCY_FORMATTER.format(value);
}

function getInitials(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "?";
  }

  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.charAt(0);
  const second = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) : "";
  return `${first ?? ""}${second ?? ""}`.toUpperCase() || "?";
}

function formatBytes(value: number) {
  if (!value) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let index = 0;
  let current = value;

  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }

  const precision = current >= 10 || index === 0 ? 0 : 1;
  return `${current.toFixed(precision)} ${units[index]}`;
}

function formatToolLabel(toolId: string | null | undefined) {
  if (!toolId) {
    return "Tool run";
  }

  return TOOL_LABELS[toolId] ?? toolId;
}

export default async function ProfilePage() {
  const supabase = getServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const user = session.user;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (existingProfile as (ProfileRow & { full_name?: string | null }) | null) ?? null;

  const { data: chatSessionsRows } = await supabase
    .from("chat_sessions")
    .select("id, title, updated_at, usage_total_tokens, usage_prompt_tokens, usage_completion_tokens, usage_cost")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const chatSessions: SessionSummary[] = (chatSessionsRows as SessionSummary[]) ?? [];
  const chatCount = chatSessions.length;
  const totalTokens = chatSessions.reduce((sum, sessionRow) => sum + toNumber(sessionRow.usage_total_tokens), 0);
  const promptTokens = chatSessions.reduce((sum, sessionRow) => sum + toNumber(sessionRow.usage_prompt_tokens), 0);
  const completionTokens = chatSessions.reduce((sum, sessionRow) => sum + toNumber(sessionRow.usage_completion_tokens), 0);
  const estimatedCost = chatSessions.reduce((sum, sessionRow) => sum + toNumber(sessionRow.usage_cost), 0);

  const { data: noteDocumentsRows } = await supabase
    .from("note_documents")
    .select("id, title, source_type, size_bytes, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const noteDocuments: NoteDocumentSummary[] = (noteDocumentsRows as NoteDocumentSummary[]) ?? [];
  const totalNoteBytes = noteDocuments.reduce((sum, note) => sum + toNumber(note.size_bytes), 0);

  const { data: toolActivityRows } = await supabase
    .from("tool_activity")
    .select("id, tool_id, run_at, metadata")
    .eq("user_id", user.id)
    .order("run_at", { ascending: false });

  const toolActivities: ToolActivitySummary[] = (toolActivityRows as ToolActivitySummary[]) ?? [];

  const activities: ActivityItem[] = [
    ...chatSessions.map((sessionRow) => ({
      id: `chat-${sessionRow.id}`,
      kind: "chat" as const,
      title: sessionRow.title || "Untitled chat",
      timestamp: sessionRow.updated_at,
      detail: `${formatInteger(toNumber(sessionRow.usage_total_tokens))} tokens • ${formatCurrency(toNumber(sessionRow.usage_cost))}`,
    })),
    ...noteDocuments.map((note) => ({
      id: `note-${note.id}`,
      kind: "note" as const,
      title: note.title || "Untitled note",
      timestamp: note.created_at,
      detail: `${note.source_type.toUpperCase()} • ${formatBytes(toNumber(note.size_bytes))}`,
    })),
    ...toolActivities.map((activity) => ({
      id: `tool-${activity.id}`,
      kind: "tool" as const,
      title: formatToolLabel(activity.tool_id),
      timestamp: activity.run_at,
      detail: "Tool run logged",
    })),
  ]
    .filter((entry) => Boolean(entry.timestamp))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  const { count: noteCount } = await supabase
    .from("note_documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: toolRuns } = await supabase
    .from("tool_activity")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const trackedChatCount = Math.max(toNumber(profile?.usage_chat_count), chatCount);
  const trackedTotalTokens = Math.max(toNumber(profile?.usage_total_tokens), totalTokens);
  const trackedNoteCount = (typeof noteCount === "number" ? noteCount : null) ?? noteDocuments.length;
  const trackedToolRuns = (typeof toolRuns === "number" ? toolRuns : null) ?? toolActivities.length;

  const provider = (session.user.app_metadata?.provider as string | undefined) ?? "email";
  const fallbackMetadataName =
    (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    null;
  const displayName =
    (profile?.display_name as string | null | undefined) ??
    (profile?.full_name as string | null | undefined) ??
    fallbackMetadataName ??
    user.email ??
    "New member";
  const apiKeyStatus = (profile?.api_key_status as "present" | "absent" | null | undefined) ?? "absent";
  const avatarUrl = (profile?.avatar_url as string | null | undefined) ?? null;
  const initials = getInitials(displayName);

  return (
    <section className="space-y-8">
      <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-surface/95 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.24)]">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_75%_at_10%_20%,rgba(99,102,241,0.18),transparent),radial-gradient(80%_60%_at_80%_0%,rgba(45,212,191,0.18),transparent)]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-accent/20 via-accent/10 to-transparent text-lg font-semibold text-foreground/80">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-background/80">{initials}</div>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.42em] text-foreground/60">Profile</p>
              <div>
                <h1 className="text-3xl font-semibold text-foreground">{displayName}</h1>
                <p className="mt-1 text-sm text-foreground/65">
                  Signed in with {provider}. Keep your OpenRouter key handy to unlock AI features across the suite.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
                {user.email ? <span className="rounded-full border border-border px-3 py-1">{user.email}</span> : null}
                <ApiKeyStatusBadge initialStatus={apiKeyStatus} />
                <span className="rounded-full border border-border px-3 py-1">
                  {formatInteger(chatCount)} chats
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-full border border-accent/60 bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90"
          >
            Jump back to chat
            <Lineicons icon={ArrowRightOutlined} size={14} />
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-border/60 bg-surface/95 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Usage overview</h2>
              <span className="text-xs uppercase tracking-[0.32em] text-foreground/40">Realtime</span>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <StatCard label="Chats logged" value={formatInteger(trackedChatCount)} />
              <StatCard label="Total tokens" value={formatInteger(trackedTotalTokens)} />
              <StatCard label="Prompt tokens" value={formatInteger(promptTokens)} />
              <StatCard label="Completion tokens" value={formatInteger(completionTokens)} />
              <StatCard label="Estimated cost" value={formatCurrency(estimatedCost)} />
              <StatCard label="Notes uploaded" value={formatInteger(trackedNoteCount)} />
              <StatCard label="Note storage" value={formatBytes(totalNoteBytes)} />
              <StatCard label="Tool runs" value={formatInteger(trackedToolRuns)} />
            </dl>
          </div>

          <div className="rounded-3xl border border-border/60 bg-surface/95 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.2)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
              <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:text-accent/80">
                <Lineicons icon={RefreshCircle1ClockwiseOutlined} size={14} />
                Refresh
              </Link>
            </div>
            {activities.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border/70 bg-background/70 p-4 text-sm text-foreground/60">
                Your latest chats, note uploads, and tool runs will appear here once you start exploring the suite.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {activities.map((item) => (
                  <li
                    key={item.id}
                    className="group rounded-2xl border border-border/50 bg-background/70 p-4 text-sm text-foreground/80 transition hover:border-accent/60 hover:bg-background"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="text-foreground/60" aria-hidden>
                          <Lineicons icon={ACTIVITY_ICONS[item.kind]} size={18} />
                        </span>
                        <div>
                          <p className="font-semibold leading-tight">{item.title}</p>
                          <p className="mt-1 text-xs text-foreground/60">{item.detail}</p>
                        </div>
                      </div>
                      <span className="text-xs text-foreground/50">{formatDate(item.timestamp)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <ProfileForm displayName={displayName} avatarUrl={avatarUrl} />
          <ApiKeySettingsCard initialStatus={apiKeyStatus} />
          <div className="rounded-3xl border border-border/60 bg-surface/95 p-6 text-sm text-foreground/70 shadow-[0_12px_28px_rgba(15,23,42,0.18)]">
            <h2 className="text-base font-semibold text-foreground">Next steps</h2>
            <ul className="mt-3 space-y-2">
              <li>• Run a chat to populate usage stats and confirm Supabase sync.</li>
              <li>• Upload a note in the Notes module to track document storage.</li>
              <li>• Try an AI tool (SQL or Explain) to log tool activity.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}

type StatCardProps = {
  label: string;
  value: number | string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-foreground/50">{label}</dt>
      <dd className="mt-2 text-xl font-semibold text-foreground">{value}</dd>
    </div>
  );
}
