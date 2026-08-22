import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/adminApi";

/**
 * Every brief people have built, including the ones nobody sent.
 *
 * Demand gaps says which buckets are worth acting on; this is the record underneath it.
 * The unsent briefs are the interesting ones — somebody answered nine questions about what
 * they want, saw what we hold, and left. That was previously visible nowhere at all.
 */

function money(value: string): string {
  const rupees = Number(value || 0);
  if (!rupees) return "";
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)}Cr`;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;

  return `₹${Math.round(rupees / 1000)}K`;
}

function when(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function AdminBriefsPage() {
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminFetch("/admin/briefs");
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || "Could not load briefs.");
      setPayload(json);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load briefs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const rows: any[] = payload?.data || [];

  return (
    <AdminLayout
      title="Briefs"
      subtitle="What people told us they wanted, whether or not they ever sent it. Anonymous — the requirement is kept, never who wrote it."
    >
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="rounded-full" disabled={loading} onClick={() => void load()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="mt-4 flex gap-2 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : null}

      {!loading && payload ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Briefs built", payload.summary?.briefs],
              ["Sent as an enquiry", payload.summary?.sent_as_enquiry],
              ["Told us something extra", payload.summary?.with_notes],
              ["Saved to an account", payload.summary?.saved_to_account],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-2xl font-black tabular-nums text-slate-900">{String(value ?? 0)}</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{String(label)}</p>
              </div>
            ))}
          </div>

          {rows.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
              No briefs in this window yet. They are recorded when someone reaches their shortlist.
            </p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {rows.map((row) => (
                <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-black text-slate-900">
                        {row.bhk ? `${row.bhk.split(",").join("/")} BHK` : "Any size"} to {row.mode} in{" "}
                        {row.where || row.commute || row.city || "Delhi NCR"}
                        {row.budget && money(row.budget) ? ` · ${money(row.budget)}` : ""}
                      </h3>
                      <p className="mt-1 text-[12.5px] font-semibold text-slate-500">
                        {[
                          row.purpose,
                          row.commute ? `near ${row.commute}` : "",
                          row.timeline,
                          row.priorities ? row.priorities.split(",").join(", ") : "",
                        ].filter(Boolean).join(" · ")}
                      </p>

                      {/* The part no filter could answer — the reason this is worth storing. */}
                      {row.notes ? (
                        <p className="mt-2 border-l-2 border-slate-200 pl-2.5 text-[13px] italic leading-5 text-slate-600">
                          {row.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[12px] font-semibold text-slate-400">{when(row.created_at)}</p>
                      <p className="mt-1 text-[13px] font-bold tabular-nums text-slate-900">
                        {row.shortlisted} of {row.scanned}
                      </p>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">shortlisted</p>
                    </div>
                  </div>

                  {/* A brief we could not answer is the one worth chasing supply for. */}
                  {row.shortlisted === 0 ? (
                    <span className="mt-2.5 inline-block rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-black uppercase text-rose-700">
                      Nothing fit
                    </span>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </>
      ) : null}

      {loading ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white p-8 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading briefs…
        </div>
      ) : null}
    </AdminLayout>
  );
}

export default AdminBriefsPage;
