import { useEffect, useState } from "react";
import { CheckCircle2, MessageSquareText, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  adminListRwaClaims,
  adminListRwaReplies,
  adminListRwaThreads,
  adminUpdateRwaClaim,
  adminUpdateRwaReply,
  adminUpdateRwaThread,
  type RwaClaim,
  type RwaReply,
  type RwaThread,
} from "@/lib/rwaApi";

export function AdminRwaPortalPage() {
  const [claims, setClaims] = useState<RwaClaim[]>([]);
  const [threads, setThreads] = useState<RwaThread[]>([]);
  const [replies, setReplies] = useState<RwaReply[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [nextClaims, nextThreads, nextReplies] = await Promise.all([
        adminListRwaClaims(),
        adminListRwaThreads(),
        adminListRwaReplies(),
      ]);
      setClaims(nextClaims);
      setThreads(nextThreads);
      setReplies(nextReplies);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load RWA moderation.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateClaim(id: number, status: string) {
    await adminUpdateRwaClaim(id, { status });
    setMessage(`RWA claim ${status}.`);
    await load();
  }

  async function updateThread(id: number, status: string) {
    await adminUpdateRwaThread(id, { status });
    setMessage(`RWA topic ${status}.`);
    await load();
  }

  async function updateReply(id: number, status: string) {
    await adminUpdateRwaReply(id, { status });
    setMessage(`RWA reply ${status}.`);
    await load();
  }

  return (
    <AdminLayout title="RWA Portal" subtitle="Approve RWA claims, resident discussions, grievances and official replies.">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white px-5 py-4">
            <p className="text-2xl font-black">{claims.length}</p>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Claims</p>
          </div>
          <div className="rounded-2xl border bg-white px-5 py-4">
            <p className="text-2xl font-black">{threads.length}</p>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Threads</p>
          </div>
          <div className="rounded-2xl border bg-white px-5 py-4">
            <p className="text-2xl font-black">{replies.length}</p>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Replies</p>
          </div>
        </div>
        <Button variant="outline" className="rounded-full bg-white" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {message ? <p className="mb-5 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</p> : null}
      {loading ? <p className="rounded-2xl bg-white p-5 text-sm font-bold text-slate-500">Loading RWA moderation...</p> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-xl font-black">RWA claims</h2>
          <div className="space-y-3">
            {claims.map((claim) => (
              <article key={claim.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h3 className="font-black">{claim.organisation_name}</h3>
                    <p className="text-sm text-slate-500">{claim.society?.name} · {claim.representative_name}, {claim.representative_role}</p>
                    <p className="text-sm text-slate-500">{claim.account?.phone || claim.phone}</p>
                  </div>
                  <span className="h-fit rounded-full bg-slate-50 px-3 py-1 text-xs font-black capitalize text-slate-700">{claim.status}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{claim.proof_notes}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-full bg-emerald-600" onClick={() => void updateClaim(claim.id, "approved")}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full bg-white text-rose-700" onClick={() => void updateClaim(claim.id, "rejected")}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </article>
            ))}
            {!claims.length ? <p className="rounded-2xl border bg-white p-5 text-sm text-slate-500">No RWA claims yet.</p> : null}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-black">Resident topics</h2>
          <div className="space-y-3">
            {threads.map((thread) => (
              <article key={thread.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h3 className="font-black">{thread.title}</h3>
                    <p className="text-sm text-slate-500">{thread.society?.name} · {thread.type} · {thread.priority}</p>
                  </div>
                  <span className="h-fit rounded-full bg-slate-50 px-3 py-1 text-xs font-black capitalize text-slate-700">{thread.status}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{thread.body}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-full bg-blue-700" onClick={() => void updateThread(thread.id, "approved")}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full bg-white" onClick={() => void adminUpdateRwaThread(thread.id, { status: "approved", resolved: true }).then(load)}>
                    Mark resolved
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full bg-white text-rose-700" onClick={() => void updateThread(thread.id, "rejected")}>
                    Reject
                  </Button>
                </div>
              </article>
            ))}
            {!threads.length ? <p className="rounded-2xl border bg-white p-5 text-sm text-slate-500">No RWA resident topics yet.</p> : null}
          </div>
        </section>

        <section className="xl:col-span-2">
          <h2 className="mb-3 text-xl font-black">Replies</h2>
          <div className="grid gap-3 xl:grid-cols-2">
            {replies.map((reply) => (
              <article key={reply.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h3 className="font-black">{reply.thread?.title}</h3>
                    <p className="text-sm text-slate-500">
                      {reply.thread?.society?.name} · {reply.is_official ? "Official RWA reply" : "Resident reply"}
                    </p>
                  </div>
                  <span className="h-fit rounded-full bg-slate-50 px-3 py-1 text-xs font-black capitalize text-slate-700">{reply.status}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{reply.body}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-full bg-emerald-600" onClick={() => void updateReply(reply.id, "approved")}>
                    <MessageSquareText className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full bg-white text-rose-700" onClick={() => void updateReply(reply.id, "rejected")}>
                    Reject
                  </Button>
                </div>
              </article>
            ))}
            {!replies.length ? <p className="rounded-2xl border bg-white p-5 text-sm text-slate-500">No replies waiting.</p> : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
