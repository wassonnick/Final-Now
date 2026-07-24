import { Link } from "react-router-dom";
import { ArrowRight, ClipboardCheck, MapPin, SearchCheck, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { usePublicSeo } from "@/lib/seo";

const cities = [
  { name: "Gurgaon", slug: "gurgaon", note: "Current live market remains the canonical production city.", state: "Live baseline" },
  { name: "Delhi", slug: "delhi", note: "Prepared for future society, owner and NRI workflows.", state: "Review-only" },
  { name: "Noida", slug: "noida", note: "Prepared for sector-led search and comparison once verified.", state: "Review-only" },
  { name: "Greater Noida", slug: "greater-noida", note: "Prepared for zone and micro-market mapping.", state: "Review-only" },
  { name: "Faridabad", slug: "faridabad", note: "Prepared for future NCR intake and lead routing.", state: "Review-only" },
];

export function NcrPreviewPage() {
  usePublicSeo(
    "NCR Preview | SocietyFlats",
    "Review-only SocietyFlats NCR multi-city foundation preview. This page is noindex and hidden behind a feature flag.",
    { noindex: true, canonical: "/ncr-preview" },
  );

  return (
    <div className="bg-ivory-100">
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm md:p-10">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">Review-only foundation</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-navy-900 md:text-6xl">
            Delhi NCR expansion, staged like a control room — not a public launch.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            This preview lets us inspect how SocietyFlats can expand from Gurgaon into Delhi, Noida, Greater Noida
            and Faridabad without weakening the live filters, sitemap, importer safety or SEO posture already working today.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5">
              <ShieldCheck className="h-6 w-6 text-blue-700" />
              <h2 className="mt-4 text-lg font-black text-navy-900">No production indexing</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This preview is noindex and not added to sitemap routes.
              </p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5">
              <MapPin className="h-6 w-6 text-blue-700" />
              <h2 className="mt-4 text-lg font-black text-navy-900">Nullable location IDs</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Existing city/locality strings continue working while structured NCR links are added.
              </p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5">
              <SlidersHorizontal className="h-6 w-6 text-blue-700" />
              <h2 className="mt-4 text-lg font-black text-navy-900">Admin-first rollout</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Admin APIs and importer context come before public city pages.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          {cities.map((city) => (
            <Link key={city.name} to={`/ncr/${city.slug}`} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-blue-700">{city.state}</span>
              <h2 className="text-xl font-black text-navy-900">{city.name}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{city.note}</p>
              <span className="mt-4 inline-flex items-center text-sm font-black text-blue-700">
                Open city shell
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">What to check here</p>
          <h2 className="mt-3 text-3xl font-black text-navy-900">Use this page to inspect the rollout rules, not live inventory.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: SearchCheck,
                title: "City page quality",
                copy: "Open each shell and check whether the page explains its market role, staged corridors, proof needed and next user path.",
              },
              {
                icon: ClipboardCheck,
                title: "Admin readiness",
                copy: "Confirm the admin location board has cities, zones, localities and backfill preview without forcing public indexing.",
              },
              {
                icon: ShieldCheck,
                title: "SEO safety",
                copy: "Verify these routes remain noindex and out of sitemap until a city has explicit approval and enough verified content.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-3xl border border-blue-100 bg-blue-50/50 p-5">
                  <Icon className="h-6 w-6 text-blue-700" />
                  <h3 className="mt-4 text-lg font-black text-navy-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
                </article>
              );
            })}
          </div>
        </section>

        <div className="mt-8 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <strong>Review note:</strong> this branch is not production-ready. Enable with <code>VITE_NCR_MULTICITY_ENABLED=true</code> only
          in a preview environment, then review admin location mappings before exposing any public NCR routes.
        </div>

        <Link className="mt-8 inline-flex rounded-full bg-blue-700 px-5 py-3 text-sm font-black text-white" to="/gurgaon">
          Back to current Gurgaon experience
        </Link>
      </section>
    </div>
  );
}
