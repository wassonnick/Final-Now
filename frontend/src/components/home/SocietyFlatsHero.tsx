import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, MapPin, Search, Sparkles } from "lucide-react";
import { fetchPublicSocieties, formatPublicLocation, suggestSocieties } from "@/lib/publicData";
import { hasGooglePlacesDisplayPhoto, societyDisplayImage, societyImageAttribution } from "@/lib/societyImages";

// SEO compatibility anchors: submitHeroAi · No forced AI page jump.

type Intent = "buy" | "rent" | "new-launch" | "society";

const tabs: Array<{ key: Intent; label: string }> = [
  { key: "society", label: "Societies" },
  { key: "buy", label: "Buy" },
  { key: "rent", label: "Rent" },
  { key: "new-launch", label: "New launches" },
];

const serviceIndex = [
  { label: "Ask the AI advisor", detail: "Build a grounded shortlist", href: "/ai-advisor", mark: "01" },
  { label: "Explore Gurgaon maps", detail: "See sectors and nearby context", href: "/maps", mark: "02" },
  { label: "Compare societies", detail: "Review fit and scores side by side", href: "/compare", mark: "03" },
  { label: "NRI ownership desk", detail: "Rent-out, resale and local management", href: "/nri-services", mark: "04" },
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

export default function SocietyFlatsHero() {
  const navigate = useNavigate();
  const [intent, setIntent] = useState<Intent>("society");
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allSocieties, setAllSocieties] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    fetchPublicSocieties()
      .then((items) => {
        if (active) setAllSocieties(items);
      })
      .catch(() => {
        if (active) setAllSocieties([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const primary = useMemo(() => {
    const heroFlag = (society: any) => (society?.showInHero ?? society?.show_in_hero ? 1 : 0);
    return [...allSocieties]
      .filter(hasGooglePlacesDisplayPhoto)
      .sort((a, b) => heroFlag(b) - heroFlag(a) || (Number(b?.score) || 0) - (Number(a?.score) || 0))[0];
  }, [allSocieties]);

  const suggestions = useMemo(() => suggestSocieties(allSocieties, query), [allSocieties, query]);
  const submit = (overrideQuery?: string) => navigate(searchUrl(intent, overrideQuery ?? query));

  return (
    <section className="overflow-hidden border-b border-[#DDE2EC] bg-[linear-gradient(135deg,#F8F6F1_0%,#F5F7FC_55%,#EEF3FC_100%)]">
      <div className="mx-auto max-w-[1440px] px-5 pb-7 pt-7 lg:px-10 lg:pb-10 lg:pt-12">
        <div className="grid gap-7 lg:grid-cols-[1.08fr_.92fr] lg:items-stretch lg:gap-12">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 border-b border-[#B59657] pb-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#233B6E] lg:text-[11px]">
              <MapPin className="h-3.5 w-3.5" />
              Gurgaon society intelligence
            </div>

            <h1 className="mt-5 max-w-[800px] font-display text-[46px] font-medium leading-[.94] tracking-[-0.045em] text-[#101828] sm:text-[58px] lg:text-[76px]">
              Find the society.
              <span className="block italic text-[#3156A3]">Then choose the home.</span>
            </h1>
            <p className="mt-5 max-w-[710px] text-[15px] leading-7 text-[#5F6B7C] lg:text-[18px] lg:leading-8">
              Verified society profiles, current homes and human-backed property services for Gurgaon—brought together around the decision you are actually making.
            </p>

            <div className="mt-6 rounded-[22px] border border-[#D8DFEC] bg-white p-3 shadow-[0_28px_70px_-52px_rgba(35,59,110,.65)] lg:mt-8 lg:p-4">
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

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submit();
                }}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <label className="relative flex min-w-0 flex-1 items-center gap-3 rounded-[14px] border border-[#D8DFEC] bg-[#FBFAF7] px-4 py-3.5">
                  <Search className="h-[19px] w-[19px] shrink-0 text-[#3156A3]" />
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
                    }}
                    placeholder="Search society, sector or builder"
                    aria-label="Search society, sector or builder"
                    className="search-bare-input min-w-0 flex-1 bg-transparent text-[14px] text-[#1D2939] outline-none placeholder:text-[#98A2B3] lg:text-[15px]"
                  />
                  {showSuggestions && query.trim() && suggestions.length > 0 ? (
                    <ul className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto rounded-[16px] border border-[#D8DFEC] bg-white p-1.5 shadow-[0_24px_50px_-28px_rgba(16,24,40,.42)]">
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
                  Search Gurgaon
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <Link
                to="/ai-advisor?q=Family-friendly+societies+near+Golf+Course+Extension"
                className="mt-3 inline-flex items-center gap-1.5 px-1 text-[11.5px] font-semibold text-[#3156A3] lg:text-[12.5px]"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#B58B3B]" />
                Ask SocietyFlats AI for a family-friendly shortlist near Golf Course Extension
              </Link>
            </div>
          </div>

          <Link
            to={primary?.slug ? `/society/${primary.slug}` : "/search?tab=societies"}
            className="group relative min-h-[360px] overflow-hidden rounded-[26px] border border-white/70 bg-[#142344] shadow-[0_35px_90px_-58px_rgba(35,59,110,.7)] lg:min-h-[560px]"
          >
            <div className="absolute inset-x-0 top-0 h-[58%] overflow-hidden bg-[#E9EEF7] lg:h-[62%]">
              {primary ? (
                <img
                  src={societyDisplayImage(primary)}
                  alt={primary.name}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
                />
              ) : (
                <div className="h-full w-full bg-[linear-gradient(135deg,#E7ECF6,#F8FAFD)] [background-image:linear-gradient(135deg,rgba(49,86,163,.08)_0_1px,transparent_1px_16px)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#142344]/20 to-transparent" />
            </div>
            <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-[11px] font-black text-[#233B6E] backdrop-blur lg:left-6 lg:top-6 lg:text-xs">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              Published society profile
            </div>
            {scoreOf(primary) ? (
              <div className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-2 text-[13px] font-black text-[#233B6E] backdrop-blur lg:right-6 lg:top-6 lg:text-sm">
                {scoreOf(primary)}
              </div>
            ) : null}
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white lg:p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E8D6A9]">Featured in Gurgaon</p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-[30px] font-medium leading-none text-white lg:text-[42px]">
                    {primary?.name || "Verified society profiles"}
                  </h2>
                  <p className="mt-2 text-sm text-white/75">
                    {primary ? formatPublicLocation(primary) : "Reviewed data for calmer shortlists"}
                  </p>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                    Scores · amenities · location context
                  </p>
                </div>
                <ArrowRight className="h-6 w-6 shrink-0 transition group-hover:translate-x-1" />
              </div>
              {primary ? (
                <p className="mt-3 text-[10px] text-white/55">{societyImageAttribution(primary).label}</p>
              ) : null}
            </div>
          </Link>
        </div>

        <nav aria-label="SocietyFlats services" className="mt-7 border-y border-[#CED7E6] lg:mt-10">
          <div className="grid divide-y divide-[#CED7E6] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {serviceIndex.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="group flex items-start gap-3 px-1 py-4 sm:px-4 lg:py-5"
              >
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
