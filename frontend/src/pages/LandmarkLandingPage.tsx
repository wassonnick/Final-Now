import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, MapPin, Navigation, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "@/config/api";
import { setPublicSeo } from "@/lib/seo";

/**
 * "Verified societies near DLF Cyber Hub" — the pages only we can write.
 *
 * A portal can list flats in a sector; it cannot tell you a society is 460 metres from
 * where you work, because it holds coordinates for neither end. We hold both, so every row
 * here carries a measured distance rather than an adjective. That is the whole reason this
 * page type is worth publishing: each line is a fact, not filler written to fill a
 * template.
 */

interface LandmarkPage {
  landmark: { name: string; slug: string; category: string; city: string | null };
  radius_km: number;
  title: string;
  meta_description: string;
  h1: string;
  intro: string;
  society_count: number;
  walkable_count: number;
  societies: Array<{
    id: number; name: string; slug: string; sector: string | null; locality: string | null;
    score: string | null; builder: string | null; rent_range: string | null;
    buy_range: string | null; distance_km: number;
  }>;
}

function readable(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function LandmarkLandingPage() {
  const { slug = "" } = useParams();
  const [page, setPage] = useState<LandmarkPage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    fetch(`${API_BASE_URL}/landmark-pages/${encodeURIComponent(slug)}`, { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("missing"))))
      .then((payload) => {
        if (cancelled) return;
        const data = payload?.data as LandmarkPage;
        setPage(data);
        setStatus("ready");
        setPublicSeo(data.title, data.meta_description, { canonical: `/near/${data.landmark.slug}` });
      })
      .catch(() => {
        if (!cancelled) setStatus("missing");
      });

    return () => { cancelled = true; };
  }, [slug]);

  if (status === "loading") {
    return <div className="min-h-[60vh] bg-white px-5 py-20 text-center text-[#6E6E73]">Loading…</div>;
  }

  if (status === "missing" || !page) {
    return (
      <div className="min-h-[60vh] bg-white px-5 py-20 text-center">
        <h1 className="!font-sans text-2xl font-medium text-[#1D1D1F]">We don’t have this area yet</h1>
        <p className="mt-2 text-[15px] text-[#6E6E73]">Not enough verified societies near it for a page worth reading.</p>
        <Link to="/societies" className="mt-6 inline-block rounded-full bg-[#0F7B63] px-6 py-3 text-[14px] font-semibold text-white">
          Browse verified societies
        </Link>
      </div>
    );
  }

  const { landmark, societies } = page;

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1100px] px-5 py-10 md:px-8 md:py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868B]">
          {landmark.city || "Delhi NCR"} · Measured distances
        </p>
        <h1 className="!font-sans mt-3 max-w-[24ch] text-[32px] font-medium leading-[1.12] tracking-[-0.025em] text-[#1D1D1F] md:text-[42px]">
          {page.h1}
        </h1>
        <p className="mt-4 max-w-[70ch] text-[16px] leading-8 text-[#6E6E73]">{page.intro}</p>

        <div className="mt-7 flex flex-wrap gap-2.5">
          {[
            `${page.society_count} verified societies`,
            `Within ${page.radius_km} km`,
            page.walkable_count > 0 ? `${page.walkable_count} under 2 km` : null,
          ].filter(Boolean).map((chip) => (
            <span key={String(chip)} className="rounded-full bg-[#ECF6F2] px-3.5 py-2 text-[13px] font-semibold text-[#0F7B63]">
              {chip}
            </span>
          ))}
        </div>

        {/* The distance is the column that matters, so it leads every row. */}
        <ol className="mt-9 space-y-2.5">
          {societies.map((society, index) => (
            <li key={society.id}>
              <Link
                to={`/society/${society.slug}`}
                className="flex items-start gap-4 rounded-[20px] border border-[#E4E4E9] bg-white p-4 transition hover:border-[#0F7B63] md:p-5"
              >
                <span className="mt-0.5 w-16 shrink-0 text-[15px] font-semibold tabular-nums text-[#0F7B63]">
                  {readable(society.distance_km)}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="!font-sans text-[17px] font-medium tracking-[-0.01em] text-[#1D1D1F]">
                      {society.name}
                    </span>
                    <span className="text-[14px] font-semibold tabular-nums text-[#1D1D1F]">
                      {society.rent_range || society.buy_range || "On request"}
                    </span>
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[#6E6E73]">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {[society.sector, society.locality].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" · ")}
                    {society.builder ? ` · ${society.builder}` : ""}
                  </span>
                </span>

                <ArrowRight className="mt-1 hidden h-4 w-4 shrink-0 text-[#86868B] sm:block" />
              </Link>
            </li>
          ))}
        </ol>

        <section className="mt-10 rounded-[20px] border border-[#E4E4E9] bg-[#F5F5F7] p-6">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[#1D1D1F]">
            <Navigation className="h-4 w-4 text-[#0F7B63]" /> How these distances are measured
          </p>
          <p className="mt-2 max-w-[75ch] text-[14px] leading-7 text-[#6E6E73]">
            Straight-line distance between {landmark.name}’s coordinates and each society’s own, both verified before
            publishing. Road distance will be longer — treat these as a fair way to rank neighbourhoods, not a
            substitute for a route. Societies without confirmed coordinates are left out rather than guessed at.
          </p>
          <p className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-[#1D1D1F]">
            <ShieldCheck className="h-4 w-4 text-[#0F7B63]" /> Every society here is published and admin-reviewed.
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/brief" className="rounded-full bg-[#0F7B63] px-6 py-3 text-[14px] font-semibold text-white">
            Build a brief around this commute
          </Link>
          <Link to="/societies" className="rounded-full border border-[#E4E4E9] px-6 py-3 text-[14px] font-semibold text-[#1D1D1F]">
            All verified societies
          </Link>
        </div>
      </main>
    </div>
  );
}

export default LandmarkLandingPage;
