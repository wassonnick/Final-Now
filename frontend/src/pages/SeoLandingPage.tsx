import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
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

function readableFromSlug(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function scoreOf(society: any, fallback = "8.3") {
  const parsed = Number(society?.score || society?.overallScore || society?.overall_score || fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed > 10 ? (parsed / 10).toFixed(1) : parsed.toFixed(1);
}

function compactText(value: unknown, fallback = "On request") {
  const text = String(value || "").trim();
  return text || fallback;
}

function landingCopy(variant: LandingVariant, localitySlug?: string, builderSlug?: string): LandingCopy {
  const localityLabel = localityLabels[localitySlug || ""] || readableFromSlug(localitySlug, "Gurgaon");
  const builderLabel = builderLabels[builderSlug || ""] || readableFromSlug(builderSlug, "Gurgaon builder");

  if (variant === "gurgaon-societies") {
    return {
      eyebrow: "Gurgaon society directory",
      title: "Verified Gurgaon societies with live context",
      description:
        "Browse society-first profiles with location, builder, rent range, resale range and available inventory context before choosing a home.",
      canonical: "/gurgaon/societies",
      searchQuery: "Gurgaon societies",
      primaryCta: "Search Gurgaon societies",
      secondaryCta: "Open AI shortlist",
    };
  }

  if (variant === "gurgaon-properties") {
    return {
      eyebrow: "Gurgaon live inventory",
      title: "Verified Gurgaon flats and owner listings",
      description:
        "Explore published homes inside verified Gurgaon societies with rent, resale, furnishing and society context in one flow.",
      canonical: "/gurgaon/properties",
      searchQuery: "Gurgaon properties",
      primaryCta: "Search live homes",
      secondaryCta: "List owner property",
    };
  }

  if (variant === "locality") {
    return {
      eyebrow: `${localityLabel} society guide`,
      title: `Best societies and flats in ${localityLabel}, Gurgaon`,
      description:
        "Compare verified societies, available homes, commute strength, pricing context and callback support for this Gurgaon micro-market.",
      canonical: `/gurgaon/${localitySlug}`,
      searchQuery: `${localityLabel} Gurgaon`,
      primaryCta: `Search ${localityLabel}`,
      secondaryCta: "Ask AI Advisor",
    };
  }

  if (variant === "builder") {
    return {
      eyebrow: `${builderLabel} Gurgaon guide`,
      title: `${builderLabel} societies and flats in Gurgaon`,
      description:
        "Compare builder-linked society profiles, location strengths, rent/resale signals and available homes before shortlisting.",
      canonical: `/builder/${builderSlug}`,
      searchQuery: `${builderLabel} Gurgaon`,
      primaryCta: `Search ${builderLabel} societies`,
      secondaryCta: "Ask AI Advisor",
    };
  }

  return {
    eyebrow: "Gurgaon society-first search",
    title: "Find the right Gurgaon society before choosing the home",
    description:
      "Discover verified Gurgaon societies, live properties, owner listings and society-first recommendations on SocietyFlats.",
    canonical: "/gurgaon",
    searchQuery: "Gurgaon societies",
    primaryCta: "Search matching societies",
    secondaryCta: "List owner property",
  };
}

function breadcrumbLabelForLanding(variant: LandingVariant, localitySlug?: string, builderSlug?: string) {
  if (variant === "locality") return localityLabels[localitySlug || ""] || readableFromSlug(localitySlug, "Locality");
  if (variant === "builder") return builderLabels[builderSlug || ""] || readableFromSlug(builderSlug, "Builder");
  if (variant === "gurgaon-societies") return "Gurgaon Societies";
  if (variant === "gurgaon-properties") return "Gurgaon Properties";
  return "Gurgaon";
}

function landingSeoText(variant: LandingVariant, localitySlug?: string, builderSlug?: string) {
  const localityLabel = localityLabels[localitySlug || ""] || readableFromSlug(localitySlug, "Gurgaon");
  const builderLabel = builderLabels[builderSlug || ""] || readableFromSlug(builderSlug, "Gurgaon builder");

  if (variant === "builder") {
    return `${builderLabel} pages on SocietyFlats help users compare Gurgaon societies by location, rent signals, resale context, live inventory and callback support.`;
  }

  if (variant === "locality") {
    return `${localityLabel} pages collect verified Gurgaon societies and available homes so users can compare location strength, pricing context and resident fit faster.`;
  }

  if (variant === "gurgaon-properties") {
    return "Gurgaon property pages focus on published inventory inside verified societies, with society context before users request visits or callbacks.";
  }

  if (variant === "gurgaon-societies") {
    return "Gurgaon society pages help users shortlist the right community first by comparing location, builder, lifestyle fit, pricing range and available homes.";
  }

  return "SocietyFlats is built around the Gurgaon society-first journey: compare the society, understand the location and then shortlist homes with better context.";
}

function matchesLocality(label: string, society: any) {
  const value = label.toLowerCase();
  const text = [society?.name, society?.sector, society?.locality, society?.address].filter(Boolean).join(" ").toLowerCase();
  return text.includes(value);
}

function matchesBuilder(label: string, society: any) {
  const value = label.toLowerCase();
  const text = [society?.name, society?.builder].filter(Boolean).join(" ").toLowerCase();
  return text.includes(value);
}

function propertyMatchesLocality(label: string, property: any) {
  const value = label.toLowerCase();
  const text = [
    property?.title,
    property?.society,
    property?.locality,
    typeof property?.society === "object" ? property?.society?.locality : "",
    typeof property?.society === "object" ? property?.society?.sector : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text.includes(value);
}

function propertyMatchesBuilder(label: string, property: any) {
  const value = label.toLowerCase();
  const text = [
    property?.title,
    property?.society,
    property?.locality,
    property?.builder,
    typeof property?.society === "object" ? property?.society?.builder : "",
    typeof property?.society === "object" ? property?.society?.name : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text.includes(value);
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
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:mb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">{eyebrow}</p>
        <h2 className="mt-2 font-display text-2xl font-black leading-tight tracking-tight text-navy-950 md:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-navy-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SeoLandingPage({ variant }: { variant: LandingVariant }) {
  const { locality, builderSlug } = useParams();
  const copy = useMemo(() => landingCopy(variant, locality, builderSlug), [variant, locality, builderSlug]);

  const [societies, setSocieties] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const searchHref = `/search?tab=${
    variant === "gurgaon-properties" ? "rent" : "societies"
  }&q=${encodeURIComponent(copy.searchQuery)}${variant === "gurgaon-properties" ? "" : "&intent=society"}`;

  const aiHref = `/ai-advisor?q=${encodeURIComponent(copy.searchQuery)}`;
  const sellHref = "/sell";

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
        setSocieties(Array.isArray(societyRows) ? societyRows : []);
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
      const label = localityLabels[locality || ""] || readableFromSlug(locality, "");
      rows = rows.filter((society) => matchesLocality(label, society) || matchesLocality(String(locality || ""), society));
    }

    if (variant === "builder") {
      const label = builderLabels[builderSlug || ""] || readableFromSlug(builderSlug, "");
      rows = rows.filter((society) => matchesBuilder(label, society) || matchesBuilder(String(builderSlug || ""), society));
    }

    return rows.slice(0, 6);
  }, [societies, variant, locality, builderSlug]);

  const scopedProperties = useMemo(() => {
    let rows = properties;

    if (variant === "locality") {
      const label = localityLabels[locality || ""] || readableFromSlug(locality, "");
      rows = rows.filter((property) => propertyMatchesLocality(label, property) || propertyMatchesLocality(String(locality || ""), property));
    }

    if (variant === "builder") {
      const label = builderLabels[builderSlug || ""] || readableFromSlug(builderSlug, "");
      rows = rows.filter((property) => propertyMatchesBuilder(label, property) || propertyMatchesBuilder(String(builderSlug || ""), property));
    }

    return rows.slice(0, 4);
  }, [properties, variant, locality, builderSlug]);

  const hasScopedResults = scopedSocieties.length > 0 || scopedProperties.length > 0;
  const heroSociety = scopedSocieties[0] || societies[0];
  const heroProperty = scopedProperties[0] || properties[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <section className="relative overflow-hidden border-b border-blue-50 bg-[radial-gradient(circle_at_80%_10%,rgba(37,99,235,0.12),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)]">
        <div className="container mx-auto px-4 py-8 md:py-10">
          <nav className="mb-5 flex items-center gap-2 text-xs font-black text-blue-300">
            <Link to="/" className="hover:text-blue-700">
              Home
            </Link>
            <span>/</span>
            <Link to="/gurgaon" className="hover:text-blue-700">
              Gurgaon
            </Link>
            <span>/</span>
            <span className="text-blue-700">{breadcrumbLabelForLanding(variant, locality, builderSlug)}</span>
          </nav>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-blue-700" />
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">{copy.eyebrow}</span>
              </div>

              <h1 className="mt-5 max-w-4xl font-display text-[34px] font-black leading-[0.98] tracking-[-0.045em] text-navy-950 md:text-[56px]">
                {copy.title}
              </h1>

              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-blue-500 md:text-lg md:leading-8">
                {copy.description}
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-12 rounded-full bg-blue-700 px-6 font-black text-white hover:bg-blue-800">
                  <Link to={searchHref}>
                    {copy.primaryCta} <Search className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <Button asChild variant="outline" className="h-12 rounded-full border-blue-100 bg-white px-6 font-black text-blue-700 hover:bg-blue-50">
                  <Link to={variant === "gurgaon-properties" ? sellHref : aiHref}>
                    {copy.secondaryCta} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.25rem] border border-blue-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-blue-400">Verified societies</p>
                  <p className="mt-1 text-2xl font-black text-navy-950">{scopedSocieties.length || societies.length || "Live"}</p>
                </div>
                <div className="rounded-[1.25rem] border border-blue-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-blue-400">Live inventory</p>
                  <p className="mt-1 text-2xl font-black text-navy-950">{scopedProperties.length || properties.length || "Live"}</p>
                </div>
                <div className="rounded-[1.25rem] border border-blue-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-blue-400">Help flow</p>
                  <p className="mt-1 text-xl font-black text-navy-950">AI + Callback</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-[0_18px_48px_rgba(37,99,235,0.10)]">
              <div className="relative h-52 overflow-hidden rounded-[1.5rem] bg-blue-50">
                {heroSociety ? (
                  <img src={societyImage(heroSociety)} alt={heroSociety.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-[linear-gradient(135deg,#eaf2ff,#ffffff)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 via-navy-950/10 to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm">
                  Society-first guide
                </span>
                {heroSociety ? (
                  <span className="absolute bottom-3 left-3 max-w-[74%] truncate rounded-full bg-slate-950/90 px-3 py-1.5 text-xs font-semibold text-white">
                    {societyImageAttribution(heroSociety).label}
                  </span>
                ) : null}
              </div>

              <div className="mt-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">Featured match</p>
                <h3 className="mt-1 line-clamp-1 text-2xl font-black text-navy-950">
                  {heroSociety?.name || "Gurgaon society search"}
                </h3>
                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-blue-500">
                  <MapPin className="h-4 w-4" />
                  {heroSociety ? formatPublicLocation(heroSociety) : "Compare Gurgaon micro-markets"}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-blue-50 p-3">
                    <p className="text-xs font-bold text-blue-300">Society score</p>
                    <p className="mt-1 text-lg font-black text-navy-950">{heroSociety ? scoreOf(heroSociety) : "AI"}</p>
                  </div>
                  <div className="rounded-2xl bg-ivory-100 p-3">
                    <p className="text-xs font-bold text-blue-300">Inventory</p>
                    <p className="mt-1 text-lg font-black text-navy-950">{heroProperty ? "Available" : "On request"}</p>
                  </div>
                </div>

                <Button asChild className="mt-4 h-11 w-full rounded-full bg-blue-700 font-black text-white hover:bg-blue-800">
                  <Link to={searchHref}>
                    Continue search <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-blue-50 bg-white px-4 py-4">
        <div className="container mx-auto rounded-[1.25rem] border border-blue-100 bg-blue-50/40 p-4 text-sm font-semibold leading-6 text-blue-600">
          {landingSeoText(variant, locality, builderSlug)}
        </div>
      </section>

      <section className="bg-white px-4 py-8 md:py-10">
        <div className="container mx-auto">
          <div className="rounded-[2rem] border border-blue-100 bg-white p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Popular Gurgaon society searches</p>
                <h2 className="mt-2 font-display text-2xl font-black text-navy-950 md:text-3xl">Explore by locality and builder</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-navy-500">
                  Continue with high-intent Gurgaon pages that match how users search before choosing a society.
                </p>
              </div>
              <Button asChild variant="outline" className="h-10 rounded-full border-blue-100 bg-white font-black text-blue-700 hover:bg-blue-50">
                <Link to="/search?tab=societies">
                  Search Gurgaon societies <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-blue-100 bg-[#F8FAFC] p-4">
                <p className="flex items-center gap-2 text-sm font-black text-navy-950">
                  <MapPin className="h-4 w-4 text-blue-700" /> Search by Gurgaon locality
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {popularLocalities.map((item) => (
                    <Link
                      key={item}
                      to={`/gurgaon/${slugify(item)}`}
                      className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-50"
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-blue-100 bg-[#F8FAFC] p-4">
                <p className="flex items-center gap-2 text-sm font-black text-navy-950">
                  <Building2 className="h-4 w-4 text-blue-700" /> Search by builder
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {popularBuilders.map((item) => (
                    <Link
                      key={item}
                      to={`/builder/${slugify(item)}`}
                      className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-50"
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 md:py-10">
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
          <div className="space-y-8 md:space-y-10">
            {hasScopedResults ? (
              <>
                <section>
                  <SectionTitle
                    eyebrow="Societies"
                    title="Verified society profiles"
                    description="Open society pages with location context, rent/resale signals and available home links."
                    action={
                      <Button asChild variant="outline" className="h-10 rounded-full border-blue-100 bg-white font-black text-blue-700 hover:bg-blue-50">
                        <Link to="/search?tab=societies">
                          View all societies <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    }
                  />

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {scopedSocieties.map((society) => (
                      <Link
                        key={society.id || society.slug || society.name}
                        to={`/society/${society.slug}`}
                        className="group overflow-hidden rounded-[1.5rem] border border-blue-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-premium"
                      >
                        <div className="relative h-36 overflow-hidden bg-blue-50">
                          <img src={societyImage(society)} alt={society.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/45 via-transparent to-transparent" />
                          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">Society</span>
                          <span className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black text-navy-950">
                            Score {scoreOf(society)}
                          </span>
                        </div>

                        <div className="p-4">
                          <h3 className="line-clamp-1 font-display text-xl font-black text-navy-950 group-hover:text-blue-700">{society.name}</h3>
                          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-blue-500">
                            <MapPin className="h-4 w-4" /> {formatPublicLocation(society)}
                          </p>

                          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-blue-50/60 p-2">
                            <div className="rounded-xl bg-white p-3">
                              <p className="text-xs font-bold text-blue-300">Rent</p>
                              <p className="mt-1 text-sm font-black text-navy-950">{compactText(society.rentRange)}</p>
                            </div>
                            <div className="rounded-xl bg-white p-3">
                              <p className="text-xs font-bold text-blue-300">Resale</p>
                              <p className="mt-1 text-sm font-black text-navy-950">{compactText(society.buyRange)}</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>

                <section>
                  <SectionTitle
                    eyebrow="Inventory"
                    title="Live verified properties"
                    description="Browse homes inside verified societies with clear next actions."
                    action={
                      <Button asChild variant="outline" className="h-10 rounded-full border-blue-100 bg-white font-black text-blue-700 hover:bg-blue-50">
                        <Link to="/search?tab=rent">
                          View all properties <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    }
                  />

                  {scopedProperties.length ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {scopedProperties.map((property) => (
                        <Link
                          key={property.id || property.slug || property.title}
                          to={propertyUrl(property)}
                          className="group overflow-hidden rounded-[1.5rem] border border-blue-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-premium"
                        >
                          <div className="relative h-32 overflow-hidden bg-blue-50">
                            <img src={propertyImage(property)} alt={property.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                            <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">
                              {property.listingType || "Property"}
                            </span>
                          </div>
                          <div className="p-4">
                            <h3 className="line-clamp-2 text-lg font-black text-navy-950 group-hover:text-blue-700">{property.title}</h3>
                            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-blue-500">
                              <MapPin className="h-4 w-4" /> {property.society || property.locality || "Gurgaon"}
                            </p>

                            <div className="mt-4 flex items-center justify-between border-t border-blue-50 pt-3">
                              <span className="text-sm font-bold text-navy-500">{property.furnishedStatus || "Verified listing"}</span>
                              <span className="rounded-full bg-blue-700 px-3 py-1.5 text-sm font-black text-white">
                                {compactText(property.price)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-blue-100 bg-white p-5 text-sm font-semibold text-navy-500">
                      No live property cards are attached to this page yet. Use search or request an AI shortlist for current options.
                    </div>
                  )}
                </section>
              </>
            ) : (
              <div className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">No exact public cards yet</p>
                <h2 className="mt-2 font-display text-3xl font-black text-navy-950">We can still shortlist options manually.</h2>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-navy-500">
                  This SEO page is live for discovery, but matching public cards are still being added. Continue to search or ask AI for nearby matches.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="rounded-full bg-blue-700 font-black text-white hover:bg-blue-800">
                    <Link to={searchHref}>
                      Open search <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full border-blue-100 font-black text-blue-700">
                    <Link to={aiHref}>
                      Ask AI Advisor <Sparkles className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="bg-white px-4 py-8 md:py-10">
        <div className="container mx-auto rounded-[2rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff,#ffffff)] p-5 shadow-sm md:p-7">
          <div className="grid gap-5 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Need help?</p>
              <h2 className="mt-2 font-display text-3xl font-black text-navy-950">
                Tell us your budget and preferred Gurgaon society
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-blue-500">
                SocietyFlats can shortlist matching homes, arrange callbacks and help you compare Gurgaon societies before a visit.
              </p>
            </div>

            <div className="grid gap-3">
              <Button asChild className="h-12 rounded-full bg-blue-700 font-black text-white hover:bg-blue-800">
                <Link to={searchHref}>
                  Find matching societies <Search className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-blue-100 bg-white font-black text-blue-700 hover:bg-blue-50">
                <Link to="/sell">
                  List owner property <Home className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <InternalSeoLinks
        variant="landing"
        title="More Gurgaon search paths"
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
