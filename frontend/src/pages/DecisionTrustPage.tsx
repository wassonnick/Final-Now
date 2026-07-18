import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileSearch, RefreshCw, Scale, ShieldCheck, Sparkles } from "lucide-react";

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

const proofCards = [
  [ShieldCheck, "Admin-reviewed first", "Imported research, AI drafts and corrections stay private until a reviewer explicitly publishes."],
  [FileSearch, "Evidence over claims", "Scores and copy lean on published society fields, public records and labelled source notes."],
  [Scale, "No false certainty", "Missing rent, resale, RERA or possession data is shown as unverified — never guessed."],
  [RefreshCw, "Refreshable profile", "Published intelligence can be marked stale and republished after review when source data changes."],
];

// Mirrors backend SocietyIntelligenceScoringService::WEIGHTS — the exact scorecard,
// shown publicly so the methodology is verifiable, not just described.
const signalWeights: Array<[string, number, string]> = [
  ["Everyday liveability", 20, "Lifestyle, amenities and how the society actually lives day to day"],
  ["Connectivity & commute", 15, "Distance to metro, arterial roads and office hubs"],
  ["Upkeep & maintenance", 10, "Maintenance standard and society/agency management"],
  ["Builder track record", 10, "Developer reputation and delivery history"],
  ["Price for what you get", 10, "Price-per-sq-ft and market range vs quality"],
  ["Rental demand", 10, "Verified rental range and tenant demand signals"],
  ["Resale liquidity", 10, "Verified resale range and how easily units move"],
  ["Safety & security", 5, "Gated security, CCTV and safety amenities"],
  ["Legal & RERA confidence", 5, "RERA registration and legal-status signals"],
  ["Environment & resilience", 5, "Green cover, drainage and environmental context"],
];

