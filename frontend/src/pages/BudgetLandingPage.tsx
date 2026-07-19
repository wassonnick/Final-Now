import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, MessageCircle, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BUDGET_SEGMENTS, BUDGET_SEGMENT_LIST, type BudgetSegment } from "@/config/budgetSegments";
import { fetchPublicSocieties, formatPublicLocation } from "@/lib/publicData";
import { societyDisplayImage, hasGooglePlacesDisplayPhoto } from "@/lib/societyImages";
import { setPublicSeo } from "@/lib/seo";

// ₹ text → the resale entry (lowest realistic buy amount) in absolute rupees.
function buyFloor(society: any): number | null {
  const text = String(society?.buyRange ?? society?.buy_range ?? society?.averageSalePrice ?? society?.average_sale_price ?? "");
  const nums = [...text.replace(/,/g, "").matchAll(/([\d.]+)\s*(cr|crore|l|lac|lakh)?/gi)]
    .map((m) => {
      let n = parseFloat(m[1]);
      const u = (m[2] || "").toLowerCase();
      if (u.startsWith("cr")) n *= 1e7;
      else if (u.startsWith("l")) n *= 1e5;
      return n;
    })
    .filter((n) => n >= 1e6); // ignore stray small numbers; a buy figure is ≥ ₹10L
  return nums.length ? Math.min(...nums) : null;
}

