import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardCheck,
  FileCheck2,
  Landmark,
  Map,
  MessageCircle,
  Route,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { usePublicSeo } from "@/lib/seo";

type NcrCity = {
  slug: string;
  name: string;
  state: string;
  status: "current-market" | "review-market";
  headline: string;
  intro: string;
  corridors: string[];
  proofPoints: string[];
  readiness: Array<{ label: string; state: string; copy: string }>;
  modules: Array<{ title: string; copy: string; icon: typeof Map }>;
};

const cityMap: Record<string, NcrCity> = {
  gurgaon: {
    slug: "gurgaon",
    name: "Gurgaon",
    state: "Haryana",
    status: "current-market",
    headline: "Gurgaon remains the live SocietyFlats market.",
    intro: "Gurgaon stays the production benchmark: verified society profiles, real rental and resale demand, RWA/builder workflows, NRI support and public lead routing all continue to run from the same society-first model.",
    corridors: ["Golf Course Road", "Golf Course Extension Road", "Dwarka Expressway", "Southern Peripheral Road"],
    proofPoints: [
      "Published society profiles remain governed by current verification and publication filters.",
      "Live property inventory appears only when a real listing is verified or intentionally published.",
      "Search, compare, AI advisor, RWA and NRI journeys continue to point users back to society context.",
    ],
    readiness: [
      { label: "City mapping", state: "Live baseline", copy: "Gurgaon and Gurugram text stay compatible while structured city IDs are backfilled safely." },
      { label: "Society depth", state: "In production", copy: "Existing public societies remain the proof model for future NCR cities." },
      { label: "Indexing", state: "Current route live", copy: "The existing `/gurgaon` experience remains canonical; this `/ncr/gurgaon` shell stays noindex." },
    ],
    modules: [
      { title: "Verified society discovery", copy: "Public Gurgaon society pages continue to be filtered by current publication rules.", icon: BadgeCheck },
      { title: "Property requests", copy: "Rental and resale enquiries continue to route through SocietyFlats lead capture.", icon: Building2 },
      { title: "RWA and builder workflows", copy: "Claim, review and announcement workflows stay attached to existing society pages.", icon: UsersRound },
    ],
  },
  delhi: {
    slug: "delhi",
    name: "Delhi",
    state: "Delhi",
    status: "review-market",
    headline: "Delhi is staged for future society-first discovery.",
    intro: "Delhi coverage should launch only after the team has enough society-level evidence to answer practical questions: where the building is, who manages it, how residents reach daily services, and how owners or NRIs can route requests without exposing private details.",
    corridors: ["South Delhi", "West Delhi", "Dwarka", "Rohini"],
    proofPoints: [
      "No Delhi society, property or locality URL is added to public sitemap by this shell.",
      "Future Delhi pages should be backed by admin-reviewed society records, not scraped or invented inventory.",
      "NRI and owner-management flows can be attached once verified listings and handover rules are ready.",
    ],
    readiness: [
      { label: "City mapping", state: "Staged", copy: "Delhi is present in the NCR city layer for admin review." },
      { label: "Locality evidence", state: "Pending", copy: "Zones such as South Delhi, West Delhi and Dwarka need curated locality mapping before launch." },
      { label: "Indexing", state: "Held", copy: "Public indexing requires explicit city approval plus the NCR indexing flag." },
    ],
    modules: [
      { title: "Society profile intake", copy: "Admin can map Delhi societies to structured city, zone and locality records before publication.", icon: ClipboardCheck },
      { title: "NRI owner support", copy: "Delhi can use the same NRI management, resale and tenant coordination workflows when verified inventory exists.", icon: ShieldCheck },
      { title: "Lead routing", copy: "Buyer, tenant and owner demand can be tagged to Delhi without changing Gurgaon search behavior.", icon: Sparkles },
    ],
  },
  noida: {
    slug: "noida",
    name: "Noida",
    state: "Uttar Pradesh",
    status: "review-market",
    headline: "Noida is prepared for structured sector and expressway coverage.",
    intro: "Noida needs a sector-aware experience because users often shortlist by expressway access, office commute and society operations before they shortlist a flat. This shell shows where that future structure will live once verified data is ready.",
    corridors: ["Noida Expressway", "Sector 150", "Sector 137", "Central Noida"],
    proofPoints: [
      "Sector and corridor language is staged as navigation structure, not as a published inventory claim.",
      "Property cards should remain absent until real rental or resale listings pass admin verification.",
      "Comparisons can be reused only after society profiles have consistent scores and source-reviewed amenities.",
    ],
    readiness: [
      { label: "Sector structure", state: "Staged", copy: "Noida can support sector-first navigation when locality records are reviewed." },
      { label: "Inventory", state: "Not live", copy: "No fake listings are created for this city shell." },
      { label: "Indexing", state: "Held", copy: "The page remains noindex and out of sitemap until approved." },
    ],
    modules: [
      { title: "Sector-first navigation", copy: "Noida sectors can be staged as localities before they appear in public SEO.", icon: Map },
      { title: "Verified homes only", copy: "Property cards will appear only after real listings pass admin verification.", icon: BadgeCheck },
      { title: "Compare before calling", copy: "Future Noida society comparisons can reuse the existing SocietyFlats compare framework.", icon: Building2 },
    ],
  },
  "greater-noida": {
    slug: "greater-noida",
    name: "Greater Noida",
    state: "Uttar Pradesh",
    status: "review-market",
    headline: "Greater Noida is staged for zone-led expansion.",
    intro: "Greater Noida should be organized around zones, corridors and verified society records so that future users can separate location fit, society operations and inventory source before speaking to anyone.",
    corridors: ["Greater Noida West", "Pari Chowk", "Yamuna Expressway", "Techzone"],
    proofPoints: [
      "Zone mapping can be reviewed without making public SEO promises.",
      "Owner-submitted, broker-assigned and SocietyFlats inventory sources stay separate.",
      "RWA or builder pages should connect only after the underlying society profile is approved.",
    ],
    readiness: [
      { label: "Zone mapping", state: "Staged", copy: "Future micro-markets can be grouped under reviewed zones." },
      { label: "Source rules", state: "Ready", copy: "Property ownership/source labels already support safe future intake." },
      { label: "Indexing", state: "Held", copy: "The shell is intentionally excluded from sitemap until city readiness passes." },
    ],
    modules: [
      { title: "Zone mapping", copy: "Micro-markets can be reviewed in admin before they become public navigation.", icon: Map },
      { title: "Owner inventory pipeline", copy: "Owner-submitted and SocietyFlats inventory sources stay separated during rollout.", icon: ClipboardCheck },
      { title: "No premature indexing", copy: "The template is intentionally noindex until content depth and inventory quality are approved.", icon: ShieldCheck },
    ],
  },
  faridabad: {
    slug: "faridabad",
    name: "Faridabad",
    state: "Haryana",
    status: "review-market",
    headline: "Faridabad is ready for admin-only NCR intake.",
    intro: "Faridabad can become a practical family-first market only after locality mapping, society verification and real lead routing are ready. This noindex shell is the review surface for that rollout.",
    corridors: ["Neharpar", "Sector 79", "Sector 85", "Surajkund"],
    proofPoints: [
      "Lead demand can be tagged internally before any public city page is launched.",
      "Society checks should cover location, management context, amenities and correction flow.",
      "The public route does not imply availability, ranking or verified inventory.",
    ],
    readiness: [
      { label: "Locality intake", state: "Staged", copy: "Faridabad sectors and corridors can be added behind admin controls." },
      { label: "Verification", state: "Pending", copy: "Public pages should wait for source-reviewed society records." },
      { label: "Indexing", state: "Held", copy: "No sitemap inclusion until city approval is explicit." },
    ],
    modules: [
      { title: "Lead qualification", copy: "Faridabad demand can be tagged without making public SEO promises.", icon: Sparkles },
      { title: "Society verification", copy: "Profiles remain draft/review until sources, location and checks are approved.", icon: BadgeCheck },
      { title: "Admin-first rollout", copy: "The public page stays behind the NCR feature flag and remains out of sitemap.", icon: ShieldCheck },
    ],
  },
};

