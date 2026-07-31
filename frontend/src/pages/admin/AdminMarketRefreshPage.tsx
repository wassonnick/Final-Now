import { useEffect, useState } from "react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { fetchMarketRefreshes, type MarketRefreshResponse, type MarketRefreshRow } from "@/lib/marketRefreshApi";

const number = new Intl.NumberFormat("en-IN");

const FIELD_LABELS: Record<string, string> = {
  rent_range: "Rent range",
  buy_range: "Buy range",
  price_per_sqft: "Price / sq.ft.",
  rental_yield: "Rental yield",
  average_rent: "Average rent",
  average_sale_price: "Average sale price",
};

function Stat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{helper}</p>
    </div>
  );
}

/** Before → after for one refresh, with unchanged fields muted so movement stands out. */
function RefreshRow({ row }: { row: MarketRefreshRow }) {
  const fields = Object.keys(row.after || {});
  const changed = new Set(row.changed_fields || []);

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-black text-slate-900">{row.society_name || `Society #${row.society_id}`}</p>
          <p className="text-xs text-slate-500">
            {row.sector || "—"} · {row.trigger} · {row.created_at ? new Date(row.created_at).toLocaleString("en-IN") : "—"}
            {row.confidence != null ? ` · ${row.confidence}% confidence` : ""}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${changed.size ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {changed.size ? `${changed.size} changed` : "no change"}
        </span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
            <tr><th className="py-1.5">Field</th><th className="py-1.5">Before</th><th className="py-1.5">After</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fields.map((field) => {
              const moved = changed.has(field);
              return (
                <tr key={field} className={moved ? "" : "text-slate-400"}>
                  <td className="py-2 font-bold">{FIELD_LABELS[field] || field}</td>
                  <td className="py-2">{row.before?.[field] || "—"}</td>
                  <td className={`py-2 ${moved ? "font-black text-emerald-700" : ""}`}>{row.after?.[field] || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {Array.isArray(row.sources) && row.sources.length ? (
        <p className="mt-2 text-[11px] text-slate-500">
          Sources: {row.sources.map((source) => (typeof source === "string" ? source : JSON.stringify(source))).join(" · ")}
        </p>
      ) : (
        <p className="mt-2 text-[11px] font-semibold text-amber-700">No sources cited for this refresh.</p>
      )}
    </div>
  );
}

export function AdminMarketRefreshPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<MarketRefreshResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (nextDays = days) => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchMarketRefreshes(nextDays));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load market refreshes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = data?.summary;

  return (
    <AdminLayout title="Market Refresh" subtitle="What the grounded price refresh actually changed, and what it cost to find out.">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[7, 30, 90].map((option) => (
            <Button key={option} type="button" variant={days === option ? "default" : "outline"} className="rounded-full" onClick={() => { setDays(option); void load(option); }}>
              Last {option} days
            </Button>
          ))}
        </div>
        <Button type="button" variant="outline" className="rounded-full" onClick={() => void load()} disabled={loading}>Refresh</Button>
      </div>

      {summary ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Refreshes" value={number.format(summary.refreshes)} helper={`${number.format(summary.societies_touched)} societies touched`} />
            <Stat label="Actually changed" value={`${summary.change_rate}%`} helper={`${number.format(summary.refreshes_with_changes)} of ${number.format(summary.refreshes)} moved a price`} />
            <Stat label="Changed nothing" value={number.format(summary.refreshes_unchanged)} helper="paid for a search, wrote the same values" />
            <Stat label="Units spent" value={`~${number.format(summary.estimated_units_spent)}`} helper="5 weighted units per web-search call" />
          </div>

          {data?.fields_changed?.length ? (
            <div className="mb-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Which fields move</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.fields_changed.map((entry) => (
                  <span key={entry.field} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {FIELD_LABELS[entry.field] || entry.field}: {number.format(entry.count)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {error ? <p className="mb-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p> : null}

      {loading ? (
        <p className="rounded-2xl bg-white p-5 text-sm font-bold text-slate-500">Loading market refreshes…</p>
      ) : data?.refreshes?.length ? (
        <div className="space-y-3">{data.refreshes.map((row) => <RefreshRow key={row.id} row={row} />)}</div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-bold text-slate-600">No market refreshes recorded in this window yet.</p>
          <p className="mt-1 text-sm text-slate-500">Logging starts from this deploy — the next nightly run will fill this in.</p>
        </div>
      )}
    </AdminLayout>
  );
}
