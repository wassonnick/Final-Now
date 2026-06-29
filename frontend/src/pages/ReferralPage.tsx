import { useEffect, useState, type FormEvent } from "react";
import { Gift, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchReferrals, submitReferral, type ReferralResponse } from "@/lib/accountApi";
import { getCustomerAccountSession } from "@/lib/customerAccount";
import { setPublicSeo } from "@/lib/seo";

export function ReferralPage() {
  const session = getCustomerAccountSession();
  const [data, setData] = useState<ReferralResponse>({});
  const [form, setForm] = useState({ name: "", phone: "", intent: "rent" as "rent" | "buy" | "sell", notes: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      setLoading(true);
      setData(await fetchReferrals(session?.accountAccessToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load referrals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPublicSeo("Private Referrals | SocietyFlats", "Private SocietyFlats referral dashboard.", { canonical: "/referrals", noindex: true });
    void load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      setSaving(true); setError(""); setNotice("");
      const result = await submitReferral(session?.accountAccessToken, form);
      setNotice(result.message || "Referral submitted for review.");
      setForm({ name: "", phone: "", intent: "rent", notes: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit referral.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[32px] border border-blue-100 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><Gift className="h-6 w-6" /></div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Referral MVP</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Refer someone who genuinely needs a home</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">SocietyFlats reviews every referral manually. Rewards are considered only after a genuine conversion; submitting a contact does not guarantee payment.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[['Submitted', data.summary?.submitted || 0], ['Qualified', data.summary?.qualified || 0], ['Converted', data.summary?.converted || 0]].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={submit} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Submit a referral</h2>
          <p className="mt-1 text-sm text-slate-500">Only share details with the person’s permission.</p>
          <div className="mt-5 space-y-4">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />
            <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile number" inputMode="numeric" />
            <select value={form.intent} onChange={(e) => setForm({ ...form, intent: e.target.value as "rent" | "buy" | "sell" })} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
              <option value="rent">Rent a home</option><option value="buy">Buy a home</option><option value="sell">Sell a home</option>
            </select>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional context" className="min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm" />
            <Button disabled={saving} className="w-full bg-blue-700 hover:bg-blue-800">{saving ? "Submitting…" : "Submit for review"}</Button>
          </div>
          {error ? <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p> : null}
          {notice ? <p className="mt-4 text-sm font-semibold text-emerald-700">{notice}</p> : null}
        </form>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-700" /><h2 className="text-xl font-black text-slate-950">Your referrals</h2></div>
          <p className="mt-1 text-xs text-slate-500">Code: {data.referral_code || (loading ? "Loading…" : "Unavailable")}</p>
          <div className="mt-5 space-y-3">
            {data.data?.length ? data.data.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3"><p className="font-bold text-slate-900">{item.name} · ••••{item.phone_last4}</p><span className="rounded-full bg-white px-3 py-1 text-xs font-bold capitalize text-blue-700">{item.status}</span></div>
                <p className="mt-2 text-xs capitalize text-slate-500">{item.intent} · Reward: {item.reward_status}</p>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No referrals submitted yet.</div>}
          </div>
          <p className="mt-5 flex gap-2 rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-800"><ShieldCheck className="h-4 w-4 shrink-0" />{data.policy || "All rewards remain subject to manual verification."}</p>
        </section>
      </div>
    </main>
  );
}
