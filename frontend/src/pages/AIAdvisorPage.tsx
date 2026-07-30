import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Sparkles, ShieldCheck, ListChecks, HandMetal, Scale, Building2, Calculator, ArrowRight } from "lucide-react";
import { setPublicSeo } from "@/lib/seo";
import { SocietyAssistant } from "@/components/ai/SocietyAssistant";

const ACCENT = "#0F7B63";

const TRUST = [
  { icon: ShieldCheck, title: "Verified societies only", body: "It reasons over our reviewed inventory — never invented listings or prices." },
  { icon: ListChecks, title: "Shows its reasoning", body: "Every shortlist explains why each society fits what you asked for." },
  { icon: HandMetal, title: "Says no honestly", body: "If nothing genuinely fits, it tells you — instead of padding the list." },
];

const CROSS = [
  { icon: Building2, name: "Browse all societies", desc: "Filter verified profiles yourself", href: "/search?tab=societies" },
  { icon: Scale, name: "Compare side by side", desc: "Put up to three head-to-head", href: "/compare" },
  { icon: Calculator, name: "Investment calculator", desc: "Model rent, yield and ROI", href: "/investment-calculator" },
];

export function AIAdvisorPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || searchParams.get("society") || "";

  useEffect(() => {
    setPublicSeo(
      "SocietyFlats AI Advisor — Your Delhi NCR Home Search, Made Simple",
      "Just tell our AI advisor what matters — your commute, budget, schools, the feel you're after — and it'll gently shortlist the Delhi NCR societies and homes that genuinely fit.",
    );
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="ncr-skin min-h-screen bg-white text-[#1D1D1F]">
      {/* HERO */}
      <section className="mx-auto max-w-[820px] px-5 pt-6 text-center md:pt-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E9] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#1D1D1F] shadow-sm">
          <Sparkles className="h-3.5 w-3.5" style={{ color: ACCENT }} /> AI Advisor
        </span>
        <h1 className="!font-sans mx-auto mt-4 max-w-[680px] text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[32px] md:text-[46px]">
          Tell us what matters. We'll shortlist the societies that fit.
        </h1>
        <p className="mx-auto mt-3 max-w-[560px] text-[14px] leading-6 text-[#6E6E73] sm:mt-4 sm:text-[16px] sm:leading-8">
          Describe your budget, commute, family and the feel you're after — in plain words.
          The advisor reasons over verified societies and shows you exactly why each one belongs on your list.
        </p>
      </section>

      {/* ASSISTANT — the centrepiece */}
      <section className="mx-auto mt-5 max-w-[860px] px-5 sm:mt-8">
        <SocietyAssistant initialQuery={initialQuery} />
      </section>

      {/* TRUST — why you can rely on it */}
      <section className="mx-auto mt-16 max-w-[1040px] px-5 md:mt-20">
        <div className="grid gap-4 md:grid-cols-3">
          {TRUST.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.title} className="rounded-[22px] border border-[#E4E4E9] bg-white p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "#ECF6F2", color: ACCENT }}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-[16px] font-semibold">{t.title}</p>
                <p className="mt-1.5 text-[14px] leading-6 text-[#6E6E73]">{t.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CROSS-SELL — prefer to drive yourself? */}
      <section className="mx-auto mt-16 max-w-[1040px] px-5 pb-20 md:mt-20">
        <div className="rounded-[28px] bg-[#F5F5F7] px-6 py-8 md:px-10 md:py-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="!font-sans text-[22px] font-semibold tracking-[-0.02em] md:text-[26px]">Prefer to drive it yourself?</h2>
              <p className="mt-1.5 text-[14.5px] text-[#6E6E73]">The same verified data, three other ways to explore.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {CROSS.map((c) => {
              const Icon = c.icon;
              return (
                <Link key={c.href} to={c.href} className="group flex items-center gap-3.5 rounded-[20px] border border-[#E4E4E9] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-40px_rgba(0,0,0,.35)]">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: "#ECF6F2", color: ACCENT }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold">{c.name}</span>
                    <span className="block text-[13px] text-[#86868B]">{c.desc}</span>
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-[#C0C0C6] transition group-hover:translate-x-0.5 group-hover:text-[#1D1D1F]" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