const methodologySteps = [
  ["Collect", "Society facts, public records, map references, amenities, market ranges and availability context are gathered for review."],
  ["Score", "Each available signal contributes to a 10-point decision score. Missing fields reduce coverage, not the score itself."],
  ["Review", "Admins review strengths, watch-outs, sources and correction requests before anything appears publicly."],
  ["Publish", "Only approved intelligence is shown on public pages, with source and correction pathways visible to users."],
];

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
    <main className="min-h-screen overflow-hidden bg-[#F7F4EF] text-[#1D2939]">
      <section className="relative border-b border-[#DDD7CC] bg-[radial-gradient(circle_at_82%_18%,rgba(194,114,78,.16),transparent_30%),radial-gradient(circle_at_18%_8%,rgba(35,59,110,.10),transparent_24%),linear-gradient(180deg,#FFFBF4,#F7F4EF)]">
        <div className="mx-auto grid max-w-[1360px] gap-10 px-5 py-14 md:px-10 md:py-20 lg:grid-cols-[1fr_440px] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#DDD7CC] bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#3156A3]">
              <CheckCircle2 className="h-4 w-4" />
              {page.eyebrow}
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-[42px] font-medium leading-[1.02] tracking-[-0.025em] text-[#111827] md:text-[70px]">
              {page.title}
            </h1>
            <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#667085] md:text-lg">{page.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="rounded-[14px] bg-[#233B6E] px-6 py-6 text-white hover:bg-[#1d315b]">
                <Link to="/search?tab=societies">Browse societies</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-[14px] border-[#E7DCCB] bg-white px-6 py-6 text-[#9A552E]">
                <Link to="/score-explained">How scores work <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="rotate-[-2deg] rounded-[28px] border border-[#E7DCCB] bg-white p-5 shadow-[0_30px_80px_-50px_rgba(0,0,0,.45)]">
              <div className="rounded-[22px] bg-[#123C32] p-5 text-white">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#B9E1C6]">Society intelligence</p>
                <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-4">
                  <div>
                    <p className="text-sm text-[#D5E7DB]">Evidence coverage</p>
                    <p className="mt-1 text-4xl font-black">60%+</p>
                  </div>
                  <Sparkles className="h-9 w-9 text-[#C5A766]" />
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                {["Draft research hidden", "Sources labelled", "Corrections reviewed"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-[16px] border border-[#EEE6DA] bg-[#F8F3EA] px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF5ED] text-[#123C32]">✓</span>
                    <span className="text-sm font-bold text-[#25302B]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-5 -right-3 hidden rotate-[4deg] rounded-[18px] border border-[#E7DCCB] bg-white px-5 py-4 shadow-[0_24px_70px_-44px_rgba(0,0,0,.55)] md:block">
              <p className="text-xs font-bold uppercase tracking-wide text-[#8A8F89]">Public rule</p>
              <p className="mt-1 text-lg font-black text-[#233B6E]">No invented claims</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1360px] px-5 py-12 md:px-10">
        {variant === "corrections" ? (
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <aside className="rounded-[28px] border border-[#E7DCCB] bg-[#123C32] p-6 text-white lg:p-8">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C5A766]">Review workflow</p>
              <h2 className="mt-3 font-display text-4xl font-medium">Corrections are reviewed, not auto-applied.</h2>
              <p className="mt-4 text-sm leading-7 text-[#D5E7DB]">Share what looks wrong and any source you have. Admins check it before changing a public society profile.</p>
              <div className="mt-6 space-y-3">
                {["Submission received", "Admin checks source", "Profile updated or note resolved"].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-[16px] bg-white/10 p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-black text-[#123C32]">{index + 1}</span>
                    <span className="text-sm font-bold">{item}</span>
                  </div>
                ))}
              </div>
            </aside>
            <form onSubmit={submit} className="rounded-[28px] border border-[#E7DCCB] bg-white p-6 shadow-[0_18px_44px_-34px_rgba(0,0,0,.35)] lg:p-8">
              <h2 className="font-display text-3xl font-medium text-[#111827]">Submit a correction</h2>
              <div className="mt-5 grid gap-4">
                <Input className="h-12 rounded-[14px]" placeholder="Society name" value={form.society_name} onChange={(e) => setForm({ ...form, society_name: e.target.value })} />
                <textarea required className="min-h-28 rounded-[18px] border border-[#E7DCCB] bg-[#FFFCF7] p-4 outline-none focus:border-[#3156A3]" placeholder="What information looks incorrect or stale?" value={form.information_challenged} onChange={(e) => setForm({ ...form, information_challenged: e.target.value })} />
                <textarea required className="min-h-28 rounded-[18px] border border-[#E7DCCB] bg-[#FFFCF7] p-4 outline-none focus:border-[#3156A3]" placeholder="What should it say instead?" value={form.suggested_correction} onChange={(e) => setForm({ ...form, suggested_correction: e.target.value })} />
                <Input className="h-12 rounded-[14px]" placeholder="Supporting URL (optional)" value={form.supporting_url} onChange={(e) => setForm({ ...form, supporting_url: e.target.value })} />
                <div className="grid gap-3 md:grid-cols-3">
                  <Input required className="h-12 rounded-[14px]" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <Input required className="h-12 rounded-[14px]" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <Input className="h-12 rounded-[14px]" placeholder="Phone optional" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <label className="flex gap-3 rounded-[18px] bg-[#F8F3EA] p-4 text-sm text-[#667085]">
                  <input required type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
                  I consent to SocietyFlats using this submission for admin review.
                </label>
                <Button className="h-12 rounded-[14px] bg-[#233B6E] text-white hover:bg-[#1d315b]">Submit correction</Button>
                {message ? <p className="rounded-[14px] bg-[#EAF5ED] p-3 text-sm font-semibold text-[#123C32]">{message}</p> : null}
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {proofCards.map(([Icon, title, body]) => {
                const ItemIcon = Icon as typeof ShieldCheck;
                return (
                  <article key={String(title)} className="group rounded-[24px] border border-[#E7DCCB] bg-white p-6 shadow-[0_14px_36px_-30px_rgba(0,0,0,.35)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_-42px_rgba(0,0,0,.45)]">
                    <span className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-[#EAF5ED] text-[#123C32]">
                      <ItemIcon className="h-6 w-6" />
                    </span>
                    <h2 className="mt-5 text-xl font-black text-[#111827]">{String(title)}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#667085]">{String(body)}</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-10 rounded-[28px] border border-[#E7DCCB] bg-white p-6 shadow-[0_18px_44px_-34px_rgba(0,0,0,.35)] lg:p-8">
              <div className="max-w-2xl">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2724E]">How the profile becomes public</p>
                <h2 className="mt-2 font-display text-4xl font-medium text-[#111827]">A controlled path from data to decision.</h2>
              </div>
              <div className="mt-7 grid gap-4 lg:grid-cols-4">
                {methodologySteps.map(([title, body], index) => (
                  <div key={title} className="relative rounded-[22px] border border-[#EEE6DA] bg-[#F8F3EA] p-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#233B6E] text-sm font-black text-white">0{index + 1}</span>
                    <h3 className="mt-5 text-lg font-black text-[#25302B]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#667085]">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            {variant === "score-explained" || variant === "methodology" ? (
              <div className="mt-10 rounded-[28px] border border-[#EEE6DA] bg-white p-6 lg:p-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2724E]">The exact scorecard</p>
                    <h2 className="mt-2 font-display text-4xl font-medium text-[#111827]">Ten weighted signals — nothing hidden.</h2>
                  </div>
                  <p className="text-sm font-bold text-[#8A8F89]">Weights total 100%</p>
                </div>
                <div className="mt-6 overflow-hidden rounded-[18px] border border-[#EEE6DA]">
                  {signalWeights.map(([label, weight, detail], index) => (
                    <div key={label} className={`flex items-center gap-4 px-4 py-3.5 md:px-6 ${index % 2 ? "bg-[#F8F3EA]" : "bg-white"}`}>
                      <div className="w-12 shrink-0 text-right font-display text-2xl font-medium text-[#233B6E]">{weight}%</div>
                      <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-[#E7E3DA]">
                        <div className="h-full rounded-full bg-[#2A6147]" style={{ width: `${weight * 5}%` }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#25302B]">{label}</p>
                        <p className="truncate text-[13px] text-[#667085]">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[13px] leading-6 text-[#667085]">
                  A society only gets an overall score once verified signals cover at least 60% of the weight. Missing signals are excluded and the remaining weights renormalise — thin data can never inflate a score. Every published society page shows this exact breakdown for that society, marking each signal verified or estimated.
                </p>
              </div>
            ) : null}

            <div className="mt-10 rounded-[28px] bg-[#123C32] p-6 text-white lg:flex lg:items-center lg:justify-between lg:p-8">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C5A766]">Use it practically</p>
                <h2 className="mt-2 font-display text-4xl font-medium">Still shortlist society-first.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[#D5E7DB]">Decision intelligence narrows the field. Unit price, exact tower, availability and visit timing still need confirmation before payment.</p>
              </div>
              <Link to="/ai-advisor" className="mt-6 inline-flex items-center rounded-[14px] bg-[#C2724E] px-6 py-3.5 text-sm font-black text-white lg:mt-0">
                Ask SocietyFlats AI <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default DecisionTrustPage;
