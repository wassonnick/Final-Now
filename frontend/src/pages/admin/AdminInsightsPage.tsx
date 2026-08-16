import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Search, Store, Target } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/adminApi";

/**
 * The three reports that say what to do next.
 *
 * Each was an artisan command, which meant each existed only for whoever was willing to
 * open a shell on the production container. They answer different questions and are worth
 * reading in this order: what we cannot sell people, what we nearly rank for, and what we
 * are absent from entirely.
 */

type Tab = "demand" | "striking" | "coverage";

const TABS: Array<{ id: Tab; label: string; icon: typeof Store; blurb: string; path: string }> = [
  {
    id: "demand", label: "Demand gaps", icon: Store, path: "demand-gaps",
    blurb: "What buyers and tenants keep asking for that we hold no listing for — the flats worth going out and signing.",
  },
  {
    id: "striking", label: "Nearly ranking", icon: Target, path: "striking-distance",
    blurb: "Pages that already rank, one nudge from page one, ordered by the clicks a move would actually win.",
  },
  {
    id: "coverage", label: "Missing entirely", icon: Search, path: "coverage-gap",
    blurb: "Keywords we target that Google has never once shown us for. Absent is a different problem from ranking badly.",
  },
];

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
      {children}
    </p>
  );
}

function money(rupees: number | null): string {
  if (!rupees) return "—";
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)}Cr`;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;

  return `₹${Math.round(rupees / 1000)}K`;
}

export function AdminInsightsPage() {
  const [tab, setTab] = useState<Tab>("demand");
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const active = TABS.find((entry) => entry.id === tab)!;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminFetch(`/admin/insights/${active.path}`);
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || "Could not load this report.");
      setPayload(json);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load this report.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);

  return (
    <AdminLayout
      title="What to do next"
      subtitle="Three reads on the same business: what we cannot sell, what we nearly rank for, and what we are invisible to."
    >
      <div className="flex flex-wrap gap-2 rounded-[22px] border border-slate-200 bg-white p-2">
        {TABS.map((entry) => {
          const Icon = entry.icon;

          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                tab === entry.id ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" /> {entry.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[70ch] text-[13.5px] leading-6 text-slate-500">{active.blurb}</p>
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

      {loading ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white p-8 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Reading the last {payload?.window_days ?? ""} days…
        </div>
      ) : null}

      {!loading && payload && tab === "demand" ? <DemandGaps payload={payload} /> : null}
      {!loading && payload && tab === "striking" ? <Striking payload={payload} /> : null}
      {!loading && payload && tab === "coverage" ? <Coverage payload={payload} /> : null}
    </AdminLayout>
  );
}

function DemandGaps({ payload }: { payload: any }) {
  const rows: any[] = payload.data || [];

  if (rows.length === 0) {
    return (
      <div className="mt-4">
        <Empty>
          No repeated requirement yet. A pattern needs a couple of dozen briefs or leads —
          with the current traffic that is a few weeks away, not a fault.
        </Empty>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Gaps found", payload.summary?.gaps],
          ["Nothing to offer", payload.summary?.unmet],
          ["People affected", payload.summary?.requests_unmet],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-2xl font-black tabular-nums text-slate-900">{String(value ?? 0)}</p>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{String(label)}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        {rows.map((row, index) => (
          <article key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-black text-slate-900">
                    {row.bhk > 0 ? `${row.bhk} BHK` : "Any size"} to {row.mode} in {row.area}
                  </h3>
                  {row.unmet ? (
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-black uppercase text-rose-700">
                      Nothing listed
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-700">
                      {row.listings_available} listed
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12.5px] font-semibold text-slate-500">
                  {row.requests} asked · typically {money(row.typical_budget)}
                  {row.societies_known > 0 ? ` · ${row.societies_known} societies there to approach` : " · no society on file there"}
                </p>
                {(row.notes || []).slice(0, 2).map((note: string) => (
                  <p key={note} className="mt-1.5 border-l-2 border-slate-200 pl-2.5 text-[12.5px] italic leading-5 text-slate-500">
                    {note}
                  </p>
                ))}
              </div>
              <p className="shrink-0 text-3xl font-black tabular-nums text-slate-900">{row.requests}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Striking({ payload }: { payload: any }) {
  const rows: any[] = payload.data || [];
  const curve: Record<string, number> = payload.ctr_by_band || {};

  return (
    <div className="mt-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
          Click-through this site actually gets, by position
        </p>
        <div className="mt-2 flex flex-wrap gap-4">
          {Object.entries(curve).map(([band, ctr]) => (
            <p key={band} className="text-[13px] font-semibold text-slate-600">
              pos {band} <span className="font-black text-slate-900">{(ctr * 100).toFixed(2)}%</span>
            </p>
          ))}
        </div>
        <p className="mt-3 text-[13px] font-semibold text-slate-500">
          About {payload.summary?.winnable_clicks ?? 0} clicks a month winnable across {payload.summary?.opportunities ?? 0} pages.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4"><Empty>Nothing in striking distance in this window.</Empty></div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wide text-slate-400">
              <tr>
                {["+clicks", "position", "impressions", "query", "why it is stuck"].map((head) => (
                  <th key={head} className="px-4 py-3">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-black tabular-nums text-emerald-700">+{row.potential_clicks}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{row.position}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{row.impressions}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.query}</td>
                  <td className="px-4 py-3 text-slate-500">{row.gap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Coverage({ payload }: { payload: any }) {
  const summary: any[] = payload.data || [];
  const actionable: any[] = payload.actionable || [];

  if (summary.length === 0) {
    return <div className="mt-4"><Empty>No keyword mapping yet — the autopilot seeds these on its nightly run.</Empty></div>;
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wide text-slate-400">
            <tr>
              {["page type", "targeted", "appearing", "absent", "coverage"].map((head) => (
                <th key={head} className="px-4 py-3">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.cluster} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-semibold text-slate-900">{row.cluster}</td>
                <td className="px-4 py-3 tabular-nums text-slate-600">{row.targeted}</td>
                <td className="px-4 py-3 tabular-nums text-emerald-700">{row.appearing}</td>
                <td className="px-4 py-3 tabular-nums text-slate-500">{row.absent}</td>
                <td className="px-4 py-3 font-black tabular-nums text-slate-900">{row.coverage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {actionable.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
            Absent keywords on page types that do rank elsewhere
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {actionable.map((row) => (
              <span key={row.keyword} className="rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-semibold text-slate-700">
                {row.keyword}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminInsightsPage;
