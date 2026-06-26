import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeIndianRupee,
  Building2,
  CheckCircle2,
  Home,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { InternalSeoLinks } from "@/components/seo/InternalSeoLinks";
import {
  fetchPublicProperties,
  fetchPublicSocieties,
  formatPublicLocation,
  propertyImage,
  propertyUrl,
  societyImage,
} from "@/lib/publicData";
import { setPublicSeo } from "@/lib/seo";
import { societyImageAttribution } from "@/lib/societyImages";

type LandingVariant =
  | "gurgaon"
  | "gurgaon-societies"
  | "gurgaon-properties"
  | "locality"
  | "builder";

type LandingCopy = {
  eyebrow: string;
  title: string;
  description: string;
  canonical: string;
  searchQuery: string;
  primaryCta: string;
  secondaryCta: string;
  focusLabel: string;
  insightTitle: string;
  insightText: string;
};

const localityLabels: Record<string, string> = {
  "sector-65": "Sector 65",
  "sector-56": "Sector 56",
  "sector-66": "Sector 66",
  "sector-67": "Sector 67",
  "sector-70": "Sector 70",
  "sector-102": "Sector 102",
  "golf-course-road": "Golf Course Road",
  "golf-course-extension-road": "Golf Course Extension Road",
  "dwarka-expressway": "Dwarka Expressway",
  "sohna-road": "Sohna Road",
};

const builderLabels: Record<string, string> = {
  dlf: "DLF",
  m3m: "M3M",
  emaar: "Emaar",
  ats: "ATS",
  godrej: "Godrej",
  adani: "Adani Realty",
  tulip: "Tulip",
  "alpha-corp": "Alpha Corp",
};

const popularLocalities = [
  "Sector 65",
  "Sector 56",
  "Sector 66",
  "Sector 67",
  "Sector 70",
  "Sector 102",
  "Golf Course Road",
  "Dwarka Expressway",
  "Sohna Road",
];

