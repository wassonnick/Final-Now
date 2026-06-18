// C74J hero alignment + map density polish: top-align hero, compact panel, denser visible map.
// C74I first fold + map visibility polish: compact hero, stronger grid, clearer pins and routes.
// C74H continuous hero surface: map panel blended into same light hero palette.
// C74FG soft map-style AI hero panel: unified map canvas, softened colors, empty input.
// C74E input fix: AI concierge input starts empty with blinking cursor cue.
// C74E clean AI concierge card: no hero result dashboard, just guided prompts and AI Advisor handoff.
// C74B hero AI card polish: right-side AI box is more inviting, search-first and visually highlighted.
// C74 hero tabs fix: Society default button is Explore Societies; tabs are Society, Rent, Buy, Ask AI.
// C74 homepage UX polish: compact hero, clearer first fold search, lighter desktop AI card.
// C71 public content: restore no forced AI page jump SEO marker and sharpen hero trust copy.
// C70C hero copy: society-first search, verified homes and AI guidance.
import { trackAiPromptSubmitted, trackEvent, trackResultClicked, trackSearchPerformed } from "@/lib/analytics";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { fetchPublicSocieties, formatPublicLocation } from "@/lib/publicData";
import { slugifySociety, type AdminSociety } from "@/lib/adminSocietyStore";

type Intent = "society" | "rent" | "buy" | "general";

type AdvisorMatch = {
  id?: number;
  society_name?: string;
  name?: string;
  slug?: string;
  sector?: string;
  locality?: string;
  score?: number;
  reason?: string;
};

type HeroMapSociety = Partial<Omit<AdminSociety, "score">> & {
  score?: string | number;
  society_name?: string;
};

const tabs: Array<{ key: Intent; label: string; button: string }> = [
  { key: "society", label: "Society", button: "Explore Societies" },
  { key: "rent", label: "Rent", button: "Rentals" },
  { key: "buy", label: "Buy", button: "Resale" },
  { key: "general", label: "Ask AI", button: "Ask SocietyFlats AI" },
];

const quickSearches = [
  "DLF Crest",
  "Golf Course Road",
  "Sector 65",
  "3BHK under Rs 1L",
  "Pet friendly",
];

const starterPrompts = [
  "Best family societies near Cyber City under Rs 1L",
  "Compare DLF Crest and M3M Golf Estate",
  "Pet friendly societies near Golf Course Extension",
];

function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  return envUrl ? String(envUrl).replace(/\/$/, "") : "https://final-now.onrender.com/api";
}

function buildSearchUrl(intent: Intent, query: string) {
  const params = new URLSearchParams();
  const cleanQuery = query.trim();

  if (cleanQuery) params.set("q", cleanQuery);

  if (intent === "rent") {
    params.set("tab", "rent");
  } else if (intent === "buy") {
    params.set("tab", "buy");
  } else {
    params.set("tab", "societies");
    params.set("intent", intent === "general" ? "general" : "society");
  }

  return `/search?${params.toString()}`;
}

function normalizeHeroText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isBlockedHeroSociety(value: unknown) {
  const name = normalizeHeroText(value);
  return (
    !name ||
    name === "gurgaon society" ||
    name === "verified gurgaon society" ||
    name.includes("verified gurgaon society")
  );
}

function heroTokens(value: string) {
  return normalizeHeroText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !["under", "near", "with", "bhk", "for", "the", "and", "rs", "lakh"].includes(token));
}

function heroSearchText(society: HeroMapSociety) {
  return normalizeHeroText([
    society.name,
    society.society_name,
    society.builder,
    society.sector,
    society.locality,
    society.address,
  ].filter(Boolean).join(" "));
}

function deterministicHeroMatches(societies: HeroMapSociety[], query: string) {
  const tokens = heroTokens(query);
  if (!tokens.length) return [];

  return societies
    .filter((society) => !isBlockedHeroSociety(society.name || society.society_name))
    .map((society) => {
      const haystack = heroSearchText(society);
      const hits = tokens.filter((token) => haystack.includes(token)).length;
      const strongNameHit = tokens.some((token) =>
        normalizeHeroText([society.name, society.society_name, society.builder].filter(Boolean).join(" ")).includes(token),
      );

      return { society, hits, strongNameHit };
    })
    .filter((item) => item.hits > 0)
    .sort((a, b) => Number(b.strongNameHit) - Number(a.strongNameHit) || b.hits - a.hits)
    .map((item) => item.society)
    .slice(0, 3);
}

