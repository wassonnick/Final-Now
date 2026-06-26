// C75 search UX compact polish: sticky compact search, higher mobile results, tighter cards and helper AI block.
import { trackEvent, trackLeadIntent, trackLeadSubmitted, trackResultClicked, trackSearchPerformed } from "@/lib/analytics";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Grid3X3,
  Home,
  List,
  MapPin,
  MapPinned,
  MessageCircle,
  PhoneCall,
  Search,
  Scale,
  Shield,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";
import { PublicLeadModal } from "@/components/leads/PublicLeadModal";
import { cleanLeadTrackingPayload } from "@/lib/leadTracking";
import { Input } from "@/components/ui/input";
import {
  fetchPublicProperties,
  fetchPublicSocieties,
  formatPublicLocation,
  propertyImage,
  propertyUrl,
  searchableText,
  societyImage,
} from "@/lib/publicData";
import { cn } from "@/lib/utils";
import { societyImageAttribution } from "@/lib/societyImages";
import { setPublicSeo } from "@/lib/seo";
import { SaveSearchButton } from "@/components/search/SaveSearchButton";

const tabs = [
  { key: "societies", label: "Societies", mobileLabel: "Society", icon: Building2 },
  { key: "rent", label: "Rent", mobileLabel: "Rent", icon: Home },
  { key: "buy", label: "Buy", mobileLabel: "Buy", icon: Home },
];

const saleListingTypes = [
  "Sale",
  "Buy / Resale",
  "Sell Listing",
  "Builder Floor",
];
const quickLocalities = [
  "Golf Course Road",
  "Sohna Road",
  "Dwarka Expressway",
  "Sector 54",
  "Sector 70",
];


type AdvisorMatch = {
  id?: number;
  society_name: string;
  slug?: string;
  sector?: string;
  locality?: string;
  score?: number;
  rent_range?: string;
  buy_range?: string;
  available_homes?: number;
  reason?: string;
  tags?: string[];
};

function getApiBaseUrl() {
  const envUrl =
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  return envUrl
    ? String(envUrl).replace(/\/$/, "")
    : "https://final-now.onrender.com/api";
}

function safeJoin(value: unknown) {
  return Array.isArray(value) ? value.join(" ") : "";
}

const searchStopWords = new Set([
  "under",
  "near",
  "with",
  "for",
  "the",
  "and",
  "or",
  "rs",
  "in",
  "at",
  "to",
  "from",
  "budget",
  "society",
  "societies",
  "flat",
  "flats",
  "home",
  "homes",
  "gurgaon",
  "gurugram",
]);

function normalizeSearchValue(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[₹,]/g, " ")
    .replace(/\b(\d+)\s*bhk\b/g, "$1 bhk $1bhk")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchTokens(value: string) {
  const normalized = normalizeSearchValue(value);
  const tokens = normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !searchStopWords.has(token));

  const bhkMatch = normalized.match(/\b(\d+)\s*bhk\b/);
  if (bhkMatch?.[1]) tokens.push(bhkMatch[1], `${bhkMatch[1]}bhk`);

  return Array.from(new Set(tokens));
}

function scoreSearchText(text: string, query: string) {
  const cleanQuery = normalizeSearchValue(query);
  if (!cleanQuery) return 1000;

  const haystack = normalizeSearchValue(text);
  if (!haystack) return 0;

  let score = haystack.includes(cleanQuery) ? 120 : 0;
  const tokens = searchTokens(cleanQuery);

  for (const token of tokens) {
    if (haystack.includes(token)) score += token.length >= 4 ? 30 : 16;
  }

  return score;
}