const popularBuilders = ["DLF", "M3M", "Emaar", "ATS", "Godrej", "Adani Realty", "Tulip", "Alpha Corp"];

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readableFromSlug(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function scoreNumber(society: any) {
  const parsed = Number(society?.score || society?.overallScore || society?.overall_score);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed > 10 ? parsed / 10 : parsed;
}

function scoreOf(society: any) {
  const score = scoreNumber(society);
  return score > 0 ? score.toFixed(1) : "—";
}

function compactText(value: unknown, fallback = "On request") {
  const text = String(value || "").trim();
  return text || fallback;
}

function qualityRank(society: any) {
  return (
    scoreNumber(society) * 100 +
    (society?.featured ? 50 : 0) +
    (society?.showInHero ? 35 : 0) +
    (society?.searchBoost ? 25 : 0) +
    Number(society?.propertiesCount || 0)
  );
}

function sortByQuality(rows: any[]) {
  return [...rows].sort((a, b) => qualityRank(b) - qualityRank(a));
}

function landingLabel(variant: LandingVariant, localitySlug?: string, builderSlug?: string) {
  if (variant === "locality") return localityLabels[localitySlug || ""] || readableFromSlug(localitySlug, "Gurgaon");
  if (variant === "builder") return builderLabels[builderSlug || ""] || readableFromSlug(builderSlug, "Gurgaon builder");
  if (variant === "gurgaon-properties") return "Gurgaon properties";
  if (variant === "gurgaon-societies") return "Gurgaon societies";
  return "Gurgaon";
}

function landingCopy(variant: LandingVariant, localitySlug?: string, builderSlug?: string): LandingCopy {
  const label = landingLabel(variant, localitySlug, builderSlug);

  if (variant === "builder") {
    return {
      eyebrow: `${label} Gurgaon`,
      title: `Best ${label} societies in Gurgaon`,
      description:
        `Compare ${label} societies by location, score, rent range, resale range and available homes before booking a visit.`,
      canonical: `/builder/${builderSlug}`,
      searchQuery: `${label} Gurgaon`,
      primaryCta: `Search ${label} societies`,
      secondaryCta: "Ask AI Advisor",
      focusLabel: `${label} best match`,
      insightTitle: `Why shortlist ${label} societies first?`,
      insightText:
        `${label} projects can vary sharply by micro-market, maintenance, access and inventory depth. SocietyFlats keeps the builder context connected to society-level details.`,
    };
  }

  if (variant === "locality") {
    return {
      eyebrow: `${label} Gurgaon`,
      title: `Top societies near ${label}`,
      description:
        `See the strongest society matches around ${label}, with rent/resale context, locality signals and live property links.`,
      canonical: `/gurgaon/${localitySlug}`,
      searchQuery: `${label} Gurgaon`,
      primaryCta: `Search ${label}`,
      secondaryCta: "Ask AI Advisor",
      focusLabel: `${label} top society`,
      insightTitle: `Why ${label} needs society-first comparison`,
      insightText:
        `Two societies in the same sector can feel very different. Compare society quality, commute, resident fit and inventory before choosing a flat.`,
    };
  }

  if (variant === "gurgaon-properties") {
    return {
      eyebrow: "Gurgaon live inventory",
      title: "Gurgaon flats inside verified societies",
      description:
        "Explore published homes with society context first, so rent and resale decisions are backed by location, pricing and community fit.",
      canonical: "/gurgaon/properties",
      searchQuery: "Gurgaon properties",
      primaryCta: "Search live homes",
      secondaryCta: "List owner property",
      focusLabel: "Best society with inventory",
      insightTitle: "Property search should start with society context",
      insightText:
        "A flat is easier to judge when the society, commute, maintenance, pricing and resident profile are visible in the same journey.",
    };
  }

  if (variant === "gurgaon-societies") {
    return {
      eyebrow: "Gurgaon society directory",
      title: "Verified Gurgaon societies ranked for better shortlists",
      description:
        "Compare Gurgaon societies by builder, sector, score, rent range, resale context and available homes in one clean flow.",
      canonical: "/gurgaon/societies",
      searchQuery: "Gurgaon societies",
      primaryCta: "Search societies",
      secondaryCta: "Open AI shortlist",
      focusLabel: "Top Gurgaon society",
      insightTitle: "Choose the society before the flat",
      insightText:
        "SocietyFlats helps users compare location, lifestyle, maintenance, pricing and available inventory before they request visits.",
    };
  }

  return {
    eyebrow: "Gurgaon society-first search",
    title: "Find the right Gurgaon society before choosing the home",
    description:
      "A premium society-first search path for Gurgaon buyers, tenants, owners and brokers. Compare society quality before you shortlist flats.",
    canonical: "/gurgaon",
    searchQuery: "Gurgaon societies",
    primaryCta: "Search matching societies",
    secondaryCta: "Ask AI Advisor",
    focusLabel: "Highest score society",
    insightTitle: "Gurgaon search works better society-first",
    insightText:
      "Locality, builder, budget and BHK matter, but the society decides daily life. Start with society intelligence, then choose the home.",
  };
}

function matchesLocality(label: string, society: any) {
  const needle = normalize(label);
  const text = normalize([society?.name, society?.sector, society?.locality, society?.address].filter(Boolean).join(" "));
  return Boolean(needle) && text.includes(needle);
}

function matchesBuilder(label: string, society: any) {
  const needle = normalize(label);
  const text = normalize([society?.name, society?.builder].filter(Boolean).join(" "));
  return Boolean(needle) && text.includes(needle);
}

function propertyMatchesLocality(label: string, property: any) {
  const needle = normalize(label);
  const text = normalize([
    property?.title,
    property?.society,
    property?.locality,
    property?.builder,
    typeof property?.society === "object" ? property?.society?.name : "",
    typeof property?.society === "object" ? property?.society?.sector : "",
    typeof property?.society === "object" ? property?.society?.locality : "",
  ].filter(Boolean).join(" "));

  return Boolean(needle) && text.includes(needle);
}

function propertyMatchesBuilder(label: string, property: any) {
  const needle = normalize(label);
  const text = normalize([
    property?.title,
    property?.society,
    property?.builder,
    typeof property?.society === "object" ? property?.society?.builder : "",
    typeof property?.society === "object" ? property?.society?.name : "",
  ].filter(Boolean).join(" "));

  return Boolean(needle) && text.includes(needle);
}

function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-col gap-3 md:mb-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">{eyebrow}</p>
        <h2 className="mt-1.5 font-display text-2xl font-black leading-tight tracking-tight text-navy-950 md:text-[28px]">
          {title}
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm font-semibold leading-6 text-navy-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function MetricPill({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 text-blue-500">
        <Icon className="h-4 w-4" />
        <p className="text-[11px] font-black uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-2 text-lg font-black text-navy-950">{value}</p>
    </div>
  );
}

function FeaturedSocietyCard({
  society,
  copy,
  searchHref,
  compact = false,
}: {
  society?: any;
  copy: LandingCopy;
  searchHref: string;
  compact?: boolean;
}) {
  if (!society) {
    return (
      <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Best match</p>
        <h3 className="mt-2 text-2xl font-black text-navy-950">No exact society card yet</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-navy-500">
          Search is ready. Admin can add featured societies for this page.
        </p>
        <Button asChild className="mt-4 h-11 w-full rounded-full bg-blue-700 font-black text-white hover:bg-blue-800">
          <Link to={searchHref}>Open search <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    );
  }

  const attribution = societyImageAttribution(society);

  return (
    <div className={`overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-[0_18px_48px_rgba(16,37,31,0.10)] ${compact ? "" : ""}`}>
      <div className="relative h-28 overflow-hidden bg-blue-50">
        <img src={societyImage(society)} alt={society.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/10 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm">
          {copy.focusLabel}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-blue-700 px-3 py-1.5 text-xs font-black text-white shadow-sm">
          {scoreOf(society)} score
        </span>
        <span className="absolute bottom-3 left-3 max-w-[75%] truncate rounded-full bg-slate-950/90 px-3 py-1.5 text-xs font-semibold text-white">
          {attribution.label}
        </span>
      </div>

      <div className="p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Featured society</p>
        <h3 className="mt-1.5 line-clamp-1 font-display text-xl font-black leading-tight text-navy-950">
          {society.name}
        </h3>
        <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-blue-500">
          <MapPin className="h-4 w-4" /> {formatPublicLocation(society)}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-blue-50 p-2.5">
            <p className="text-xs font-bold text-blue-300">Rent range</p>
            <p className="mt-0.5 text-sm font-black text-navy-950">{compactText(society.rentRange)}</p>
          </div>
          <div className="rounded-xl bg-ivory-100 p-2.5">
            <p className="text-xs font-bold text-blue-300">Resale range</p>
            <p className="mt-0.5 text-sm font-black text-navy-950">{compactText(society.buyRange)}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          <Button asChild className="h-11 rounded-full bg-blue-700 font-black text-white hover:bg-blue-800">
            <Link to={`/society/${society.slug}`}>
              View society <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-full border-blue-100 font-black text-blue-700 hover:bg-blue-50">
            <Link to={searchHref}>
              Search nearby homes <Search className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SocietyCard({ society }: { society: any }) {
  return (
    <Link
      to={`/society/${society.slug}`}
      className="group overflow-hidden rounded-[1.25rem] border border-blue-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-28 overflow-hidden bg-blue-50">
        <img src={societyImage(society)} alt={society.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/45 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">Society</span>
        <span className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black text-navy-950">
          {scoreOf(society)}
        </span>
      </div>

      <div className="p-3">
        <h3 className="line-clamp-1 font-display text-lg font-black text-navy-950 group-hover:text-blue-700">{society.name}</h3>
        <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-blue-500">
          <MapPin className="h-4 w-4" /> {formatPublicLocation(society)}
        </p>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50/60 p-1.5">
          <div className="min-w-0 flex-1 rounded-lg bg-white px-2.5 py-2">
            <p className="text-[11px] font-bold text-blue-300">Rent</p>
            <p className="truncate text-sm font-black text-navy-950">{compactText(society.rentRange)}</p>
          </div>
          <div className="min-w-0 flex-1 rounded-lg bg-white px-2.5 py-2">
            <p className="text-[11px] font-bold text-blue-300">Resale</p>
            <p className="truncate text-sm font-black text-navy-950">{compactText(society.buyRange)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PropertyCard({ property }: { property: any }) {
  return (
    <Link
      to={propertyUrl(property)}
      className="group overflow-hidden rounded-[1.25rem] border border-blue-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-28 overflow-hidden bg-blue-50">
        <img src={propertyImage(property)} alt={property.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">
          {property.listingType || "Property"}
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-lg font-black text-navy-950 group-hover:text-blue-700">{property.title}</h3>
        <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-blue-500">
          <MapPin className="h-4 w-4" /> {property.society || property.locality || "Gurgaon"}
        </p>
        <div className="mt-3 flex items-center justify-between border-t border-blue-50 pt-2.5">
          <span className="text-sm font-bold text-navy-500">{property.furnishedStatus || "Verified listing"}</span>
          <span className="rounded-full bg-blue-700 px-3 py-1.5 text-sm font-black text-white">
            {compactText(property.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function SeoLandingPage({ variant }: { variant: LandingVariant }) {
  const { locality, builderSlug } = useParams();
  const copy = useMemo(() => landingCopy(variant, locality, builderSlug), [variant, locality, builderSlug]);

  const [societies, setSocieties] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const searchTab = variant === "gurgaon-properties" ? "rent" : "societies";
  const searchHref = `/search?tab=${searchTab}&q=${encodeURIComponent(copy.searchQuery)}${searchTab === "societies" ? "&intent=society" : ""}`;
  const aiHref = `/ai-advisor?q=${encodeURIComponent(copy.searchQuery)}`;

  useEffect(() => {
    setPublicSeo(copy.title, copy.description, { canonical: copy.canonical });
  }, [copy]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    Promise.all([fetchPublicSocieties(), fetchPublicProperties()])
      .then(([societyRows, propertyRows]) => {
        if (!mounted) return;
        setSocieties(sortByQuality(Array.isArray(societyRows) ? societyRows : []));
        setProperties(Array.isArray(propertyRows) ? propertyRows : []);
      })
      .catch((fetchError) => {
        console.error("SEO landing data fetch failed:", fetchError);
        if (mounted) setError("Live data is temporarily unavailable. Please use search or request a callback.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const scopedSocieties = useMemo(() => {
    let rows = societies;

    if (variant === "locality") {
      const label = landingLabel(variant, locality, builderSlug);
      rows = rows.filter((society) => matchesLocality(label, society) || matchesLocality(String(locality || ""), society));
    }

    if (variant === "builder") {
      const label = landingLabel(variant, locality, builderSlug);
      rows = rows.filter((society) => matchesBuilder(label, society) || matchesBuilder(String(builderSlug || ""), society));
    }

    return sortByQuality(rows);
  }, [societies, variant, locality, builderSlug]);

  const scopedProperties = useMemo(() => {
    let rows = properties;

    if (variant === "locality") {
      const label = landingLabel(variant, locality, builderSlug);
      rows = rows.filter((property) => propertyMatchesLocality(label, property) || propertyMatchesLocality(String(locality || ""), property));
    }

    if (variant === "builder") {
      const label = landingLabel(variant, locality, builderSlug);
      rows = rows.filter((property) => propertyMatchesBuilder(label, property) || propertyMatchesBuilder(String(builderSlug || ""), property));
    }

    return rows.slice(0, 6);
  }, [properties, variant, locality, builderSlug]);

  const bestSociety = scopedSocieties[0] || societies[0];
  const shownSocieties = scopedSocieties.slice(0, 6);
  const shownProperties = scopedProperties.slice(0, 4);
  const pageLabel = landingLabel(variant, locality, builderSlug);

  return (
    <div className="min-h-screen bg-[#F8F3EA]">
      <section className="relative overflow-hidden border-b border-[#E7DCCB] bg-[radial-gradient(circle_at_82%_14%,rgba(194,114,78,0.10),transparent_30%),linear-gradient(180deg,#FFFBF3_0%,#F8F3EA_100%)]">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <nav className="mb-5 flex items-center gap-2 text-xs font-black text-blue-300">
            <Link to="/" className="hover:text-blue-700">Home</Link>
            <span>/</span>
            <Link to="/gurgaon" className="hover:text-blue-700">Gurgaon</Link>
            <span>/</span>
            <span className="text-blue-700">{pageLabel}</span>
          </nav>

          <div className="grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_430px] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-blue-700" />
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">{copy.eyebrow}</span>
              </div>

              <h1 className="mt-4 max-w-4xl font-display text-[34px] font-black leading-[0.96] tracking-[-0.05em] text-navy-950 md:text-[52px]">
                {copy.title}
              </h1>

              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-blue-500 md:text-[17px] md:leading-7">
                {copy.description}
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-12 rounded-full bg-blue-700 px-6 font-black text-white hover:bg-blue-800">
                  <Link to={searchHref}>
                    {copy.primaryCta} <Search className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-12 rounded-full border-blue-100 bg-white px-6 font-black text-blue-700 hover:bg-blue-50">
                  <Link to={variant === "gurgaon-properties" ? "/sell" : aiHref}>
                    {copy.secondaryCta} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {["Rent homes", "Buy / resale", "Societies", "AI shortlist"].map((chip) => (
                  <Link
                    key={chip}
                    to={chip === "AI shortlist" ? aiHref : `/search?tab=${chip.includes("Buy") ? "buy" : chip.includes("Rent") ? "rent" : "societies"}&q=${encodeURIComponent(copy.searchQuery)}${chip === "Societies" ? "&intent=society" : ""}`}
                    className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm hover:bg-blue-50"
                  >
                    {chip}
                  </Link>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MetricPill icon={Building2} label="Societies" value={String(scopedSocieties.length || societies.length || "Live")} />
                <MetricPill icon={Home} label="Inventory" value={String(scopedProperties.length || properties.length || "Live")} />
                <MetricPill icon={ShieldCheck} label="Flow" value="Verified + AI" />
              </div>
            </div>

            <FeaturedSocietyCard society={bestSociety} copy={copy} searchHref={searchHref} compact />
          </div>
        </div>
      </section>

      <section className="border-y border-blue-50 bg-white px-4 py-3">
        <div className="container mx-auto grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.1rem] bg-blue-50/70 p-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Best match logic</p>
            <p className="mt-1.5 text-sm font-semibold leading-5 text-navy-600">
              Featured and highest-score societies are promoted first for this page.
            </p>
          </div>
          <div className="rounded-[1.1rem] bg-blue-50/70 p-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Page focus</p>
            <p className="mt-1.5 text-sm font-semibold leading-5 text-navy-600">
              {copy.insightText}
            </p>
          </div>
          <div className="rounded-[1.1rem] bg-blue-50/70 p-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Next action</p>
            <p className="mt-1.5 text-sm font-semibold leading-5 text-navy-600">
              Search, ask AI or open the featured society before requesting a visit.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6 md:py-8">
        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-[2rem] border border-blue-100 bg-white">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-4 text-navy-500">Loading live SocietyFlats data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-amber-800">{error}</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <main className="space-y-5">
              <section className="rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm">
                <SectionTitle
                  eyebrow="Top societies"
                  title={`Best societies for ${pageLabel}`}
                  description="Ranked by page relevance, featured status and society score. Open a society before shortlisting flats."
                  action={
                    <Button asChild variant="outline" className="h-10 rounded-full border-blue-100 bg-white font-black text-blue-700 hover:bg-blue-50">
                      <Link to={searchHref}>
                        View search <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  }
                />

                {shownSocieties.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {shownSocieties.map((society) => (
                      <SocietyCard key={society.id || society.slug || society.name} society={society} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-blue-100 bg-blue-50/50 p-5">
                    <p className="text-sm font-bold text-navy-700">No exact society cards attached yet.</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-navy-500">
                      Use search or AI Advisor for nearby Gurgaon matches while this page gets more admin-approved data.
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm">
                <SectionTitle
                  eyebrow="Available homes"
                  title="Homes linked to this search"
                  description="Inventory appears with society context so users can judge the community before the flat."
                  action={
                    <Button asChild variant="outline" className="h-10 rounded-full border-blue-100 bg-white font-black text-blue-700 hover:bg-blue-50">
                      <Link to={`/search?tab=rent&q=${encodeURIComponent(copy.searchQuery)}`}>
                        Search homes <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  }
                />

                {shownProperties.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {shownProperties.map((property) => (
                      <PropertyCard key={property.id || property.slug || property.title} property={property} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-blue-100 bg-blue-50/50 p-5 text-sm font-semibold text-navy-500">
                    No live property cards are attached to this exact page yet. Search can still find live Gurgaon homes.
                  </div>
                )}
              </section>

              <section className="rounded-[1.75rem] border border-blue-100 bg-[linear-gradient(135deg,#EEF5F1,#FFFBF3)] p-4 shadow-sm md:p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">SocietyFlats view</p>
                <h2 className="mt-2 font-display text-3xl font-black text-navy-950">{copy.insightTitle}</h2>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-blue-500">{copy.insightText}</p>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {[
                    ["Society quality", "Score, lifestyle and builder context."],
                    ["Pricing context", "Rent and resale ranges where available."],
                    ["Next action", "Search, AI shortlist or callback."],
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-2xl bg-white p-4 shadow-sm">
                      <CheckCircle2 className="h-5 w-5 text-blue-700" />
                      <p className="mt-3 font-black text-navy-950">{title}</p>
                      <p className="mt-1 text-sm font-semibold leading-5 text-navy-500">{body}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm">
                <SectionTitle
                  eyebrow="Explore more"
                  title="Search Gurgaon by locality and builder"
                  description="Use these internal paths to continue browsing high-intent Gurgaon society pages."
                />

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-blue-100 bg-[#FFFBF3] p-4">
                    <p className="flex items-center gap-2 text-sm font-black text-navy-950">
                      <MapPin className="h-4 w-4 text-blue-700" /> Localities
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {popularLocalities.map((item) => (
                        <Link key={item} to={`/gurgaon/${slugify(item)}`} className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-50">
                          {item}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-blue-100 bg-[#FFFBF3] p-4">
                    <p className="flex items-center gap-2 text-sm font-black text-navy-950">
                      <Building2 className="h-4 w-4 text-blue-700" /> Builders
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {popularBuilders.map((item) => (
                        <Link key={item} to={`/builder/${slugify(item)}`} className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-50">
                          {item}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </main>

            <aside className="space-y-4">
              <FeaturedSocietyCard society={bestSociety} copy={copy} searchHref={searchHref} />

              <div className="rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Quick actions</p>
                <div className="mt-3 grid gap-2">
                  <Button asChild className="h-11 rounded-full bg-blue-700 font-black text-white hover:bg-blue-800">
                    <Link to={searchHref}>Search this page <Search className="ml-2 h-4 w-4" /></Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-full border-blue-100 font-black text-blue-700 hover:bg-blue-50">
                    <Link to={aiHref}>Ask AI Advisor <Sparkles className="ml-2 h-4 w-4" /></Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-full border-blue-100 font-black text-blue-700 hover:bg-blue-50">
                    <Link to="/sell">List owner property <Home className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </div>

                <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-black text-navy-950">
                    <BadgeIndianRupee className="h-4 w-4 text-blue-700" /> Price check
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-navy-500">
                    Rent and resale ranges are indicative and should be verified before visit or negotiation.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>

      <section className="bg-white px-4 py-6 md:py-8">
        <div className="container mx-auto rounded-[1.75rem] border border-blue-100 bg-navy-950 p-5 text-white shadow-sm md:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-200">Ready to shortlist?</p>
              <h2 className="mt-2 font-display text-3xl font-black text-white">Compare the society first. Then choose the flat.</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-blue-100">
                SocietyFlats connects Gurgaon society intelligence, verified inventory and callback support in one flow.
              </p>
            </div>

            <div className="grid gap-3">
              <Button asChild className="h-12 rounded-full bg-white font-black text-navy-950 hover:bg-blue-50">
                <Link to={searchHref}>
                  Find matching societies <Search className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/20 bg-white/10 font-black text-white hover:bg-white/15">
                <Link to={aiHref}>
                  Open AI shortlist <Sparkles className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <InternalSeoLinks
        variant="landing"
        title="Continue Gurgaon discovery"
        description="Continue exploring Gurgaon by society, locality, builder and live inventory paths."
      />

      <span className="sr-only">
        Gurgaon society guide, verified Gurgaon societies, live Gurgaon properties, SocietyFlats AI recommendations and callback support.
      </span>
      <span className="sr-only">
        <ShieldCheck /> <CheckCircle2 /> <TrendingUp /> <Star />
      </span>
    </div>
  );
}

export default SeoLandingPage;
