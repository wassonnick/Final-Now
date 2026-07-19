import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  FileSearch,
  Globe2,
  Home,
  KeyRound,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/config/api";
import { setPublicSeo } from "@/lib/seo";

const nriLanes = [
  {
    title: "Buy from overseas",
    body: "Shortlist societies, verify locality fit, compare towers and coordinate visits for family or representatives in Gurgaon.",
    icon: Home,
  },
  {
    title: "Sell with control",
    body: "Prepare a society-first resale brief, source-check listing details, route buyer interest and keep private owner details protected.",
    icon: BadgeCheck,
  },
  {
    title: "Rent out safely",
    body: "Create verified rental inventory, qualify enquiries, coordinate viewing steps and keep every lead inside the SocietyFlats workflow.",
    icon: KeyRound,
  },
  {
    title: "Manage follow-ups",
    body: "Track calls, documents-to-review, visit status, tenant/buyer interest and next actions from one NRI case queue.",
    icon: ClipboardCheck,
  },
];

const commandCenterSteps = [
  ["Intake", "Tell us country, property context, goal and preferred contact method. No sensitive documents in the public form."],
  ["Society intelligence", "We start with verified society profiles, location checks, map context, amenities and current public inventory."],
  ["Local coordination", "Calls, viewings, buyer/tenant interest, source notes and status changes are tracked in the NRI case workflow."],
  ["Human decision", "You approve next steps. SocietyFlats does not auto-commit, auto-publish private data or give legal/tax/FEMA advice."],
];

const proofPoints = [
  ["Private by design", "Owner, broker and family contact details stay inside protected workflows."],
  ["No fake listings", "If a home has no real photos yet, we show a verification placeholder instead of pretending."],
  ["Society-first sales", "We sell the context: commute, society fit, price sanity, livability and verified demand."],
  ["Admin case tracking", "NRI requests appear in the admin case queue for follow-up and status updates."],
];

const serviceOptions = [
  ["buy", "Buy"],
  ["sell", "Sell"],
  ["rent_out", "Rent out"],
  ["manage", "Property management"],
];

