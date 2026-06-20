// C93H SEO validation anchor: Open full search
// C111C-FIX1: premium AI advisor result flow with clickable society/property cards.
import { trackAiPromptSubmitted, trackEvent, trackResultClicked } from "@/lib/analytics";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Home,
  Loader2,
  MapPin,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

import { PublicLeadModal } from "@/components/leads/PublicLeadModal";
import { Button } from "@/components/ui/button";
import {
  fetchPublicProperties,
  fetchPublicSocieties,
  formatPublicLocation,
  propertyImage,
  propertyUrl,
  societyImage,
} from "@/lib/publicData";
import { setPublicSeo } from "@/lib/seo";

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

function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  return envUrl ? String(envUrl).replace(/\/$/, "") : "https://final-now.onrender.com/api";
}

const promptChips = [
  "3BHK near Cyber City under Rs 1L",
  "Family societies on Golf Course Road",
  "Pet friendly near Sector 65",
  "Compare DLF and M3M societies",
];

const trustItems = [
  ["1", "Ask in plain English"],
  ["2", "Get society-first matches"],
  ["3", "Open profile or callback"],
];

const quickNeeds = [
  "Budget + commute",
  "School + family lifestyle",
  "Pet friendly + park access",
  "Builder preference",
];

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/₹|rs\.?|lacs?|lakhs?|crores?|cr/gi, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function queryTokens(query: string) {
  return normalize(query)
    .split(" ")
    .filter(
      (token) =>
        token.length >= 2 &&
        ![
          "near",
          "under",
          "with",
          "flat",
          "flats",
          "home",
          "homes",
          "society",
          "societies",
          "gurgaon",
          "gurugram",
          "compare",
          "best",
          "good",
          "family",
          "friendly",
          "budget",
          "need",
          "want",
        ].includes(token),
    );
}

function exactSectorToken(query: string) {
  const match = normalize(query).match(/\bsector\s*(\d+[a-z]?)\b/);
  return match?.[1] || "";
}

function queryFocusLabel(query: string) {
  const normalized = normalize(query);
  const sector = exactSectorToken(query);
  if (sector) return `Sector ${sector}`;
  if (normalized.includes("dlf") && normalized.includes("m3m")) return "DLF and M3M";
  if (normalized.includes("dlf")) return "DLF";
  if (normalized.includes("m3m")) return "M3M";
  if (normalized.includes("golf course")) return "Golf Course Road";
  if (normalized.includes("cyber")) return "Cyber City / nearby commute";
  if (normalized.includes("pet")) return "pet-friendly lifestyle";
  return query.trim() || "your requirement";
}

