// Design-preview build of the new homepage per design_handoff_societyflats
// (01-design-system.md + 03-pages-desktop.md, hero/trust/featured/AI/sectors/
// owner/broker/FAQ/final-CTA/footer sections). Pixel reference: the bundle's
// "SocietyFlats Desktop.dc.html" prototype, radius language Option A.
//
// Scope: homepage only, behind /design-preview/home. Does not touch the live
// HomePage.tsx, Navbar, or Footer. Real data via fetchPublicSocieties — the
// spec's "no fake inventory" rule applies here too, so an empty database
// renders the real empty state rather than mock cards.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Search,
} from "lucide-react";

import { fetchPublicSocieties, formatPublicLocation, societyImage } from "@/lib/publicData";
import { hasGooglePlacesDisplayPhoto } from "@/lib/societyImages";
import { setPublicSeo } from "@/lib/seo";

const heroTabs = ["Rent", "Buy", "New Launch", "Society"];

const aiChips = [
  "Best societies near Cyber Hub under ₹1.2L rent",
  "Family-friendly 3BHK on Golf Course Road",
  "Pet-friendly societies near Sector 65",
];

const trustItems = [
  { title: "RWA confirmed", body: "Society identity and basic facts checked against RWA/official sources." },
  { title: "On-ground checked", body: "Local signals reviewed before a society is marked verified." },
  { title: "Admin-reviewed images", body: "Every public photo is reviewed before it goes live." },
  { title: "Always current", body: "Listings and intelligence are refreshed on a regular cycle." },
];

const aiBandPrompts = [
  "3BHK rent under ₹70k near Golf Course Road",
  "Best resale societies for investment in Sector 65",
  "Family-friendly society near a good school",
];

const popularAreas = ["Golf Course Road", "Golf Course Extension Road", "Dwarka Expressway", "Sohna Road"];

const sectorChips = ["Sector 65", "Sector 56", "Sector 66", "Golf Course Rd", "Dwarka Expwy", "Sohna Road", "Sector 102"];

const topBuilders = ["DLF", "M3M", "Emaar", "ATS", "Godrej", "Adani"];

const faqs = [
  "How does SocietyFlats verify a society?",
  "Why don't I see every property on a society page?",
  "Is SocietyFlats free to use?",
  "How is SocietyFlats different from a broker portal?",
];

