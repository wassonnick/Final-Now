import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Home,
  ListFilter,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SocietyMapView } from "@/components/maps/SocietyMapView";
import { GoogleSocietyMapView } from "@/components/maps/GoogleSocietyMapView";
import { fetchPublicSocieties, formatPublicLocation, searchableText } from "@/lib/publicData";
import { setPublicSeo } from "@/lib/seo";
import { type AdminSociety } from "@/lib/adminSocietyStore";
import { googleMapsSearchHref, hasValidMapCoordinates, mapCoordinateHref } from "@/lib/mapCoordinates";

function hasCoordinates(society: AdminSociety) {
  return hasValidMapCoordinates(society.latitude, society.longitude);
}

function societyPath(society: AdminSociety) {
  return society.slug ? `/society/${society.slug}` : `/search?tab=societies&intent=general&q=${encodeURIComponent(society.name)}`;
}

function mapsHref(society: AdminSociety) {
  if (society.googleMapsUrl) return society.googleMapsUrl;

  return (
    mapCoordinateHref(society.latitude, society.longitude) ||
    googleMapsSearchHref(`${society.name} ${formatPublicLocation(society)} Gurugram`)
  );
}

function locationWhatsAppMessage(query: string, society?: AdminSociety) {
  const target = society
    ? `${society.name} (${formatPublicLocation(society)})`
    : query.trim() || "Gurgaon society map";

  return encodeURIComponent(
    `Hi SocietyFlats, I am exploring homes from the map around ${target}. Please share verified rent/buy options and suitable society matches.`,
  );
}

export function MapsPage() {
  const [params] = useSearchParams();
  const initialQuery = params.get("q") || "";
  const fromSearch = params.get("fromSearch") === "1";
  const [query, setQuery] = useState(initialQuery);
  const [societies, setSocieties] = useState<AdminSociety[]>([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const googleMapsApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();

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

  const pinnedSocieties = useMemo(
    () => filteredSocieties.filter(hasCoordinates),
    [filteredSocieties],
  );

  const selectedSociety = useMemo(
    () => pinnedSocieties.find((society) => Number(society.id) === selectedSocietyId) || pinnedSocieties[0],
    [pinnedSocieties, selectedSocietyId],
  );

  const localityChips = useMemo(() => {
    const chips = new Set<string>();

    societies.forEach((society) => {
      const label = society.locality || society.sector || society.builder;
      if (label) chips.add(label);
    });

    return Array.from(chips).slice(0, 6);
  }, [societies]);

  const mapLabel = googleMapsApiKey ? "Live Google map" : "Coordinate map";
  const visiblePinCount = pinnedSocieties.length;
  const matchCount = filteredSocieties.length;

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
                Search society, sector, builder or locality, compare verified pins and continue to profiles or homes around the same location.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="rounded-full border-blue-100 text-blue-700">
                <Link to="/search?tab=societies&intent=general">
                  Search list view <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="rounded-full bg-blue-700 text-white hover:bg-blue-800">
                <a href={`https://wa.me/919911886222?text=${locationWhatsAppMessage(query)}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Ask on WhatsApp
                </a>
              </Button>
            </div>
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

          {localityChips.length ? (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {localityChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setQuery(chip)}
                  className="shrink-0 rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-black text-blue-700 shadow-sm transition hover:bg-blue-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Map mode", value: mapLabel, icon: Navigation },
              { label: "Visible pins", value: String(visiblePinCount), icon: MapPin },
              { label: "Matching societies", value: String(matchCount), icon: Building2 },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-500">{item.label}</p>
                    <p className="mt-1 text-lg font-black text-navy-950">{item.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {fromSearch ? (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              Continued from search. Use the map pins to compare location before opening society profiles.
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div>
          {loading ? (
            <div className="flex min-h-[520px] items-center justify-center rounded-[1.75rem] border border-blue-100 bg-white">
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
          ) : googleMapsApiKey ? (
            <GoogleSocietyMapView societies={filteredSocieties} query={query} apiKey={googleMapsApiKey} />
          ) : (
            <SocietyMapView societies={filteredSocieties} query={query} />
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-500">Map shortlist</p>
                <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-navy-950">
                  Ready society pins
                </h2>
              </div>
              <ListFilter className="h-5 w-5 text-blue-600" />
            </div>

            <div className="mt-4 space-y-3">
              {pinnedSocieties.length ? (
                pinnedSocieties.slice(0, 6).map((society) => {
                  const active = Number(society.id) === Number(selectedSociety?.id);

                  return (
                    <button
                      key={society.id || society.slug || society.name}
                      type="button"
                      onClick={() => setSelectedSocietyId(Number(society.id))}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        active
                          ? "border-blue-200 bg-blue-50"
                          : "border-slate-100 bg-white hover:border-blue-100 hover:bg-blue-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-navy-950">{society.name}</p>
                          <p className="mt-1 line-clamp-1 text-xs font-semibold text-navy-500">
                            {formatPublicLocation(society)}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-black text-blue-700">
                          {society.score || "Verified"}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  No ready pins match this search. Try a wider sector or locality.
                </div>
              )}
            </div>
          </div>

          {selectedSociety ? (
            <div className="rounded-[1.5rem] border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-4 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">Selected pin</p>
              <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-navy-950">{selectedSociety.name}</h3>
              <p className="mt-2 text-sm leading-6 text-navy-500">{formatPublicLocation(selectedSociety)}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-2xl bg-white p-3">
                  <p className="font-black text-navy-950">{selectedSociety.rentRange || "On request"}</p>
                  <p className="mt-1 text-navy-400">Rent range</p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="font-black text-navy-950">{selectedSociety.buyRange || "On request"}</p>
                  <p className="mt-1 text-navy-400">Buy range</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <Link
                  to={societyPath(selectedSociety)}
                  className="inline-flex items-center justify-center rounded-full bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
                >
                  Open society profile <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  to={`/search?tab=rent&q=${encodeURIComponent(selectedSociety.name)}`}
                  className="inline-flex items-center justify-center rounded-full border border-blue-100 bg-white px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-50"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Homes near this society
                </Link>
                <a
                  href={`https://wa.me/919911886222?text=${locationWhatsAppMessage(query, selectedSociety)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp map shortlist
                </a>
                <a
                  href={mapsHref(selectedSociety)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  Open Google pin
                </a>
              </div>
            </div>
          ) : null}
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-slate-50 p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Map-first shortlisting
              </p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-navy-950">
                Found the right location? Request homes near that society.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-500">
                Compare sectors and society pins on the map, then open verified profiles or continue to homes around the same location.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                to={`/search?tab=societies&intent=general&q=${encodeURIComponent(query || "Gurgaon societies")}`}
                className="inline-flex items-center justify-center rounded-full bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
              >
                View matching societies
              </Link>
              <Link
                to={`/search?tab=rent&q=${encodeURIComponent(query || "Gurgaon")}`}
                className="inline-flex items-center justify-center rounded-full border border-blue-100 bg-white px-5 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-50"
              >
                Homes near map area
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default MapsPage;
