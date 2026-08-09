import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Check, MapPin, ShieldCheck } from "lucide-react";
import { usePublicSeo } from "@/lib/seo";
import { fallbackNcrCityLaunchPolicy, fetchNcrCityLaunchPolicy, type NcrCityLaunchPolicy } from "@/lib/ncrPublicApi";
import { NCR_REGION, LIVE_NCR_CITY, ncrCityStatusLabel, useNcrCities, type NcrCity } from "@/lib/ncrCities";
import { MODULES } from "@/lib/modules";

const ACCENT = "#0F7B63";

// Micro-markets we cover (or will cover) per city — presented as navigation, never as an
// availability claim. Kept front-end so a launching city can preview its corridors.
const CORRIDORS: Record<string, string[]> = {
  gurgaon: ["Golf Course Road", "Golf Course Extension", "Dwarka Expressway", "Southern Peripheral Road", "Sohna Road", "New Gurgaon"],
  noida: ["Noida Expressway", "Sector 150", "Sector 137", "Central Noida"],
  "greater-noida": ["Greater Noida West", "Pari Chowk", "Yamuna Expressway", "Techzone"],
  delhi: ["South Delhi", "West Delhi", "Dwarka", "Rohini"],
  faridabad: ["Neharpar", "Sector 79", "Sector 85", "Surajkund"],
  ghaziabad: ["Indirapuram", "Raj Nagar Extension", "Vaishali", "Crossings Republik"],
};

const STANDARD = [
  ["Real location & builder", "Every society is placed on the map with its real builder and address — verified, not scraped."],
  ["Reviewed photos & honest scores", "Approved images and checkable scores for safety, connectivity and lifestyle. No brochures."],
  ["Honest availability", "Only genuinely available homes appear — nothing fabricated, no stale prices."],
];

function statusPill(status: NcrCity["status"]) {
  if (status === "live") return "bg-[#ECF6F2] text-[#0F7B63]";
  if (status === "launching") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-500";
}

