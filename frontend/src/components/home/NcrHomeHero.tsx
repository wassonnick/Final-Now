import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, MapPin, Search, Sparkles } from "lucide-react";
import { fetchPublicSocieties, formatPublicLocation, suggestPlaces, suggestSocieties } from "@/lib/publicData";
import { hasGooglePlacesDisplayPhoto, societyDisplayImage } from "@/lib/societyImages";
import { LIVE_NCR_CITY, NCR_CITIES, NCR_REGION, ncrCityStatusLabel, type NcrCity } from "@/lib/ncrCities";

type Intent = "society" | "buy" | "rent" | "new-launch";

const tabs: Array<{ key: Intent; label: string }> = [
  { key: "society", label: "Societies" },
  { key: "buy", label: "Buy" },
  { key: "rent", label: "Rent" },
  { key: "new-launch", label: "New launches" },
];

const serviceIndex = [
  { label: "Ask the AI advisor", detail: "Build a grounded shortlist", href: "/ai-advisor", mark: "01" },
  { label: "Explore on the map", detail: "Sectors, zones and context", href: "/maps", mark: "02" },
  { label: "Compare societies", detail: "Fit and scores side by side", href: "/compare", mark: "03" },
  { label: "NRI ownership desk", detail: "Rent-out, resale, management", href: "/nri-services", mark: "04" },
] as const;

function searchUrl(intent: Intent, query: string) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  params.set("tab", intent === "rent" ? "rent" : intent === "buy" ? "buy" : "societies");
  if (intent === "new-launch" && !query.trim()) params.set("q", "Under Construction");
  return `/search?${params.toString()}`;
}

function scoreOf(society: any) {
  const value = Number(society?.score ?? society?.overallScore);
  if (!Number.isFinite(value) || value <= 0) return null;
  return (value > 10 ? value / 10 : value).toFixed(1);
}

function statusDot(status: NcrCity["status"]) {
  if (status === "live") return "bg-emerald-500";
  if (status === "launching") return "bg-amber-400";
  return "bg-slate-300";
}