const inr = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(n % 1e7 ? 2 : 0).replace(/\.?0+$/, "")} Cr` : `₹${Math.round(n / 1e5)} L`);

export function BudgetLandingPage() {
  const { segment } = useParams();
  const config: BudgetSegment | undefined = segment ? BUDGET_SEGMENTS[segment] : undefined;
  const [societies, setSocieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (config) setPublicSeo(config.seo.title, config.seo.description, { canonical: `/gurgaon-flats/${config.slug}` });
    window.scrollTo(0, 0);
    fetchPublicSocieties().then((rows) => setSocieties(Array.isArray(rows) ? rows : [])).catch(() => setSocieties([])).finally(() => setLoading(false));
  }, [config]);

  const matches = useMemo(() => {
    if (!config) return [];
    return societies
      .map((s) => ({ s, floor: buyFloor(s) }))
      .filter(({ floor }) => floor != null && (floor as number) >= config.min && (floor as number) < config.max)
      .sort((a, b) => (Number(b.s.score) || 0) - (Number(a.s.score) || 0))
      .map(({ s }) => s);
  }, [societies, config]);

  if (!config) {
    return (
      <div className="min-h-[60vh] bg-[#F7F4EF] px-5 py-16 text-center">
        <h1 className="font-display text-3xl text-[#111827]">Segment not found.</h1>
        <Link to="/societies" className="mt-4 inline-block font-bold text-[#233B6E] underline">Browse all societies</Link>
      </div>
    );
  }

  return (
    <div className="bg-[#F7F4EF] text-[#1D2939]">
      <section className="border-b border-[#E6DDCF] bg-gradient-to-b from-[#FFFCF7] to-[#F7F2EA] px-5 py-14 md:px-10 md:py-16">
        <div className="mx-auto max-w-[1180px]">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#E6DDCF] bg-white px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#233B6E]"><ShieldCheck className="h-3.5 w-3.5" /> {config.eyebrow} · verified</p>
          <h1 className="mt-4 max-w-3xl font-display text-[38px] font-medium leading-[1.05] tracking-[-0.02em] text-[#111827] md:text-[58px]">{config.title}</h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-8 text-[#667085]">{config.subtitle}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-white px-4 py-2 font-bold text-[#233B6E] shadow-sm">{loading ? "Loading…" : `${matches.length} verified ${matches.length === 1 ? "society" : "societies"}`}</span>
            <span className="text-[#8A8F89]">Ranked by SocietyFlats score · resale ranges are verified, not guessed</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 py-10 md:px-10">
        {loading ? (
          <p className="text-[#667085]">Loading verified societies…</p>
        ) : matches.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((s) => {
              const img = hasGooglePlacesDisplayPhoto(s) ? societyDisplayImage(s) : "";
              const floor = buyFloor(s);
              return (
                <Link key={s.slug} to={`/society/${s.slug}`} className="group overflow-hidden rounded-[20px] border border-[#E7DCCB] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative h-[168px] bg-[#E8EDF7] [background-image:repeating-linear-gradient(135deg,#D8DFEC_0_1px,transparent_1px_12px)]">
                    {img ? <img src={img} alt={s.name} className="h-full w-full object-cover" /> : null}
                    <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-[#EEF2FA] px-2.5 py-1 text-[11px] font-bold text-[#3156A3]"><Check className="h-3 w-3 stroke-[3]" /> Verified</span>
                    {Number(s.score) > 0 ? <span className="absolute right-2.5 top-2.5 rounded-[9px] bg-white px-2 py-1 text-xs font-extrabold text-[#233B6E]">{Number(s.score).toFixed(1)}</span> : null}
                  </div>
                  <div className="p-4">
                    <p className="truncate font-bold text-[#25302B]">{s.name}</p>
                    <p className="mt-0.5 truncate text-[12.5px] text-[#6E756E]">{formatPublicLocation(s)}{s.builder ? ` · ${s.builder}` : ""}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-[#EEE6DA] pt-3">
                      <div><p className="text-[11px] text-[#6E756E]">Resale from</p><p className="text-sm font-black text-[#233B6E]">{floor ? inr(floor) : "On request"}</p></div>
                      <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[#233B6E]">View <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[20px] border border-dashed border-[#D8D4CA] bg-white p-8 text-[#667085]">
            <p className="font-bold text-[#25302B]">No verified societies in this band right now.</p>
            <p className="mt-2 text-sm">Ranges are verified before they're shown, so this list only fills with confirmed data. Tell us your budget and we'll match current options.</p>
            <a href={`https://wa.me/919911886222?text=${encodeURIComponent(`Hi SocietyFlats, I'm looking for ${config.title.toLowerCase()}.`)}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#233B6E] px-5 py-2.5 text-sm font-bold text-white"><MessageCircle className="h-4 w-4" /> WhatsApp your budget</a>
          </div>
        )}

        {/* Cross-links to other bands — discovery + internal SEO */}
        <div className="mt-12 border-t border-[#E7DCCB] pt-8">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8A8F89]">Browse by budget</p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {BUDGET_SEGMENT_LIST.filter((seg) => seg.slug !== config.slug).map((seg) => (
              <Link key={seg.slug} to={`/gurgaon-flats/${seg.slug}`} className="rounded-full border border-[#D8DFEC] bg-white px-4 py-2 text-sm font-semibold text-[#3156A3] hover:bg-[#EEF2FA]">{seg.title.replace(" in Gurgaon", "")}</Link>
            ))}
            <Link to="/compare" className="rounded-full border border-[#C5A766] bg-white px-4 py-2 text-sm font-semibold text-[#8C6E2F] hover:bg-[#FBF6EA]">Compare societies →</Link>
          </div>
        </div>

        <div className="mt-10 rounded-[24px] bg-[#111827] p-6 text-white md:flex md:items-center md:justify-between md:p-8">
          <div>
            <h2 className="font-display text-2xl font-medium">Not sure which fits your budget?</h2>
            <p className="mt-1.5 text-sm text-[#B7C0CF]">Tell our AI advisor your number and priorities — it shortlists from verified societies only.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 md:mt-0">
            <Button asChild className="rounded-full bg-[#B08A3E] px-6 font-bold text-[#1C2434] hover:bg-[#C79B4B]"><Link to="/ai-advisor">Ask AI Advisor</Link></Button>
            <Button asChild variant="outline" className="rounded-full border-[#27364E] bg-transparent px-6 font-bold text-white hover:bg-[#1B2536]"><Link to="/search?tab=societies">Browse all societies</Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default BudgetLandingPage;
