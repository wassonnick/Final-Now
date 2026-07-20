import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, DollarSign, ImageIcon, RefreshCw, ServerCog } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { fetchAiSpend, type AiSpendGroup, type AiSpendLog, type AiSpendResponse } from "@/lib/aiSpendApi";

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-IN");

function usd(value: number | undefined) {
  return `$${Number(value || 0).toFixed(4)}`;
}

function featureLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StatCard({ label, value, helper, icon: Icon }: { label: string; value: string; helper: string; icon: any }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <span className="rounded-2xl bg-blue-50 p-2 text-blue-700"><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-semibold text-slate-500">{helper}</p>
    </div>
  );
}

function GroupTable({ title, rows }: { title: string; rows: AiSpendGroup[] }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-serif text-2xl font-black text-slate-950">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.14em] text-slate-400">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2 text-right">Spend</th>
              <th className="py-2 text-right">Calls</th>
              <th className="py-2 text-right">Tokens</th>
              <th className="py-2 text-right">Images</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(rows || []).map((row) => (
              <tr key={row.label}>
                <td className="py-3 font-bold text-slate-800">{featureLabel(row.label || "unknown")}</td>
                <td className="py-3 text-right font-black text-blue-700">{usd(row.estimated_cost_usd)}</td>
                <td className="py-3 text-right text-slate-600">{number.format(row.calls)}</td>
                <td className="py-3 text-right text-slate-600">{number.format(row.total_tokens)}</td>
                <td className="py-3 text-right text-slate-600">{number.format(row.image_count)}</td>
              </tr>
            ))}
            {(!rows || rows.length === 0) ? (
              <tr><td colSpan={5} className="py-6 text-center font-semibold text-slate-500">No usage logged yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecentTable({ rows }: { rows: AiSpendLog[] }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-serif text-2xl font-black text-slate-950">Recent AI calls</h2>
      <p className="mt-1 text-sm font-semibold text-slate-500">No prompts, outputs, tokens, API keys, or secrets are stored here — only usage metadata.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.14em] text-slate-400">
            <tr>
              <th className="py-2">When</th>
              <th className="py-2">Module</th>
              <th className="py-2">Provider / model</th>
              <th className="py-2 text-right">Tokens</th>
              <th className="py-2 text-right">Images</th>
              <th className="py-2 text-right">Spend</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-3 text-slate-500">{row.created_at ? new Date(row.created_at).toLocaleString("en-IN") : "—"}</td>
                <td className="py-3">
                  <p className="font-bold text-slate-800">{featureLabel(row.feature)}</p>
                  <p className="text-xs text-slate-500">{row.operation || "—"}</p>
                </td>
                <td className="py-3">
                  <p className="font-bold text-slate-800">{row.provider}</p>
                  <p className="max-w-[260px] truncate text-xs text-slate-500">{row.model || "—"}</p>
                </td>
                <td className="py-3 text-right text-slate-600">{number.format(row.total_tokens)}</td>
                <td className="py-3 text-right text-slate-600">{number.format(row.image_count)}</td>
                <td className="py-3 text-right font-black text-blue-700">{usd(row.estimated_cost_usd)}</td>
                <td className="py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${row.status === "failed" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="py-6 text-center font-semibold text-slate-500">No AI calls logged yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AdminAiSpendPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AiSpendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchAiSpend(days));
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI spend data could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const summary = data?.summary;
  const rupeeEstimate = useMemo(() => {
    // Display-only rough conversion so the USD vendor estimate feels concrete.
    return inr.format(Math.round((summary?.estimated_cost_usd || 0) * 84));
  }, [summary?.estimated_cost_usd]);

  return (
    <AdminLayout title="AI Spend Monitor" subtitle="Estimated Claude + OpenAI usage by SocietyFlats module. Secrets and prompts never appear here.">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[7, 30, 90].map((option) => (
            <Button key={option} type="button" variant={days === option ? "default" : "outline"} className="rounded-full" onClick={() => setDays(option)}>
              {option} days
            </Button>
          ))}
        </div>
        <Button type="button" variant="outline" className="rounded-full" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label={`${days}d estimated`} value={usd(summary?.estimated_cost_usd)} helper={`≈ ₹${rupeeEstimate} display estimate`} icon={DollarSign} />
        <StatCard label="Today" value={usd(summary?.today_estimated_cost_usd)} helper="Logged since midnight" icon={Bot} />
        <StatCard label="Calls" value={number.format(summary?.calls || 0)} helper={`${number.format(summary?.total_tokens || 0)} tokens`} icon={ServerCog} />
        <StatCard label="Images" value={number.format(summary?.image_count || 0)} helper="OpenAI generated image calls" icon={ImageIcon} />
        <StatCard label="Failures" value={number.format(summary?.failures || 0)} helper={summary?.budget_guard?.provider_limited ? "Provider limit active" : "Provider limit clear"} icon={AlertTriangle} />
      </div>

      <div className="mt-5 rounded-[24px] border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
        Daily AI guard: {number.format(summary?.budget_guard?.used_today || 0)} / {number.format(summary?.budget_guard?.daily_cap || 0)} weighted units used today.
        These totals are estimates from app-side usage logs; compare with vendor dashboards for final invoices.
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <GroupTable title="Spend by provider" rows={summary?.by_provider || []} />
        <GroupTable title="Spend by module" rows={summary?.by_feature || []} />
      </div>

      <div className="mt-5">
        <GroupTable title="Spend by model" rows={summary?.by_model || []} />
      </div>

      <div className="mt-5">
        <RecentTable rows={data?.recent || []} />
      </div>
    </AdminLayout>
  );
}
