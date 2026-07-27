import { useEffect, useMemo, useState } from "react";
import { MailCheck, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/adminApi";

type Delivery = {
  id: number;
  message_type: string;
  recipient_masked?: string | null;
  related_type?: string | null;
  related_id?: number | null;
  provider: string;
  provider_message_id?: string | null;
  status: "sent" | "delivered" | "delayed" | "bounced" | "complained" | "suppressed" | "failed" | "skipped";
  http_status?: number | null;
  failure_reason?: string | null;
  created_at: string;
};

type Summary = {
  sent: number;
  delivered: number;
  delayed: number;
  bounced: number;
  complained: number;
  suppressed: number;
  failed: number;
  skipped: number;
};

const emptySummary: Summary = {
  sent: 0,
  delivered: 0,
  delayed: 0,
  bounced: 0,
  complained: 0,
  suppressed: 0,
  failed: 0,
  skipped: 0,
};

function statusTone(status: Delivery["status"]) {
  if (status === "delivered") return "bg-emerald-50 text-emerald-700";
  if (["bounced", "complained", "suppressed", "failed"].includes(status)) return "bg-rose-50 text-rose-700";
  if (status === "sent") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

export function AdminEmailDeliveriesPage() {
  const [items, setItems] = useState<Delivery[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const response = await adminFetch(`/admin/email-deliveries?per_page=100${status ? `&status=${status}` : ""}`);
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || "Could not load email delivery history.");
      setItems(json?.data?.data || []);
      setSummary({ ...emptySummary, ...(json?.summary || {}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load email delivery history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status]);

  const total = useMemo(() => Object.values(summary).reduce((sum, value) => sum + value, 0), [summary]);
  const attention = summary.bounced + summary.complained + summary.suppressed + summary.failed;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Outbound communications</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-slate-950">Email delivery</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Safe Resend status for enquiry confirmations and admin alerts. Message bodies, tokens and full recipient addresses are never stored here.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Tracked", total, "text-slate-950"],
          ["Accepted", summary.sent, "text-blue-700"],
          ["Delivered", summary.delivered, "text-emerald-700"],
          ["Needs attention", attention, "text-rose-700"],
          ["Delayed / skipped", summary.delayed + summary.skipped, "text-amber-700"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <p className={`mt-2 text-3xl font-black ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div className="flex items-center gap-2 font-bold text-slate-900"><MailCheck className="h-5 w-5 text-blue-600" /> Recent delivery attempts</div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="sent">Accepted</option>
            <option value="delivered">Delivered</option>
            <option value="delayed">Delayed</option>
            <option value="bounced">Bounced</option>
            <option value="complained">Complained</option>
            <option value="suppressed">Suppressed</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
        </div>
        {error ? <div className="m-4 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="p-4">When</th><th className="p-4">Message</th><th className="p-4">Recipient</th><th className="p-4">Related record</th><th className="p-4">Status</th><th className="p-4">Provider result</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && items.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">No delivery attempts match this filter.</td></tr> : null}
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="p-4 text-slate-600">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="p-4 font-semibold text-slate-900">{item.message_type.replace(/_/g, " ")}</td>
                  <td className="p-4 font-mono text-xs text-slate-600">{item.recipient_masked || "—"}</td>
                  <td className="p-4 text-slate-600">{item.related_type ? `${item.related_type} #${item.related_id || "—"}` : "—"}</td>
                  <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(item.status)}`}>{item.status === "sent" ? "accepted" : item.status}</span></td>
                  <td className="max-w-xs p-4 text-xs text-slate-600">{item.provider_message_id || item.failure_reason || (item.http_status ? `HTTP ${item.http_status}` : "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
