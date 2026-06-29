import { useEffect, useState } from "react";
import { Gift, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/adminApi";

type Referral = {
  id: number; referred_name: string; referred_phone: string; intent: string; status: string;
  reward_status: string; referrer?: { name?: string; phone_normalized?: string };
};

export function AdminReferralsPage() {
  const [items, setItems] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true); setError("");
      const response = await adminFetch("/admin/referrals?per_page=100");
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || "Could not load referrals.");
      setItems(json?.data?.data || []);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load referrals."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function update(item: Referral, field: "status" | "reward_status", value: string) {
    const response = await adminFetch(`/admin/referrals/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) { setError(json?.message || "Could not update referral."); return; }
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...json.data } : entry));
  }

  return (
    <AdminLayout title="Referrals" subtitle="Review genuine introductions and control conversion/reward states manually.">
      <div className="mb-5 flex items-center justify-between rounded-[24px] border border-blue-100 bg-blue-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-blue-800"><Gift className="h-5 w-5" />No reward is automatic. Mark converted only after verification.</p>
        <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
      </div>
      {error ? <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr] lg:items-center">
              <div><p className="font-black text-slate-950">{item.referred_name} · {item.referred_phone}</p><p className="mt-1 text-xs text-slate-500">Intent: {item.intent} · Referred by {item.referrer?.name || item.referrer?.phone_normalized || "Account"}</p></div>
              <select value={item.status} onChange={(e) => void update(item, "status", e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
                {['submitted','contacted','qualified','rejected','converted'].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <select value={item.reward_status} onChange={(e) => void update(item, "reward_status", e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
                {['pending','approved','paid','declined'].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
          </article>
        ))}
        {!loading && !items.length ? <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No referrals yet.</div> : null}
      </div>
    </AdminLayout>
  );
}