export function NriServicesPage() {
  const [form, setForm] = useState({
    name: "",
    country: "",
    contact_method: "email",
    phone: "",
    email: "",
    service_type: "buy",
    property_context: "",
    notes: "",
    consent: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setPublicSeo(
      "NRI Property Management & Sales in Gurgaon | SocietyFlats",
      "SocietyFlats NRI desk helps overseas owners and families buy, sell, rent out and coordinate Gurgaon property through verified society intelligence, private lead handling and admin-tracked follow-up.",
      { canonical: "/nri-services" },
    );
    window.scrollTo(0, 0);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setNotice("");
      const response = await fetch(`${API_BASE_URL}/nri-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(form),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || "Could not submit your request.");
      setNotice(`${json.message} Reference: ${json.case_reference}`);
      setForm({
        name: "",
        country: "",
        contact_method: "email",
        phone: "",
        email: "",
        service_type: "buy",
        property_context: "",
        notes: "",
        consent: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F2EA] text-[#111827]">
      <section className="border-b border-[#E6DDCF] bg-[radial-gradient(circle_at_82%_12%,rgba(194,114,78,.16),transparent_30%),radial-gradient(circle_at_12%_20%,rgba(35,59,110,.12),transparent_28%),linear-gradient(180deg,#FFFCF7,#F7F2EA)]">
        <div className="mx-auto grid max-w-[1360px] gap-9 px-5 py-14 md:px-10 md:py-20 lg:grid-cols-[1fr_430px] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#E6DDCF] bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#233B6E]">
              <Globe2 className="h-4 w-4" />
              NRI management desk
            </p>
            <h1 className="mt-5 max-w-5xl font-display text-[42px] font-medium leading-[1.02] tracking-[-0.025em] md:text-[72px]">
              Gurgaon property, managed from overseas with a local command center.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#667085] md:text-lg">
              Buying, selling, renting out or coordinating an existing Gurgaon home from abroad? SocietyFlats gives NRI owners and families a private, admin-tracked workflow built around verified societies, real inventory and careful local follow-up.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#nri-consultation" className="rounded-[14px] bg-[#233B6E] px-6 py-3.5 text-sm font-black text-white">
                Start NRI case
              </a>
              <Link to="/search?tab=societies" className="rounded-[14px] border border-[#E6DDCF] bg-white px-6 py-3.5 text-sm font-black text-[#233B6E]">
                View verified societies
              </Link>
            </div>
          </div>

          <aside className="rounded-[30px] border border-[#E6DDCF] bg-white p-5 shadow-[0_30px_80px_-52px_rgba(17,24,39,.5)]">
            <div className="rounded-[24px] bg-[#111827] p-6 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#E3B36B]">NRI sales strength</p>
              <p className="mt-4 font-display text-4xl font-medium">One desk for owner, buyer, tenant and field follow-up.</p>
            </div>
            <div className="mt-4 grid gap-3">
              {["Private lead routing", "Society-first resale pitch", "Rent-out coordination", "Status tracked by admin"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-[18px] border border-[#EFE6DA] bg-[#FAF7F1] p-4">
                  <ShieldCheck className="h-5 w-5 text-[#C2724E]" />
                  <p className="text-sm font-black">{item}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-[1360px] px-5 py-12 md:px-10">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {nriLanes.map(({ title, body, icon: Icon }) => (
            <article key={title} className="rounded-[24px] border border-[#E6DDCF] bg-white p-6 shadow-[0_14px_34px_-32px_rgba(17,24,39,.42)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#E9EEF9] text-[#233B6E]">
                <Icon className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-[#667085]">{body}</p>
            </article>
          ))}
        </div>

        <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[30px] bg-[#233B6E] p-6 text-white lg:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#E3B36B]">Remote-control workflow</p>
            <h2 className="mt-2 font-display text-4xl font-medium">Built for families who cannot keep chasing calls from another timezone.</h2>
            <p className="mt-4 text-sm leading-7 text-[#D8E3FF]">
              The NRI desk is not just a contact form. It is a managed case pipeline: requirement intake, society matching, owner/listing source clarity, visit coordination, document reminders and follow-up status.
            </p>
            <div className="mt-6 grid gap-3">
              {proofPoints.map(([title, body]) => (
                <div key={title} className="rounded-[18px] bg-white/10 p-4">
                  <p className="font-black">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#D8E3FF]">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-[#E6DDCF] bg-white p-6 lg:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2724E]">What happens after you start</p>
            <h2 className="mt-2 font-display text-4xl font-medium">A clear NRI case journey.</h2>
            <ol className="mt-6 grid gap-4">
              {commandCenterSteps.map(([title, body], index) => (
                <li key={title} className="grid gap-4 rounded-[20px] border border-[#EFE6DA] bg-[#FAF7F1] p-4 sm:grid-cols-[54px_1fr]">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#111827] font-display text-xl font-medium text-white">0{index + 1}</span>
                  <div>
                    <h3 className="text-lg font-black">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#667085]">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="nri-consultation" className="mt-10 grid gap-7 lg:grid-cols-[1.12fr_0.88fr]">
          <form onSubmit={submit} className="rounded-[30px] border border-[#E6DDCF] bg-white p-6 shadow-[0_18px_44px_-34px_rgba(17,24,39,.35)] md:p-8">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#FBE9DF] text-[#C2724E]">
                <MessageSquareText className="h-6 w-6" />
              </span>
              <div>
                <h2 className="font-display text-3xl font-medium">Start an NRI consultation</h2>
                <p className="mt-1 text-sm leading-6 text-[#667085]">Tell us the goal. Keep sensitive identity, tax, bank and remittance details out of this form.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input required placeholder="Country of residence" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              <select value={form.contact_method} onChange={(e) => setForm({ ...form, contact_method: e.target.value })} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm">
                <option value="email">Prefer email</option>
                <option value="whatsapp">Prefer WhatsApp</option>
              </select>
              <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm">
                {serviceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="WhatsApp with country code" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input className="sm:col-span-2" placeholder="Society / property context, if any" value={form.property_context} onChange={(e) => setForm({ ...form, property_context: e.target.value })} />
              <textarea
                className="min-h-28 rounded-md border border-slate-200 p-3 text-sm sm:col-span-2"
                placeholder="What help do you need? Example: rent out my Golf Course Extension apartment, sell family-owned flat, buy near Cyber City."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <label className="flex items-start gap-2 text-sm leading-6 text-slate-600 sm:col-span-2">
                <input required type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-1" />
                I consent to SocietyFlats contacting me about this request and understand independent professional verification may be required.
              </label>
              <Button disabled={saving} className="bg-[#233B6E] hover:bg-[#1d315b] sm:col-span-2">{saving ? "Submitting…" : "Submit NRI case"}</Button>
            </div>
            {error ? <p className="mt-4 rounded-[14px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
            {notice ? <p className="mt-4 rounded-[14px] bg-[#E9EEF9] p-3 text-sm font-semibold text-[#233B6E]">{notice}</p> : null}
          </form>

          <aside className="rounded-[30px] border border-[#F1D1B7] bg-[#FFF4E9] p-6 md:p-8">
            <ShieldCheck className="h-7 w-7 text-[#C2724E]" />
            <h2 className="mt-4 font-display text-3xl font-medium">Clear scope, fewer surprises.</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-[#6B4B35]">
              <li>• No passport, PAN, bank or payment details in this form.</li>
              <li>• No legal, tax, FEMA, banking or remittance advice.</li>
              <li>• No guaranteed rent, resale value, timeline or investment return.</li>
              <li>• Any specialist work must be independently verified with qualified professionals.</li>
            </ul>
            <div className="mt-6 rounded-[20px] bg-white/80 p-5">
              <p className="text-sm font-black text-[#111827]">Already have a society in mind?</p>
              <p className="mt-1 text-sm leading-6 text-[#667085]">Open the profile first, then send us the exact requirement so the case starts with better context.</p>
              <Link to="/search?tab=societies" className="mt-4 inline-flex items-center text-sm font-black text-[#233B6E]">
                Search societies <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </aside>
        </section>

        <section className="mt-10 grid gap-5 rounded-[30px] bg-[#111827] p-6 text-white lg:grid-cols-4 lg:p-8">
          {[
            [FileSearch, "Verified society intelligence"],
            [Building2, "Owner/listing source clarity"],
            [CalendarCheck, "Viewing and follow-up coordination"],
            [LockKeyhole, "Private contact handling"],
          ].map(([Icon, label]) => {
            const ItemIcon = Icon as typeof FileSearch;
            return (
              <div key={String(label)} className="rounded-[20px] bg-white/8 p-5">
                <ItemIcon className="h-6 w-6 text-[#E3B36B]" />
                <p className="mt-4 text-lg font-black">{String(label)}</p>
              </div>
            );
          })}
        </section>
      </section>
    </main>
  );
}
