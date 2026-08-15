import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Check, CornerDownLeft, MapPin, Search, ShieldCheck, Sparkles, Star } from "lucide-react";
import { fetchPublicSocieties, formatPublicLocation, suggestPlaces, suggestSocieties } from "@/lib/publicData";
import { hasGooglePlacesDisplayPhoto, societyDisplayImage } from "@/lib/societyImages";
import { setPublicSeo } from "@/lib/seo";
import { NCR_REGION, ncrCityFrom, ncrCityStatusLabel, rowIsInCity, useNcrCities, useSelectedNcrCity, type NcrCity } from "@/lib/ncrCities";
import { cachedSocietyCount, rememberSocietyCount } from "@/lib/societyCountCache";
import { MODULES, MODULE_INTENTS, searchModules, type ModuleIntent } from "@/lib/modules";

/*
  SocietyFlats — new design language (light · Apple-like · premium).
  Canvas #FFFFFF / #F5F5F7 · ink #1D1D1F · secondary #6E6E73 · line #E4E4E9
  accent (verified) #0F7B63 · soft accent #ECF6F2 · radius large · soft shadows.
  Sans throughout (system / Hanken Grotesk). One calm accent, lots of air.
*/

const ACCENT = "#0F7B63";

function scoreOf(society: any) {
  const value = Number(society?.score ?? society?.overallScore);
  if (!Number.isFinite(value) || value <= 0) return null;
  return (value > 10 ? value / 10 : value).toFixed(1);
}

function statusPill(status: NcrCity["status"]) {
  if (status === "live") return "bg-[#ECF6F2] text-[#0F7B63]";
  if (status === "launching") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-500";
}

