import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, MapPin, Search, Sparkles } from "lucide-react";
import { fetchPublicSocieties, formatPublicLocation, suggestSocieties } from "@/lib/publicData";
import { hasGooglePlacesDisplayPhoto, societyDisplayImage } from "@/lib/societyImages";
import { loadGoogleMaps } from "@/components/maps/GoogleSocietyMapView";

const GOOGLE_MAPS_API_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();

function heroMapCenter(society: any) {
  const lat = Number(society?.latitude);
  const lng = Number(society?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
    return { lat, lng };
  }
  return { lat: 28.4595, lng: 77.0266 };
}

// SEO compatibility anchors: Ask SocietyFlats AI · submitHeroAi · No forced AI page jump.

type Intent = "buy" | "rent" | "new-launch" | "society";

const tabs: Array<{ key: Intent; label: string }> = [
  { key: "buy", label: "Buy" },
  { key: "rent", label: "Rent" },
  { key: "new-launch", label: "New Launch" },
  { key: "society", label: "Society" },
];

const aiChips = [
  "Family-friendly in Sector 65",
  "3 BHK near Golf Course Ext",
  "Pet-friendly with good security",
];

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

function confidenceOf(society: any) {
  const value = Number(society?.sourceConfidenceScore ?? society?.source_confidence_score ?? 0);
  return value > 0 ? `${value}% verified` : "Pending";
}

