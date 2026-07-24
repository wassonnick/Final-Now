import { Link } from "react-router-dom";
import { MapPin, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { usePublicSeo } from "@/lib/seo";

const cities = [
  { name: "Gurgaon", note: "Current live market remains the canonical production city." },
  { name: "Delhi", note: "Prepared for future society/property discovery." },
  { name: "Noida", note: "Prepared for future structured locality coverage." },
  { name: "Greater Noida", note: "Prepared for future zone and micro-market mapping." },
  { name: "Faridabad", note: "Prepared for future NCR intake and lead routing." },
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
            Delhi NCR city architecture, safely staged behind a feature flag.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            NCR-1 adds the structured region, city, zone and locality layer needed for SocietyFlats to expand beyond
            Gurgaon without weakening today’s live filters, sitemap, importer safety or public SEO posture.
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
            <article key={city.name} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-navy-900">{city.name}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{city.note}</p>
            </article>
          ))}
        </div>

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
