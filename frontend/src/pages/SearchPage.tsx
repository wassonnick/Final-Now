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

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-dashed border-blue-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-blue-50 via-white to-ivory-100 p-6 md:p-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-100">
            <Search className="h-5 w-5" />
          </span>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            No exact match found
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-navy-950 md:text-3xl">
            {isSocietySearch
              ? "No matching societies found yet."
              : "No matching homes found yet."}
          </h3>
          <p className="mt-3 text-sm leading-6 text-navy-500 md:text-base">
            {query
              ? `We could not find a live result for “${query}”. Leave your number and our Gurgaon team will shortlist matching ${isSocietySearch ? "societies" : "homes"} for you.`
              : `Tell us your requirement and our Gurgaon team will help you shortlist the right ${isSocietySearch ? "societies" : "homes"}.`}
          </p>

          <div className="mt-6 grid gap-3 rounded-[1.25rem] border border-blue-100 bg-white p-3 shadow-sm md:grid-cols-[1fr_1fr_auto]">
            <Input
              value={leadName}
              onChange={(event) => onLeadNameChange(event.target.value)}
              placeholder="Your name"
              className="h-12 rounded-full border-navy-100 bg-ivory-100 px-5"
            />
            <Input
              value={leadPhone}
              onChange={(event) => onLeadPhoneChange(event.target.value)}
              placeholder="Mobile number"
              className="h-12 rounded-full border-navy-100 bg-ivory-100 px-5"
            />
            <Button
              onClick={onSubmitLead}
              disabled={
                isSubmittingLead || !leadName.trim() || !leadPhone.trim()
              }
              className="h-12 rounded-full bg-blue-600 px-6 font-black text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <PhoneCall className="mr-2 h-4 w-4" />
              {isSubmittingLead ? "Sending..." : "Request callback"}
            </Button>
          </div>

          {leadStatus === "success" ? (
            <p className="mt-3 text-sm font-bold text-emerald-700">
              Request received. Our team will contact you shortly.
            </p>
          ) : null}
          {leadStatus === "error" ? (
            <p className="mt-3 text-sm font-bold text-red-600">
              Could not submit right now. Please try again.
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              to="/chat"
              className="inline-flex items-center rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Chat with team
            </Link>
            <Link
              to="/ai-advisor"
              className="inline-flex items-center rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
            >
              <Sparkles className="mr-2 h-4 w-4" /> Try AI Advisor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "societies";
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
      .then(setProperties)
      .catch((error) => console.error("Properties fetch failed:", error));
  }, []);

  useEffect(() => {
    setActiveTab(searchParams.get("tab") || "societies");
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
    if (!leadName.trim() || !leadPhone.trim() || isSubmittingLead) return;

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
          phone: leadPhone.trim(),
          source: `search_empty_state_${activeTab}`,
          message: `Search query: ${query || "No query"} | Intent: ${resultLabel(activeTab)}`,
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

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <section className="border-b border-navy-100 bg-white">
        <div className="container mx-auto px-4 py-3 md:py-8">
          <div className="hidden flex-col gap-5 md:flex lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600 md:text-sm">
                Search results
              </p>
              <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-navy-950 md:text-5xl">
                Find verified societies and homes.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-navy-500 md:text-base md:leading-7">
                Search Gurgaon societies, compare locations and open verified
                inventory from the same place.
              </p>
            </div>
            <div className="hidden flex-wrap gap-2 md:flex">
              <Button
                asChild
                variant="outline"
                className="rounded-full border-navy-200 bg-white text-navy-700"
              >
                <Link to="/compare">Compare</Link>
              </Button>
              <Button
                asChild
                className="rounded-full bg-blue-600 hover:bg-blue-700"
              >
                <Link to="/ai-advisor">
                  AI Advisor <Sparkles className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-0 rounded-[1.5rem] border border-navy-100 bg-white p-3 shadow-soft md:mt-6 md:p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && submitSearch()}
                  placeholder="Search society, sector or landmark..."
                  className="h-13 rounded-full border-navy-100 pl-12 text-sm md:h-14 md:text-base"
                />
              </div>
              <Button
                onClick={submitSearch}
                className="h-13 rounded-full bg-blue-600 px-8 font-black hover:bg-blue-700 md:h-14"
              >
                Search
              </Button>
            </div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
              <div className="grid w-full grid-cols-[1.12fr_0.94fr_0.94fr] gap-2 md:flex md:w-auto md:flex-wrap">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => updateTab(tab.key)}
                      className={cn(
                        "inline-flex h-11 min-w-0 items-center justify-center gap-1 rounded-full px-1.5 text-[13px] font-black transition md:h-auto md:justify-start md:gap-2 md:px-4 md:py-2 md:text-sm md:font-bold",
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
              <div className="ml-auto hidden items-center gap-2 md:flex">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setShowMap((value) => !value)}
                >
                  <MapPinned className="mr-2 h-4 w-4" />{" "}
                  {showMap ? "Hide map" : "Map"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "rounded-full",
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
                    "rounded-full",
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

      <section className="container mx-auto px-4 pb-52 pt-4 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:block lg:self-start">
            <div className="rounded-[1.5rem] border border-navy-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-navy-900">Filters</h2>
                <SlidersHorizontal className="h-4 w-4 text-navy-400" />
              </div>
              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-400">
                    Intent
                  </p>
                  <div className="mt-3 grid gap-2">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => updateTab(tab.key)}
                          className={cn(
                            "flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-semibold transition",
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
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-400">
                    Popular locality
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickLocalities.map((item) => (
                      <button
                        key={item}
                        onClick={() => applyQuickSearch(item)}
                        className="shrink-0 rounded-full border border-navy-100 bg-white px-3 py-2 text-xs font-semibold text-navy-600 hover:border-blue-200 hover:bg-blue-50"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#EFF6FF] p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
                    <Shield className="h-4 w-4" /> Public-safe data
                  </div>
                  <p className="mt-2 text-sm leading-6 text-navy-500">
                    Only live properties and published society profiles are
                    shown here.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-navy-100 bg-navy-900 p-5 text-white shadow-sm">
              <Bot className="h-5 w-5 text-blue-200" />
              <h3 className="mt-3 text-lg font-bold">Need a shortcut?</h3>
              <p className="mt-2 text-sm leading-6 text-navy-200">
                Let AI turn this search into a ranked shortlist by budget,
                commute and lifestyle.
              </p>
              <Button
                asChild
                className="mt-4 w-full rounded-full bg-white text-navy-900 hover:bg-navy-100"
              >
                <Link to={`/ai-advisor?q=${encodeURIComponent(query)}`}>
                  Open AI Advisor
                </Link>
              </Button>
            </div>
          </aside>

          <div className="min-w-0 space-y-5 md:space-y-6">
            <div className="rounded-[1.5rem] border border-navy-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-navy-500">
                    {isAiLoading && activeTab === "societies"
                      ? "Finding AI matches..."
                      : `${visibleCount} ${resultLabel(activeTab).toLowerCase()} result${visibleCount === 1 ? "" : "s"} found`}
                  </p>
                  <h2 className="text-lg font-black text-navy-950 md:text-xl">
                    {query
                      ? `Showing matches for “${query}”`
                      : "Explore published SocietyFlats inventory"}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
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
                    className="rounded-full bg-blue-600 hover:bg-blue-700"
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

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {quickLocalities.map((item) => (
                  <button
                    key={item}
                    onClick={() => applyQuickSearch(item)}
                    className="shrink-0 rounded-full border border-navy-100 bg-ivory-100 px-3 py-2 text-xs font-bold text-navy-600"
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
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {societyResults.map((society) => (
                  <Link
                    key={society.id}
                    to={society.slug ? `/society/${society.slug}` : "/societies"}
                    className="group overflow-hidden rounded-[1.5rem] border border-navy-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-apple"
                  >
                    <div className="relative h-52 overflow-hidden bg-navy-50 md:h-56">
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
                    <div className="p-5 md:p-6">
                      <h2 className="text-xl font-black text-navy-950 md:text-2xl">
                        {society.name}
                      </h2>
                      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-navy-500">
                        <MapPin className="h-4 w-4" />{" "}
                        {formatPublicLocation(society)}
                      </p>
                      {society.aiReason ? (
                        <p className="mt-3 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-bold leading-5 text-blue-700">
                          AI match: {society.aiReason}
                        </p>
                      ) : null}
                      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-ivory-100 p-3 text-sm">
                        <div>
                          <p className="text-navy-400">Rent</p>
                          <p className="font-black text-navy-900">
                            {society.rentRange || "On request"}
                          </p>
                        </div>
                        <div>
                          <p className="text-navy-400">Buy</p>
                          <p className="font-black text-navy-900">
                            {society.buyRange || "On request"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-navy-100 pt-4 text-sm font-black text-blue-700">
                        View society{" "}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div
                className={cn(
                  viewMode === "grid"
                    ? "grid gap-5 md:grid-cols-2 xl:grid-cols-3"
                    : "space-y-4",
                )}
              >
                {filteredProperties.map((property) => (
                  <Link
                    key={property.id}
                    to={propertyUrl(property)}
                    className={cn(
                      "group overflow-hidden border border-navy-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-apple",
                      viewMode === "grid"
                        ? "rounded-[1.5rem]"
                        : "grid rounded-[1.5rem] md:grid-cols-[260px_1fr]",
                    )}
                  >
                    <div
                      className={cn(
                        "relative overflow-hidden bg-navy-50",
                        viewMode === "grid" ? "h-56 md:h-60" : "h-56 md:h-full",
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
                    <div className="p-5 md:p-6">
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
                      <h2 className="mt-4 text-xl font-black text-navy-950 md:text-2xl">
                        {property.title}
                      </h2>
                      <p className="mt-2 text-sm font-semibold text-navy-500">
                        {property.society} • {property.locality}
                      </p>
                      <div className="mt-6 flex items-end justify-between">
                        <div>
                          <p className="text-sm text-navy-400">Price</p>
                          <p className="text-xl font-black text-navy-900">
                            {property.price || "On request"}
                          </p>
                        </div>
                        <div className="text-right text-sm font-semibold text-navy-500">
                          {property.bedrooms || "-"} BHK
                          <br />
                          {property.areaSqft || "-"} sq.ft
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="rounded-[1.5rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-ivory-100 p-4 shadow-sm md:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                    <Sparkles className="h-4 w-4" /> AI powered recommendations
                  </p>
                  <h3 className="mt-2 font-display text-xl font-black tracking-tight text-navy-950 md:text-2xl">
                    Similar matches for{" "}
                    {query ? `“${query}”` : "your Gurgaon search"}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-navy-500">
                    Based on your search intent, budget signals, locality and
                    available published inventory.
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="w-fit rounded-full border-blue-100 bg-white font-bold text-blue-700 hover:bg-blue-50"
                >
                  <Link
                    to={`/ai-advisor?q=${encodeURIComponent(query || resultLabel(activeTab))}`}
                  >
                    Ask AI Advisor
                  </Link>
                </Button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                      className="group overflow-hidden rounded-[1.25rem] border border-blue-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
                    >
                      <div className="flex gap-3 p-3">
                        <img
                          src={image}
                          alt={title}
                          className="h-20 w-24 shrink-0 rounded-2xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                              AI #{index + 1}
                            </span>
                            {isSociety && item.score ? (
                              <span className="text-[11px] font-bold text-navy-400">
                                Score {item.score}
                              </span>
                            ) : null}
                          </div>
                          <h4 className="mt-2 line-clamp-1 text-sm font-black text-navy-950 group-hover:text-blue-700">
                            {title}
                          </h4>
                          <p className="mt-1 line-clamp-1 text-xs font-semibold text-navy-500">
                            {subtitle}
                          </p>
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-navy-500">
                            {reason}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
