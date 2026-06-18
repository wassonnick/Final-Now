import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SocietyMapView } from "@/components/maps/SocietyMapView";
import { fetchPublicSocieties, formatPublicLocation, searchableText } from "@/lib/publicData";
import { setPublicSeo } from "@/lib/seo";
import { type AdminSociety } from "@/lib/adminSocietyStore";

export function MapsPage() {
  const [params] = useSearchParams();
  const initialQuery = params.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [societies, setSocieties] = useState<AdminSociety[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setPublicSeo(
      "Gurgaon Society Map | SocietyFlats",
      "Explore verified Gurgaon societies on a live map with society-first location intelligence, valid coordinates and profile links.",
      { canonical: "/maps" },
    );
  }, []);

  useEffect(() => {
    let mounted = true;

    fetchPublicSocieties()
      .then((items) => {
        if (!mounted) return;
        setSocieties(items);
      })
      .catch((err) => {
        console.error("Unable to load map societies", err);
        if (mounted) setError("Unable to load live societies right now.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredSocieties = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return societies;

    return societies.filter((society) =>
      searchableText(
        society.name,
        society.sector,
        society.locality,
        society.address,
        society.builder,
        formatPublicLocation(society),
      ).includes(clean),
    );
  }, [query, societies]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-blue-50/35 to-white">
      <section className="border-b border-blue-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                <MapPin className="h-3.5 w-3.5" />
                Map Intelligence
              </div>
              <h1 className="mt-4 font-serif text-4xl font-black tracking-[-0.05em] text-navy-950 md:text-6xl">
                Explore Gurgaon societies on a live map.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-navy-500 md:text-lg">
                Search society, sector, builder or locality and open verified society profiles from live map pins.
              </p>
            </div>

            <Button asChild variant="outline" className="rounded-full border-blue-100 text-blue-700">
              <Link to="/search?tab=societies&intent=general">
                Search list view <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-6 rounded-[1.35rem] border border-blue-100 bg-blue-50/70 p-2 shadow-sm">
            <div className="flex flex-col gap-2 rounded-[1.1rem] bg-white p-2 sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-blue-50/65 px-4 py-3">
                <Search className="h-5 w-5 text-blue-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search DLF Crest, Sector 65, Golf Course Road..."
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-navy-900 outline-none placeholder:text-blue-300"
                />
              </div>
              <Button
                type="button"
                onClick={() => setQuery("")}
                variant="outline"
                className="h-12 rounded-2xl border-blue-100 text-blue-700"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[1.75rem] border border-blue-100 bg-white">
            <div className="text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-700" />
              <p className="mt-3 text-sm font-bold text-navy-500">Loading live society map...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[1.75rem] border border-red-100 bg-red-50 p-6">
            <p className="font-bold text-red-700">{error}</p>
            <Button asChild className="mt-4 rounded-full bg-blue-700 hover:bg-blue-800">
              <Link to="/search?tab=societies&intent=general">Open society search</Link>
            </Button>
          </div>
        ) : (
          <SocietyMapView societies={filteredSocieties} query={query} />
        )}
      </section>
    </main>
  );
}

export default MapsPage;