export default function HomePremium() {
  const navigate = useNavigate();
  const cities = useNcrCities();
  const [city, setCity] = useSelectedNcrCity();
  // Whichever city is actually live, so the escape hatch and its label cannot disagree.
  const liveCity = ncrCityFrom(cities, null);
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [societies, setSocieties] = useState<any[]>([]);
  // Distinguishes "still loading" from "genuinely none", which an empty array cannot.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPublicSeo(
      "Verified societies and real homes across Delhi NCR | SocietyFlats",
      "Choose your society first, then the home. Verified profiles, real scores and honest availability — now expanding across Delhi NCR.",
    );
    let active = true;
    fetchPublicSocieties()
      .then((items) => { if (active) { setSocieties(items); setLoaded(true); } })
      .catch(() => { if (active) { setSocieties([]); setLoaded(true); } });
    return () => { active = false; };
  }, []);

  // Everything below the hero is about the city being browsed. Deriving each section from
  // the whole NCR catalogue meant picking Delhi changed a chip and a placeholder while the
  // societies, the areas and the counted total all stayed Gurgaon's.
  const citySocieties = useMemo(() => societies.filter((s) => rowIsInCity(s, city)), [societies, city]);

  const featured = useMemo(
    () => [...citySocieties].filter(hasGooglePlacesDisplayPhoto).sort((a, b) => (Number(b?.score) || 0) - (Number(a?.score) || 0)).slice(0, 8),
    [citySocieties],
  );

  // Area-tabbed inventory: group verified societies by their micro-market (sector/locality),
  // data-driven so every tab is genuinely populated. Available-homes signal comes from the
  // society's live property count where present, honest "on request" otherwise.
  const areaGroups = useMemo(() => {
    // Keyed on the lower-cased name, because the catalogue holds "paschim vihar" and
    // "Paschim Vihar" and grouping on the raw string gave the same place two tabs.
    const map = new Map<string, { label: string; list: any[] }>();
    for (const s of citySocieties) {
      if (!hasGooglePlacesDisplayPhoto(s)) continue;
      const area = String(s.sector || s.locality || "").trim();
      if (!area) continue;
      const key = area.toLowerCase();
      const group = map.get(key) ?? { label: area, list: [] };
      // Prefer a properly capitalised spelling for the tab; title-case only if every
      // variant arrived lower-case.
      if (area !== key && group.label === group.label.toLowerCase()) group.label = area;
      group.list.push(s);
      map.set(key, group);
    }
    return [...map.values()]
      .sort((a, b) => b.list.length - a.list.length)
      .slice(0, 8)
      .map(({ label, list }) => ({
        area: label.replace(/\b[a-z]/g, (c) => c.toUpperCase()),
        societies: list.sort((a, b) => (Number(b?.score) || 0) - (Number(a?.score) || 0)),
      }));
  }, [citySocieties]);
  const [areaTab, setAreaTab] = useState("");
  // Falls back to the first group rather than blanking when the previous city's area does
  // not exist here.
  const currentArea = areaGroups.find((g) => g.area === areaTab) ?? areaGroups[0];
  const suggestions = useMemo(() => suggestSocieties(citySocieties, query), [citySocieties, query]);
  const places = useMemo(() => suggestPlaces(citySocieties, query), [citySocieties, query]);
  const moduleMatches = useMemo(() => searchModules(query), [query]);
  const submit = (q?: string) => navigate(`/search?tab=societies${(q ?? query).trim() ? `&q=${encodeURIComponent((q ?? query).trim())}` : ""}`);
  // Opens on the number we last showed for this city and corrects it when the catalogue
  // lands; null only for a city we have never counted, which is the one case worth a dash.
  const liveCount = loaded ? citySocieties.length : cachedSocietyCount(city.slug);

  useEffect(() => {
    if (loaded) rememberSocietyCount(city.slug, citySocieties.length);
  }, [loaded, city.slug, citySocieties.length]);

  return (
    <div className="premium-home bg-white text-[#1D1D1F]">
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(120%_90%_at_50%_-10%,#F1F7F5_0%,#FFFFFF_60%)]" />
        <div className="relative mx-auto max-w-[1120px] px-5 pb-10 pt-7 text-center sm:pb-14 sm:pt-14 lg:pb-20 lg:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E9] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#6E6E73] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
            Now across {NCR_REGION}
          </span>

          <h1 className="!font-sans mx-auto mt-4 max-w-[880px] text-[31px] font-semibold leading-[1.06] tracking-[-0.03em] sm:mt-6 sm:text-[56px] lg:text-[68px]">
            Choose the society.
            <br />
            <span className="text-[#6E6E73]">Then choose the home.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-[600px] text-[14.5px] leading-6 text-[#6E6E73] sm:mt-5 sm:text-[17px] sm:leading-8 lg:text-[19px]">
            Verified society profiles, real homes and honest guidance — the calm way to decide where you'll live in Delhi NCR.
          </p>

          {/* City selector */}
          <div className="scrollbar-hide -mx-5 mt-5 flex snap-x gap-2 overflow-x-auto px-5 sm:mx-0 sm:mt-8 sm:flex-wrap sm:items-center sm:justify-center sm:overflow-visible sm:px-0">
            {cities.map((item) => {
              const active = item.slug === city.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => { setCity(item); setQuery(""); }}
                  className={`inline-flex shrink-0 snap-start items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                    active ? "bg-[#1D1D1F] text-white" : "bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#ECECEF]"
                  }`}
                >
                  {item.name}
                  {item.status !== "live" ? (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white/20 text-white" : statusPill(item.status)}`}>
                      {ncrCityStatusLabel(item.status)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Search */}
          {city.status === "live" ? (
            <form
              onSubmit={(e) => { e.preventDefault(); submit(); }}
              className="relative mx-auto mt-4 flex max-w-[640px] items-center gap-2 rounded-full border border-[#E4E4E9] bg-white p-1.5 shadow-[0_20px_50px_-28px_rgba(0,0,0,.28)] sm:mt-6 sm:p-2"
            >
              <span className="pl-3 text-[#86868B]"><Search className="h-5 w-5" /></span>
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                placeholder={`Search a ${city.name} society`}
                className="search-bare-input min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#86868B]"
                aria-label={`Search ${city.name}`}
              />
              <button type="submit" aria-label="Search" className="shrink-0 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90 sm:px-6 sm:py-3" style={{ background: ACCENT }}>
                Search
              </button>
              {showSuggestions && query.trim() && (moduleMatches.length > 0 || places.length > 0 || suggestions.length > 0) ? (
                <div className="absolute left-2 right-2 top-[calc(100%+8px)] z-30 max-h-80 overflow-y-auto rounded-2xl border border-[#E4E4E9] bg-white p-1.5 text-left shadow-[0_24px_50px_-28px_rgba(0,0,0,.3)]">
                  {/* Command launcher — jump straight to a module */}
                  {moduleMatches.length > 0 ? (
                    <div className="mb-1">
                      <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">Jump to</p>
                      {moduleMatches.map((m) => {
                        const Icon = m.icon;
                        return (
                          <button key={m.key} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => navigate(m.href)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[#F5F5F7]">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#ECF6F2", color: ACCENT }}><Icon className="h-4 w-4" /></span>
                            <span className="flex-1">
                              <span className="block text-sm font-semibold">{m.name}</span>
                              <span className="block text-xs text-[#86868B]">{m.desc}</span>
                            </span>
                            <CornerDownLeft className="h-3.5 w-3.5 text-[#C4C4CC]" />
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {places.length > 0 ? (
                    <ul className="mb-1">
                      {places.map((place) => (
                        <li key={`place-${place.name}-${place.city}`}>
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setShowSuggestions(false);
                              setQuery(place.name);
                              submit(place.name);
                            }}
                            className="flex w-full flex-col rounded-[11px] px-3 py-2.5 text-left hover:bg-[#F5F7FB]"
                          >
                            <span className="text-sm font-bold text-[#1D2939]">{place.name}{place.city ? `, ${place.city}` : ""}</span>
                            <span className="text-xs text-[#667085]">{place.count} {place.count === 1 ? "society" : "societies"}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {suggestions.length > 0 ? (
                    <div>
                      {moduleMatches.length > 0 ? <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">Societies</p> : null}
                      {suggestions.map((s) => (
                        <button key={s.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setShowSuggestions(false); setQuery(s.name); submit(s.name); }} className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left hover:bg-[#F5F5F7]">
                          <span className="text-sm font-semibold">{s.name}</span>
                          <span className="text-xs text-[#86868B]">{formatPublicLocation(s)}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </form>
          ) : (
            <div className="mx-auto mt-6 max-w-[560px] rounded-3xl border border-[#E4E4E9] bg-white p-6 shadow-sm">
              <p className="text-[13px] font-semibold" style={{ color: ACCENT }}>{ncrCityStatusLabel(city.status)} in {city.name}</p>
              <p className="mt-2 text-[15px] leading-7 text-[#6E6E73]">We verify a market before we open it — {city.name} societies are being checked to the same standard as Gurgaon. Get notified the moment it's live.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link to={`/ncr/${city.slug}`} className="rounded-full px-5 py-2.5 text-[14px] font-semibold text-white" style={{ background: ACCENT }}>Notify me about {city.name}</Link>
                <button onClick={() => setCity(liveCity)} className="rounded-full bg-[#F5F5F7] px-5 py-2.5 text-[14px] font-semibold text-[#1D1D1F] hover:bg-[#ECECEF]">Explore {liveCity.name}</button>
              </div>
            </div>
          )}

          <Link to="/brief" className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6E6E73] hover:text-[#1D1D1F]">
            <Sparkles className="h-4 w-4" style={{ color: ACCENT }} />
            Not sure where to start? Answer 8 questions and we'll shortlist for you
          </Link>

          {/* trust chips */}
          <div className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[13px] font-medium text-[#6E6E73]">
            {["No fake listings", "Real, checkable scores", "Verified society profiles", "No paid ranking"].map((t) => (
              <span key={t} className="inline-flex items-center gap-2"><Check className="h-4 w-4" style={{ color: ACCENT }} />{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- STATS ---------- */}
      <section className="border-y border-[#EEEEF1] bg-[#F5F5F7]">
        <div className="mx-auto grid max-w-[1120px] grid-cols-2 gap-6 px-5 py-12 sm:grid-cols-4">
          {[
            // No invented placeholder while the list loads: "240+" was both wrong and
            // visibly swapped to the real figure a moment later, which is a poor look on
            // the one number that carries the whole verification promise.
            [liveCount === null ? "—" : `${liveCount}`, `Verified societies in ${city.name}`],
            ["6", "NCR cities on the map"],
            ["0", "Fabricated listings"],
            ["1", "Simple, honest journey"],
          ].map(([v, l]) => (
            <div key={l as string} className="text-center">
              <p className="text-[34px] font-semibold tracking-tight">{v}</p>
              <p className="mt-1 text-[13px] text-[#6E6E73]">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CITY COVERAGE ---------- */}
      <section className="mx-auto max-w-[1120px] px-5 py-16 lg:py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="!font-sans text-[28px] font-semibold tracking-[-0.02em] lg:text-[36px]">One region, verified city by city</h2>
            <p className="mt-2 max-w-[520px] text-[15px] leading-7 text-[#6E6E73]">We start where we can verify. Gurgaon is live today; the rest of Delhi NCR is being checked to the same standard.</p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {cities.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => { setCity(item); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="group rounded-[24px] border border-[#E4E4E9] bg-white p-6 text-left transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-36px_rgba(0,0,0,.28)]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5F5F7]"><MapPin className="h-5 w-5 text-[#6E6E73]" /></span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusPill(item.status)}`}>{ncrCityStatusLabel(item.status)}</span>
              </div>
              <p className="mt-4 text-[19px] font-semibold">{item.name}</p>
              <p className="text-[13px] text-[#86868B]">{item.state}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: ACCENT }}>
                {item.status === "live" ? "Explore now" : "Get notified"} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* ---------- FEATURED SOCIETIES ---------- */}
      {featured.length > 0 ? (
      <section className="mx-auto max-w-[1120px] px-5 py-14 lg:py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="!font-sans text-[28px] font-semibold tracking-[-0.02em] lg:text-[36px]">Top verified societies in {city.name}</h2>
            <p className="mt-2 max-w-[520px] text-[15px] leading-7 text-[#6E6E73]">Start with a society you can trust — every profile is verified, with real scores and genuine homes.</p>
          </div>
          <Link to="/societies" className="inline-flex shrink-0 items-center gap-1 text-[14px] font-semibold" style={{ color: ACCENT }}>View all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="scrollbar-hide -mx-5 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {featured.slice(0, 8).map((s) => (
            <Link key={s.id} to={`/society/${s.slug}`} className="group w-[74vw] shrink-0 snap-start overflow-hidden rounded-[20px] border border-[#E4E4E9] bg-white transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-36px_rgba(0,0,0,.3)] sm:w-auto sm:shrink">
              <div className="relative h-32 overflow-hidden bg-[#F5F5F7]">
                <img src={societyDisplayImage(s)} alt={s.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
                {scoreOf(s) ? (
                  <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-[#1D1D1F] backdrop-blur">
                    <Star className="h-2.5 w-2.5" style={{ color: ACCENT }} />{scoreOf(s)}
                  </span>
                ) : null}
              </div>
              <div className="p-3.5">
                <div className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: ACCENT }}>
                  <Check className="h-3 w-3" /> Verified
                </div>
                <p className="mt-1 text-[14.5px] font-semibold leading-tight">{s.name}</p>
                <p className="mt-0.5 text-[12px] text-[#86868B]">{formatPublicLocation(s)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      ) : null}

      {/* ---------- EXPLORE BY AREA ---------- */}
      {currentArea ? (
        <section className="mx-auto max-w-[1120px] px-5 py-14 lg:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="!font-sans text-[28px] font-semibold tracking-[-0.02em] lg:text-[36px]">Explore homes by area</h2>
              <p className="mt-2 max-w-[520px] text-[15px] leading-7 text-[#6E6E73]">Pick a {city.name} micro-market and see the verified societies there — with real homes available now or on request.</p>
            </div>
            <Link to="/societies" className="inline-flex items-center gap-1 text-[14px] font-semibold" style={{ color: ACCENT }}>All areas <ArrowRight className="h-4 w-4" /></Link>
          </div>

          {/* Area tabs */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {areaGroups.map((g) => {
              const active = g.area === currentArea.area;
              return (
                <button
                  key={g.area}
                  type="button"
                  onClick={() => setAreaTab(g.area)}
                  className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition ${active ? "bg-[#1D1D1F] text-white" : "bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#ECECEF]"}`}
                >
                  {g.area}
                  <span className={`ml-1.5 text-[11px] ${active ? "text-white/60" : "text-[#98A2B3]"}`}>{g.societies.length}</span>
                </button>
              );
            })}
          </div>

          {/* Area society cards */}
          <div className="scrollbar-hide -mx-5 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
            {currentArea.societies.slice(0, 8).map((s) => {
              const homes = Number(s?.propertiesCount ?? s?.properties_count ?? 0);
              return (
                <Link key={s.id} to={`/society/${s.slug}`} className="group w-[74vw] shrink-0 snap-start overflow-hidden rounded-[20px] border border-[#E4E4E9] bg-white transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-36px_rgba(0,0,0,.3)] sm:w-auto sm:shrink">
                  <div className="relative h-32 overflow-hidden bg-[#F5F5F7]">
                    <img src={societyDisplayImage(s)} alt={s.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
                    {scoreOf(s) ? (
                      <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-[#1D1D1F] backdrop-blur">
                        <Star className="h-2.5 w-2.5" style={{ color: ACCENT }} />{scoreOf(s)}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-3.5">
                    <p className="text-[14.5px] font-semibold leading-tight">{s.name}</p>
                    <p className="mt-0.5 text-[12px] text-[#86868B]">{formatPublicLocation(s)}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: homes > 0 ? ACCENT : "#86868B" }}>
                      <Building2 className="h-3 w-3" />
                      {homes > 0 ? `${homes} home${homes === 1 ? "" : "s"}` : "On request"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between rounded-[20px] bg-[#F5F5F7] px-6 py-5">
            <p className="text-[14px] text-[#6E6E73]">Looking for a specific home in <span className="font-semibold text-[#1D1D1F]">{currentArea.area}</span>? We'll surface real availability.</p>
            <button onClick={() => submit(currentArea.area)} className="shrink-0 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white" style={{ background: ACCENT }}>Request availability</button>
          </div>
        </section>
      ) : null}

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="border-y border-[#EEEEF1] bg-[#F5F5F7]">
        <div className="mx-auto max-w-[1120px] px-5 py-16 lg:py-20">
          <h2 className="!font-sans text-center text-[28px] font-semibold tracking-[-0.02em] lg:text-[36px]">A calmer way to decide</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              [ShieldCheck, "Start with the society", "Compare verified profiles — real scores for safety, connectivity and lifestyle. Not brochures."],
              [Building2, "See the real homes", "Only genuine, currently-available homes in that society. Nothing fabricated, no stale prices."],
              [Sparkles, "Get honest guidance", "An AI advisor and a human desk help you shortlist, compare and arrange a visit — no pressure."],
            ].map(([Icon, title, body], i) => (
              <div key={title as string} className="rounded-[24px] bg-white p-7 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ background: ACCENT }}><Icon className="h-5 w-5" /></span>
                  <span className="text-[13px] font-bold text-[#86868B]">0{i + 1}</span>
                </div>
                <p className="mt-5 text-[19px] font-semibold">{title as string}</p>
                <p className="mt-2 text-[14px] leading-7 text-[#6E6E73]">{body as string}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- TOOLKIT (module presentation) ---------- */}
      <section className="mx-auto max-w-[1120px] px-5 py-16 lg:py-20">
        <div className="max-w-[560px]">
          <h2 className="!font-sans text-[28px] font-semibold tracking-[-0.02em] lg:text-[36px]">Everything you need to decide</h2>
          <p className="mt-2 text-[15px] leading-7 text-[#6E6E73]">Not just listings — a full toolkit that does the hard thinking with you. Search any of these from the box above, too.</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.key} to={m.href} className="group flex flex-col rounded-[24px] border border-[#E4E4E9] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-36px_rgba(0,0,0,.28)]">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "#ECF6F2", color: ACCENT }}><Icon className="h-5 w-5" /></span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#B7B7BE]">{MODULE_INTENTS[m.intent as ModuleIntent].split(" ")[0]}</span>
                </div>
                <p className="mt-4 text-[18px] font-semibold">{m.name}</p>
                <p className="mt-1.5 flex-1 text-[14px] leading-6 text-[#6E6E73]">{m.desc}</p>
                <p className="mt-3 rounded-xl bg-[#F5F5F7] px-3 py-2 text-[12px] text-[#86868B]">{m.example}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold transition group-hover:gap-1.5" style={{ color: ACCENT }}>Open <ArrowRight className="h-3.5 w-3.5" /></span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-[1120px] px-5 pb-20">
        <div className="overflow-hidden rounded-[32px] bg-[#1D1D1F] px-8 py-14 text-center text-white lg:px-16 lg:py-20">
          <h2 className="!font-sans mx-auto max-w-[640px] text-[30px] font-semibold leading-tight tracking-[-0.02em] lg:text-[42px]">Find your home the calm, verified way.</h2>
          <p className="mx-auto mt-4 max-w-[500px] text-[16px] leading-8 text-white/70">Start with a society you can trust — then choose the home. We'll help across every step.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={() => submit()} className="rounded-full px-7 py-3.5 text-[15px] font-semibold text-white" style={{ background: ACCENT }}>Explore Gurgaon societies</button>
            <Link to="/brief" className="rounded-full bg-white/10 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/20">Build my shortlist</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