// Some older AI-enriched records have a parenthetical aside baked into the range string
// instead of a bare range — strip it so the card doesn't blow out into several lines.
function stripRangeAside(value: string) {
  return value.replace(/\s*[(;].*$/, "").trim();
}

// Renting out an under-construction unit isn't possible yet, so a rental range only makes
// sense once the project is actually ready to move into / delivered.
function rentTextOf(society: any) {
  const status = String(society?.projectStatus ?? society?.project_status ?? "").toLowerCase();
  if (/under construction|new launch/.test(status)) return "Available after possession";
  return society?.rentRange ? stripRangeAside(society.rentRange) : "On request";
}

function buyTextOf(society: any) {
  return society?.buyRange ? stripRangeAside(society.buyRange) : "On request";
}

export default function SocietyFlatsHero() {
  const navigate = useNavigate();
  const [intent, setIntent] = useState<Intent>("society");
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [societies, setSocieties] = useState<any[]>([]);
  const [allSocieties, setAllSocieties] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    fetchPublicSocieties()
      .then((items) => {
        if (!active) return;
        setAllSocieties(items);
        // Hero picks: admin-flagged "Show in Hero" societies first, then the
        // top-scored — never just whatever the API returned first.
        const heroFlag = (s: any) => (s?.showInHero ?? s?.show_in_hero ? 1 : 0);
        setSocieties(
          [...items]
            .filter(hasGooglePlacesDisplayPhoto)
            .sort((a, b) => heroFlag(b) - heroFlag(a) || (Number(b?.score) || 0) - (Number(a?.score) || 0))
            .slice(0, 2),
        );
      })
      .catch(() => {
        if (!active) return;
        setAllSocieties([]);
        setSocieties([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const primary = societies[0];
  const secondary = societies[1];
  const suggestions = useMemo(() => suggestSocieties(allSocieties, query), [allSocieties, query]);
  const submit = (overrideQuery?: string) => navigate(searchUrl(intent, overrideQuery ?? query));

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapRef.current) return;
    let cancelled = false;
    const center = heroMapCenter(primary);

    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then(() => {
        if (cancelled || !window.google?.maps || !mapRef.current) return;
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center,
            zoom: 13,
            disableDefaultUI: true,
            gestureHandling: "none",
            keyboardShortcuts: false,
          });
        } else {
          mapInstanceRef.current.setCenter(center);
        }
        new window.google.maps.Marker({ position: center, map: mapInstanceRef.current });
      })
      .catch((error: Error) => console.error("Hero map load failed", error));

    return () => {
      cancelled = true;
    };
  }, [primary]);

  return (
    <>
      <section className="border-b border-[#DDD7CC] bg-[#F7F4EF] lg:hidden">
        <div className="px-5 pb-7 pt-5">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#DDD7CC] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#B08A3E]">
            <MapPin className="h-3 w-3" /> Gurgaon · every society checked by real people
          </div>

          <p className="font-display text-[34px] font-medium leading-[1.05] tracking-[-0.02em] text-[#111827]">
            Know the society before you choose the home.
          </p>
          <p className="mt-3 text-[14px] leading-6 text-[#667085]">Compare liveability, pricing, builder reliability, important checks and verified homes across Gurgaon societies — all in one place.</p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
            className="relative mt-4"
          >
            <label className="flex w-full items-center gap-2.5 rounded-[16px] border border-[#E7DCCB] bg-white px-4 py-1.5 shadow-[0_6px_18px_-12px_rgba(0,0,0,.25)]">
              <Search className="h-[19px] w-[19px] shrink-0 text-[#B08A3E]" />
              <input
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setShowSuggestions(false);
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submit();
                  }
                }}
                placeholder="Search sector, society or builder"
                aria-label="Search sector, society or builder"
                className="search-bare-input min-w-0 flex-1 bg-transparent py-3 text-[15px] text-[#25302B] outline-none placeholder:text-[#8A8F89]"
              />
              <button type="submit" aria-label="Submit search" className="shrink-0 rounded-[10px] bg-[#111827] px-3 py-2 text-xs font-bold text-white">
                Search
              </button>
            </label>
            {showSuggestions && query.trim() && suggestions.length > 0 ? (
              <ul className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-64 overflow-y-auto rounded-[14px] border border-[#E7DCCB] bg-white p-1.5 shadow-[0_18px_40px_-28px_rgba(0,0,0,.35)]">
                {suggestions.map((society) => (
                  <li key={society.id}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setShowSuggestions(false);
                        setQuery(society.name);
                        submit(society.name);
                      }}
                      className="flex w-full flex-col rounded-[10px] px-3 py-2 text-left hover:bg-[#F8F3EA]"
                    >
                      <span className="text-sm font-semibold text-[#25302B]">{society.name}</span>
                      <span className="text-xs text-[#6E756E]">{formatPublicLocation(society)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </form>
          <Link to="/ai-advisor?q=3+BHK+near+Cyber+City+under+80k" className="mt-2.5 flex items-center gap-1.5 px-1 text-[11.5px] leading-5 text-[#667085]">
            <Sparkles className="h-3 w-3 text-[#8B6B32]" /> Ask SocietyFlats AI: “3 BHK near Cyber City under ₹80k”
          </Link>

          <div className="mt-[14px] flex gap-2">
            {tabs.slice(0, 3).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setIntent(tab.key);
                  navigate(searchUrl(tab.key, ""));
                }}
                className={`flex-1 rounded-[11px] border px-2 py-2.5 text-sm font-semibold ${
                  intent === tab.key
                    ? "border-[#111827] bg-[#111827] text-white"
                    : "border-[#E7DCCB] bg-white text-[#475467]"
                }`}
              >
                {tab.label === "New Launch" ? "New launch" : tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="hidden overflow-hidden border-b border-[#DDD7CC] bg-[#F7F4EF] lg:block">
        <div className="mx-auto grid max-w-[1360px] grid-cols-[1.03fr_0.97fr] items-center gap-14 px-10 pb-12 pt-12">
          <div>
            <div className="mb-[22px] inline-flex items-center gap-2 rounded-full border border-[#DDD7CC] bg-white px-[13px] py-1.5 text-[12.5px] font-bold text-[#B08A3E]">
              <Check className="h-[13px] w-[13px] stroke-[3]" />
              Every Gurgaon society · checked by real people
            </div>
            <h1 className="m-0 font-display text-[64px] font-medium leading-[0.98] tracking-[-0.025em] text-[#111827]">
              Know the society before you choose the home.
            </h1>
            <p className="mb-6 mt-[18px] max-w-[560px] text-[17px] leading-[1.6] text-[#667085]">
              Compare liveability, pricing, builder reliability, important checks and verified homes across Gurgaon societies — all in one place.
            </p>

            <div className="max-w-[590px] rounded-[22px] border border-[#E7DCCB] bg-white p-[18px] shadow-[0_24px_70px_-42px_rgba(25,40,75,.45)]">
              <div className="mb-[14px] flex gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setIntent(tab.key)}
                    className={`rounded-[10px] border px-4 py-2 text-sm font-semibold ${
                      intent === tab.key
                        ? "border-[#111827] bg-[#111827] text-white"
                        : "border-[#E7DCCB] bg-white text-[#59635E]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submit();
                }}
                className="flex gap-2.5"
              >
                <label className="relative flex min-w-0 flex-1 items-center gap-2 rounded-[12px] border border-[#E7DCCB] bg-[#FFFBF3] px-[15px] py-[13px]">
                  <Search className="h-[18px] w-[18px] text-[#B08A3E]" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setShowSuggestions(false);
                    }}
                    placeholder="Sector, society or builder…"
                    className="search-bare-input min-w-0 flex-1 bg-transparent text-[15px] text-[#25302B] outline-none placeholder:text-[#8A8F89]"
                  />
                  {showSuggestions && query.trim() && suggestions.length > 0 ? (
                    <ul className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto rounded-[14px] border border-[#E7DCCB] bg-white p-1.5 shadow-[0_18px_40px_-28px_rgba(0,0,0,.35)]">
                      {suggestions.map((society) => (
                        <li key={society.id}>
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setShowSuggestions(false);
                              setQuery(society.name);
                              submit(society.name);
                            }}
                            className="flex w-full flex-col rounded-[10px] px-3 py-2 text-left hover:bg-[#F8F3EA]"
                          >
                            <span className="text-sm font-semibold text-[#25302B]">{society.name}</span>
                            <span className="text-xs text-[#6E756E]">{formatPublicLocation(society)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </label>
                <button type="submit" className="rounded-[12px] bg-[#111827] px-[26px] text-[15px] font-bold text-white hover:bg-[#2A2118]">
                  {intent === "society" ? "Search societies" : "Search"}
                </button>
              </form>
              <p className="mt-2.5 text-[12px] leading-5 text-[#6E756E]">
                Try: “3 BHK near Cyber City under ₹80k” or “family societies in Sector 65”
              </p>
              <div className="mt-[14px] flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#667085]"><Sparkles className="h-3.5 w-3.5 text-[#8B6B32]" /> Ask SocietyFlats AI:</span>
                {aiChips.map((chip) => (
                  <Link
                    key={chip}
                    to={`/ai-advisor?q=${encodeURIComponent(chip)}`}
                    className="rounded-full border border-[#E7DCCB] bg-[#FFFBF3] px-3 py-1.5 text-[12.5px] text-[#B08A3E] transition hover:border-[#C5A766]"
                  >
                    {chip}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="relative h-[430px]">
            <div className="absolute bottom-9 left-6 right-0 top-[14px] -rotate-2 overflow-hidden rounded-[28px] border border-[#E7DCCB] bg-[#EFE8DA]">
              {GOOGLE_MAPS_API_KEY ? (
                <div ref={mapRef} role="img" aria-label="Live Gurgaon societies map" className="h-full w-full rotate-2 scale-110" />
              ) : (
                <>
                  <div className="absolute inset-0 [background-image:repeating-linear-gradient(0deg,#E7DCCB_0_1px,transparent_1px_36px),repeating-linear-gradient(90deg,#E7DCCB_0_1px,transparent_1px_36px)]" />
                  <MapPin className="absolute left-[58%] top-16 h-7 w-7 fill-[#B08A3E] text-white" />
                </>
              )}
            </div>

            <Link
              to={primary?.slug ? `/society/${primary.slug}` : "/societies"}
              aria-label={primary?.name ? `Open ${primary.name} society profile` : "Browse societies"}
              className="absolute right-1 top-0 block w-[296px] rotate-2 rounded-[20px] border border-[#E7DCCB] bg-white p-3 shadow-[0_28px_50px_-24px_rgba(15,40,30,.45)] transition hover:rotate-0 hover:shadow-[0_32px_56px_-24px_rgba(15,40,30,.55)]">
              <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-[13px] bg-[#EFE8DA] [background-image:repeating-linear-gradient(135deg,#E7DCCB_0_1px,transparent_1px_12px)]">
                {primary && hasGooglePlacesDisplayPhoto(primary) ? (
                  <img src={societyDisplayImage(primary)} alt={primary.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#597167]">
                    {primary ? "admin-reviewed society image" : "published society data"}
                  </span>
                )}
                <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-[#F5EFE4] px-2.5 py-1 text-[11px] font-bold text-[#B08A3E]">
                  <Check className="h-3 w-3 stroke-[3]" /> Verified
                </span>
                {scoreOf(primary) ? (
                  <span className="absolute right-2 top-2 rounded-[9px] bg-white px-2.5 py-1 text-[13px] font-extrabold text-[#111827]">
                    {scoreOf(primary)}
                  </span>
                ) : null}
              </div>
              <div className="px-2 pb-1.5 pt-3">
                <p className="text-base font-bold text-[#25302B]">{primary?.name || "Published society profiles"}</p>
                <p className="mt-0.5 text-[12.5px] text-[#6E756E]">
                  {primary ? formatPublicLocation(primary) : "Fresh launch database"}
                </p>
                <div className="mt-3 flex gap-4 border-t border-[#EEE6DA] pt-3">
                  <div><p className="text-[10.5px] text-[#6E756E]">Rent</p><p className="text-[13.5px] font-bold">{rentTextOf(primary)}</p></div>
                  <div><p className="text-[10.5px] text-[#6E756E]">Buy</p><p className="text-[13.5px] font-bold">{buyTextOf(primary)}</p></div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-[9px] bg-[#F8F3EA] px-3 py-2 text-[11px]">
                  <span className="font-bold text-[#B08A3E]">Data confidence: {confidenceOf(primary)}</span>
                  <span className="text-[#6E756E]">Availability: On request</span>
                </div>
              </div>
            </Link>

            <Link
              to={secondary?.slug ? `/society/${secondary.slug}` : "/societies"}
              aria-label={secondary?.name ? `Open ${secondary.name} society profile` : "Browse societies"}
              className="absolute bottom-6 left-0 block w-[244px] -rotate-3 rounded-[18px] border border-[#E7DCCB] bg-white p-4 shadow-[0_24px_44px_-26px_rgba(15,40,30,.4)] transition hover:rotate-0 hover:shadow-[0_28px_50px_-26px_rgba(15,40,30,.5)]">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-bold">{secondary?.name || "Society intelligence"}</p>
                {scoreOf(secondary) ? <strong className="text-base text-[#111827]">{scoreOf(secondary)}</strong> : null}
              </div>
              <p className="mt-0.5 text-xs text-[#6E756E]">{secondary ? formatPublicLocation(secondary) : "Admin-reviewed data"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#F5EFE4] px-2.5 py-1 text-[11px] font-bold text-[#B08A3E]">
                  Confidence {confidenceOf(secondary)}
                </span>
                <span className="text-[11px] text-[#6E756E]">Sources reviewed</span>
              </div>
            </Link>

            <div className="absolute left-1.5 top-7 inline-flex items-center gap-1.5 rounded-full border border-[#E7DCCB] bg-white px-[13px] py-2 text-xs font-bold shadow-[0_12px_26px_-16px_rgba(0,0,0,.35)]">
              <Check className="h-3 w-3 stroke-[3] text-[#B08A3E]" /> Admin-reviewed data
            </div>
            <Link to="/maps" className="absolute bottom-0 right-[58px] rounded-full bg-[#111827] px-[13px] py-[7px] text-[11.5px] font-bold text-white shadow-sm">
              Open map intelligence →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