function scoreOfSociety(society: HeroMapSociety, fallback: number) {
  const parsed = Number(society.score || fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

function societyDisplayName(society: HeroMapSociety) {
  const raw = society.name || society.society_name || "";
  return isBlockedHeroSociety(raw) ? "" : raw;
}

function societyHref(society: HeroMapSociety, fallbackQuery: string) {
  const name = societyDisplayName(society);
  const slug = society.slug || (name ? slugifySociety(name) : "");
  return slug
    ? `/society/${slug}`
    : `/search?tab=societies&intent=general&q=${encodeURIComponent(name || fallbackQuery)}`;
}

function societyMeta(society: HeroMapSociety, fallback: string) {
  return formatPublicLocation(society as AdminSociety) || society.sector || society.locality || fallback;
}

const fallbackHeroMapSocieties: HeroMapSociety[] = [
  { name: "DLF Crest", slug: "dlf-crest", sector: "Golf Course Road", score: "94" },
  { name: "Alpha Corp Sky1", slug: "alpha-corp-sky1", sector: "Sector 15", score: "87" },
  { name: "M3M Golf Estate", slug: "m3m-golf-estate", sector: "Sector 65", score: "83" },
];











export default function SocietyFlatsHero() {
  const [activeTab, setActiveTab] = useState<Intent>("society");
  const [query, setQuery] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiQuestion, setAiQuestion] = useState("Best family societies near Cyber City under Rs 1L");
  const [aiReply, setAiReply] = useState(
    "Ask here. I will shortlist Gurgaon societies by budget, commute, family fit, verified inventory and lifestyle match.",
  );
  const [aiMatches, setAiMatches] = useState<AdvisorMatch[]>([
    { society_name: "DLF The Crest", sector: "Golf Course Road", score: 92 },
    { society_name: "M3M Golf Estate", sector: "Sector 65", score: 88 },
    { society_name: "Ireo Skyon", sector: "Sector 60", score: 84 },
  ]);
  const [heroMapSocieties, setHeroMapSocieties] = useState<HeroMapSociety[]>([]);
  const [heroMapCards, setHeroMapCards] = useState<HeroMapSociety[]>(fallbackHeroMapSocieties);
  const [hasExactHeroMapMatch, setHasExactHeroMapMatch] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const active = tabs.find((tab) => tab.key === activeTab) || tabs[0];

  useEffect(() => {
    let mounted = true;

    fetchPublicSocieties()
      .then((items) => {
        if (!mounted) return;
        const cleanItems = items.filter((society) => !isBlockedHeroSociety(society.name));
        setHeroMapSocieties(cleanItems);
        if (cleanItems.length) setHeroMapCards(cleanItems.slice(0, 3));
      })
      .catch((error) => {
        console.warn("Hero live map societies unavailable:", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const mapQuery = aiInput || aiQuestion;
  const displayMapCards = heroMapCards.filter((society) => societyDisplayName(society)).slice(0, 3);
  const primaryMapSociety = displayMapCards[0] || fallbackHeroMapSocieties[0];
  const primaryMapScore = scoreOfSociety(primaryMapSociety, 94);



  const submitSearch = () => {
    window.location.href = buildSearchUrl(activeTab, query);
  };

  const applyQuickSearch = (value: string) => {
    setQuery(value);
    window.location.href = buildSearchUrl("society", value);
  };

  const submitHeroAi = async (value?: string) => {
    const clean = (value || aiInput).trim();
    trackAiPromptSubmitted({
      source: "homepage_ai",
      ai_query: clean,
      cta_label: "Ask SocietyFlats AI",
    });

    if (!clean || isAiLoading) return;

    const localMatches = deterministicHeroMatches(heroMapSocieties, clean);
    setHeroMapCards(localMatches);
    setHasExactHeroMapMatch(localMatches.length > 0);
    setAiQuestion(clean);
    setAiInput(clean);
    setIsAiLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/ai/advisor`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: clean, intent: "general" }),
      });

      if (!response.ok) throw new Error("AI request failed");

      const payload = await response.json();
      const matches = Array.isArray(payload?.matches) ? payload.matches.slice(0, 3) : [];

      setAiMatches(matches);
      setAiReply(
        localMatches.length
          ? payload?.reply || "These are live SocietyFlats matches from the current database."
          : "No exact live society match yet. Try a society, builder, sector or open the full map/search.",
      );
    } catch (error) {
      console.error("Hero AI failed:", error);
      setAiMatches([]);
      setAiReply(
        localMatches.length
          ? "I found live SocietyFlats matches from the current database."
          : "No exact live society match yet. Try a society, builder, sector or open the full map/search.",
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden border-b border-blue-50 bg-[radial-gradient(circle_at_78%_18%,rgba(37,99,235,0.10),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
      <div className="mx-auto grid max-w-[1440px] gap-4 px-4 py-4 sm:px-6 md:py-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:items-start lg:px-20 lg:py-4">
        <div className="max-w-[760px]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
              Gurgaon society intelligence
            </span>
          </div>

          <h1 className="font-serif text-[34px] font-black leading-[0.96] tracking-[-0.045em] text-slate-950 sm:text-[44px] lg:text-[50px]">
            Find the right
            <br />
            Gurgaon society first.
          </h1>

          <p className="mt-4 max-w-[560px] text-base font-semibold leading-7 text-blue-500 sm:text-lg">
            Compare verified societies, rentals, resale homes, commute strength and lifestyle fit before booking visits.
          </p>

          <div className="mt-6 rounded-[1.35rem] border border-blue-100 bg-white p-2.5 shadow-[0_18px_48px_rgba(37,99,235,0.10)]">
            <div className="mb-2 grid grid-cols-4 gap-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-full px-3 py-2 text-sm font-black transition ${
                      isActive
                        ? "bg-blue-700 text-white shadow-md shadow-blue-100"
                        : "text-blue-500 hover:bg-blue-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitSearch();
              }}
              className="flex flex-col gap-2 rounded-[1.1rem] bg-blue-50/55 p-2 sm:flex-row"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-white px-4 py-3">
                <Search className="h-5 w-5 shrink-0 text-blue-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search society, sector, landmark or budget..."
                  className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-800 outline-none placeholder:text-blue-300"
                />
              </div>

              <Button
                type="submit"
                className="h-12 rounded-2xl bg-blue-700 px-6 text-sm font-black text-white shadow-md shadow-blue-100 hover:bg-blue-800"
              >
                {active.button}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-black text-blue-600">
              Popular:
            </span>
            {quickSearches.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => applyQuickSearch(item)}
                className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden lg:block lg:origin-center lg:scale-[0.98]">
          <div className="relative min-h-[430px] overflow-hidden rounded-[1.75rem] border border-blue-100 bg-[linear-gradient(135deg,#fbfdff_0%,#f4f8ff_28%,#edf4ff_62%,#e7f0ff_100%)] p-4 text-navy-950 shadow-[0_14px_34px_rgba(37,99,235,0.10)]">
            <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(37,99,235,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.12)_1px,transparent_1px)] [background-size:58px_58px]" />
            <div className="absolute -left-16 top-0 h-72 w-72 rounded-full bg-white/90 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-blue-100/75 blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-navy-950">SocietyFlats AI</p>
                    <p className="text-xs font-semibold text-navy-500">
                      Plotting society matches live
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-100">
                  Live
                </span>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const clean = aiInput.trim() || aiQuestion;
                  void submitHeroAi(clean);
                }}
                className="mt-3 rounded-[1.25rem] border border-blue-100 bg-white p-2 shadow-[0_10px_24px_rgba(37,99,235,0.09)]"
              >
                <div className="flex items-center gap-2">
                  <Search className="ml-2 h-4 w-4 shrink-0 text-blue-400" />
                  <div className="relative min-w-0 flex-1">
                    <input
                      value={aiInput}
                      onChange={(event) => setAiInput(event.target.value)}
                      className="peer h-11 w-full bg-transparent px-2 pr-7 text-sm font-black text-navy-950 outline-none placeholder:text-slate-400"
                      placeholder="Type your requirement..."
                    />
                    {!aiInput ? (
                      <span className="pointer-events-none absolute right-4 top-1/2 h-5 w-[2px] -translate-y-1/2 animate-pulse rounded-full bg-blue-600" />
                    ) : null}
                  </div>
                  <button
                    type="submit"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-950/20 transition hover:scale-105 hover:bg-blue-700"
                    aria-label="Ask SocietyFlats AI"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>

              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  "3BHK under ₹1L",
                  "Near Cyber City",
                  "Pet friendly",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setAiInput(prompt);
                      void submitHeroAi(prompt);
                    }}
                    className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="relative mt-3 h-[150px]">
                <div className="absolute left-[14%] top-[28%] h-[2px] w-[52%] bg-blue-300/80" />
                <div className="absolute left-[30%] top-[58%] h-[2px] w-[50%] bg-blue-300/75" />
                <div className="absolute left-[66%] top-[10%] h-[60%] w-[2px] bg-blue-300/80" />
                <div className="absolute left-[54%] top-[76%] h-3.5 w-3.5 rounded-full border border-blue-100 bg-white shadow-[0_0_0_6px_rgba(37,99,235,0.16)]" />
                <div className="absolute left-[12%] top-[18%] h-3.5 w-3.5 rounded-full border border-blue-100 bg-white shadow-[0_0_0_6px_rgba(37,99,235,0.16)]" />
                <div className="absolute right-[22%] top-[8%] h-3.5 w-3.5 rounded-full border border-blue-100 bg-white shadow-[0_0_0_6px_rgba(37,99,235,0.16)]" />
                <div className="absolute bottom-[22%] left-[38%] h-3.5 w-3.5 rounded-full border border-blue-100 bg-white shadow-[0_0_0_6px_rgba(37,99,235,0.16)]" />
                <div className="absolute bottom-[12%] right-[14%] h-3.5 w-3.5 rounded-full border border-blue-100 bg-white shadow-[0_0_0_6px_rgba(37,99,235,0.16)]" />

                <div className="absolute left-[56%] top-[30%]">
                  <div className="flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-white" />
                    {societyDisplayName(primaryMapSociety)} · {primaryMapScore} fit
                  </div>
                  <div className="mx-auto mt-1.5 h-7 w-[2px] bg-blue-300/70" />
                  <div className="mx-auto h-7 w-7 rounded-full border-4 border-blue-500 bg-white shadow-[0_0_0_8px_rgba(37,99,235,0.18)]" />
                </div>

                <p className="absolute right-4 top-[36%] text-xs font-bold text-navy-500">
                  Cyber City
                </p>
              </div>

              <div className="mt-0 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.18em] text-navy-500">
                <span>Matched on map</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-100">
                  {hasExactHeroMapMatch ? `${displayMapCards.length} matched` : "No exact match"}
                </span>
              </div>

              {!hasExactHeroMapMatch ? (
                <p className="mt-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
                  No exact live society match yet. Try a society, builder or sector.
                </p>
              ) : null}

              {displayMapCards.length ? (
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {displayMapCards.map((society, index) => {
                    const name = societyDisplayName(society);
                    const score = scoreOfSociety(society, 94 - index * 5);
                    const href = societyHref(society, mapQuery);
                    const meta = societyMeta(society, "Gurgaon · live match");

                    return (
                      <Link
                        key={`${name}-${index}`}
                        to={href}
                        onClick={() =>
                          trackResultClicked({
                            source: "homepage_hero_live_map",
                            result_type: "society",
                            result_slug: society.slug || "",
                            result_name: name,
                            position: index + 1,
                            query: mapQuery,
                          })
                        }
                        className="rounded-2xl border border-blue-100 bg-white p-2.5 text-navy-950 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                            #{index + 1}
                          </p>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                            {score} fit
                          </span>
                        </div>
                        <p className="mt-1.5 truncate text-sm font-black">{name}</p>
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{meta}</p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 rounded-2xl border border-amber-100 bg-white/90 p-3 text-center">
                  <p className="text-xs font-black text-navy-950">No exact live society match yet</p>
                  <p className="mt-1 text-[11px] font-semibold text-navy-500">
                    Try a society, builder, sector or open the full map/search.
                  </p>
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link to={`/maps?q=${encodeURIComponent(mapQuery)}`}>
                  <Button variant="outline" className="h-10 w-full rounded-xl border-blue-100 bg-white text-xs font-black text-blue-700 hover:bg-blue-50">
                    View all on map
                  </Button>
                </Link>
                <Link to={`/ai-advisor?q=${encodeURIComponent(mapQuery)}`}>
                  <Button className="h-10 w-full rounded-xl bg-blue-700 text-xs font-black text-white hover:bg-blue-800">
                    Open AI Advisor
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>

              <div className="mt-2 flex items-center justify-center gap-2 text-[11px] font-bold text-navy-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                No forced AI page jump.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