export function NcrCityLandingPage() {
  const { citySlug = "" } = useParams();
  const navigate = useNavigate();
  const cities = useNcrCities();
  const city = cities.find((c) => c.slug === citySlug) || null;
  const [launchPolicy, setLaunchPolicy] = useState<NcrCityLaunchPolicy>(() => fallbackNcrCityLaunchPolicy(citySlug));
  const isIndexable = Boolean(city && launchPolicy.is_indexable && launchPolicy.is_sitemap_approved && !launchPolicy.is_review_only);

  useEffect(() => {
    let active = true;
    setLaunchPolicy(fallbackNcrCityLaunchPolicy(citySlug));
    fetchNcrCityLaunchPolicy(citySlug).then((policy) => { if (active) setLaunchPolicy(policy); });
    return () => { active = false; };
  }, [citySlug]);

  usePublicSeo(
    city ? `${city.name} — verified societies & homes | SocietyFlats` : "Delhi NCR city | SocietyFlats",
    city
      ? isIndexable
        ? `Choose your ${city.name} society first, then the home — verified profiles, real scores and honest availability across ${NCR_REGION}.`
        : `${city.name} is being verified to SocietyFlats' standard before launch. Get notified when ${city.name} goes live.`
      : "Verified societies across Delhi NCR.",
    { noindex: !isIndexable, canonical: city ? `/ncr/${city.slug}` : "/ncr-preview" },
  );

  if (!city) {
    return (
      <div className="premium-home bg-white text-[#1D1D1F]">
        <section className="mx-auto max-w-[720px] px-5 py-24 text-center">
          <h1 className="!font-sans text-[32px] font-semibold tracking-[-0.02em]">That NCR city isn't here yet</h1>
          <p className="mt-3 text-[15px] text-[#6E6E73]">We're rolling out across Delhi NCR one verified market at a time. Explore the live one meanwhile.</p>
          <Link to="/" className="mt-6 inline-flex rounded-full px-6 py-3 text-[14px] font-semibold text-white" style={{ background: ACCENT }}>Explore Gurgaon</Link>
        </section>
      </div>
    );
  }

  const live = city.status === "live";
  const corridors = CORRIDORS[city.slug] || [];

  return (
    <div className="premium-home bg-white text-[#1D1D1F]">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px] bg-[radial-gradient(120%_90%_at_50%_-10%,#F1F7F5_0%,#FFFFFF_60%)]" />
        <div className="relative mx-auto max-w-[1120px] px-5 pb-14 pt-16 text-center lg:pt-20">
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#6E6E73]"><MapPin className="h-3.5 w-3.5" />{NCR_REGION} · {city.state}</span>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusPill(city.status)}`}>{ncrCityStatusLabel(city.status)}</span>
          </div>
          <h1 className="!font-sans mx-auto mt-5 max-w-[820px] text-[42px] font-semibold leading-[1.04] tracking-[-0.03em] sm:text-[56px] lg:text-[64px]">
            {live ? <>Verified societies in <span className="text-[#6E6E73]">{city.name}</span></> : <>{city.name} is coming — <span className="text-[#6E6E73]">verified first</span></>}
          </h1>
          <p className="mx-auto mt-5 max-w-[600px] text-[16px] leading-8 text-[#6E6E73] lg:text-[18px]">
            {live
              ? `Choose the society, then the home. Real profiles, checkable scores and honest availability across ${city.name}.`
              : `We open a market only after it's verified to the same standard as Gurgaon. Tell us what you're looking for and we'll reach out the moment ${city.name} is live.`}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {live ? (
              <>
                <button onClick={() => navigate("/search?tab=societies")} className="rounded-full px-6 py-3.5 text-[15px] font-semibold text-white" style={{ background: ACCENT }}>Explore {city.name} societies</button>
                <Link to="/ai-advisor" className="rounded-full bg-[#F5F5F7] px-6 py-3.5 text-[15px] font-semibold text-[#1D1D1F] hover:bg-[#ECECEF]">Ask the AI advisor</Link>
              </>
            ) : (
              <>
                <button onClick={() => navigate(`/sell?notify=${city.slug}`)} className="rounded-full px-6 py-3.5 text-[15px] font-semibold text-white" style={{ background: ACCENT }}>Notify me about {city.name}</button>
                <Link to="/" className="rounded-full bg-[#F5F5F7] px-6 py-3.5 text-[15px] font-semibold text-[#1D1D1F] hover:bg-[#ECECEF]">Explore Gurgaon (live)</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* CORRIDORS */}
      {corridors.length ? (
        <section className="mx-auto max-w-[1120px] px-5 pb-4">
          <p className="text-center text-[13px] font-semibold uppercase tracking-[0.14em] text-[#98A2B3]">{live ? "Popular micro-markets" : "Micro-markets we'll cover"}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {corridors.map((c) => (
              live ? (
                <button key={c} onClick={() => navigate(`/search?tab=societies&q=${encodeURIComponent(c)}`)} className="rounded-full border border-[#E4E4E9] bg-white px-4 py-2 text-[13px] font-semibold text-[#43434A] hover:border-[#C9D6D1] hover:text-[#1D1D1F]">{c}</button>
              ) : (
                <span key={c} className="rounded-full bg-[#F5F5F7] px-4 py-2 text-[13px] font-semibold text-[#6E6E73]">{c}</span>
              )
            ))}
          </div>
        </section>
      ) : null}

      {/* OUR STANDARD */}
      <section className="border-y border-[#EEEEF1] bg-[#F5F5F7]">
        <div className="mx-auto max-w-[1120px] px-5 py-16 lg:py-20">
          <div className="mx-auto max-w-[560px] text-center">
            <h2 className="!font-sans text-[28px] font-semibold tracking-[-0.02em] lg:text-[34px]">The standard every city must clear</h2>
            <p className="mt-2 text-[15px] leading-7 text-[#6E6E73]">The reason we're calm and honest — and the reason {city.name} launches only when it's ready.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STANDARD.map(([title, body], i) => (
              <div key={title} className="rounded-[24px] bg-white p-7 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ background: ACCENT }}><ShieldCheck className="h-5 w-5" /></span>
                  <span className="text-[13px] font-bold text-[#86868B]">0{i + 1}</span>
                </div>
                <p className="mt-5 text-[18px] font-semibold">{title}</p>
                <p className="mt-2 text-[14px] leading-7 text-[#6E6E73]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOOLKIT */}
      <section className="mx-auto max-w-[1120px] px-5 py-16 lg:py-20">
        <h2 className="!font-sans text-center text-[28px] font-semibold tracking-[-0.02em] lg:text-[34px]">Everything you need to decide</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.key} to={m.href} className="group flex items-start gap-3 rounded-[20px] border border-[#E4E4E9] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-36px_rgba(0,0,0,.28)]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "#ECF6F2", color: ACCENT }}><Icon className="h-4 w-4" /></span>
                <span>
                  <span className="block text-[15px] font-semibold">{m.name}</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-[#86868B]">{m.desc}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1120px] px-5 pb-20">
        <div className="overflow-hidden rounded-[32px] bg-[#1D1D1F] px-8 py-14 text-center text-white lg:px-16 lg:py-16">
          <h2 className="!font-sans mx-auto max-w-[600px] text-[28px] font-semibold leading-tight tracking-[-0.02em] lg:text-[38px]">
            {live ? `Find your ${city.name} home, calmly.` : `Be first when ${city.name} goes live.`}
          </h2>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {live ? (
              <button onClick={() => navigate("/search?tab=societies")} className="rounded-full px-7 py-3.5 text-[15px] font-semibold text-white" style={{ background: ACCENT }}>Explore {city.name}</button>
            ) : (
              <button onClick={() => navigate(`/sell?notify=${city.slug}`)} className="rounded-full px-7 py-3.5 text-[15px] font-semibold text-white" style={{ background: ACCENT }}>Notify me about {city.name}</button>
            )}
            <Link to="/ai-advisor" className="rounded-full bg-white/10 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/20">Ask the AI advisor</Link>
          </div>
          <p className="mt-6 inline-flex items-center gap-1.5 text-[12px] text-white/50"><Check className="h-3.5 w-3.5" style={{ color: "#9FE0CE" }} />No fake listings · real scores · no paid ranking</p>
        </div>
      </section>
    </div>
  );
}
