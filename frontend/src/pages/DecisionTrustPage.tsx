import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileSearch, Scale, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { backendApi } from "@/services/backendApi";
import { setPublicSeo } from "@/lib/seo";
import { trackCorrectionFormSubmit } from "@/lib/analytics";

type Variant = "methodology" | "data-sources" | "score-explained" | "corrections" | "editorial-independence";

const copy: Record<Variant, { eyebrow: string; title: string; description: string }> = {
  methodology: {
    eyebrow: "Decision methodology",
    title: "How SocietyFlats turns society data into decision intelligence.",
    description: "Scores combine liveability, connectivity, maintenance, builder reliability, price value, rental demand, resale liquidity, safety, legal/RERA confidence and environmental context.",
  },
  "data-sources": {
    eyebrow: "Data sources",
    title: "Every public insight should trace back to reviewed source material.",
    description: "We use published society data, public records, official pages, Google Maps references, admin review and user corrections. Private notes and draft research stay hidden.",
  },
  "score-explained": {
    eyebrow: "Score explained",
    title: "Missing data is not treated as a bad score.",
    description: "A society intelligence score appears only after enough evidence coverage. Admins can override a score only with a recorded reason.",
  },
  corrections: {
    eyebrow: "Corrections",
    title: "Report information that looks incomplete, stale or incorrect.",
    description: "Corrections go to admin review first. We do not instantly change public data from anonymous submissions.",
  },
  "editorial-independence": {
    eyebrow: "Editorial independence",
    title: "SocietyFlats separates useful guidance from advertising pressure.",
    description: "Public decision copy should not invent prices, guarantees, rankings, possession status, travel time or investment returns.",
  },
};

export function DecisionTrustPage({ variant }: { variant: Variant }) {
  const page = copy[variant];
  const [form, setForm] = useState({ society_name: "", information_challenged: "", suggested_correction: "", supporting_url: "", name: "", email: "", phone: "", consent: false });
  const [message, setMessage] = useState("");

  useEffect(() => {
    setPublicSeo(`${page.eyebrow} | SocietyFlats`, page.description, { canonical: `/${variant}` });
    window.scrollTo(0, 0);
  }, [page, variant]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      await backendApi.submitIntelligenceCorrection({ ...form, information_key: "public_correction" });
      trackCorrectionFormSubmit({ source: "trust_corrections_page", society_name: form.society_name });
      setMessage("Correction submitted for admin review.");
      setForm({ society_name: "", information_challenged: "", suggested_correction: "", supporting_url: "", name: "", email: "", phone: "", consent: false });
    } catch (error: any) {
      setMessage(error?.message || "Unable to submit correction.");
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1f271f]">
      <section className="border-b border-[#e6dfd3] bg-[linear-gradient(180deg,#fffaf0,#F8F3EA)]">
        <div className="mx-auto max-w-[1180px] px-5 py-14 md:px-10 md:py-20">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c8793f]">{page.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-tight text-[#153f2b] md:text-6xl">{page.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#667064]">{page.description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild className="rounded-full bg-[#153f2b] text-white"><Link to="/search?tab=societies">Browse societies</Link></Button>
            <Button asChild variant="outline" className="rounded-full border-[#c8793f] bg-white text-[#9a552e]"><Link to="/score-explained">How scores work <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 py-12 md:px-10">
        {variant === "corrections" ? (
          <form onSubmit={submit} className="mx-auto max-w-3xl rounded-[2rem] border border-[#dfded6] bg-white p-6 shadow-sm">
            <h2 className="font-serif text-3xl text-[#153f2b]">Submit a correction</h2>
            <div className="mt-5 grid gap-4">
              <Input placeholder="Society name" value={form.society_name} onChange={(e) => setForm({ ...form, society_name: e.target.value })} />
              <textarea required className="min-h-24 rounded-2xl border p-3" placeholder="What information looks incorrect or stale?" value={form.information_challenged} onChange={(e) => setForm({ ...form, information_challenged: e.target.value })} />
              <textarea required className="min-h-24 rounded-2xl border p-3" placeholder="What should it say instead?" value={form.suggested_correction} onChange={(e) => setForm({ ...form, suggested_correction: e.target.value })} />
              <Input placeholder="Supporting URL (optional)" value={form.supporting_url} onChange={(e) => setForm({ ...form, supporting_url: e.target.value })} />
              <div className="grid gap-3 md:grid-cols-3">
                <Input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Phone optional" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <label className="flex gap-3 rounded-2xl bg-[#f4f0e7] p-4 text-sm text-[#667064]">
                <input required type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
                I consent to SocietyFlats using this submission for admin review.
              </label>
              <Button className="rounded-full bg-[#153f2b] text-white">Submit correction</Button>
              {message ? <p className="text-sm font-semibold text-[#153f2b]">{message}</p> : null}
            </div>
          </form>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {[
              [ShieldCheck, "Approved before public", "Draft research and AI output are not exposed until admin approval."],
              [FileSearch, "Sources are labelled", "Public source notes show confidence and attribution where available."],
              [Scale, "No forced certainty", "If rent, resale, RERA or possession data is unverified, the UI says so."],
              [CheckCircle2, "Coverage threshold", "An overall score is withheld when too many inputs are missing."],
            ].map(([Icon, title, body]) => {
              const ItemIcon = Icon as typeof ShieldCheck;
              return (
                <article key={String(title)} className="rounded-[1.5rem] border border-[#dfded6] bg-white p-6">
                  <ItemIcon className="h-6 w-6 text-[#153f2b]" />
                  <h2 className="mt-4 text-xl font-bold">{String(title)}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#667064]">{String(body)}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default DecisionTrustPage;
