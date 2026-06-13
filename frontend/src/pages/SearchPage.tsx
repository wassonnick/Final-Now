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
  Shield,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLeadModal } from "@/components/leads/PublicLeadModal";
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
    <div className="overflow-hidden rounded-[1.5rem] border border-blue-100 bg-white shadow-sm md:rounded-[1.75rem]">
      <div className="bg-gradient-to-br from-blue-50 via-white to-ivory-100 p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-5 md:grid-cols-[1fr_0.9fr] md:items-center">
            <div className="text-center md:text-left">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-100 md:mx-0 md:h-12 md:w-12">
                <Search className="h-5 w-5" />
              </span>

              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700 md:mt-5 md:text-xs md:tracking-[0.18em]">
                No exact live match found
              </p>

              <h3 className="mt-2 text-xl font-black tracking-tight text-navy-950 md:text-3xl">
                {isSocietySearch
                  ? "We can still find the right society."
                  : "We can still find matching homes."}
              </h3>

              <p className="mt-2 text-sm leading-6 text-navy-500 md:mt-3 md:text-base">
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
                  Request received. Our team will contact you shortly.
                </p>
              ) : null}
              {leadStatus === "error" ? (
                <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-center text-sm font-bold text-red-600">
                  Could not submit right now. Please try again.
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
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
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const rawIntent = searchParams.get("intent");
  const initialTab = resolveSearchTab(rawTab, rawIntent);
  const initialQuery =
    searchParams.get("q") || searchParams.get("locality") || "";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showMap, setShowMap] = useState(false);
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

  useEffect(() => {
    fetchPublicSocieties()
      .then(setSocieties)
      .catch((error) => console.error("Societies fetch failed:", error));
    fetchPublicProperties()
      .then((items) => setProperties(filterPublicLiveProperties(items)))
      .catch((error) => console.error("Properties fetch failed:", error));
  }, []);

  useEffect(() => {
    setActiveTab(resolveSearchTab(searchParams.get("tab"), searchParams.get("intent")));
    setQuery(searchParams.get("q") || searchParams.get("locality") || "");
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
      body: JSON.stringify({ message: aiQuery, intent: "rent" }),
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
    const q = query.toLowerCase().trim();
    return societies.filter((society) => {
      const text = searchableText(
        society?.name,
        society?.builder,
        society?.sector,
        society?.locality,
        safeJoin(society?.amenities),
        society?.nearbyOfficeHubs,
        society?.nearbyMetro,
        society?.rentRange,
        society?.buyRange,
      );
      return !q || text.includes(q);
    });
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
    const q = query.toLowerCase().trim();
    return properties.filter((property) => {
      const typeMatch =
        activeTab === "rent"
          ? property?.listingType === "Rent"
          : activeTab === "buy"
            ? saleListingTypes.includes(property?.listingType)
            : true;
      const text = searchableText(
        property?.title,
        property?.society,
        property?.locality,
        property?.price,
        property?.listingType,
        property?.bedrooms,
        property?.areaSqft,
        safeJoin(property?.amenities),
      );
      return typeMatch && (!q || text.includes(q));
    });
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
    setActiveTab(tab);
    updateUrl(tab, query);
  };

  const submitSearch = () => {
    updateUrl(activeTab, query);
  };

  const applyQuickSearch = (value: string) => {
    setQuery(value);
    updateUrl(activeTab, value);
  };

  const submitLead = async () => {
    const normalizedPhone = cleanLeadPhone(leadPhone);

    if (!leadName.trim() || !isValidLeadPhone(normalizedPhone) || isSubmittingLead) {
      setLeadStatus("error");
      return;
    }

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
        }),
      });

      if (!response.ok) throw new Error("Lead submit failed");

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

  const visibleCount =
    activeTab === "societies"
      ? societyResults.length
      : filteredProperties.length;
  const selectedSociety = societyResults[0] || societies[0];
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
      ? "Request property callback"
      : "Request society callback";

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
    <div className="min-h-screen bg-[#F8FAFC]">
      <section className="border-b border-navy-100 bg-white/95 backdrop-blur">
        <div className="container mx-auto px-3 py-2 md:px-4 md:py-3">
          <h1 className="sr-only">Search Gurgaon societies and homes</h1>

          <div className="rounded-[1.35rem] border border-navy-100 bg-white p-2.5 shadow-sm md:p-3">
            <div className="flex flex-col gap-2 md:grid md:grid-cols-[auto_1fr_auto_auto] md:items-center md:gap-3">
              <div className="grid w-full grid-cols-[1.12fr_0.94fr_0.94fr] gap-2 md:flex md:w-auto md:flex-wrap">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => updateTab(tab.key)}
                      className={cn(
                        "inline-flex h-10 min-w-0 items-center justify-center gap-1 rounded-full px-1.5 text-[12px] font-black transition md:h-11 md:justify-start md:gap-2 md:px-4 md:text-sm md:font-bold",
                        activeTab === tab.key
                          ? "bg-navy-700 text-white"
                          : "bg-ivory-200 text-navy-600 hover:bg-navy-100",
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
                    className="h-11 rounded-full border-navy-100 pl-10 text-sm md:h-11 md:pl-12 md:text-base"
                  />
                </div>
                <Button
                  onClick={submitSearch}
                  className="h-11 w-11 shrink-0 rounded-full bg-blue-600 px-0 font-black hover:bg-blue-700 md:w-auto md:px-7"
                  aria-label="Search"
                >
                  <Search className="h-5 w-5 md:hidden" />
                  <span className="hidden md:inline">Search</span>
                </Button>
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 rounded-full"
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

      <section className="container mx-auto px-3 pb-52 pt-2 md:px-4 md:pb-10 md:pt-3">
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <aside className="hidden space-y-3 lg:sticky lg:top-24 lg:block lg:self-start">
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
                  <div className="mt-2.5 grid gap-1.5">
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
                    Only live properties and published society profiles are shown here.
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

          <div className="min-w-0 space-y-5 md:space-y-6">
            <div className="rounded-[1.25rem] border border-navy-100 bg-white p-3 shadow-sm md:rounded-[1.35rem] md:p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600 md:text-sm md:normal-case md:tracking-normal md:text-navy-500">
                    {isAiLoading && activeTab === "societies"
                      ? "Finding AI matches..."
                      : `${visibleCount} ${resultLabel(activeTab).toLowerCase()} result${visibleCount === 1 ? "" : "s"} found`}
                  </p>
                  <h2 className="mt-1 line-clamp-2 text-base font-black text-navy-950 md:mt-0 md:text-xl">
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
                    <Link to="/compare">Compare</Link>
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

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
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
              <div className="grid gap-4 rounded-[1.5rem] border border-navy-100 bg-white p-4 shadow-sm lg:grid-cols-[1fr_300px]">
                <div className="min-h-[300px] rounded-[1.25rem] bg-[radial-gradient(circle_at_22%_25%,rgba(37,99,235,0.22),transparent_24%),linear-gradient(135deg,#e8f1ff,#f8fafc)] p-5">
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

            {visibleCount === 0 ? (
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
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {societyResults.map((society) => (
                  <article
                    key={society.id}
                    className="group overflow-hidden rounded-[1.25rem] border border-navy-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-apple"
                  >
                    <Link
                      to={society.slug ? `/society/${society.slug}` : "/societies"}
                      className="block"
                    >
                      <div className="relative h-32 overflow-hidden bg-navy-50 md:h-36">
                        <img
                          src={societyImage(society)}
                          alt={society.name}
                          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/30 via-transparent to-transparent" />
                        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-blue-700">
                          Society
                        </span>
                        <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-navy-900">
                          Score {society.score || "New"}
                        </span>
                      </div>
                    </Link>

                    <div className="p-3.5 md:p-4">
                      <h2 className="line-clamp-1 text-lg font-black text-navy-950 md:text-xl">
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

                      <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-2xl bg-ivory-100 p-2.5 text-sm">
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
                          <Button asChild variant="outline" className="h-8 w-full rounded-full border-blue-100 px-2 text-xs font-bold text-blue-700 md:text-sm">
                            <Link to={societySearchUrl(society, "rent")}>
                              View Homes
                            </Link>
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
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div
                className={cn(
                  viewMode === "grid"
                    ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
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
                          viewMode === "grid" ? "h-32 md:h-36" : "h-32 md:h-full",
                        )}
                      >
                        <img
                          src={propertyImage(property)}
                          alt={property.title}
                          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                        />
                        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-blue-700">
                          {activeTab === "rent" ? "Rent" : "Buy / Resale"}
                        </span>
                      </div>
                    </Link>

                    <div className="p-3.5 md:p-4">
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

                      <h2 className="mt-4 line-clamp-2 text-xl font-black text-navy-950 md:text-2xl">
                        {property.title}
                      </h2>

                      <p className="mt-2 line-clamp-1 text-sm font-semibold text-navy-500">
                        {property.society || "Gurgaon"} • {property.locality || "Verified listing"}
                      </p>

                      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-ivory-100 p-3">
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

            <div className="rounded-[1.25rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-ivory-100 p-3 shadow-sm md:rounded-[1.5rem] md:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700 md:text-xs md:tracking-[0.16em]">
                    <Sparkles className="h-4 w-4" /> AI powered recommendations
                  </p>
                  <h3 className="mt-1 font-display text-lg font-black tracking-tight text-navy-950 md:mt-2 md:text-2xl">
                    Similar matches for{" "}
                    {query ? `“${query}”` : "your Gurgaon search"}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-navy-500 md:text-sm md:leading-6">
                    Based on your search intent, budget signals, locality and
                    available published inventory.
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

              <div className="mt-3 grid gap-2 md:mt-4 md:grid-cols-3 md:gap-3">
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
        </div>
      </section>
      <PublicLeadModal
        open={Boolean(callbackTarget)}
        title={callbackTitle}
        subtitle={callbackSubtitle}
        source={callbackTarget?.source || "search_page"}
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