const footerColumns = [
  { head: "Explore", links: ["By sector", "By builder", "Popular areas", "Compare societies"] },
  { head: "Company", links: ["Trust & privacy", "How verification works", "FAQ"] },
  { head: "List or partner", links: ["List your flat", "Become a broker partner"] },
];

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-trust-bg px-3 py-1 text-[11px] font-bold text-trust-green ${className}`}
    >
      <CheckCircle2 className="h-3 w-3" strokeWidth={3} />
      {children}
    </span>
  );
}

export function HomeRedesignPreview() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [societies, setSocieties] = useState<any[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    setPublicSeo("Homepage redesign preview | SocietyFlats", "Internal design preview. Not a public page.", {
      noindex: true,
      canonical: "/design-preview/home",
    });
  }, []);

  useEffect(() => {
    let active = true;

    fetchPublicSocieties()
      .then((items: any[]) => {
        if (!active) return;
        setSocieties((items || []).filter(hasGooglePlacesDisplayPhoto).slice(0, 4));
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  const hasSocieties = status === "ready" && societies.length > 0;

  const goSearch = () => navigate("/search?tab=societies");
  const goAI = () => navigate("/ai-advisor");
  const goList = () => navigate("/sell");
  const goBroker = () => navigate("/broker");

  return (
    <div className="min-h-screen bg-paper font-grotesk text-rdtext antialiased pb-16 md:pb-0">
      {/* ===== Mobile app-style home (designed separately — design_handoff_societyflats/02-pages-mobile.md) ===== */}
      <div className="pb-24 md:hidden">
        <div className="px-5 pt-1">
          <div className="flex items-center justify-between py-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-rdtext-muted">Location</div>
              <button type="button" onClick={goSearch} className="mt-0.5 flex items-center gap-1.5">
                <span className="text-[17px] font-semibold">Gurgaon</span>
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            </div>
            <Link
              to="/login"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-pine text-sm font-semibold text-trust-bg"
            >
              AR
            </Link>
          </div>

          <h1 className="font-newsreader text-[30px] font-medium leading-[1.12] tracking-tight">
            Find a home in a society you can actually trust.
          </h1>

          <button
            type="button"
            onClick={goSearch}
            className="mt-4 flex w-full items-center gap-2.5 rounded-2xl border border-rdborder bg-white px-4 py-3.5 text-left shadow-[0_6px_18px_-12px_rgba(0,0,0,.25)]"
          >
            <Search className="h-[19px] w-[19px] shrink-0 text-pine-link" />
            <span className="text-[15px] text-rdtext-muted">Search sector, society or builder</span>
          </button>

          <div className="mt-3.5 flex gap-2">
            {["Buy", "Rent", "New launch"].map((tab, index) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(index)}
                className={`flex-1 rounded-[11px] py-2.5 text-center text-sm font-semibold ${
                  activeTab === index ? "bg-pine text-trust-bg" : "border border-rdborder bg-white text-rdtext-muted"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="-mx-5 mt-3.5 flex gap-2 overflow-x-auto px-5 pb-1">
            {aiChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={goAI}
                className="shrink-0 whitespace-nowrap rounded-full border border-rdborder bg-white px-3.5 py-2 text-[12.5px] font-medium text-pine-link"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="mb-3 mt-[26px] flex items-baseline justify-between">
            <h2 className="text-base font-bold">Explore by sector</h2>
            <button type="button" onClick={goSearch} className="text-[13px] font-semibold text-pine-link">See all</button>
          </div>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {sectorChips.map((sector) => (
              <button
                key={sector}
                type="button"
                onClick={goSearch}
                className="shrink-0 whitespace-nowrap rounded-full border border-rdborder bg-white px-3.5 py-2 text-[13px] font-medium text-rdtext"
              >
                {sector}
              </button>
            ))}
          </div>

          <h2 className="mb-3 mt-[26px] text-base font-bold">Featured verified societies</h2>
          {hasSocieties ? (
            <div className="-mx-5 flex gap-3.5 overflow-x-auto px-5 pb-1">
              {societies.map((society) => (
                <Link
                  key={society.id || society.slug}
                  to={`/society/${society.slug}`}
                  className="block w-[230px] shrink-0 overflow-hidden rounded-2xl border border-rdborder bg-white shadow-[0_8px_22px_-16px_rgba(0,0,0,.3)]"
                >
                  <div className="relative h-[126px] bg-paper-sage">
                    <img src={societyImage(society)} alt={society.name} className="h-full w-full object-cover" />
                    <Pill className="absolute left-2.5 top-2.5">Verified</Pill>
                  </div>
                  <div className="p-3">
                    <span className="font-bold">{society.name}</span>
                    <p className="mt-0.5 text-[12.5px] text-rdtext-muted">{formatPublicLocation(society)}</p>
                    <p className="mt-2 text-sm font-bold text-pine">{society.rentRange || "On request"}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-rdborder bg-white p-5 text-center">
              <p className="text-sm font-bold text-rdtext-forest">No published societies yet.</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-rdtext-muted">
                Ask SocietyFlats AI or search to request availability once admin review is complete.
              </p>
              <button type="button" onClick={goAI} className="mt-3.5 w-full rounded-xl bg-pine py-2.5 text-sm font-bold text-white">
                Ask SocietyFlats AI
              </button>
            </div>
          )}

          <div className="mt-[26px] rounded-[20px] bg-pine p-5 text-paper-sage">
            <h2 className="font-newsreader text-[21px] font-medium text-white">Every society, verified.</h2>
            <p className="mb-4 mt-1 text-[13.5px] leading-relaxed text-paper-sage">
              We physically check each society and confirm details with the RWA before it goes live.
            </p>
            <div className="flex flex-col gap-3">
              {trustItems.slice(0, 3).map((item) => (
                <div key={item.title} className="flex items-center gap-3">
                  <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-pine-press">
                    <CheckCircle2 className="h-[17px] w-[17px] text-trust-bg" strokeWidth={2.4} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    <div className="text-xs text-paper-sage">{item.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <h2 className="mb-3 mt-[26px] text-base font-bold">Top builders</h2>
          <div className="grid grid-cols-3 gap-2">
            {topBuilders.map((builder) => (
              <div key={builder} className="flex h-14 items-center justify-center rounded-[13px] border border-rdborder bg-white text-[15px] font-bold text-rdtext">
                {builder}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={goSearch}
            className="mt-[22px] w-full rounded-2xl bg-pine py-4 text-[15px] font-semibold text-white"
          >
            Browse all verified societies
          </button>

          {/* Remaining sections (AI band onward) reuse the desktop vocabulary per the design doc's
              "build 9–17 in the same vocabulary" note — they already collapse to single-column below. */}
        </div>
      </div>

      {/* Bottom nav (mobile only) */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex border-t border-rdborder bg-white px-2 pb-[14px] pt-[9px] md:hidden">
        <Link to="/" className="flex flex-1 flex-col items-center gap-1 text-pine">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>
          <span className="text-[10.5px] font-semibold">Home</span>
        </Link>
        <button type="button" onClick={goSearch} className="flex flex-1 flex-col items-center gap-1 text-rdtext-muted">
          <Search className="h-[22px] w-[22px]" strokeWidth={1.9} />
          <span className="text-[10.5px] font-semibold">Explore</span>
        </button>
        <button type="button" onClick={goAI} className="flex flex-1 flex-col items-center gap-1 text-rdtext-muted">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}><path d="M20 5H4v11h4v3l4-3h8z" /></svg>
          <span className="text-[10.5px] font-semibold">Assistant</span>
        </button>
        <Link to="/compare" className="flex flex-1 flex-col items-center gap-1 text-rdtext-muted">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}><path d="M6 3h12v18l-6-4-6 4z" /></svg>
          <span className="text-[10.5px] font-semibold">Saved</span>
        </Link>
      </div>

      {/* ===== Desktop home (design_handoff_societyflats/03-pages-desktop.md) ===== */}
      {/* Header */}
      <div className="sticky top-0 z-50 hidden border-b border-rdborder bg-paper md:block">
        <div className="mx-auto flex h-[74px] max-w-[1360px] items-center gap-5 px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-pine">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D9A21B" strokeWidth={2.2}>
                <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
              </svg>
            </span>
            <span className="font-newsreader text-[21px] font-medium tracking-tight text-pine">SocietyFlats</span>
          </Link>

          <button
            type="button"
            onClick={goSearch}
            className="flex max-w-[340px] flex-1 items-center gap-2 rounded-[11px] border border-rdborder bg-white px-3.5 py-2.5 text-left"
          >
            <Search className="h-4 w-4 shrink-0 text-pine-link" />
            <span className="truncate text-sm text-rdtext-muted">Search society, sector or builder</span>
          </button>

          <div className="flex shrink-0 items-center gap-4">
            <Link to="/search?tab=societies" className="hidden text-sm font-semibold text-rdtext lg:inline">Explore Societies</Link>
            <Link to="/compare" className="hidden text-sm font-semibold text-rdtext lg:inline">Compare</Link>
            <Link to="/ai-advisor" className="hidden text-sm font-semibold text-rdtext lg:inline">AI Advisor</Link>
            <button
              type="button"
              onClick={goList}
              className="whitespace-nowrap rounded-[10px] bg-clay px-4 py-2 text-[13.5px] font-bold text-white"
            >
              List Your Flat
            </button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="mx-auto hidden max-w-[1360px] gap-14 px-8 py-14 md:grid md:grid-cols-[1.05fr_0.95fr] md:items-center">
        <div>
          <Pill className="mb-5">Verified Gurgaon societies &middot; admin-reviewed</Pill>
          <h1 className="font-newsreader text-[40px] font-medium leading-[1.06] tracking-tight text-rdtext-forest md:text-[58px]">
            Find the <span className="italic text-clay">right</span> Gurgaon society before choosing the home.
          </h1>
          <p className="mt-4 max-w-[540px] text-[17px] leading-relaxed text-rdtext-muted">
            Search verified society data, compare lifestyle, and request rental or resale options inside Gurgaon&apos;s top communities.
          </p>

          <div className="mt-7 max-w-[560px] rounded-2xl border border-rdborder bg-white p-4 shadow-[0_18px_40px_-28px_rgba(0,0,0,.35)]">
            <div className="mb-3.5 flex gap-2">
              {heroTabs.map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(index)}
                  className={`rounded-[10px] px-4 py-2 text-sm font-semibold ${
                    activeTab === index ? "bg-pine text-white" : "border border-rdborder bg-white text-rdtext-muted"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={goSearch}
                className="flex flex-1 items-center gap-2 rounded-xl border border-rdborder bg-paper-chip px-4 py-3 text-left"
              >
                <Search className="h-[18px] w-[18px] text-pine-link" />
                <span className="text-[15px] text-rdtext-muted">Sector, society or builder&hellip;</span>
              </button>
              <button
                type="button"
                onClick={goSearch}
                className="rounded-xl bg-pine px-6 py-3 text-[15px] font-bold text-white"
              >
                Search
              </button>
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] font-semibold text-rdtext-muted">Ask AI:</span>
              {aiChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={goAI}
                  className="rounded-full border border-trust-bg bg-trust-bg px-3 py-1.5 text-[12.5px] text-pine-link"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hero visual collage */}
        <div className="relative hidden h-[420px] md:block">
          <div className="absolute inset-[14px_0_36px_24px] -rotate-2 rounded-[26px] border border-paper-sage bg-paper-sage" />

          <div className="absolute right-1 top-0 w-[260px] rotate-2 rounded-[20px] border border-rdborder bg-white p-3 shadow-[0_28px_50px_-24px_rgba(15,40,30,.45)]">
            <div className="relative flex h-[150px] items-center justify-center rounded-[13px] bg-paper-sage">
              <span className="font-mono text-[10px] uppercase tracking-wide text-rdtext-muted">society &middot; admin-reviewed</span>
              <Pill className="absolute left-2.5 top-2.5">Verified</Pill>
              <span className="absolute right-2 top-2 rounded-[9px] bg-white px-2 py-1 text-[13px] font-extrabold text-pine">8.6</span>
            </div>
            <div className="px-1.5 pt-3">
              <div className="text-base font-bold">Emerald Heights</div>
              <div className="mt-0.5 text-xs text-rdtext-muted">Sector 65 &middot; DLF</div>
              <div className="mt-2.5 flex gap-4 border-t border-paper-chip pt-2.5">
                <div><div className="text-[10.5px] text-rdtext-muted">Rent</div><div className="text-[13.5px] font-bold">&#8377;55k&ndash;90k</div></div>
                <div><div className="text-[10.5px] text-rdtext-muted">Buy</div><div className="text-[13.5px] font-bold">&#8377;2.4&ndash;3.8 Cr</div></div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-0 w-[220px] -rotate-3 rounded-2xl border border-rdborder bg-white p-4 shadow-[0_24px_44px_-26px_rgba(15,40,30,.4)]">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-bold">The Cattleya</span>
              <span className="text-base font-extrabold text-pine">9.1</span>
            </div>
            <div className="mt-0.5 text-xs text-rdtext-muted">Golf Course Ext &middot; M3M</div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-trust-bg px-2 py-1 text-[11px] font-bold text-trust-green">Confidence High</span>
              <span className="text-[11px] text-rdtext-muted">14 min to Cyber City</span>
            </div>
          </div>

          <div className="absolute right-12 bottom-1 rounded-full bg-clay px-3 py-1.5 text-[11.5px] font-bold text-white shadow-[0_12px_24px_-14px_rgba(0,0,0,.4)]">
            Updated weekly
          </div>
        </div>
      </div>

      {/* Trust module (mobile has its own compact trust band above) */}
      <div className="mx-auto hidden max-w-[1360px] px-8 md:block">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <div key={item.title} className="rounded-2xl border border-rdborder bg-white p-5">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-[11px] bg-trust-bg">
                <CheckCircle2 className="h-[19px] w-[19px] text-trust-green" strokeWidth={2.4} />
              </span>
              <p className="mb-1 text-[15px] font-bold">{item.title}</p>
              <p className="text-[13px] leading-relaxed text-rdtext-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Featured societies (mobile has its own horizontal carousel above) */}
      <div className="mx-auto hidden max-w-[1360px] px-8 py-16 md:block">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-newsreader text-[28px] font-medium md:text-[32px]">Featured verified societies</h2>
            <p className="mt-1.5 text-sm text-rdtext-muted">Published &amp; admin-reviewed. Updated weekly.</p>
          </div>
          <button type="button" onClick={goSearch} className="text-sm font-bold text-pine-link">
            View all societies &rarr;
          </button>
        </div>

        {hasSocieties ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {societies.map((society) => (
              <Link
                key={society.id || society.slug}
                to={`/society/${society.slug}`}
                className="block overflow-hidden rounded-2xl border border-rdborder bg-white shadow-[0_10px_28px_-22px_rgba(0,0,0,.35)]"
              >
                <div className="relative h-[150px] bg-paper-sage">
                  <img src={societyImage(society)} alt={society.name} className="h-full w-full object-cover" />
                  <Pill className="absolute left-2.5 top-2.5">Verified</Pill>
                  {society.score ? (
                    <span className="absolute right-2.5 top-2.5 rounded-[9px] bg-white px-2 py-1 text-xs font-extrabold text-pine">
                      {society.score}
                    </span>
                  ) : null}
                </div>
                <div className="p-4">
                  <span className="font-bold">{society.name}</span>
                  <p className="mt-1 text-[13px] text-rdtext-muted">{formatPublicLocation(society)}</p>
                  <div className="mt-3 flex gap-3.5 border-t border-paper-chip pt-3">
                    <div><div className="text-[11px] text-rdtext-muted">Rent</div><div className="text-[13.5px] font-bold text-pine">{society.rentRange || "On request"}</div></div>
                    <div><div className="text-[11px] text-rdtext-muted">Buy</div><div className="text-[13.5px] font-bold text-pine">{society.buyRange || "On request"}</div></div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-rdborder bg-white p-8 text-center">
            <p className="font-bold text-rdtext-forest">No published societies yet.</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-rdtext-muted">
              Verified society data is being added. Ask SocietyFlats AI or search to request availability once admin review is complete.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={goSearch} className="rounded-xl border border-pine px-5 py-2.5 text-sm font-bold text-pine">
                Explore societies
              </button>
              <button type="button" onClick={goAI} className="rounded-xl bg-pine px-5 py-2.5 text-sm font-bold text-white">
                Ask SocietyFlats AI
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI band */}
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <div className="grid gap-10 rounded-[24px] bg-pine p-9 text-paper-sage md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-clay">SocietyFlats AI</p>
            <h2 className="font-newsreader text-[28px] font-medium leading-tight text-white md:text-[34px]">
              Not sure which society fits?
            </h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-paper-sage">
              Tell us your budget, office location and lifestyle. SocietyFlats AI will suggest societies that fit
              &mdash; with clear reasoning and a data-confidence signal.
            </p>
            <button type="button" onClick={goAI} className="mt-6 inline-flex rounded-xl bg-clay px-7 py-3.5 text-[15px] font-bold text-white">
              Build my shortlist
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {aiBandPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={goAI}
                className="flex items-center justify-between rounded-xl border border-white/15 bg-pine-press px-4 py-3.5 text-left text-sm text-white"
              >
                {prompt} <ArrowRight className="h-4 w-4 text-clay" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Popular areas */}
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 py-16">
        <h2 className="mb-5 font-newsreader text-[28px] font-medium md:text-[32px]">Popular Gurgaon areas</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popularAreas.map((area) => (
            <button
              key={area}
              type="button"
              onClick={goSearch}
              className="relative h-[140px] overflow-hidden rounded-2xl bg-pine text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-pine/10 to-pine-press/80" />
              <div className="absolute bottom-3.5 left-4 text-white">
                <div className="font-bold">{area}</div>
                <div className="mt-0.5 text-xs opacity-85">View societies</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Owner + broker */}
      <div className="mx-auto grid max-w-[1360px] gap-5 px-4 sm:px-8 md:grid-cols-2">
        <div className="rounded-[20px] border border-clay/25 bg-paper-cream p-8">
          <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.1em] text-clay">For owners</p>
          <h3 className="font-newsreader text-[25px] font-medium">List your flat once. Reach serious tenants &amp; buyers.</h3>
          <p className="mt-2.5 text-sm leading-relaxed text-rdtext-muted">
            Own a flat in Gurgaon? List it once and reach serious tenants and buyers looking inside your society.
            No spam &mdash; your number is used only for verification and enquiries.
          </p>
          <button type="button" onClick={goList} className="mt-5 inline-flex rounded-[11px] bg-clay px-6 py-3 text-sm font-bold text-white">
            List your flat
          </button>
        </div>
        <div className="rounded-[20px] bg-pine p-8 text-paper-sage">
          <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.1em] text-clay">For brokers</p>
          <h3 className="font-newsreader text-[25px] font-medium text-white">Partner with SocietyFlats.</h3>
          <p className="mt-2.5 text-sm leading-relaxed text-paper-sage">
            Have verified Gurgaon inventory? Get society-specific enquiries, avoid duplicate spam, and track leads
            with clean demand.
          </p>
          <button type="button" onClick={goBroker} className="mt-5 inline-flex rounded-[11px] bg-trust-bg px-6 py-3 text-sm font-bold text-pine">
            Become a partner
          </button>
        </div>
      </div>

      {/* FAQ */}
      <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-16">
        <h2 className="mb-5 text-center font-newsreader text-[28px] font-medium md:text-[32px]">Questions, answered</h2>
        <div className="flex flex-col gap-3">
          {faqs.map((question) => (
            <button
              key={question}
              type="button"
              className="flex items-center justify-between rounded-2xl border border-rdborder bg-white px-5 py-4 text-left"
            >
              <span className="text-[15px] font-semibold">{question}</span>
              <ChevronDown className="h-[18px] w-[18px] text-rdtext-muted" strokeWidth={2.2} />
            </button>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <div className="rounded-[24px] bg-pine px-8 py-14 text-center text-white">
          <h2 className="font-newsreader text-[28px] font-medium tracking-tight md:text-[40px]">
            Find a home in a society you can actually trust.
          </h2>
          <p className="mt-3 text-base text-paper-sage">Start with the community. The right home follows.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3.5">
            <button type="button" onClick={goSearch} className="rounded-xl bg-clay px-8 py-4 text-[15px] font-bold text-white">
              Browse verified societies
            </button>
            <button type="button" onClick={goAI} className="rounded-xl border border-white/30 bg-white/10 px-8 py-4 text-[15px] font-bold text-white">
              Ask SocietyFlats AI
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mx-auto max-w-[1360px] border-t border-rdborder px-4 sm:px-8 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <span className="font-newsreader text-xl text-pine">SocietyFlats</span>
            <p className="mt-2.5 max-w-[260px] text-[13px] leading-relaxed text-rdtext-muted">
              Gurgaon&apos;s society-first real estate intelligence platform. Verified data, no fake inventory.
            </p>
          </div>
          {footerColumns.map((col) => (
            <div key={col.head} className="hidden md:block">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-rdtext-faint">{col.head}</p>
              <div className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <span key={link} className="text-[13.5px] text-rdtext-muted">{link}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 border-t border-paper-chip pt-5 text-[12.5px] text-rdtext-muted">
          &copy; 2026 SocietyFlats &middot; Verified society data &middot; We never show fake inventory.
        </div>
      </div>
    </div>
  );
}