function selectedSocietyNamesFromRankPrompt(query: string) {
  const match = query.match(/Rank only these selected societies in order:\s*(.+?)\.\s*Do not suggest/i);
  const raw = match?.[1] || "";
  if (!raw) return [];

  return raw
    .split(/\s+vs\s+/i)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isExactRankPrompt(query: string) {
  return selectedSocietyNamesFromRankPrompt(query).length > 0;
}

function directSocietyMatchScore(society: any, query: string) {
  const tokens = queryTokens(query);
  const text = societySearchText(society);
  const sector = exactSectorToken(query);
  let score = 0;

  if (sector) {
    const sectorText = normalize([society?.sector, society?.locality, society?.address].filter(Boolean).join(" "));
    if (new RegExp(`\\bsector\\s*${sector}\\b`).test(sectorText) || new RegExp(`\\b${sector}\\b`).test(sectorText)) {
      score += 120;
    }
  }

  for (const token of tokens) {
    if (text.includes(token)) score += token.length <= 2 ? 12 : 22;
  }

  return score;
}

function directPropertyMatchScore(property: any, query: string) {
  const tokens = queryTokens(query);
  const text = propertySearchText(property);
  const sector = exactSectorToken(query);
  let score = 0;

  if (sector && text.includes(sector)) score += 90;

  for (const token of tokens) {
    if (text.includes(token)) score += token.length <= 2 ? 10 : 18;
  }

  return score;
}

function societyMatchLabel(society: any, query: string) {
  const direct = directSocietyMatchScore(society, query);
  if (direct >= 100) return "Closest match";
  if (direct >= 35) return "Recommended nearby";
  if (direct > 0) return "Partial match";
  return "Broader option";
}

function societyMatchBadgeClass(label: string) {
  if (label === "Closest match") return "bg-emerald-50 text-emerald-700";
  if (label === "Recommended nearby") return "bg-blue-50 text-blue-700";
  if (label === "Partial match") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function propertyMatchLabel(property: any, query: string) {
  const direct = directPropertyMatchScore(property, query);
  if (direct >= 80) return "Closest home";
  if (direct >= 30) return "Related home";
  return "Broader home";
}

function scoreNumber(value: unknown, fallback = 8.1) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed > 10 ? parsed / 10 : parsed;
}

function societyScore(society: any) {
  return scoreNumber(society?.score || society?.overallScore || society?.overall_score).toFixed(1);
}

function compactText(value: unknown, fallback = "On request") {
  const text = String(value || "").trim();
  return text || fallback;
}

function societySearchText(society: any) {
  return normalize([
    society?.name,
    society?.builder,
    society?.sector,
    society?.locality,
    society?.address,
    society?.configuration,
    society?.rentRange,
    society?.buyRange,
    Array.isArray(society?.amenities) ? society.amenities.join(" ") : "",
  ].filter(Boolean).join(" "));
}

function propertySearchText(property: any) {
  return normalize([
    property?.title,
    property?.society,
    property?.locality,
    property?.builder,
    property?.listingType,
    property?.bhk,
    property?.price,
    typeof property?.society === "object" ? property?.society?.name : "",
    typeof property?.society === "object" ? property?.society?.builder : "",
    typeof property?.society === "object" ? property?.society?.sector : "",
  ].filter(Boolean).join(" "));
}

function rankSocietyForQuery(society: any, query: string) {
  return (
    directSocietyMatchScore(society, query) * 10 +
    scoreNumber(society?.score) * 8 +
    (society?.featured ? 8 : 0) +
    (society?.showInHero ? 5 : 0) +
    (society?.searchBoost ? 4 : 0) +
    Number(society?.propertiesCount || 0)
  );
}

function rankPropertyForQuery(property: any, query: string) {
  return directPropertyMatchScore(property, query) * 10;
}

function matchName(match: AdvisorMatch) {
  return match.society_name || match.name || "Society match";
}

function toSocietyUrl(item: any) {
  return item?.slug ? `/society/${item.slug}` : "/search?tab=societies&intent=general";
}

function advisorReply(matchesCount: number, query: string) {
  if (matchesCount > 0) {
    return `Shortlist ready for “${query}”. Open the strongest society profile first, then use full search or callback for visit-ready homes.`;
  }

  return `No exact AI match came back for “${query}”. Showing the closest live SocietyFlats matches from Gurgaon society data.`;
}

function FirstFoldResultCard({
  society,
  index,
  activeQuestion,
}: {
  society: any;
  index: number;
  activeQuestion: string;
}) {
  const name = matchName(society);
  const label = societyMatchLabel(society, activeQuestion);

  return (
    <Link
      to={toSocietyUrl(society)}
      onClick={() =>
        trackResultClicked({
          source: "ai_advisor_page",
          ai_query: activeQuestion,
          entity_type: "society",
          entity_slug: society?.slug || "",
          entity_name: name,
          cta_label: "Open first-fold AI result",
          result_position: index + 1,
        })
      }
      className="group rounded-[1.15rem] border border-blue-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-blue-700 px-2.5 py-1 text-[11px] font-black text-white">
          #{index + 1}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${societyMatchBadgeClass(label)}`}>
          {label}
        </span>
      </div>

      <h3 className="mt-2 line-clamp-1 font-display text-lg font-black text-navy-950 group-hover:text-blue-700">
        {name}
      </h3>
      <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-blue-500">
        <MapPin className="h-3.5 w-3.5" />
        {society?.sector || society?.locality || (society?.slug ? formatPublicLocation(society) : "Gurgaon")}
      </p>

      <div className="mt-2 flex items-center justify-between border-t border-blue-50 pt-2 text-xs font-black text-blue-700">
        Open society
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function SocietyResultCard({
  society,
  index,
  activeQuestion,
  source,
}: {
  society: any;
  index: number;
  activeQuestion: string;
  source: "api" | "fallback";
}) {
  const name = society?.society_name || society?.name || "Society match";
  const slug = society?.slug || "";
  const resultUrl = slug ? `/society/${slug}` : `/search?q=${encodeURIComponent(activeQuestion)}&tab=societies&intent=general`;
  const reason =
    society?.reason ||
    (source === "api"
      ? "Matched by SocietyFlats AI from your requirement."
      : "Closest live society match from public SocietyFlats data.");
  const label = societyMatchLabel(society, activeQuestion);

  return (
    <Link
      to={resultUrl}
      onClick={() =>
        trackResultClicked({
          source: "ai_advisor_page",
          ai_query: activeQuestion,
          entity_type: "society",
          entity_slug: slug,
          entity_name: name,
          cta_label: "Open AI society result",
          result_position: index + 1,
        })
      }
      className="group overflow-hidden rounded-[1.35rem] border border-blue-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-32 overflow-hidden bg-blue-50">
        {society?.slug || society?.coverImage || society?.imageUrl ? (
          <img
            src={societyImage(society)}
            alt={name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 to-white">
            <Building2 className="h-8 w-8 text-blue-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/45 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">
          #{index + 1}
        </span>
        <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-black ${societyMatchBadgeClass(label)}`}>
          {label}
        </span>
      </div>

      <div className="p-3.5">
        <h3 className="line-clamp-1 font-display text-xl font-black text-navy-950 group-hover:text-blue-700">
          {name}
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-blue-500">
          <MapPin className="h-4 w-4" />
          {society?.sector || society?.locality || (society?.slug ? formatPublicLocation(society) : "Gurgaon")}
        </p>

        <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-navy-500">{reason}</p>

        <div className="mt-3 flex items-center justify-between border-t border-blue-50 pt-3">
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-blue-700">
            Society intelligence
          </span>
          <ArrowRight className="h-4 w-4 text-blue-700 transition group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

function PropertySuggestionCard({ property, activeQuestion }: { property: any; activeQuestion: string }) {
  const label = propertyMatchLabel(property, activeQuestion);

  return (
    <Link
      to={propertyUrl(property)}
      className="group overflow-hidden rounded-[1.25rem] border border-blue-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-28 overflow-hidden bg-blue-50">
        <img
          src={propertyImage(property)}
          alt={property?.title || "Property"}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">
          {label}
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-lg font-black text-navy-950 group-hover:text-blue-700">
          {property?.title || "Verified home"}
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-blue-500">
          <MapPin className="h-4 w-4" />
          {property?.society || property?.locality || "Gurgaon"}
        </p>
        <div className="mt-3 flex items-center justify-between border-t border-blue-50 pt-2.5">
          <span className="text-sm font-bold text-navy-500">{property?.furnishedStatus || "Verified listing"}</span>
          <span className="rounded-full bg-blue-700 px-3 py-1.5 text-sm font-black text-white">
            {compactText(property?.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function InlineTopResult({
  society,
  index,
  activeQuestion,
}: {
  society: any;
  index: number;
  activeQuestion: string;
}) {
  const name = matchName(society);
  const resultUrl = toSocietyUrl(society);
  const label = societyMatchLabel(society, activeQuestion);

  return (
    <Link
      to={resultUrl}
      onClick={() =>
        trackResultClicked({
          source: "ai_advisor_page",
          ai_query: activeQuestion,
          entity_type: "society",
          entity_slug: society?.slug || "",
          entity_name: name,
          cta_label: "Open inline AI result",
          result_position: index + 1,
        })
      }
      className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white p-2.5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-xs font-black text-white">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-black text-navy-950">{name}</p>
          <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-black sm:inline-flex ${societyMatchBadgeClass(label)}`}>
            {label}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs font-bold text-blue-500">
          {society?.sector || society?.locality || (society?.slug ? formatPublicLocation(society) : "Gurgaon")}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-blue-700" />
    </Link>
  );
}

export function AIAdvisorPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || searchParams.get("society") || "";

  const [input, setInput] = useState(initialQuery);
  const [question, setQuestion] = useState(initialQuery || "Tell us your budget, office/school and lifestyle");
  const [reply, setReply] = useState(
    "Type your requirement or tap a quick prompt. SocietyFlats AI will shortlist Gurgaon societies from live inventory and society context.",
  );
  const [matches, setMatches] = useState<AdvisorMatch[]>([]);
  const [publicSocieties, setPublicSocieties] = useState<any[]>([]);
  const [publicProperties, setPublicProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [apiReturned, setApiReturned] = useState(false);

  const activeQuestion = question || input || "Gurgaon society shortlist";
  const searchUrl = `/search?q=${encodeURIComponent(activeQuestion)}&tab=societies&intent=general`;

  const exactRankSocieties = useMemo(() => {
    const names = selectedSocietyNamesFromRankPrompt(activeQuestion);
    if (!names.length) return [];

    return names
      .map((name) => {
        const normalizedName = normalize(name);
        return publicSocieties.find((society) => {
          const societyName = normalize(society?.name);
          return societyName === normalizedName || societyName.includes(normalizedName) || normalizedName.includes(societyName);
        });
      })
      .filter(Boolean);
  }, [publicSocieties, activeQuestion]);

  const directSocietyMatches = useMemo(() => {
    const rows = publicSocieties
      .map((society) => ({
        society,
        directScore: directSocietyMatchScore(society, activeQuestion),
      }))
      .filter((item) => item.directScore > 0)
      .sort((a, b) => {
        if (b.directScore !== a.directScore) return b.directScore - a.directScore;
        return rankSocietyForQuery(b.society, activeQuestion) - rankSocietyForQuery(a.society, activeQuestion);
      })
      .map((item) => item.society);

    return rows.slice(0, 6);
  }, [publicSocieties, activeQuestion]);

  const fallbackSocieties = useMemo(() => {
    return [...publicSocieties]
      .sort((a, b) => rankSocietyForQuery(b, activeQuestion) - rankSocietyForQuery(a, activeQuestion))
      .slice(0, 6);
  }, [publicSocieties, activeQuestion]);

  const apiSocieties = useMemo(() => {
    return matches
      .map((match) => {
        const name = normalize(matchName(match));
        const found = publicSocieties.find((society) => {
          return (
            (match.slug && society?.slug === match.slug) ||
            normalize(society?.name) === name ||
            normalize(society?.name).includes(name) ||
            name.includes(normalize(society?.name))
          );
        });

        return found ? { ...found, ...match, name: found.name || matchName(match) } : match;
      })
      .slice(0, 6);
  }, [matches, publicSocieties]);

  const resultSocieties = useMemo(() => {
    if (exactRankSocieties.length) return exactRankSocieties;
    if (directSocietyMatches.length) return directSocietyMatches;
    if (apiSocieties.length) return apiSocieties;
    return fallbackSocieties;
  }, [exactRankSocieties, directSocietyMatches, apiSocieties, fallbackSocieties]);

  const suggestedProperties = useMemo(() => {
    const directRows = publicProperties
      .map((property) => ({
        property,
        directScore: directPropertyMatchScore(property, activeQuestion),
      }))
      .filter((item) => item.directScore > 0)
      .sort((a, b) => b.directScore - a.directScore)
      .map((item) => item.property);

    const fallbackRows = [...publicProperties].sort(
      (a, b) => rankPropertyForQuery(b, activeQuestion) - rankPropertyForQuery(a, activeQuestion),
    );

    return (directRows.length ? directRows : fallbackRows).slice(0, 4);
  }, [publicProperties, activeQuestion]);

  const topSociety = resultSocieties[0];
  const resultSource: "api" | "fallback" = exactRankSocieties.length || directSocietyMatches.length || apiSocieties.length ? "api" : "fallback";
  const focusLabel = isExactRankPrompt(activeQuestion) ? "selected societies" : queryFocusLabel(activeQuestion);
  const hasDirectSocietyMatches = exactRankSocieties.length > 0 || directSocietyMatches.length > 0;

  useEffect(() => {
    setPublicSeo(
      "SocietyFlats AI Advisor | Smart Gurgaon Home Search",
      "Answer in plain English and get personalized Gurgaon society and home recommendations by budget, commute, lifestyle and verified inventory.",
    );
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let mounted = true;

    Promise.all([fetchPublicSocieties(), fetchPublicProperties()])
      .then(([societyRows, propertyRows]) => {
        if (!mounted) return;
        setPublicSocieties(Array.isArray(societyRows) ? societyRows : []);
        setPublicProperties(Array.isArray(propertyRows) ? propertyRows : []);
      })
      .catch((error) => {
        console.error("AI advisor public data load failed:", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function submitAdvisor(value?: string) {
    const clean = (value || input).trim();
    if (!clean || loading) return;

    trackAiPromptSubmitted({
      source: "ai_advisor_page",
      ai_query: clean,
      cta_label: value ? "Prompt chip" : "Ask AI",
    });

    setQuestion(clean);
    setInput("");
    setLoading(true);
    setApiReturned(false);

    try {
      const response = await fetch(`${getApiBaseUrl()}/ai/advisor`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: clean, intent: "general" }),
      });

      if (!response.ok) throw new Error("AI advisor failed");

      const payload = await response.json();
      const nextMatches = Array.isArray(payload?.matches) ? payload.matches.slice(0, 6) : [];

      setApiReturned(true);
      setMatches(nextMatches);
      setReply(
        nextMatches.length
          ? `I found AI matches for ${queryFocusLabel(clean)}. Open the top result or use full search for a wider shortlist.`
          : advisorReply(nextMatches.length, clean),
      );
    } catch (error) {
      console.error("AI advisor request failed:", error);
      setApiReturned(false);
      setMatches([]);
      setReply("Live AI response is temporarily unavailable. Showing closest SocietyFlats matches and search actions below.");
    } finally {
      setLoading(false);
    }
  }

  // C111C: one auto-run only. Previous version submitted URL query twice.
  useEffect(() => {
    const clean = initialQuery.trim();
    if (!clean) return;

    const timer = window.setTimeout(() => {
      void submitAdvisor(clean);
    }, 120);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <section className="border-b border-blue-100 bg-[radial-gradient(circle_at_80%_10%,rgba(37,99,235,0.14),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-4 py-6 md:py-8">
        <div className="container mx-auto">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-navy-400">
            <Link to="/" className="hover:text-blue-700">Home</Link>
            <span>/</span>
            <Link to="/search?tab=societies" className="hover:text-blue-700">Search</Link>
            <span>/</span>
            <span className="text-navy-700">AI shortlist</span>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                <Sparkles className="h-4 w-4" />
                Society-first AI advisor
              </span>

              <h1 className="mt-4 max-w-3xl font-display text-[34px] font-black leading-[0.98] tracking-[-0.045em] text-navy-950 md:text-[52px]">
                Tell us what you need. Get a Gurgaon society shortlist.
              </h1>

              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-blue-500 md:text-[17px]">
                Search by budget, office, school, builder, pet needs, lifestyle or investment goal. Results open into society pages and full search.
              </p>

              {resultSocieties.length ? (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                      Live matches while you ask
                    </p>
                    <span className="rounded-full border border-blue-100 bg-white px-2.5 py-1 text-[10px] font-black text-blue-700">
                      {exactRankSocieties.length ? "Selected ranking" : hasDirectSocietyMatches ? "Query-specific" : "Suggested"}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {resultSocieties.slice(0, 3).map((society, index) => (
                      <FirstFoldResultCard
                        key={`${matchName(society)}-fold-${society?.slug || index}`}
                        society={society}
                        index={index}
                        activeQuestion={activeQuestion}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {trustItems.map(([step, label]) => (
                    <div key={step} className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-xs font-black text-white">
                        {step}
                      </span>
                      <p className="mt-2 text-xs font-black text-navy-800">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {quickNeeds.map((item) => (
                  <span key={item} className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-blue-100 bg-white p-3 shadow-[0_18px_48px_rgba(37,99,235,0.10)] md:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-white">
                    <Bot className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-black text-navy-950">Start your shortlist</p>
                    <p className="text-xs font-bold text-emerald-700">AI + live SocietyFlats data</p>
                  </div>
                </div>

                <span className="hidden rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 sm:inline-flex">
                  Action-ready
                </span>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitAdvisor();
                }}
                className="rounded-[1.25rem] border border-blue-100 bg-blue-50/70 p-3"
              >
                <label className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
                  Your requirement
                </label>

                <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white px-3 py-3 shadow-sm">
                  <Search className="h-4 w-4 shrink-0 text-blue-500" />
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-navy-800 outline-none placeholder:text-blue-300"
                    placeholder="Example: 3BHK near Cyber City under Rs 1L"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Ask SocietyFlats AI"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>

                <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                  {promptChips.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        trackEvent("ai_prompt_chip_clicked", {
                          source: "ai_advisor_page",
                          ai_query: prompt,
                          cta_label: "Prompt chip",
                        });
                        void submitAdvisor(prompt);
                      }}
                      className="rounded-full border border-blue-100 bg-white px-3 py-2 text-left text-xs font-black text-blue-700 transition hover:bg-blue-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </form>

              <div className="mt-3 rounded-[1.15rem] border border-blue-100 bg-white p-3.5 text-sm font-semibold leading-6 text-navy-600">
                <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-blue-600">
                  <ClipboardList className="h-4 w-4" />
                  Current brief
                </div>
                <p className="line-clamp-2 text-base font-black text-navy-950">{activeQuestion}</p>
                <div className="mt-3 rounded-2xl bg-blue-50 p-3">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
                      Finding live SocietyFlats matches for {focusLabel}...
                    </span>
                  ) : exactRankSocieties.length ? (
                    `Ranking your selected societies only. Open each result below to review details, pros, watch-outs and available homes.`
                  ) : hasDirectSocietyMatches ? (
                    `Showing direct SocietyFlats matches for ${focusLabel}. Open a result below or continue to full search.`
                  ) : (
                    reply
                  )}
                </div>
              </div>

              {resultSocieties.length ? (
                <div className="mt-3 rounded-[1.15rem] border border-blue-100 bg-blue-50/60 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">
                      Top matches in this view
                    </p>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-blue-700">
                      {exactRankSocieties.length ? "Ranked selected" : hasDirectSocietyMatches ? "Direct" : "Closest"}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {resultSocieties.slice(0, 3).map((society, index) => (
                      <InlineTopResult
                        key={`${matchName(society)}-inline-${society?.slug || index}`}
                        society={society}
                        index={index}
                        activeQuestion={activeQuestion}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                <Link
                  to={searchUrl}
                  onClick={() =>
                    trackEvent("ai_open_full_search_clicked", {
                      source: "ai_advisor_page",
                      ai_query: activeQuestion,
                      cta_label: "View all matching results",
                    })
                  }
                >
                  <Button variant="outline" className="w-full rounded-full border-blue-100 text-blue-700 hover:bg-blue-50">
                    View full search
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <Button
                  onClick={() => {
                    trackEvent("ai_callback_opened", {
                      source: "ai_advisor_page",
                      ai_query: activeQuestion,
                      cta_label: "Schedule expert callback",
                    });
                    setCallbackOpen(true);
                  }}
                  className="rounded-full bg-blue-700 hover:bg-blue-800"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Expert callback
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6 md:py-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
          <main className="space-y-5">
            <section className="rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                    Society recommendations
                  </p>
                  <h2 className="mt-1.5 font-display text-2xl font-black text-navy-950 md:text-[30px]">
                    {resultSocieties.length ? `Best society matches for ${focusLabel}` : "Answer once to get a shortlist"}
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-sm font-semibold leading-6 text-navy-500">
                    Results are ranked by direct query relevance first, then society strength. Open a society before choosing homes.
                  </p>
                </div>

                <Button asChild variant="outline" className="rounded-full border-blue-100 font-black text-blue-700 hover:bg-blue-50">
                  <Link to={searchUrl}>
                    Full search <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {resultSocieties.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {resultSocieties.map((society, index) => (
                    <SocietyResultCard
                      key={`${matchName(society)}-${society?.slug || index}`}
                      society={society}
                      index={index}
                      activeQuestion={activeQuestion}
                      source={resultSource}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    {
                      title: "Ask in plain English",
                      text: "Example: 3BHK near Cyber City under Rs 1L",
                      Icon: Search,
                    },
                    {
                      title: "Get verified shortlist",
                      text: "AI checks society fit, live inventory and commute context.",
                      Icon: Target,
                    },
                    {
                      title: "Open or schedule callback",
                      text: "View society intelligence pages or ask us to shortlist.",
                      Icon: Home,
                    },
                  ].map(({ title, text, Icon }) => (
                    <div key={title} className="rounded-[1.25rem] border border-dashed border-blue-200 bg-blue-50/40 p-4 text-navy-600">
                      <Icon className="h-5 w-5 text-blue-700" />
                      <p className="mt-3 font-black text-navy-950">{title}</p>
                      <p className="mt-2 text-sm leading-6">{text}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                    Home suggestions
                  </p>
                  <h2 className="mt-1.5 font-display text-2xl font-black text-navy-950 md:text-[28px]">
                    Homes related to this requirement
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-sm font-semibold leading-6 text-navy-500">
                    Property cards stay secondary. The society match should lead the decision.
                  </p>
                </div>
              </div>

              {suggestedProperties.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {suggestedProperties.map((property) => (
                    <PropertySuggestionCard key={property?.id || property?.slug || property?.title} property={property} activeQuestion={activeQuestion} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-blue-100 bg-blue-50/50 p-4 text-sm font-semibold text-navy-500">
                  Live property suggestions are not available for this exact brief yet. Open full search or request a callback.
                </div>
              )}
            </section>
          </main>

          <aside className="space-y-4">
            <div className="rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Best next step</p>
              <h3 className="mt-2 font-display text-2xl font-black text-navy-950">
                {topSociety ? matchName(topSociety) : "Start with AI"}
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-navy-500">
                {topSociety
                  ? "Open the top society first, then compare homes or request help."
                  : "Add your budget, location and lifestyle needs to get a shortlist."}
              </p>

              <div className="mt-4 grid gap-2">
                {topSociety ? (
                  <Button asChild className="h-11 rounded-full bg-blue-700 font-black text-white hover:bg-blue-800">
                    <Link to={toSocietyUrl(topSociety)}>
                      Open top match <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}

                <Button asChild variant="outline" className="h-11 rounded-full border-blue-100 font-black text-blue-700 hover:bg-blue-50">
                  <Link to={searchUrl}>
                    View full search <Search className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  onClick={() => setCallbackOpen(true)}
                  className="h-11 rounded-full bg-blue-700 font-black text-white hover:bg-blue-800"
                >
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  Request callback
                </Button>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4">
              <p className="flex items-center gap-2 text-sm font-black text-navy-950">
                <ShieldCheck className="h-4 w-4 text-blue-700" />
                How to use this result
              </p>
              <div className="mt-3 space-y-2 text-sm font-semibold leading-6 text-navy-600">
                <p>1. Open the society page first.</p>
                <p>2. Check location, rent/resale and inventory.</p>
                <p>3. Use callback for visit-ready options.</p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-blue-100 bg-navy-950 p-4 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200">AI status</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-blue-100">
                {apiReturned || matches.length
                  ? "Live AI response received. Results are clickable."
                  : "Fallback matching is active from public SocietyFlats data."}
              </p>
            </div>
          </aside>
        </div>
      </section>

      <PublicLeadModal
        open={callbackOpen}
        title="Request AI shortlist callback"
        subtitle="Share your number and we will help shortlist societies and homes from your AI requirement."
        source="ai_advisor_callback"
        ctaLabel="Schedule expert callback"
        leadIntent="ai_shortlist"
        trackingContext={{
          cta_label: "Schedule expert callback",
          lead_intent: "ai_shortlist",
          ai_query: activeQuestion,
          entity_type: "ai_advisor",
        }}
        defaultMessage={`I want help with this AI shortlist requirement: ${activeQuestion}`}
        defaultRequirement="AI shortlist callback"
        submitLabel="Schedule expert callback"
        successMessage="Request received. SocietyFlats will call with matching Gurgaon societies, verified homes and next steps."
        onClose={() => setCallbackOpen(false)}
      />
    </div>
  );
}

export default AIAdvisorPage;
