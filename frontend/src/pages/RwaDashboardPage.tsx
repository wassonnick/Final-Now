import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, Megaphone, MessageSquareText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/config/api";
import { getCustomerAccountSession } from "@/lib/customerAccount";
import { setPublicSeo } from "@/lib/seo";
import {
  fetchRwaDashboard,
  resolveRwaThread,
  submitRwaAnnouncement,
  submitRwaClaim,
  submitRwaReply,
  type RwaClaim,
  type RwaDashboardResponse,
  type RwaSociety,
  type RwaThread,
} from "@/lib/rwaApi";

export function RwaDashboardPage() {
  const session = getCustomerAccountSession();
  const token = session?.accountAccessToken || "";
  const [societies, setSocieties] = useState<RwaSociety[]>([]);
  const [dashboard, setDashboard] = useState<RwaDashboardResponse>({ claims: [], threads: [], replies: [] });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [claimForm, setClaimForm] = useState({
    society_id: "",
    organisation_name: "",
    representative_name: session?.name || "",
    representative_role: "RWA President / Secretary",
    phone: session?.phone || "",
    email: "",
    proof_notes: "",
  });
  const [notice, setNotice] = useState({ claimId: "", title: "", content: "", category: "notice" });

  const approvedClaims = useMemo(() => dashboard.claims.filter((claim) => claim.status === "approved"), [dashboard.claims]);
  const claimedSocietyIds = useMemo(() => new Set(approvedClaims.map((claim) => claim.society?.id || claim.society_id)), [approvedClaims]);

  useEffect(() => {
    setPublicSeo("RWA Dashboard | SocietyFlats", "Private RWA dashboard for claims, notices and resident issue response.", {
      canonical: "/rwa/dashboard",
      noindex: true,
    });
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [societiesJson, dashboardJson] = await Promise.all([
        fetch(`${API_BASE_URL}/societies?per_page=100`).then((response) => response.json()),
        token ? fetchRwaDashboard(token) : Promise.resolve({ claims: [], threads: [], replies: [] } as RwaDashboardResponse),
      ]);
      setSocieties(societiesJson?.data?.data || societiesJson?.data || []);
      setDashboard(dashboardJson);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load RWA dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await submitRwaClaim(token, {
        ...claimForm,
        society_id: Number(claimForm.society_id),
      });
      setMessage(response.message || "RWA claim submitted for admin review.");
      setClaimForm({ ...claimForm, society_id: "", organisation_name: "", proof_notes: "" });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit claim.");
    } finally {
      setSaving(false);
    }
  }

  async function handleNotice(event: FormEvent) {
    event.preventDefault();
    if (!notice.claimId) return;
    setSaving(true);
    setMessage("");

    try {
      const response = await submitRwaAnnouncement(token, Number(notice.claimId), {
        title: notice.title,
        content: notice.content,
        category: notice.category,
      });
      setMessage(response.message || "Announcement sent for moderation.");
      setNotice({ claimId: notice.claimId, title: "", content: "", category: "notice" });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit announcement.");
    } finally {
      setSaving(false);
    }
  }

  async function reply(thread: RwaThread) {
    const body = window.prompt(`Official reply to “${thread.title}”`);
    if (!body) return;
    try {
      const response = await submitRwaReply(token, thread.id, body);
      setMessage(response.message || "Reply published.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit reply.");
    }
  }

  async function markResolved(thread: RwaThread) {
    try {
      const response = await resolveRwaThread(token, thread.id);
      setMessage(response.message || "Thread marked resolved.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not resolve thread.");
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-700" />
        <p className="mt-4 font-semibold text-slate-600">Loading RWA dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F3EA] px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-black text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              RWA account
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-950 md:text-6xl">RWA dashboard</h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Claim society pages, publish moderated notices, answer resident questions and close grievances with a visible public record.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full bg-white">
            <Link to="/societies">Find society page</Link>
          </Button>
        </div>

        {message ? <p className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm font-black text-blue-700">{message}</p> : null}

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          {[
            ["Claims", dashboard.claims.length],
            ["Approved societies", approvedClaims.length],
            ["Resident topics", dashboard.threads.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
              <p className="text-3xl font-black text-slate-950">{String(value)}</p>
              <p className="mt-1 text-sm font-bold text-slate-500">{String(label)}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-7 xl:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={handleClaim} className="rounded-[1.75rem] border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Claim a society RWA page</h2>
            <p className="mt-1 text-sm text-slate-500">Admin approval is required before official publishing tools unlock.</p>
            <div className="mt-5 space-y-3">
              <select
                required
                className="h-12 w-full rounded-2xl border px-3 text-sm font-semibold"
                value={claimForm.society_id}
                onChange={(event) => setClaimForm({ ...claimForm, society_id: event.target.value })}
              >
                <option value="">Select published society</option>
                {societies.map((society) => (
                  <option key={society.id} value={society.id}>
                    {society.name}
                  </option>
                ))}
              </select>
              <Input required className="h-12 rounded-2xl" placeholder="RWA / AOA organisation name" value={claimForm.organisation_name} onChange={(event) => setClaimForm({ ...claimForm, organisation_name: event.target.value })} />
              <Input required className="h-12 rounded-2xl" placeholder="Representative name" value={claimForm.representative_name} onChange={(event) => setClaimForm({ ...claimForm, representative_name: event.target.value })} />
              <Input required className="h-12 rounded-2xl" placeholder="Role, e.g. President / Secretary" value={claimForm.representative_role} onChange={(event) => setClaimForm({ ...claimForm, representative_role: event.target.value })} />
              <Input required className="h-12 rounded-2xl" placeholder="Mobile number" value={claimForm.phone} onChange={(event) => setClaimForm({ ...claimForm, phone: event.target.value })} />
              <Input className="h-12 rounded-2xl" placeholder="Official email, if available" value={claimForm.email} onChange={(event) => setClaimForm({ ...claimForm, email: event.target.value })} />
              <textarea required minLength={20} className="min-h-28 w-full rounded-2xl border p-3 text-sm" placeholder="Verification proof notes: role, society office, documents available, public reference, etc." value={claimForm.proof_notes} onChange={(event) => setClaimForm({ ...claimForm, proof_notes: event.target.value })} />
              <Button disabled={saving} className="h-12 rounded-full bg-emerald-700">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Submit RWA claim
              </Button>
            </div>
          </form>

          <div className="space-y-7">
            <section className="rounded-[1.75rem] border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">Your RWA claims</h2>
              <div className="mt-4 space-y-3">
                {dashboard.claims.length ? dashboard.claims.map((claim) => (
                  <article key={claim.id} className="rounded-2xl border bg-slate-50 p-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-950">{claim.society?.name}</h3>
                        <p className="text-sm text-slate-500">{claim.organisation_name}</p>
                      </div>
                      <span className="h-fit rounded-full bg-white px-3 py-1 text-xs font-black capitalize text-slate-700">{claim.status}</span>
                    </div>
                    {claim.society?.slug ? <Link className="mt-3 inline-block text-sm font-black text-blue-700" to={`/rwa/${claim.society.slug}`}>Open public RWA page</Link> : null}
                  </article>
                )) : <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No RWA claims submitted yet.</p>}
              </div>
            </section>

            <form onSubmit={handleNotice} className="rounded-[1.75rem] border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">Submit official announcement</h2>
              <p className="mt-1 text-sm text-slate-500">Announcements are moderated before appearing on society and RWA pages.</p>
              <div className="mt-4 space-y-3">
                <select required className="h-12 w-full rounded-2xl border px-3 text-sm font-semibold" value={notice.claimId} onChange={(event) => setNotice({ ...notice, claimId: event.target.value })}>
                  <option value="">Select approved RWA claim</option>
                  {approvedClaims.map((claim: RwaClaim) => <option key={claim.id} value={claim.id}>{claim.society?.name} · {claim.organisation_name}</option>)}
                </select>
                <Input required className="h-12 rounded-2xl" placeholder="Announcement title" value={notice.title} onChange={(event) => setNotice({ ...notice, title: event.target.value })} />
                <textarea required minLength={20} className="min-h-28 w-full rounded-2xl border p-3 text-sm" placeholder="Notice text" value={notice.content} onChange={(event) => setNotice({ ...notice, content: event.target.value })} />
                <Button disabled={saving || !approvedClaims.length} className="h-12 rounded-full bg-blue-700">
                  <Megaphone className="mr-2 h-4 w-4" />
                  Send for moderation
                </Button>
              </div>
            </form>
          </div>
        </section>

        <section className="mt-8 rounded-[1.75rem] border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Resident topics for your approved societies</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {dashboard.threads.length ? dashboard.threads.map((thread) => {
              const canManage = claimedSocietyIds.has(thread.society?.id);
              return (
                <article key={thread.id} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black capitalize text-slate-700">{thread.type}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black capitalize text-slate-700">{thread.status}</span>
                  </div>
                  <h3 className="mt-3 font-black text-slate-950">{thread.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-600">{thread.body}</p>
                  <p className="mt-3 text-xs font-bold text-slate-500">{thread.society?.name}</p>
                  {canManage ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="rounded-full bg-white" onClick={() => void reply(thread)}>
                        <MessageSquareText className="mr-2 h-4 w-4" />
                        Official reply
                      </Button>
                      {!thread.resolved_at ? (
                        <Button size="sm" variant="outline" className="rounded-full bg-white" onClick={() => void markResolved(thread)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark resolved
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            }) : <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No public resident topics yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