function cityStatusLabel(city: NcrCity) {
  return city.status === "current-market" ? "Current live market" : "Review-only market";
}

export function NcrCityLandingPage() {
  const { citySlug = "" } = useParams();
  const city = cityMap[citySlug] || null;

  usePublicSeo(
    city ? `${city.name} Society-First Home Search Preview | SocietyFlats` : "NCR City Preview | SocietyFlats",
    city
      ? `Review-only ${city.name} city coverage preview for SocietyFlats. Noindex, feature-flagged and excluded from sitemap until approved.`
      : "Review-only SocietyFlats NCR city shell.",
    { noindex: true, canonical: city ? `/ncr/${city.slug}` : "/ncr-preview" },
  );

  if (!city) {
    return (
      <div className="bg-ivory-100">
        <section className="mx-auto max-w-4xl px-4 py-16">
          <div className="rounded-[2rem] border border-amber-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-700">Review-only NCR route</p>
            <h1 className="mt-4 text-4xl font-black text-navy-900">This NCR city is not staged yet.</h1>
            <p className="mt-4 text-slate-600">Choose one of the staged NCR cities from the preview page.</p>
            <Link className="mt-6 inline-flex rounded-full bg-blue-700 px-5 py-3 text-sm font-black text-white" to="/ncr-preview">
              Back to NCR preview
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="bg-ivory-100">
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="overflow-hidden rounded-[2.25rem] border border-blue-100 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-6 md:p-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-blue-700">NCR city preview</span>
                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800">{cityStatusLabel(city)}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">Noindex</span>
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-navy-900 md:text-6xl">
                {city.headline}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{city.intro}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="inline-flex items-center rounded-full bg-blue-700 px-5 py-3 text-sm font-black text-white" to={city.slug === "gurgaon" ? "/gurgaon" : "/search"}>
                  {city.slug === "gurgaon" ? "Open live Gurgaon" : "Review current search"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link className="inline-flex items-center rounded-full border border-blue-100 bg-white px-5 py-3 text-sm font-black text-blue-700" to="/ai-advisor">
                  Ask AI advisor
                </Link>
                <Link className="inline-flex items-center rounded-full border border-blue-100 bg-white px-5 py-3 text-sm font-black text-blue-700" to="/trust">
                  How verification works
                </Link>
              </div>
            </div>

            <div className="border-t border-blue-100 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-6 md:p-10 lg:border-l lg:border-t-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-700">Prepared corridors</p>
              <div className="mt-5 grid gap-3">
                {city.corridors.map((corridor) => (
                  <div key={corridor} className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
                    <p className="font-black text-navy-900">{corridor}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Can become a reviewed zone/locality before public SEO rollout.</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {city.modules.map((module) => {
            const Icon = module.icon;
            return (
              <article key={module.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <Icon className="h-6 w-6 text-blue-700" />
                <h2 className="mt-4 text-xl font-black text-navy-900">{module.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{module.copy}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">What must be true before launch</p>
            <h2 className="mt-3 text-2xl font-black text-navy-900">No city goes public on a label alone.</h2>
            <div className="mt-5 space-y-4">
              {city.proofPoints.map((point) => (
                <div key={point} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                  <FileCheck2 className="mt-0.5 h-5 w-5 flex-none text-blue-700" />
                  <p className="text-sm leading-6 text-slate-600">{point}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">City readiness path</p>
            <h2 className="mt-3 text-2xl font-black text-navy-900">The rollout is intentionally gated.</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {city.readiness.map((item) => (
                <article key={item.label} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">{item.state}</p>
                  <h3 className="mt-2 font-black text-navy-900">{item.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-[1.75rem] border border-blue-100 bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Connected SocietyFlats journeys</p>
              <h2 className="mt-3 text-2xl font-black text-navy-900">Every city should plug into the same user journey.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                The city page is not a standalone brochure. It should guide users into society comparison, map-led discovery,
                RWA context, NRI owner support, verified homes and correction workflows when those pieces are ready.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Compare societies", href: "/compare", icon: Route },
                { label: "Explore on map", href: "/maps", icon: Map },
                { label: "NRI owner support", href: "/nri", icon: Landmark },
                { label: "Corrections & data", href: "/corrections", icon: MessageCircle },
              ].map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.label} to={link.href} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-navy-900 transition hover:border-blue-200 hover:bg-blue-50">
                    <Icon className="h-5 w-5 text-blue-700" />
                    <span>{link.label}</span>
                    <ArrowRight className="ml-auto h-4 w-4 text-blue-700 transition group-hover:translate-x-1" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mt-6 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <strong>Indexing guard:</strong> this page sets explicit <code>noindex, nofollow</code>, is available only when the NCR feature flag is enabled, and is not added to sitemap generation. Public city SEO should wait for mapping audit, approved content and sitemap policy.
        </div>
      </section>
    </div>
  );
}
