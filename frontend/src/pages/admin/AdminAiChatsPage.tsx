import { useEffect, useState } from "react";
import { Bot, MessageSquareText, RefreshCw, User } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  fetchAiChats,
  fetchAiChatTranscript,
  type AiChatBreakdown,
  type AiChatConversation,
  type AiChatListResponse,
  type AiChatTranscript,
} from "@/lib/aiChatApi";

const number = new Intl.NumberFormat("en-IN");

function timeAgo(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Machine keys → words an operator can read at a glance. */
const ENTRY_SOURCES: Record<string, string> = {
  advisor_page: "AI Advisor page",
  feature_page: "Feature/experience page",
  assistant: "Embedded assistant",
  unknown: "Unknown (pre-tracking)",
};
const ENTRY_LABELS: Record<string, string> = {
  typed: "Typed their own question",
  starter_chip: "Tapped a starter chip",
  handoff_query: "Arrived with a query link",
  quick_reply: "Tapped a suggested answer",
  unknown: "Unknown (pre-tracking)",
};
const OUTCOMES: Record<string, string> = {
  society_opened: "Opened a society",
  lead_started: "Started a callback/visit",
  refined: "Refined the shortlist",
  reset: "Started a new chat",
  errored: "Hit an error",
  abandoned: "Left the page",
  unknown: "No exit recorded",
};
// Green = the chat went somewhere useful; amber = still in the funnel; slate = it ended flat.
const OUTCOME_TONE: Record<string, string> = {
  society_opened: "bg-emerald-50 text-emerald-700",
  lead_started: "bg-emerald-100 text-emerald-800",
  refined: "bg-amber-50 text-amber-700",
  reset: "bg-slate-100 text-slate-600",
  errored: "bg-rose-50 text-rose-700",
  abandoned: "bg-slate-100 text-slate-500",
  unknown: "bg-slate-100 text-slate-400",
};

function Breakdown({ title, rows, labels, helper }: { title: string; rows?: AiChatBreakdown[]; labels: Record<string, string>; helper: string }) {
  const items = rows?.filter((r) => r.count > 0) || [];
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{title}</p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{helper}</p>
      {items.length ? (
        <div className="mt-4 space-y-2.5">
          {items.map((row) => (
            <div key={row.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-bold text-slate-800">{labels[row.key] || row.key}</span>
                <span className="shrink-0 text-sm font-black tabular-nums text-slate-900">{number.format(row.count)} <span className="text-xs font-bold text-slate-400">{row.share}%</span></span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(2, row.share)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400">Nothing recorded in this window yet.</p>
      )}
    </div>
  );
}

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{helper}</p>
    </div>
  );
}

export function AdminAiChatsPage() {
  const [data, setData] = useState<AiChatListResponse | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AiChatConversation | null>(null);
  const [transcript, setTranscript] = useState<AiChatTranscript | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  async function load(nextDays = days) {
    setLoading(true);
    setError("");
    try {
      setData(await fetchAiChats(nextDays, 100));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load AI chats.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openConversation(conversation: AiChatConversation) {
    setSelected(conversation);
    setTranscript(null);
    setTranscriptLoading(true);
    try {
      setTranscript(await fetchAiChatTranscript(conversation.id));
    } catch {
      setTranscript(null);
    } finally {
      setTranscriptLoading(false);
    }
  }

  const summary = data?.summary;

  return (
    <AdminLayout title="User AI Chats" subtitle="What real users ask the SocietyFlats assistant. Anonymous — no personal identity is stored.">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[7, 30, 90].map((option) => (
            <button
              key={option}
              onClick={() => { setDays(option); void load(option); }}
              className={`rounded-full px-4 py-2 text-sm font-bold ${days === option ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
            >
              Last {option} days
            </button>
          ))}
        </div>
        <Button variant="outline" className="rounded-full bg-white" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {summary ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Conversations" value={number.format(summary.conversations)} helper={`in the last ${summary.window_days} days`} />
            <StatCard label="Got a 2nd question" value={`${summary.continued_rate}%`} helper={`${number.format(summary.continued)} of ${number.format(summary.conversations)} went past one exchange`} />
            <StatCard label="Reached something" value={`${summary.converted_rate}%`} helper={`${number.format(summary.converted)} opened a society or started a callback`} />
            <StatCard label="Avg. questions asked" value={summary.avg_user_turns.toFixed(2)} helper={`${number.format(summary.one_shot)} chats ended after one`} />
          </div>
          <div className="mb-6 grid gap-3 lg:grid-cols-3">
            <Breakdown title="How they arrived" rows={data?.entry_sources} labels={ENTRY_SOURCES} helper="Which page the conversation started on" />
            <Breakdown title="What started it" rows={data?.entry_labels} labels={ENTRY_LABELS} helper="The affordance they used to ask" />
            <Breakdown title="How it ended" rows={data?.outcomes} labels={OUTCOMES} helper="Last recorded exit for each chat" />
          </div>
        </>
      ) : null}

      {error ? <p className="mb-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section>
          <h2 className="mb-3 text-xl font-black">Recent conversations</h2>
          {loading ? (
            <p className="rounded-2xl bg-white p-5 text-sm font-bold text-slate-500">Loading conversations…</p>
          ) : data?.conversations.length ? (
            <div className="space-y-3">
              {data.conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => void openConversation(conversation)}
                  className={`block w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-blue-300 ${selected?.id === conversation.id ? "border-blue-500 ring-1 ring-blue-200" : "border-slate-200"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">#{conversation.id} · {conversation.user_turns ?? 0} question{(conversation.user_turns ?? 0) === 1 ? "" : "s"}</span>
                    <span className="text-xs text-slate-400">{timeAgo(conversation.last_message_at)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-800">{conversation.preview || "(no user message)"}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                      {ENTRY_SOURCES[conversation.entry_source || "unknown"] || conversation.entry_source}
                    </span>
                    {conversation.entry_label ? (
                      <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                        {ENTRY_LABELS[conversation.entry_label] || conversation.entry_label}
                      </span>
                    ) : null}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${OUTCOME_TONE[conversation.outcome || "unknown"]}`}>
                      → {OUTCOMES[conversation.outcome || "unknown"] || conversation.outcome}
                      {conversation.outcome_detail ? `: ${conversation.outcome_detail}` : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No AI conversations in this window yet.</p>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xl font-black">Transcript</h2>
          {!selected ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Select a conversation to read the full transcript.</p>
          ) : transcriptLoading ? (
            <p className="rounded-2xl bg-white p-5 text-sm font-bold text-slate-500">Loading transcript…</p>
          ) : transcript ? (
            <div className="space-y-3 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="border-b border-slate-100 pb-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Conversation #{transcript.conversation.id} · {transcript.conversation.model || "assistant"}</p>
                <p className="mt-1.5 text-sm font-semibold text-slate-600">
                  {ENTRY_SOURCES[transcript.conversation.entry_source || "unknown"] || transcript.conversation.entry_source}
                  {transcript.conversation.entry_label ? ` · ${ENTRY_LABELS[transcript.conversation.entry_label] || transcript.conversation.entry_label}` : ""}
                  {" → "}
                  <span className="font-black text-slate-900">{OUTCOMES[transcript.conversation.outcome || "unknown"] || transcript.conversation.outcome}</span>
                  {transcript.conversation.outcome_detail ? ` (${transcript.conversation.outcome_detail})` : ""}
                </p>
                {transcript.conversation.entry_path ? <p className="mt-0.5 truncate text-xs text-slate-400">{transcript.conversation.entry_path}</p> : null}
              </div>
              {transcript.messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div key={message.id} className={`flex gap-3 ${isUser ? "" : "flex-row-reverse text-right"}`}>
                    <span className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-slate-100 text-slate-600" : "bg-blue-100 text-blue-700"}`}>
                      {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </span>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${isUser ? "bg-slate-50 text-slate-900" : "bg-blue-50 text-slate-900"}`}>
                      <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                      {Array.isArray(message.context_entities) && message.context_entities.length ? (
                        <p className="mt-2 text-xs font-semibold text-slate-500">Matched {message.context_entities.length} societ{message.context_entities.length === 1 ? "y" : "ies"}/home(s)</p>
                      ) : null}
                      {Array.isArray(message.suggested_replies) && message.suggested_replies.length ? (
                        <p className="mt-1.5 text-xs font-semibold text-slate-400">Offered: {message.suggested_replies.join(" · ")}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">This conversation could not be loaded (it may have expired).</p>
          )}
        </section>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-slate-400">
        <MessageSquareText className="h-4 w-4" />
        Conversations are stored anonymously for 30 days, then auto-deleted. No phone number, name or account is attached.
      </p>
    </AdminLayout>
  );
}