function sortedSearchResults<T>(
  items: T[],
  query: string,
  buildText: (item: T) => string,
) {
  if (!query.trim()) return items;

  return items
    .map((item, index) => ({
      item,
      index,
      score: scoreSearchText(buildText(item), query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}

function quickSearchIntent(value: string): "societies" | "rent" | "buy" {
  const clean = normalizeSearchValue(value);
  if (/\b(buy|sale|resale|purchase)\b/.test(clean)) return "buy";
  if (/\b(bhk|rent|under|budget|lakh|l)\b/.test(clean)) return "rent";
  return "societies";
}

function isSectorLikeQuery(value: string) {
  return /\bsector\s*\d+[a-z]?\b/i.test(value.trim());
}

function primarySocietySearchText(society: any) {
  return searchableText(
    society?.name,
    society?.builder,
    society?.sector,
    society?.locality,
    society?.address,
  );
}

function sectorQueryKey(value: string) {
  const match = normalizeSearchValue(value).match(/\bsector\s*(\d+[a-z]?)\b/);
  return match?.[1] || "";
}

function societyMatchesSectorQuery(society: any, queryValue: string) {
  const sectorKey = sectorQueryKey(queryValue);
  if (!sectorKey) return false;

  const exactSectorPattern = new RegExp(`\\bsector\\s*${sectorKey}\\b`, "i");
  const exactLoosePattern = new RegExp(`\\b${sectorKey}\\b`, "i");

  const sectorFields = [
    society?.sector,
    society?.locality,
    society?.address,
  ]
    .filter(Boolean)
    .map((value) => String(value));

  return sectorFields.some((value) => {
    const normalized = normalizeSearchValue(value);
    return exactSectorPattern.test(normalized) || exactLoosePattern.test(normalized);
  });
}

function expandedSocietySearchText(society: any) {
  return searchableText(
    society?.name,
    society?.builder,
    society?.sector,
    society?.locality,
    society?.address,
    society?.description,
    safeJoin(society?.amenities),
    safeJoin(society?.nearbyOfficeHubs),
    safeJoin(society?.nearbyMetro),
    safeJoin(society?.nearbySchools),
    safeJoin(society?.nearbyHospitals),
    society?.rentRange,
    society?.buyRange,
  );
}

function resultLabel(tab: string) {
  if (tab === "rent") return "Rent homes";
  if (tab === "buy") return "Buy / Resale homes";
  return "Societies";
}


function societySearchUrl(society: any, tab = "rent") {
  return `/search?tab=${tab}&q=${encodeURIComponent(society?.name || "")}`;
}



function compactValue(value: unknown, fallback = "On request") {
  const text = String(value || "").trim();
  return text || fallback;
}

function cleanLeadPhone(value: string) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

function isValidLeadPhone(value: string) {
  return /^[6-9]\d{9}$/.test(cleanLeadPhone(value));
}

function EmptyResults({
  activeTab,
  query,
  leadName,
  leadPhone,
  leadStatus,
  isSubmittingLead,
  onLeadNameChange,
  onLeadPhoneChange,
  onSubmitLead,
}: {
  activeTab: string;
  query: string;
  leadName: string;
  leadPhone: string;
  leadStatus: "idle" | "success" | "error";
  isSubmittingLead: boolean;
  onLeadNameChange: (value: string) => void;
  onLeadPhoneChange: (value: string) => void;
  onSubmitLead: () => void;
}) {
  const isSocietySearch = activeTab === "societies";
  const searchLabel = query.trim() || "your requirement";
  const advisorUrl = `/ai-advisor?q=${encodeURIComponent(searchLabel)}`;
  const browseUrl = isSocietySearch ? "/search?tab=societies" : "/search?tab=rent";
  const browseLabel = isSocietySearch ? "Browse all societies" : "Browse available homes";

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-blue-100 bg-white shadow-sm md:rounded-[1.5rem]">
      <div className="bg-gradient-to-br from-blue-50 via-white to-ivory-100 p-4 md:p-5">
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-4 md:grid-cols-[1fr_0.82fr] md:items-center">
            <div className="text-center md:text-left">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-100 md:mx-0 md:h-12 md:w-12">
                <Search className="h-5 w-5" />
              </span>

              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700 md:mt-4 md:text-xs md:tracking-[0.18em]">
                No exact live match found
              </p>

              <h3 className="mt-2 text-xl font-black tracking-tight text-navy-950 md:text-2xl">
                {isSocietySearch
                  ? "We can still find the right society."
                  : "We can still find matching homes."}
              </h3>

              <p className="mt-2 text-sm leading-6 text-navy-500 md:text-sm">
                {query
                  ? `No live result is currently matching “${query}”. Share your number and our Gurgaon team will check offline inventory, fresh owner listings and similar options.`
                  : `Tell us your requirement and our Gurgaon team will shortlist verified ${isSocietySearch ? "societies" : "homes"} for you.`}
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-navy-600 shadow-sm">
                  Offline inventory check
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-navy-600 shadow-sm">
                  Verified callback
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-navy-600 shadow-sm">
                  Similar matches
                </span>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-blue-100 bg-white p-3 shadow-sm md:p-4">
              <p className="mb-3 text-center text-sm font-black text-navy-900 md:text-left">
                Get matching options on call
              </p>

              <div className="grid gap-2">
                <Input
                  value={leadName}
                  onChange={(event) => onLeadNameChange(event.target.value)}
                  placeholder="Your name"
                  className="h-11 rounded-full border-navy-100 bg-ivory-100 px-5 md:h-12"
                />
                <Input
                  value={leadPhone}
                  onChange={(event) => onLeadPhoneChange(cleanLeadPhone(event.target.value))}
                  placeholder="Mobile number"
                  className="h-11 rounded-full border-navy-100 bg-ivory-100 px-5 md:h-12"
                />
                <Button
                  onClick={onSubmitLead}
                  disabled={
                    isSubmittingLead || !leadName.trim() || !leadPhone.trim()
                  }
                  className="h-11 rounded-full bg-blue-600 px-6 font-black text-white hover:bg-blue-700 disabled:opacity-60 md:h-12"
                >
                  <PhoneCall className="mr-2 h-4 w-4" />
                  {isSubmittingLead ? "Sending..." : "Request callback"}
                </Button>
              </div>

              {leadStatus === "success" ? (
                <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-center text-sm font-bold text-emerald-700">
                  Request received. We will call with matching Gurgaon societies and homes.
                </p>
              ) : null}
              {leadStatus === "error" ? (
                <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-center text-sm font-bold text-red-600">
                  Could not submit right now. Please try again or request a callback from any society/property page.
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Link
              to={advisorUrl}
              className="inline-flex h-11 items-center justify-center rounded-full border border-blue-100 bg-white px-4 text-sm font-black text-blue-700 hover:bg-blue-50"
            >
              <Sparkles className="mr-2 h-4 w-4" /> Ask AI Advisor
            </Link>
            <Link
              to={browseUrl}
              className="inline-flex h-11 items-center justify-center rounded-full border border-blue-100 bg-white px-4 text-sm font-black text-blue-700 hover:bg-blue-50"
            >
              <Building2 className="mr-2 h-4 w-4" /> {browseLabel}
            </Link>
            <Link
              to="/chat"
              className="inline-flex h-11 items-center justify-center rounded-full border border-blue-100 bg-white px-4 text-sm font-black text-blue-700 hover:bg-blue-50"
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Chat with team
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function isPublicLiveProperty(property: any) {
  const rawStatus = String(
    property?.status ||
      property?.publication_status ||
      property?.publicationStatus ||
      "",
  ).toLowerCase();

  const explicitlyPublished =
    property?.is_published === true ||
    property?.isPublished === true ||
    property?.published === true ||
    Boolean(property?.published_at || property?.publishedAt);

  if (explicitlyPublished) return true;

  return rawStatus === "live" || rawStatus === "published" || rawStatus === "active";
}

function filterPublicLiveProperties(properties: any[]) {
  return Array.isArray(properties) ? properties.filter(isPublicLiveProperty) : [];
}

function resolveSearchTab(tab: string | null, intent: string | null) {
  const cleanTab = (tab || "").toLowerCase().trim();
  const cleanIntent = (intent || "").toLowerCase().trim();

  if (cleanTab === "rent" || cleanTab === "buy" || cleanTab === "societies") {
    return cleanTab;
  }

  if (cleanIntent === "rent") {
    return "rent";
  }

  if (cleanIntent === "buy" || cleanIntent === "resale" || cleanIntent === "sale") {
    return "buy";
  }

  return "societies";
}

export function SearchPage() {
  const searchPageParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const fromMapParam = searchPageParams.get("fromMap") === "1";
  const mapSocietyParam = searchPageParams.get("society") || "";

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const rawIntent = searchParams.get("intent");
  const initialTab = resolveSearchTab(rawTab, rawIntent);
  const initialQuery =
    searchParams.get("q") || searchParams.get("locality") || "";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showMap, setShowMap] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1200px)").matches,
  );
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadStatus, setLeadStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const [societies, setSocieties] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [aiMatches, setAiMatches] = useState<AdvisorMatch[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [dataStatus, setDataStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let societiesFailed = false;
    let propertiesFailed = false;

    Promise.allSettled([fetchPublicSocieties(), fetchPublicProperties()]).then(
      ([societiesResult, propertiesResult]) => {
        if (societiesResult.status === "fulfilled") {
          setSocieties(societiesResult.value);
        } else {
          societiesFailed = true;
          console.error("Societies fetch failed:", societiesResult.reason);
        }

        if (propertiesResult.status === "fulfilled") {
          setProperties(filterPublicLiveProperties(propertiesResult.value));
        } else {
          propertiesFailed = true;
          console.error("Properties fetch failed:", propertiesResult.reason);
        }

        setDataStatus(societiesFailed && propertiesFailed ? "error" : "ready");
      },
    );
  }, []);

  useEffect(() => {
    const nextTab = resolveSearchTab(searchParams.get("tab"), searchParams.get("intent"));
    const nextQuery = searchParams.get("q") || searchParams.get("locality") || "";

    setActiveTab(nextTab);
    setQuery(nextQuery);

    setPublicSeo(
      `SocietyFlats Search${nextQuery ? ` | ${nextQuery}` : ""}`,
      "Search live verified Gurgaon society homes, published society profiles and AI-assisted recommendations on SocietyFlats.",
    );
  }, [searchParams]);

  const isAiSearch = searchParams.get("intent") === "general";

  useEffect(() => {
    const aiQuery = (searchParams.get("q") || searchParams.get("locality") || "").trim();

    if (!isAiSearch || !aiQuery) {
      setAiMatches([]);
      return;
    }

    let cancelled = false;
    setIsAiLoading(true);

    fetch(`${getApiBaseUrl()}/ai/advisor`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: aiQuery, intent: "general" }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("AI search failed");
        return response.json();
      })
      .then((payload) => {
        if (!cancelled) {
          setAiMatches(Array.isArray(payload?.matches) ? payload.matches : []);
        }
      })
      .catch((error) => {
        console.error("AI search fetch failed:", error);
        if (!cancelled) setAiMatches([]);
      })
      .finally(() => {
        if (!cancelled) setIsAiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAiSearch, searchParams]);

  const filteredSocieties = useMemo(() => {
    if (isSectorLikeQuery(query)) {
      return societies.filter((society) => societyMatchesSectorQuery(society, query));
    }

    return sortedSearchResults(societies, query, expandedSocietySearchText);
  }, [query, societies]);

  const aiSocietyResults = useMemo(
    () =>
      aiMatches.map((match, index) => ({
        id: match.id || `ai-${index}`,
        name: match.society_name,
        slug: match.slug || "",
        sector: match.sector || "",
        locality: match.locality || "Gurgaon",
        score: match.score,
        rentRange: match.rent_range,
        buyRange: match.buy_range,
        description: match.reason,
        aiReason: match.reason,
        aiTags: match.tags || [],
      })),
    [aiMatches],
  );

  const societyResults =
    activeTab === "societies" && isAiSearch && aiSocietyResults.length > 0
      ? aiSocietyResults
      : filteredSocieties;

  const filteredProperties = useMemo(() => {
    const typedProperties = properties.filter((property) => {
      const listingType = String(property?.listingType || "").toLowerCase();
      return activeTab === "rent"
        ? listingType.includes("rent")
        : activeTab === "buy"
          ? saleListingTypes.some((type) => listingType === type.toLowerCase())
          : true;
    });

    return sortedSearchResults(typedProperties, query, (property) =>
      searchableText(
        property?.title,
        property?.society,
        property?.locality,
        property?.price,
        property?.listingType,
        property?.bedrooms,
        property?.bathrooms,
        property?.areaSqft,
        property?.floor,
        property?.furnishedStatus,
        property?.description,
        safeJoin(property?.amenities),
      ),
    );
  }, [activeTab, properties, query]);

  const updateUrl = (tab: string, searchValue: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    if (searchValue.trim()) params.set("q", searchValue.trim());
    else params.delete("q");
    if (tab !== "societies") params.delete("intent");
    params.delete("locality");
    setSearchParams(params);
  };

  const updateTab = (tab: string) => {
    trackEvent("search_tab_changed", {
      tab,
      search_query: query,
      source: "search_page",
    });
    setActiveTab(tab);
    updateUrl(tab, query);
  };

  const submitSearch = () => {
    trackSearchPerformed({
      source: "search_page",
      tab: activeTab,
      search_query: query,
      lead_intent: activeTab,
    });
    updateUrl(activeTab, query);
  };

  const applyQuickSearch = (value: string) => {
    setQuery(value);
    updateUrl(activeTab, value);
  };

  const submitLead = async () => {
    if (isSubmittingLead || leadStatus === "success") return;

    const normalizedPhone = cleanLeadPhone(leadPhone);

    if (!leadName.trim() || !isValidLeadPhone(normalizedPhone)) {
      setLeadStatus("error");
      return;
    }

    const noResultTrackingPayload = cleanLeadTrackingPayload({
      cta_label: "No results callback",
      lead_intent: activeTab,
      search_query: query || "",
      entity_type: activeTab === "societies" ? "society" : "property",
      entity_slug: "",
    });

    setIsSubmittingLead(true);
    setLeadStatus("idle");

    try {
      const response = await fetch(`${getApiBaseUrl()}/leads`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: leadName.trim(),
          phone: normalizedPhone,
          source: `search_no_results_${activeTab}`,
          requirement:
            activeTab === "rent"
              ? "Rent"
              : activeTab === "buy"
                ? "Buy"
                : "Society search",
          message: [
            `Search page no-result lead`,
            `Query: ${query || "No query"}`,
            `Intent: ${resultLabel(activeTab)}`,
            `Requested help: Find matching ${activeTab === "societies" ? "societies/homes" : "homes"}`,
          ].join(" | "),
          ...noResultTrackingPayload,
        }),
      });

      if (!response.ok) throw new Error("Lead submit failed");

      trackLeadSubmitted({
        ...noResultTrackingPayload,
        source: `search_no_results_${activeTab}`,
      });
      setLeadStatus("success");
      setLeadName("");
      setLeadPhone("");
    } catch (error) {
      console.error("Search lead submission failed:", error);
      setLeadStatus("error");
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const { compareList, addToCompare, removeFromCompare } = useAppStore();
  const liveSocietyIds = useMemo(
    () => new Set(societies.map((society: any) => String(society?.id)).filter(Boolean)),
    [societies],
  );
  const liveCompareCount = compareList.filter((item: any) => liveSocietyIds.has(String(item?.id))).length;
  const isSocietyCompared = (society: any) =>
    compareList.some((item: any) => String(item.id) === String(society?.id));

  useEffect(() => {
    compareList.forEach((item: any) => {
      if (item?.id && !liveSocietyIds.has(String(item.id))) {
        removeFromCompare(item.id);
      }
    });
  }, [compareList, liveSocietyIds, removeFromCompare]);

  const toggleSocietyCompare = (society: any) => {
    if (!society?.id) return;

    if (isSocietyCompared(society)) {
      removeFromCompare(society.id);
      trackEvent("society_removed_from_compare", {
        source: "search_page",
        entity_type: "society",
        entity_slug: society?.slug || "",
        entity_name: society?.name || "",
        search_query: query || "",
      });
      return;
    }

    if (liveCompareCount >= 3) {
      trackEvent("compare_limit_reached", {
        source: "search_page",
        search_query: query || "",
      });
      return;
    }

    addToCompare(society);
    trackEvent("society_added_to_compare", {
      source: "search_page",
      entity_type: "society",
      entity_slug: society?.slug || "",
      entity_name: society?.name || "",
      search_query: query || "",
    });
  };

  const visibleCount =
    activeTab === "societies"
      ? societyResults.length
      : filteredProperties.length;
  const selectedSociety = societyResults[0];
  const recommendedSocieties = societyResults.slice(0, 3);
  const aiRecommendedSocieties = useMemo(() => {
    const base = societyResults.length > 0 ? societyResults : societies;
    return base.slice(0, 3);
  }, [societyResults, societies]);
  const aiRecommendedProperties = useMemo(() => {
    const base =
      filteredProperties.length > 0 ? filteredProperties : properties;
    return base.slice(0, 3);
  }, [filteredProperties, properties]);

  const [callbackTarget, setCallbackTarget] = useState<{
    type: "society" | "property";
    societyName: string;
    propertyTitle?: string;
    propertySlug?: string;
    propertyIntent?: "Rent" | "Buy" | "Callback";
    source: string;
  } | null>(null);

  const openSocietyCallback = (society: any) => {
    setCallbackTarget({
      type: "society",
      societyName: society?.name || "Selected society",
      source: `search_society_card_${activeTab}`,
    });
  };

  const openMapSearchCallback = () => {
    const context = mapSocietyParam || searchPageParams.get("q") || query || "Gurgaon map search";

    setCallbackTarget({
      type: "society",
      societyName: context,
      propertyIntent: "Callback",
      source: "map_search_conversion",
    });
  };

  const openPropertyCallback = (property: any) => {
    const listingType = String(property?.listingType || "").toLowerCase();
    const propertyIntent =
      listingType.includes("rent")
        ? "Rent"
        : listingType.includes("sale") ||
            listingType.includes("buy") ||
            listingType.includes("resale") ||
            listingType.includes("builder")
          ? "Buy"
          : "Callback";

    setCallbackTarget({
      type: "property",
      societyName: property?.society || "Selected society",
      propertyTitle: property?.title || "Selected property",
      propertySlug: property?.slug || "",
      propertyIntent,
      source: `search_property_card_${propertyIntent.toLowerCase()}`,
    });
  };

  const callbackTitle =
    callbackTarget?.type === "property"
      ? "Check property availability"
      : "Request society shortlist";

  const callbackSubtitle =
    callbackTarget?.type === "property"
      ? "Share your mobile number and our team will help verify availability, pricing and visit timing for this home."
      : "Share your mobile number and our team will help with availability, matching homes and visit planning for this society.";

  const callbackMessage =
    callbackTarget?.type === "property"
      ? `I want a callback for ${callbackTarget.propertyTitle} in ${callbackTarget.societyName}. Search query: ${query || "No query"}.`
      : `I want a callback for ${callbackTarget?.societyName || "this society"}. Search query: ${query || "No query"}.`;

  const callbackRequirement =
    callbackTarget?.type === "property"
      ? callbackTarget.propertyIntent || "Callback"
      : activeTab === "rent"
        ? "Rent"
        : activeTab === "buy"
          ? "Buy"
          : `Society enquiry for ${callbackTarget?.societyName || "this society"}`;

  return (
    <div className="min-h-screen bg-[#F8F3EA]">
      <section className="sticky top-0 z-30 border-b border-navy-100 bg-white/95 backdrop-blur">
        <div className="container mx-auto px-3 py-2 md:px-4 md:py-2.5">
          <h1 className="sr-only">Search Gurgaon societies and homes</h1>

          <div className="rounded-[1.25rem] border border-blue-100 bg-white p-2 shadow-sm md:p-2.5">
            <div className="flex flex-col gap-2 md:grid md:grid-cols-[auto_1fr_auto_auto] md:items-center md:gap-2">
              <div className="grid w-full grid-cols-3 gap-1.5 md:flex md:w-auto md:flex-wrap md:gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => updateTab(tab.key)}
                      className={cn(
                        "inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-full px-1.5 text-[12px] font-black transition md:h-10 md:justify-start md:gap-2 md:px-4 md:text-sm md:font-bold",
                        activeTab === tab.key
                          ? "bg-blue-700 text-white shadow-sm shadow-blue-100"
                          : "bg-blue-50 text-navy-600 hover:bg-blue-100",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="md:hidden">{tab.mobileLabel}</span>
                      <span className="hidden md:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400 md:left-5 md:h-5 md:w-5" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && submitSearch()}
                    placeholder="Search society, sector or landmark..."
                    className="h-10 rounded-full border-blue-100 bg-blue-50/45 pl-10 text-sm font-semibold md:h-10 md:pl-12 md:text-base"
                  />
                </div>
                <Button
                  onClick={submitSearch}
                  className="h-10 w-10 shrink-0 rounded-full bg-blue-700 px-0 font-black hover:bg-blue-800 md:w-auto md:px-6"
                  aria-label="Search"
                >
                  <Search className="h-5 w-5 md:hidden" />
                  <span className="hidden md:inline">Search</span>
                </Button>
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <SaveSearchButton
                  filters={{ ...Object.fromEntries(searchParams.entries()), q: query, tab: activeTab }}
                  suggestedName={`${query || quickLocalities[0]} · ${activeTab}`}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-full"
                  onClick={() => setShowMap((value) => !value)}
                >
                  <MapPinned className="mr-2 h-4 w-4" />{" "}
                  {showMap ? "Hide map" : "Map"}
                </Button>
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "h-11 rounded-full",
                    viewMode === "grid" && "bg-navy-50",
                  )}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "h-11 rounded-full",
                    viewMode === "list" && "bg-navy-50",
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {fromMapParam ? (
        <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-[1.5rem] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-slate-50 p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                  Continued from map
                </p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-navy-950">
                  {mapSocietyParam ? `Homes and societies near ${mapSocietyParam}` : "Homes and societies from your map selection"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-500">
                  You came from the map. Continue with society-first matches, compare nearby profiles, or request verified homes around the same location.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                <Link
                  to={`/maps?q=${encodeURIComponent(mapSocietyParam || searchPageParams.get("q") || "Gurgaon societies")}&fromSearch=1`}
                  className="inline-flex items-center justify-center rounded-full border border-blue-100 bg-white px-5 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-50"
                >
                  Back to map
                </Link>
                <Link
                  to={`/ai-advisor?q=${encodeURIComponent(mapSocietyParam || searchPageParams.get("q") || "Gurgaon society homes")}`}
                  className="inline-flex items-center justify-center rounded-full bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
                >
                  Ask AI for nearby homes
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}


      <section className="container mx-auto px-3 pb-36 pt-2 md:px-4 md:pb-10 md:pt-3">
        <div className={cn(
          "grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-4",
          showMap && "xl:grid-cols-[240px_minmax(0,1fr)_minmax(330px,38vw)]",
        )}>
          <aside className="hidden space-y-3 lg:sticky lg:top-[5.75rem] lg:block lg:self-start">
            <div className="rounded-[1.25rem] border border-navy-100 bg-white p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-navy-900">Filters</h2>
                <SlidersHorizontal className="h-4 w-4 text-navy-400" />
              </div>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-navy-400">
                    Intent
                  </p>
                  <div className="mt-2 grid gap-1.5">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => updateTab(tab.key)}
                          className={cn(
                            "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold transition",
                            activeTab === tab.key
                              ? "bg-blue-50 text-blue-700"
                              : "bg-ivory-200 text-navy-600 hover:bg-navy-50",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" /> {tab.label}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-navy-400">
                    Popular locality
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {quickLocalities.map((item) => (
                      <button
                        key={item}
                        onClick={() => applyQuickSearch(item)}
                        className="shrink-0 rounded-full border border-navy-100 bg-white px-2.5 py-1 text-[11px] font-bold text-navy-600 hover:border-blue-200 hover:bg-blue-50"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-[#EFF6FF] p-3">
                  <div className="flex items-center gap-2 text-sm font-black text-blue-700">
                    <Shield className="h-4 w-4" /> Public-safe data
                  </div>
                  <p className="mt-1.5 text-[11px] leading-5 text-navy-500">
                    Only live verified properties and published society profiles are shown here. Draft and unverified inventory stays hidden from public search.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50 p-3.5 text-navy-900 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black">AI shortlist</h3>
                  <p className="text-[11px] font-bold text-blue-700">
                    Rank this search
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-navy-600">
                Get a quick shortlist by budget, commute and lifestyle.
              </p>
              <Button
                asChild
                className="mt-3 h-9 w-full rounded-full bg-blue-600 text-xs font-black text-white hover:bg-blue-700"
              >
                <Link to={`/ai-advisor?q=${encodeURIComponent(query)}`}>
                  Open AI Advisor
                </Link>
              </Button>
            </div>
          </aside>

          <div className="min-w-0 space-y-3 md:space-y-4">
            <div className="rounded-[1.2rem] border border-blue-100 bg-white p-2.5 shadow-sm md:rounded-[1.35rem] md:p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600 md:text-sm md:normal-case md:tracking-normal md:text-navy-500">
                    {isAiLoading && activeTab === "societies"
                      ? "Finding AI matches..."
                      : `${visibleCount} ${resultLabel(activeTab).toLowerCase()} result${visibleCount === 1 ? "" : "s"} found`}
                  </p>
                  <h2 className="mt-0.5 line-clamp-2 text-base font-black text-navy-950 md:mt-0 md:text-xl">
                    {query
                      ? `Matches for “${query}”`
                      : "Published SocietyFlats inventory"}
                  </h2>
                </div>
                <div className="hidden flex-wrap gap-2 md:flex">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full md:hidden"
                    onClick={() => setShowMap((value) => !value)}
                  >
                    <MapPinned className="mr-2 h-4 w-4" />{" "}
                    {showMap ? "Hide map" : "Map"}
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="hidden rounded-full md:inline-flex"
                  >
                    <Link to="/compare">Compare {liveCompareCount ? `(${liveCompareCount})` : ""}</Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="rounded-full bg-blue-600 hover:bg-blue-700 md:h-10 md:px-4"
                  >
                    <Link
                      to={`/recommendations?q=${encodeURIComponent(query)}`}
                    >
                      <span className="md:hidden">AI Match</span>
                      <span className="hidden md:inline">Smart match</span>
                    </Link>
                  </Button>
                </div>
              </div>

              {activeTab === "societies" ? (
                <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-xs font-bold text-blue-700 md:flex-row md:items-center md:justify-between">
                  <span>
                    Compare flow: tap Compare on up to 3 society cards, then open the Compare page.
                  </span>
                  <Link to="/compare" className="inline-flex items-center font-black text-blue-800">
                    Open compare {liveCompareCount ? `(${liveCompareCount})` : ""}
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : null}

              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {quickLocalities.map((item) => (
                  <button
                    key={item}
                    onClick={() => applyQuickSearch(item)}
                    className="shrink-0 rounded-full border border-navy-100 bg-ivory-100 px-3 py-1.5 text-xs font-bold text-navy-600"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {showMap ? (
              <div className="grid gap-4 rounded-[1.5rem] border border-navy-100 bg-white p-4 shadow-sm lg:hidden">
                <div className="min-h-[300px] rounded-[1.25rem] bg-[radial-gradient(circle_at_22%_25%,rgba(194,114,78,0.16),transparent_24%),linear-gradient(135deg,#DDE7DC,#F8F3EA)] p-5">
                  <div className="flex h-full flex-col justify-between gap-8">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                        Map intelligence
                      </p>
                      <h3 className="mt-2 text-2xl font-bold text-navy-900">
                        {selectedSociety?.name || "Select a society"}
                      </h3>
                      <p className="mt-1 text-navy-500">
                        {selectedSociety
                          ? formatPublicLocation(selectedSociety)
                          : "Search results will anchor this map panel."}
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {recommendedSocieties.map((society) => (
                        <Link
                          key={society.id}
                          to={society.slug ? `/society/${society.slug}` : "/societies"}
                          className="rounded-2xl bg-white/90 p-3 shadow-sm"
                        >
                          <p className="text-sm font-bold text-navy-900">
                            {society.name}
                          </p>
                          <p className="mt-1 text-xs text-navy-500">
                            {formatPublicLocation(society)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-[1.25rem] bg-ivory-200 p-4">
                  <h3 className="font-bold text-navy-900">Nearby context</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-navy-400">Metro</p>
                      <p className="font-semibold text-navy-800">
                        {selectedSociety?.nearbyMetro || "Needs verification"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-navy-400">Office hubs</p>
                      <p className="font-semibold text-navy-800">
                        {selectedSociety?.nearbyOfficeHubs ||
                          "Needs verification"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-navy-400">Map pin</p>
                      <p className="font-semibold text-navy-800">
                        {selectedSociety?.latitude && selectedSociety?.longitude
                          ? "Available"
                          : "Admin review pending"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {dataStatus === "loading" && visibleCount === 0 ? (
              <div className={cn(
                "grid gap-3 md:grid-cols-2 md:gap-3",
                showMap ? "xl:grid-cols-1 2xl:grid-cols-2" : "xl:grid-cols-3",
              )}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`search-skeleton-${index}`}
                    className="h-56 animate-pulse rounded-[1.2rem] border border-blue-100 bg-blue-50/60"
                  />
                ))}
              </div>
            ) : dataStatus === "error" && visibleCount === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-red-200 bg-red-50 p-6 text-red-700">
                <p className="font-black">Could not load live listings right now.</p>
                <p className="mt-1 text-sm font-semibold">
                  This is usually temporary. Please refresh, or try again in a moment.
                </p>
                <Button
                  variant="outline"
                  className="mt-3 h-9 rounded-full border-red-200 bg-white px-4 text-sm font-extrabold text-red-700 hover:bg-red-50"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            ) : visibleCount === 0 ? (
              <EmptyResults
                activeTab={activeTab}
                query={query}
                leadName={leadName}
                leadPhone={leadPhone}
                leadStatus={leadStatus}
                isSubmittingLead={isSubmittingLead}
                onLeadNameChange={setLeadName}
                onLeadPhoneChange={setLeadPhone}
                onSubmitLead={submitLead}
              />
            ) : activeTab === "societies" ? (
              <div className={cn(
                "grid gap-3 md:grid-cols-2 md:gap-3",
                showMap ? "xl:grid-cols-1 2xl:grid-cols-2" : "xl:grid-cols-3",
              )}>
                {societyResults.map((society) => {
                  const imageAttribution = societyImageAttribution(society);

                  return (
                  <article
                    key={society.id}
                    className="group overflow-hidden rounded-[1.2rem] border border-blue-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-apple"
                  >
                    <Link
                      to={society.slug ? `/society/${society.slug}` : "/societies"}
                      className="block"
                    >
                      <div className="relative h-24 overflow-hidden bg-navy-50 md:h-32">
                        <img
                          src={societyImage(society)}
                          alt={society.name}
                          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/30 via-transparent to-transparent" />
                        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-blue-700">
                          Society
                        </span>
                        <span
                          className="absolute bottom-2 left-3 z-20 max-w-[72%] truncate rounded-full bg-slate-950/90 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm ring-1 ring-white/20 backdrop-blur"
                          title={imageAttribution.title}
                        >
                          {imageAttribution.label}
                        </span>
                        <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-navy-900">
                          Score {society.score || "New"}
                        </span>
                      </div>
                    </Link>

                    <div className="p-3 md:p-3.5">
                      <h2 className="line-clamp-1 text-base font-black text-navy-950 md:text-lg">
                        {society.name}
                      </h2>

                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-navy-500">
                        <MapPin className="h-4 w-4 shrink-0" />{" "}
                        <span className="line-clamp-1">{formatPublicLocation(society)}</span>
                      </p>

                      {society.aiReason ? (
                        <p className="mt-2 rounded-2xl bg-blue-50 px-3 py-1.5 text-xs font-bold leading-5 text-blue-700">
                          AI match: {society.aiReason}
                        </p>
                      ) : null}

                      <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-blue-50/55 p-2.5 text-sm">
                        <div>
                          <p className="text-navy-400">Rent</p>
                          <p className="line-clamp-1 font-black text-navy-900">
                            {compactValue(society.rentRange)}
                          </p>
                        </div>
                        <div>
                          <p className="text-navy-400">Buy</p>
                          <p className="line-clamp-1 font-black text-navy-900">
                            {compactValue(society.buyRange)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 grid gap-1.5">
                        <Button asChild className="h-9 w-full rounded-full bg-navy-700 px-3 text-sm hover:bg-navy-800">
                          <Link to={society.slug ? `/society/${society.slug}` : "/societies"}>
                            View Society
                          </Link>
                        </Button>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className={
                              isSocietyCompared(society)
                                ? "h-8 w-full rounded-full border-emerald-100 bg-emerald-50 px-2 text-xs font-black text-emerald-700 md:text-sm"
                                : "h-8 w-full rounded-full border-blue-100 px-2 text-xs font-black text-blue-700 md:text-sm"
                            }
                            onClick={() => toggleSocietyCompare(society)}
                            title={liveCompareCount >= 3 && !isSocietyCompared(society) ? "Compare limit reached. Remove one society first." : "Add society to compare"}
                          >
                            <Scale className="mr-1.5 h-3.5 w-3.5" />
                            {isSocietyCompared(society) ? "Added" : liveCompareCount >= 3 ? "Compare full" : "Compare"}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 w-full rounded-full border-navy-100 px-2 text-xs font-bold md:text-sm"
                            onClick={() => openSocietyCallback(society)}
                          >
                            Callback
                          </Button>
                        </div>

                        <Button asChild variant="outline" className="h-8 w-full rounded-full border-blue-100 px-2 text-xs font-bold text-blue-700 md:text-sm">
                          <Link to={societySearchUrl(society, "rent")}>
                            View Homes
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </article>
                  );
                })}
              </div>
            ) : (
              <div
                className={cn(
                  viewMode === "grid"
                    ? cn("grid gap-3 md:grid-cols-2 md:gap-4", showMap ? "xl:grid-cols-1 2xl:grid-cols-2" : "xl:grid-cols-3")
                    : "space-y-4",
                )}
              >
                {filteredProperties.map((property) => (
                  <article
                    key={property.id}
                    className={cn(
                      "group overflow-hidden border border-navy-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-apple",
                      viewMode === "grid"
                        ? "rounded-[1.25rem]"
                        : "grid rounded-[1.5rem] md:grid-cols-[260px_1fr]",
                    )}
                  >
                    <Link to={propertyUrl(property)} className="block">
                      <div
                        className={cn(
                          "relative overflow-hidden bg-navy-50",
                          viewMode === "grid" ? "h-24 md:h-32" : "h-28 md:h-full",
                        )}
                      >
                        <img
                          src={propertyImage(property)}
                          alt={property.title}
                          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                        />
                        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-blue-700">
                          {activeTab === "rent" ? "Rent" : "Buy / Resale"}
                        </span>
                      </div>
                    </Link>

                    <div className="p-3 md:p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {property.listingType}
                        </span>
                        {property.verified ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                          </span>
                        ) : null}
                      </div>

                      <h2 className="mt-3 line-clamp-2 text-lg font-black text-navy-950 md:text-xl">
                        {property.title}
                      </h2>

                      <p className="mt-1.5 line-clamp-1 text-sm font-semibold text-navy-500">
                        {property.society || "Gurgaon"} • {property.locality || "Verified listing"}
                      </p>

                      <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-2xl bg-blue-50/55 p-2.5 md:mt-3 md:p-3">
                        <div>
                          <p className="text-xs text-navy-400">Price</p>
                          <p className="line-clamp-1 font-black text-navy-900">
                            {compactValue(property.price)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-navy-400">BHK</p>
                          <p className="font-black text-navy-900">{property.bedrooms || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-navy-400">Area</p>
                          <p className="line-clamp-1 font-black text-navy-900">{property.areaSqft || "-"} sq.ft</p>
                        </div>
                      </div>

                      <div className="mt-2.5 grid gap-1.5">
                        <Button asChild className="h-9 w-full rounded-full bg-navy-700 px-3 text-sm hover:bg-navy-800">
                          <Link to={propertyUrl(property)}>
                            View Property
                          </Link>
                        </Button>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 w-full rounded-full border-blue-100 px-2 text-xs font-bold text-blue-700 md:text-sm"
                            onClick={() => openPropertyCallback(property)}
                          >
                            Callback
                          </Button>

                          {property.society ? (
                            <Button asChild variant="outline" className="h-8 w-full rounded-full border-navy-100 px-2 text-xs font-bold md:text-sm">
                              <Link to={`/search?tab=societies&q=${encodeURIComponent(property.society)}`}>
                                Society
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}


            {fromMapParam ? (
              <section className="rounded-[1.5rem] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-slate-50 p-4 shadow-sm md:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                      Verified homes request
                    </p>
                    <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-navy-950">
                      Need verified homes around this location?
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-500">
                      Share your budget and preferred size. SocietyFlats will shortlist verified available homes around the selected society or nearby sectors.
                    </p>
                    <p className="mt-2 text-xs font-bold text-blue-600">
                      Lead source: Map search{mapSocietyParam ? ` • ${mapSocietyParam}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      to={`/search?tab=societies&intent=general&q=${encodeURIComponent(mapSocietyParam || searchPageParams.get("q") || "Gurgaon societies")}`}
                      className="inline-flex items-center justify-center rounded-full border border-blue-100 bg-white px-5 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-50"
                    >
                      Compare nearby societies
                    </Link>
                    <button
                      type="button"
                      onClick={openMapSearchCallback}
                      className="inline-flex items-center justify-center rounded-full bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
                    >
                      Request homes nearby
                    </button>
                  </div>
                </div>
              </section>
            ) : null}


            <div className="rounded-[1.2rem] border border-blue-100 bg-white p-3 shadow-sm md:rounded-[1.35rem] md:p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700 md:text-xs md:tracking-[0.16em]">
                    <Sparkles className="h-4 w-4" /> Smart recommendations
                  </p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-navy-950 md:text-xl">
                    Similar matches for{" "}
                    {query ? `“${query}”` : "your Gurgaon search"}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-navy-500 md:text-sm md:leading-6">
                    Based on your search intent, budget signals, locality and
                    available live published inventory.
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="w-full rounded-full border-blue-100 bg-white font-bold text-blue-700 hover:bg-blue-50 md:w-fit"
                >
                  <Link
                    to={`/ai-advisor?q=${encodeURIComponent(query || resultLabel(activeTab))}`}
                  >
                    Ask AI Advisor
                  </Link>
                </Button>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-3 md:gap-2">
                {(activeTab === "societies"
                  ? aiRecommendedSocieties
                  : aiRecommendedProperties
                ).map((item: any, index: number) => {
                  const isSociety = activeTab === "societies";
                  const title = isSociety ? item.name : item.title;
                  const subtitle = isSociety
                    ? formatPublicLocation(item)
                    : `${item.society || "Gurgaon"} • ${item.locality || "Verified listing"}`;
                  const link = isSociety
                    ? `/society/${item.slug}`
                    : propertyUrl(item);
                  const image = isSociety
                    ? societyImage(item)
                    : propertyImage(item);
                  const reason =
                    index === 0
                      ? "Closest match to your search"
                      : index === 1
                        ? "Good location and lifestyle fit"
                        : "Worth shortlisting as an alternative";

                  return (
                    <Link
                      key={`${isSociety ? "society" : "property"}-${item.id}-${index}`}
                      to={link}
                      className={cn(
                        "group overflow-hidden rounded-[1.1rem] border border-blue-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft md:rounded-[1.25rem]",
                        index > 1 && "hidden md:block",
                      )}
                    >
                      <div className="flex gap-3 p-2.5 md:p-3">
                        <img
                          src={image}
                          alt={title}
                          className="h-16 w-20 shrink-0 rounded-2xl object-cover md:h-20 md:w-24"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 md:py-1">
                              AI #{index + 1}
                            </span>
                            {isSociety && item.score ? (
                              <span className="text-[11px] font-bold text-navy-400">
                                Score {item.score}
                              </span>
                            ) : null}
                          </div>
                          <h4 className="mt-1.5 line-clamp-1 text-sm font-black text-navy-950 group-hover:text-blue-700 md:mt-2">
                            {title}
                          </h4>
                          <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-navy-500 md:mt-1">
                            {subtitle}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between gap-2 md:mt-2">
                            <p className="line-clamp-1 text-xs leading-5 text-navy-500 md:line-clamp-2">
                              {reason}
                            </p>
                            <span className="shrink-0 text-xs font-black text-blue-700">
                              View →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-3 flex justify-center md:mt-4">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs font-black text-blue-700 hover:bg-blue-50 hover:text-blue-800 md:text-sm"
                >
                  <Link to={`/search?tab=${activeTab}&q=${encodeURIComponent(query || "")}`}>
                    View all similar matches
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {showMap ? (
            <aside className="sticky top-[5.75rem] hidden h-[calc(100vh-7rem)] self-start overflow-hidden rounded-[1.4rem] border border-[#E7DCCB] bg-white shadow-sm xl:flex xl:flex-col">
              <div className="border-b border-[#E7DCCB] px-5 py-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2A6147]">Live map intelligence</p>
                <h2 className="mt-1 text-xl font-medium text-[#10251F]">Societies around your search</h2>
                <p className="mt-1 text-xs leading-5 text-[#6E756E]">Select a result to inspect its location and published nearby context.</p>
              </div>
              <div className="relative min-h-0 flex-1 bg-[#DDE7DC] [background-image:repeating-linear-gradient(0deg,#C8D7C7_0_1px,transparent_1px_48px),repeating-linear-gradient(90deg,#C8D7C7_0_1px,transparent_1px_48px)]">
                <div className="absolute inset-x-8 top-[22%] h-px rotate-[-16deg] bg-[#C2724E]/60" />
                <div className="absolute inset-x-12 top-[58%] h-px rotate-[12deg] bg-[#2A6147]/35" />
                {recommendedSocieties.slice(0, 3).map((society, index) => (
                  <Link
                    key={society.id}
                    to={society.slug ? `/society/${society.slug}` : "/societies"}
                    className={cn(
                      "absolute max-w-[210px] rounded-[12px] border border-[#E7DCCB] bg-[#FFFBF3] p-3 shadow-[0_12px_30px_-18px_rgba(16,37,31,.4)]",
                      index === 0 && "left-[8%] top-[12%]",
                      index === 1 && "right-[6%] top-[42%]",
                      index === 2 && "left-[14%] top-[70%]",
                    )}
                  >
                    <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#123C32] text-[11px] font-black text-white">{index + 1}</span>
                    <p className="line-clamp-1 text-sm font-bold text-[#10251F]">{society.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-[#6E756E]">{formatPublicLocation(society)}</p>
                  </Link>
                ))}
                {!recommendedSocieties.length ? (
                  <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                    <div className="rounded-[16px] border border-[#E7DCCB] bg-[#FFFBF3] p-5">
                      <MapPin className="mx-auto h-6 w-6 text-[#2A6147]" />
                      <p className="mt-2 text-sm font-bold text-[#10251F]">Map results will appear here</p>
                      <p className="mt-1 text-xs leading-5 text-[#6E756E]">Search a society, builder or sector to anchor the map.</p>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-[#E7DCCB] p-3">
                <Link to="/maps" className="rounded-[10px] border border-[#E7DCCB] px-3 py-2.5 text-center text-xs font-bold text-[#123C32]">Open full map</Link>
                <Link to={`/ai-advisor?q=${encodeURIComponent(query || "Gurgaon societies")}`} className="rounded-[10px] bg-[#123C32] px-3 py-2.5 text-center text-xs font-bold text-white">Ask AI</Link>
              </div>
            </aside>
          ) : null}
        </div>
      </section>
      <PublicLeadModal
        open={Boolean(callbackTarget)}
        title={callbackTitle}
        subtitle={callbackSubtitle}
        source={callbackTarget?.source || "search_page"}
        ctaLabel={callbackTarget?.source?.includes("no_results") ? "No results callback" : "Search page callback"}
        leadIntent={activeTab}
        trackingContext={{
          cta_label: callbackTarget?.source?.includes("no_results") ? "No results callback" : "Search page callback",
          lead_intent: activeTab,
          search_query: query || "",
          entity_type: callbackTarget?.propertySlug ? "property" : "society",
          entity_slug: callbackTarget?.propertySlug || "",
        }}
        societyName={callbackTarget?.societyName || ""}
        propertyTitle={callbackTarget?.propertyTitle || ""}
        propertySlug={callbackTarget?.propertySlug || ""}
        defaultMessage={callbackMessage}
        defaultRequirement={callbackRequirement}
        submitLabel="Request callback"
        onClose={() => setCallbackTarget(null)}
      />
    </div>
  );
}