export default function NcrHomeHero() {
  const navigate = useNavigate();
  const [city, setCity] = useState<NcrCity>(LIVE_NCR_CITY);
  const [intent, setIntent] = useState<Intent>("society");
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allSocieties, setAllSocieties] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    fetchPublicSocieties()
      .then((items) => active && setAllSocieties(items))
      .catch(() => active && setAllSocieties([]));
    return () => { active = false; };
  }, []);

  const cityLive = city.status === "live";

  const primary = useMemo(() => {
    if (!cityLive) return null;
    const heroFlag = (s: any) => (s?.showInHero ?? s?.show_in_hero ? 1 : 0);
    return [...allSocieties]
      .filter(hasGooglePlacesDisplayPhoto)
      .sort((a, b) => heroFlag(b) - heroFlag(a) || (Number(b?.score) || 0) - (Number(a?.score) || 0))[0];
  }, [allSocieties, cityLive]);

  const suggestions = useMemo(() => (cityLive ? suggestSocieties(allSocieties, query) : []), [allSocieties, query, cityLive]);
  const places = useMemo(() => cityLive ? suggestPlaces(allSocieties, query) : [], [allSocieties, query, cityLive]);
  const submit = (overrideQuery?: string) => navigate(searchUrl(intent, overrideQuery ?? query));

  return (
    <section className="overflow-hidden border-b border-[#DDE2EC] bg-[linear-gradient(135deg,#F8F6F1_0%,#F4F6FC_52%,#EAF0FB_100%)]">
      <div className="mx-auto max-w-[1440px] px-5 pb-8 pt-6 lg:px-10 lg:pb-12 lg:pt-10">
        {/* NCR market ribbon — the multi-city frame the whole language is built around */}
        <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-3 lg:mb-8">
          <span className="inline-flex items-center gap-2 border-b border-[#B59657] pb-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#233B6E] lg:text-[11px]">
            <MapPin className="h-3.5 w-3.5" />
            {NCR_REGION} · verified society intelligence
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {NCR_CITIES.map((item) => {
              const active = item.slug === city.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => { setCity(item); setQuery(""); }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold transition ${
                    active
                      ? "border-[#233B6E] bg-[#233B6E] text-white"
                      : "border-[#D8DFEC] bg-white/70 text-[#475467] hover:border-[#B9C4DA] hover:bg-white"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#E8D6A9]" : statusDot(item.status)}`} />
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.06fr_.94fr] lg:items-stretch lg:gap-12">
          <div className="flex flex-col justify-center">
            <h1 className="max-w-[820px] font-display text-[44px] font-medium leading-[.94] tracking-[-0.045em] text-[#101828] sm:text-[56px] lg:text-[74px]">
              Choose the society.
              <span className="block italic text-[#3156A3]">Then choose the home.</span>
            </h1>
            <p className="mt-5 max-w-[680px] text-[15px] leading-7 text-[#5F6B7C] lg:text-[18px] lg:leading-8">
              Verified society profiles, current homes and human-backed property services — now expanding across {NCR_REGION}, one carefully verified market at a time.
            </p>

            {cityLive ? (
              <div className="mt-7 rounded-[22px] border border-[#D8DFEC] bg-white p-3 shadow-[0_28px_70px_-52px_rgba(35,59,110,.65)] lg:p-4">
                <div className="mb-3 flex gap-1 overflow-x-auto scrollbar-hide">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setIntent(tab.key)}
                      className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-extrabold transition lg:text-[13px] ${
                        intent === tab.key ? "bg-[#233B6E] text-white" : "text-[#667085] hover:bg-[#F2F5FA]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-2 sm:flex-row">
                  <label className="relative flex min-w-0 flex-1 items-center gap-3 rounded-[14px] border border-[#D8DFEC] bg-[#FBFAF7] px-4 py-3.5">
                    <Search className="h-[19px] w-[19px] shrink-0 text-[#3156A3]" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                      placeholder={`Search ${city.name} society, sector or builder`}
                      aria-label={`Search ${city.name}`}
                      className="search-bare-input min-w-0 flex-1 bg-transparent text-[14px] text-[#1D2939] outline-none placeholder:text-[#98A2B3] lg:text-[15px]"
                    />
                    {showSuggestions && query.trim() && (places.length > 0 || suggestions.length > 0) ? (
                      <ul className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto rounded-[16px] border border-[#D8DFEC] bg-white p-1.5 shadow-[0_24px_50px_-28px_rgba(16,24,40,.42)]">
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
                        {suggestions.map((society) => (
                          <li key={society.id}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setShowSuggestions(false); setQuery(society.name); submit(society.name); }}
                              className="flex w-full flex-col rounded-[11px] px-3 py-2.5 text-left hover:bg-[#F5F7FB]"
                            >
                              <span className="text-sm font-bold text-[#1D2939]">{society.name}</span>
                              <span className="text-xs text-[#667085]">{formatPublicLocation(society)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </label>
                  <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#233B6E] px-6 py-3.5 text-[14px] font-black text-white transition hover:bg-[#182F60]">
                    Search {city.name}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
                <Link to="/ai-advisor?q=Family-friendly+societies+near+Golf+Course+Extension" className="mt-3 inline-flex items-center gap-1.5 px-1 text-[11.5px] font-semibold text-[#3156A3] lg:text-[12.5px]">
                  <Sparkles className="h-3.5 w-3.5 text-[#B58B3B]" />
                  Ask SocietyFlats AI for a family-friendly shortlist near Golf Course Extension
                </Link>
              </div>
            ) : (
              <div className="mt-7 rounded-[22px] border border-[#D8DFEC] bg-white p-6 shadow-[0_28px_70px_-52px_rgba(35,59,110,.65)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#B58B3B]">{ncrCityStatusLabel(city.status)} in {city.name}</p>
                <h3 className="mt-2 font-display text-2xl font-medium text-[#101828]">We verify before we launch a market.</h3>
                <p className="mt-2 max-w-[520px] text-[15px] leading-7 text-[#5F6B7C]">
                  {city.name} societies are being verified now — real location data, reviewed images and honest scores, the same standard as Gurgaon. Tell us what you're looking for and we'll reach out the moment {city.name} goes live.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/ncr/${city.slug}`} className="inline-flex items-center gap-2 rounded-[14px] bg-[#233B6E] px-5 py-3 text-[14px] font-black text-white transition hover:bg-[#182F60]">
                    Notify me about {city.name}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button type="button" onClick={() => setCity(LIVE_NCR_CITY)} className="inline-flex items-center gap-2 rounded-[14px] border border-[#D8DFEC] px-5 py-3 text-[14px] font-bold text-[#233B6E] transition hover:bg-[#F5F7FB]">
                    Explore Gurgaon (live)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Featured / market card */}
          {cityLive ? (
            <Link
              to={primary?.slug ? `/society/${primary.slug}` : "/search?tab=societies"}
              className="group relative min-h-[360px] overflow-hidden rounded-[26px] border border-white/70 bg-[#142344] shadow-[0_35px_90px_-58px_rgba(35,59,110,.7)] lg:min-h-[540px]"
            >
              <div className="absolute inset-x-0 top-0 h-[58%] overflow-hidden bg-[#E9EEF7] lg:h-[62%]">
                {primary ? (
                  <img src={societyDisplayImage(primary)} alt={primary.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" />
                ) : (
                  <div className="h-full w-full bg-[linear-gradient(135deg,#E7ECF6,#F8FAFD)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#142344]/20 to-transparent" />
              </div>
              <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-[11px] font-black text-[#233B6E] backdrop-blur lg:left-6 lg:top-6 lg:text-xs">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
                Published society profile
              </div>
              {scoreOf(primary) ? (
                <div className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-2 text-[13px] font-black text-[#233B6E] backdrop-blur lg:right-6 lg:top-6 lg:text-sm">{scoreOf(primary)}</div>
              ) : null}
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white lg:p-7">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E8D6A9]">Featured in {city.name}</p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="font-display text-[30px] font-medium leading-none text-white lg:text-[42px]">{primary?.name || "Verified society profiles"}</h2>
                    <p className="mt-2 text-sm text-white/75">{primary ? formatPublicLocation(primary) : "Reviewed data for calmer shortlists"}</p>
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Scores · amenities · location context</p>
                  </div>
                  <ArrowRight className="h-6 w-6 shrink-0 transition group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ) : (
            <div className="relative flex min-h-[360px] flex-col justify-between overflow-hidden rounded-[26px] border border-[#D8DFEC] bg-[linear-gradient(160deg,#233B6E,#142344)] p-7 text-white shadow-[0_35px_90px_-58px_rgba(35,59,110,.7)] lg:min-h-[540px]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#E8D6A9]">{NCR_REGION} market map</p>
                <h2 className="mt-3 font-display text-[34px] font-medium leading-tight lg:text-[44px]">One region.<br />Verified city by city.</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {NCR_CITIES.map((item) => (
                  <button key={item.slug} type="button" onClick={() => setCity(item)} className={`rounded-2xl border p-3 text-left transition ${item.slug === city.slug ? "border-[#E8D6A9] bg-white/10" : "border-white/15 hover:bg-white/5"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${statusDot(item.status)}`} />
                      <span className="font-bold">{item.name}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/60">{item.blurb}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coverage / service index */}
        <nav aria-label="SocietyFlats services" className="mt-8 border-y border-[#CED7E6] lg:mt-12">
          <div className="grid divide-y divide-[#CED7E6] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {serviceIndex.map((item) => (
              <Link key={item.href} to={item.href} className="group flex items-start gap-3 px-1 py-4 sm:px-4 lg:py-5">
                <span className="mt-0.5 font-display text-[12px] italic text-[#B58B3B]">{item.mark}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-black text-[#1D2939] group-hover:text-[#3156A3] lg:text-[14px]">{item.label}</span>
                  <span className="mt-1 block text-[11.5px] leading-5 text-[#667085]">{item.detail}</span>
                </span>
                <ArrowRight className="ml-auto mt-1 h-3.5 w-3.5 shrink-0 text-[#98A2B3] transition group-hover:translate-x-1 group-hover:text-[#3156A3]" />
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </section>
  );
}
