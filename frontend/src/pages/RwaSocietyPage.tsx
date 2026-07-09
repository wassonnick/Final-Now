import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, HelpCircle, Loader2, MessageSquareText, Megaphone, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { setPublicSeo } from "@/lib/seo";
import { getCustomerAccountSession } from "@/lib/customerAccount";
import { fetchRwaSociety, submitRwaThread, type RwaPublicResponse, type RwaThread } from "@/lib/rwaApi";

const typeMeta = {
  question: { label: "Question", icon: HelpCircle, className: "bg-blue-50 text-blue-700 border-blue-100" },
  discussion: { label: "Discussion", icon: MessageSquareText, className: "bg-violet-50 text-violet-700 border-violet-100" },
  grievance: { label: "Grievance", icon: AlertCircle, className: "bg-rose-50 text-rose-700 border-rose-100" },
};

function ThreadCard({ thread }: { thread: RwaThread }) {
  const meta = typeMeta[(thread.type as keyof typeof typeMeta) || "discussion"] || typeMeta.discussion;
  const Icon = meta.icon;

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${meta.className}`}>
          <Icon className="h-3.5 w-3.5" />
          {meta.label}
        </span>
        {thread.resolved_at ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Resolved
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 text-lg font-black text-slate-950">{thread.title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{thread.body}</p>
      {thread.replies?.length ? (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {thread.replies.map((reply) => (
            <div key={reply.id} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm leading-6 text-slate-700">{reply.body}</p>
              {reply.is_official ? (
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-black text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Official RWA reply
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function RwaSocietyPage() {
  const { slug = "" } = useParams();
  const session = getCustomerAccountSession();
  const [data, setData] = useState<RwaPublicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "question",
    title: "",
    body: "",
    category: "resident",
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchRwaSociety(slug)
      .then((next) => {
        if (!active) return;
        setData(next);
        setPublicSeo(
          `${next.society.name} RWA, Notices & Resident Forum | SocietyFlats`,
          `Verified RWA updates, resident questions, grievances and discussions for ${next.society.name}. Claims and official posts are reviewed before publishing.`,
          { canonical: `/rwa/${next.society.slug}` },
        );
      })
      .catch(() => {
        if (!active) return;
        setPublicSeo("RWA Page Not Found | SocietyFlats", "This RWA page is not available yet.", {
          canonical: `/rwa/${slug}`,
          noindex: true,
        });
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [slug]);

  const location = useMemo(() => {
    const society = data?.society;
    return [society?.sector, society?.locality, society?.city].filter(Boolean).join(", ");
  }, [data]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await submitRwaThread(slug, form, session?.accountAccessToken);
      setMessage(response.message || "Submitted for review.");
      setForm({ type: "question", title: "", body: "", category: "resident" });
      const refreshed = await fetchRwaSociety(slug);
      setData(refreshed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit this item.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-700" />
        <p className="mt-4 font-semibold text-slate-600">Loading RWA page...</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-4xl font-black text-slate-950">RWA page not found</h1>
        <p className="mt-3 text-slate-600">This society may not be published yet.</p>
        <Button asChild className="mt-6 rounded-full bg-blue-700">
          <Link to="/societies">Explore societies</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="bg-[#F8F3EA]">
      <section className="border-b border-[#E7DCCB] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <Badge className="rounded-full border-emerald-100 bg-emerald-50 px-4 py-1.5 text-emerald-700">
              RWA resident hub
            </Badge>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.04em] text-slate-950 md:text-6xl">
              {data.society.name} RWA updates, questions and grievances.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              The verified resident hub for {data.society.name} — official notices, community questions, maintenance issues and how they were resolved, all in one transparent place.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-slate-600">
              {location ? <span className="rounded-full bg-slate-100 px-3 py-1">{location}</span> : null}
              {data.rwa ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Claimed by {data.rwa.organisation_name}</span>
              ) : (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Unclaimed RWA page</span>
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild className="rounded-full bg-[#233B6E] hover:bg-[#1B2E57]">
                <Link to={`/society/${data.society.slug || slug}`}>View {data.society.name}'s verified profile</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-slate-300">
                <Link to={`/ai-advisor?q=${encodeURIComponent(`Tell me about living in ${data.society.name}`)}`}>Thinking of moving here? Ask our AI</Link>
              </Button>
            </div>
          </div>
          <aside className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-xl">
            <ShieldCheck className="h-8 w-8 text-emerald-300" />
            <h2 className="mt-4 text-2xl font-black">Represent this RWA?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Claim the page with OTP, proof notes and admin review. Official posts remain moderated before public visibility.
            </p>
            <Button asChild className="mt-5 w-full rounded-full bg-white text-slate-950 hover:bg-slate-100">
              <Link to={`/login?role=rwa&next=${encodeURIComponent("/rwa/dashboard")}`}>Claim / manage RWA</Link>
            </Button>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-4">
        {[
          ["Official notices", data.stats.announcements || 0, Megaphone],
          ["Open topics", data.stats.open_threads || 0, MessageSquareText],
          ["Resolved", data.stats.resolved_threads || 0, CheckCircle2],
          ["Claim status", data.stats.claim_status || "unclaimed", UsersRound],
        ].map(([label, value, Icon]) => {
          const IconComponent = Icon as typeof Megaphone;
          return (
            <div key={String(label)} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <IconComponent className="h-5 w-5 text-blue-700" />
              <p className="mt-3 text-3xl font-black text-slate-950">{String(value)}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{String(label)}</p>
            </div>
          );
        })}
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-14 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Megaphone className="h-6 w-6 text-blue-700" />
              <div>
                <h2 className="text-2xl font-black text-slate-950">Official announcements</h2>
                <p className="text-sm text-slate-500">Published only after SocietyFlats moderation.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {data.announcements.length ? data.announcements.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">{item.category || "notice"}</p>
                  <h3 className="mt-2 font-black text-slate-950">{item.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.content}</p>
                </article>
              )) : <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No official RWA notice has been published yet.</p>}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Resident questions, discussions and grievances</h2>
            <p className="mt-1 text-sm text-slate-500">Public-safe items appear here after moderation; official RWA replies are clearly marked.</p>
            <div className="mt-5 space-y-4">
              {data.threads.length ? data.threads.map((thread) => <ThreadCard key={thread.id} thread={thread} />) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  No resident topics are public yet. Start with a question or maintenance discussion.
                </p>
              )}
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-2xl font-black text-slate-950">Ask or raise an issue</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Submissions are held for moderation unless posted by an approved RWA account.
          </p>
          {message ? <p className="mt-4 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-blue-700">{message}</p> : null}
          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <select
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold"
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            >
              <option value="question">Question</option>
              <option value="discussion">Discussion</option>
              <option value="grievance">Grievance / problem</option>
            </select>
            <Input
              required
              minLength={8}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="h-12 rounded-2xl"
              placeholder="Short title"
            />
            <textarea
              required
              minLength={20}
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
              className="min-h-32 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-300"
              placeholder="Explain the question, issue or discussion point"
            />
            <Button disabled={saving} className="h-12 w-full rounded-full bg-blue-700">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareText className="mr-2 h-4 w-4" />}
              Submit for review
            </Button>
          </form>
        </aside>
      </section>
    </main>
  );
}
