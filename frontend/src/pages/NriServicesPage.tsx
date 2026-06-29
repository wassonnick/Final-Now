import { useEffect, useState, type FormEvent } from "react";
import { Globe2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/config/api";
import { setPublicSeo } from "@/lib/seo";

export function NriServicesPage() {
  const [form, setForm] = useState({ name: "", country: "", contact_method: "email", phone: "", email: "", service_type: "buy", property_context: "", notes: "", consent: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setPublicSeo("NRI Property Support in Gurgaon | SocietyFlats", "Request a human-reviewed Gurgaon property consultation for buying, selling, renting out or local coordination from overseas.", { canonical: "/nri-services" });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      setSaving(true); setError(""); setNotice("");
      const response = await fetch(`${API_BASE_URL}/nri-cases`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(form) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || "Could not submit your request.");
      setNotice(`${json.message} Reference: ${json.case_reference}`);
      setForm({ name: "", country: "", contact_method: "email", phone: "", email: "", service_type: "buy", property_context: "", notes: "", consent: false });
    } catch (err) { setError(err instanceof Error ? err.message : "Could not submit your request."); }
    finally { setSaving(false); }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-[36px] border border-blue-100 bg-white p-7 shadow-sm md:p-10">
        <div className="flex items-start gap-4"><div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><Globe2 className="h-7 w-7" /></div><div><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">NRI property desk</p><h1 className="mt-2 text-4xl font-black text-slate-950">Human-reviewed Gurgaon property support from overseas</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Request local coordination for buying, selling, renting out or property management. We start with a consultation—never with invented inventory or guaranteed outcomes.</p></div></div>
        <div className="mt-7 grid gap-3 md:grid-cols-4">{['Buy with local verification','Sell through a reviewed process','Rent out real inventory','Coordinate property management'].map((text) => <div key={text} className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">{text}</div>)}</div>
      </section>

      <div className="mt-7 grid gap-7 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={submit} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-black text-slate-950">Request a consultation</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input required placeholder="Country of residence" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <select value={form.contact_method} onChange={(e) => setForm({ ...form, contact_method: e.target.value })} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="email">Prefer email</option><option value="whatsapp">Prefer WhatsApp</option></select>
            <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="buy">Buy</option><option value="sell">Sell</option><option value="rent_out">Rent out</option><option value="manage">Property management</option></select>
            <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="WhatsApp with country code" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input className="sm:col-span-2" placeholder="Society / property context (optional)" value={form.property_context} onChange={(e) => setForm({ ...form, property_context: e.target.value })} />
            <textarea className="min-h-28 rounded-md border border-slate-200 p-3 text-sm sm:col-span-2" placeholder="What help do you need? Do not include passport, PAN, bank or remittance details." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <label className="flex items-start gap-2 text-sm leading-6 text-slate-600 sm:col-span-2"><input required type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-1" />I consent to SocietyFlats contacting me about this request and understand independent professional verification may be required.</label>
            <Button disabled={saving} className="bg-blue-700 hover:bg-blue-800 sm:col-span-2">{saving ? "Submitting…" : "Submit consultation request"}</Button>
          </div>
          {error ? <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p> : null}{notice ? <p className="mt-4 text-sm font-semibold text-emerald-700">{notice}</p> : null}
        </form>
        <aside className="rounded-[30px] border border-amber-100 bg-amber-50 p-6 md:p-8"><ShieldCheck className="h-7 w-7 text-amber-700" /><h2 className="mt-4 text-2xl font-black text-slate-950">Clear scope, fewer surprises</h2><ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700"><li>• No passport, PAN, bank or payment details in this form.</li><li>• No legal, tax, FEMA, banking or remittance advice.</li><li>• No guaranteed rent, resale value, timeline or investment return.</li><li>• Any specialist work must be independently verified with qualified professionals.</li></ul></aside>
      </div>
    </main>
  );
}
