import { Link, useParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, Building2, ClipboardCheck, Map, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

import { usePublicSeo } from "@/lib/seo";

type NcrCity = {
  slug: string;
  name: string;
  state: string;
  status: "current-market" | "review-market";
  headline: string;
  intro: string;
  corridors: string[];
  modules: Array<{ title: string; copy: string; icon: typeof Map }>;
};

const cityMap: Record<string, NcrCity> = {
  gurgaon: {
    slug: "gurgaon",
    name: "Gurgaon",
    state: "Haryana",
    status: "current-market",
    headline: "Gurgaon remains the live SocietyFlats market.",
    intro: "The NCR framework keeps Gurgaon as the canonical production market while we prepare city-aware routing for future Delhi NCR expansion.",
    corridors: ["Golf Course Road", "Golf Course Extension Road", "Dwarka Expressway", "Southern Peripheral Road"],
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
    intro: "This page previews the city template only. Delhi inventory, locality pages and public indexing are not live until admin review approves them.",
    corridors: ["South Delhi", "West Delhi", "Dwarka", "Rohini"],
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
    intro: "The page is a noindex review shell for the future Noida market. It does not publish unverified societies or create fake inventory.",
    corridors: ["Noida Expressway", "Sector 150", "Sector 137", "Central Noida"],
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
    intro: "This shell shows how Greater Noida can be organized around zones and micro-markets once verified profiles are ready.",
    corridors: ["Greater Noida West", "Pari Chowk", "Yamuna Expressway", "Techzone"],
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
    intro: "This city shell gives the team a safe place to review future Faridabad society, locality and lead-routing structure.",
    corridors: ["Neharpar", "Sector 79", "Sector 85", "Surajkund"],
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
    city ? `${city.name} NCR Preview | SocietyFlats` : "NCR City Preview | SocietyFlats",
    city
      ? `Review-only SocietyFlats city shell for ${city.name}. Noindex, feature-flagged and excluded from sitemap until approved.`
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
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-blue-700">NCR-5 city shell</span>
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
                <Link className="inline-flex items-center rounded-full border border-blue-100 bg-white px-5 py-3 text-sm font-black text-blue-700" to="/admin/locations">
                  Admin location mapping
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

        <div className="mt-6 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <strong>Indexing guard:</strong> this page sets explicit <code>noindex, nofollow</code>, is available only when the NCR feature flag is enabled, and is not added to sitemap generation. Public city SEO should wait for mapping audit, approved content and sitemap policy.
        </div>
      </section>
    </div>
  );
}
