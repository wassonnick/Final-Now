// C86 SEO landing page polish: sharper Gurgaon/builder/locality copy, tighter cards and conversion CTAs.
// C71 SEO landing copy: verified Gurgaon societies, sector pages, builder pages and society-first internal linking.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  Building2,
  Home,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setPublicSeo } from "@/lib/seo";
import { InternalSeoLinks } from "@/components/seo/InternalSeoLinks";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://final-now.onrender.com/api";

type LandingVariant = "gurgaon" | "gurgaon-societies" | "gurgaon-properties" | "locality" | "builder";

type Society = {
  id: number;
  name: string;
  slug: string;
  builder?: string | null;
  sector?: string | null;
  locality?: string | null;
  description?: string | null;
  rent_range?: string | null;
  buy_range?: string | null;
  score?: string | number | null;
  status?: string | null;
  featured?: boolean;
  show_in_hero?: boolean;
  search_boost?: boolean;
  properties_count?: number;
};

type Property = {
  id: number;
  title: string;
  slug: string;
  listing_type?: string | null;
  property_type?: string | null;
  bedrooms?: string | number | null;
  area_sqft?: string | number | null;
  price?: string | number | null;
  furnished_status?: string | null;
  featured?: boolean;
  verified?: boolean;
  locality?: string | null;
  society?:
    | string
    | {
        name?: string | null;
        slug?: string | null;
        locality?: string | null;
        sector?: string | null;
      }
    | null;
};

type ApiResponse<T> = {
  status?: string;
  data?: {
    data?: T[];
  } | T[];
};

const localityLabels: Record<string, string> = {
  "sector-56": "Sector 56",
  "sector-65": "Sector 65",
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
  tata: "Tata Housing",
  adani: "Adani Realty",
  tulip: "Tulip",
  "alpha-corp": "Alpha Corp",
};

function extractRows<T>(payload: ApiResponse<T>): T[] {
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.data)) return payload.data.data;
  return [];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function readableFromSlug(slug: string | undefined, fallback = "Gurgaon") {
  if (!slug) return fallback;

  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => {
      if (/^\d+$/.test(part)) return part;
      if (part.length <= 3) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function societyLocation(society: Society) {
  return [society.sector, society.locality].filter(Boolean).join(", ") || "Gurgaon";
}

function propertySocietyName(property: Property) {
  if (typeof property.society === "object") return property.society?.name || "";
  return property.society || "";
}

function propertyLocation(property: Property) {
  if (typeof property.society === "object") {
    return [property.society?.name, property.society?.sector || property.society?.locality]
      .filter(Boolean)
      .join(", ");
  }

  return [property.society, property.locality].filter(Boolean).join(", ") || "Gurgaon";
}

function matchesLocality(value: string, society: Society) {
  const haystack = [society.name, society.builder, society.sector, society.locality]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(value.toLowerCase());
}

function propertyMatchesLocality(value: string, property: Property) {
  const haystack = [
    property.title,
    property.locality,
    propertySocietyName(property),
    typeof property.society === "object" ? property.society?.sector : "",
    typeof property.society === "object" ? property.society?.locality : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(value.toLowerCase());
}

function matchesBuilder(value: string, society: Society) {
  const builder = String(society.builder || society.name || "").toLowerCase();
  return builder.includes(value.toLowerCase());
}

function propertyMatchesBuilder(value: string, property: Property) {
  const haystack = [property.title, propertySocietyName(property)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(value.toLowerCase());
}

function cleanPropertyForSeo(property: Property) {
  const slug = String(property.slug || "");
  const title = String(property.title || "");
  const lowerSlug = slug.toLowerCase();
  const lowerTitle = title.toLowerCase();

  if (!slug || !title) return false;
  if (lowerSlug.includes("owner-lead")) return false;
  if (lowerSlug.includes("test")) return false;
  if (lowerTitle.includes("test")) return false;
  if (/^\d+-?bhk-?flat$/i.test(lowerSlug)) return false;
  if (/lead-\d+/i.test(lowerSlug)) return false;
  if (/\d{10,}$/.test(lowerSlug)) return false;

  return true;
}

function landingCopy(variant: LandingVariant, localitySlug?: string, builderSlug?: string) {
  const localityLabel = localityLabels[localitySlug || ""] || readableFromSlug(localitySlug, "Gurgaon");
  const builderLabel = builderLabels[builderSlug || ""] || readableFromSlug(builderSlug, "Gurgaon builder");

  if (variant === "gurgaon-societies") {
    return {
      eyebrow: "Gurgaon Society Intelligence",
      title: "Verified societies in Gurgaon",
      description:
        "Explore verified Gurgaon societies with society scores, rent ranges, resale context, live inventory and callback support.",
      canonical: "/gurgaon/societies",
      searchQuery: "Verified Gurgaon societies",
    };
  }

  if (variant === "gurgaon-properties") {
    return {
      eyebrow: "Gurgaon Verified Homes",
      title: "Verified properties in Gurgaon",
      description:
        "Browse live Gurgaon rental and resale homes inside verified societies with pricing context, society intelligence and callback support.",
      canonical: "/gurgaon/properties",
      searchQuery: "Gurgaon properties",
    };
  }

  if (variant === "locality") {
    return {
      eyebrow: "Gurgaon Locality Intelligence",
      title: `Societies and properties in ${localityLabel}, Gurgaon`,
      description: `Compare verified societies and live homes in ${localityLabel}, Gurgaon with location strength, pricing context and callback support.`,
      canonical: `/gurgaon/${localitySlug}`,
      searchQuery: `${localityLabel} Gurgaon`,
    };
  }

  if (variant === "builder") {
    return {
      eyebrow: "Builder Society Collection",
      title: `${builderLabel} societies and properties in Gurgaon`,
      description: `Compare ${builderLabel} societies and available homes in Gurgaon with society intelligence, pricing context and callback support.`,
      canonical: `/builder/${builderSlug}`,
      searchQuery: `${builderLabel} Gurgaon`,
    };
  }

  return {
    eyebrow: "Gurgaon Society-First Search",
    title: "Find the right Gurgaon society before choosing the home",
    description:
      "Discover verified Gurgaon societies, live properties, owner listings and society-first recommendations on SocietyFlats.",
    canonical: "/gurgaon",
    searchQuery: "Gurgaon",
  };
}


function breadcrumbLabelForLanding(variant: LandingVariant, localitySlug?: string, builderSlug?: string) {
  if (variant === "gurgaon-societies") return "Societies";
  if (variant === "gurgaon-properties") return "Properties";
  if (variant === "locality") return localityLabels[localitySlug || ""] || readableFromSlug(localitySlug, "Locality");
  if (variant === "builder") return builderLabels[builderSlug || ""] || readableFromSlug(builderSlug, "Builder");
  return "Gurgaon";
}

function landingSeoText(variant: LandingVariant, localitySlug?: string, builderSlug?: string) {
  const localityLabel = localityLabels[localitySlug || ""] || readableFromSlug(localitySlug, "Gurgaon");
  const builderLabel = builderLabels[builderSlug || ""] || readableFromSlug(builderSlug, "Gurgaon builder");

  if (variant === "builder") {
    return `${builderLabel} pages help users compare society location, rent signals, resale context and live homes before booking visits in Gurgaon.`;
  }

  if (variant === "locality") {
    return `${localityLabel} pages collect verified Gurgaon societies and available homes so users can compare location strength, pricing context and resident fit faster.`;
  }

  if (variant === "gurgaon-properties") {
    return "The Gurgaon properties section connects live inventory with society context, helping users understand the building before choosing the flat.";
  }

  if (variant === "gurgaon-societies") {
    return "The Verified Gurgaon societies section is designed for users who want to compare societies first, then shortlist homes based on fit, budget and location.";
  }

  return "SocietyFlats is built around the Gurgaon society-first journey: compare the society, understand the location and then shortlist homes with better context.";
}

export function SeoLandingPage({ variant }: { variant: LandingVariant }) {
  const { locality, builderSlug } = useParams();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(Boolean(API_BASE_URL));
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => landingCopy(variant, locality, builderSlug), [variant, locality, builderSlug]);

  useEffect(() => {
    setPublicSeo(
      `${copy.title} | SocietyFlats`,
      copy.description,
      {
        canonical: copy.canonical,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${copy.title} | SocietyFlats`,
          description: copy.description,
          url: `https://www.societyflats.com${copy.canonical}`,
          isPartOf: {
            "@type": "WebSite",
            name: "SocietyFlats",
            url: "https://www.societyflats.com",
          },
          about: {
            "@type": "Place",
            name: "Gurugram, Haryana, India",
          },
        },
      },
    );
  }, [copy]);

  useEffect(() => {
    let mounted = true;

    async function loadLandingData() {
      try {
        const [societyResponse, propertyResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/societies?per_page=100`),
          fetch(`${API_BASE_URL}/properties?per_page=100`),
        ]);

        if (!societyResponse.ok || !propertyResponse.ok) {
          throw new Error("Unable to fetch landing page data");
        }

        const [societyJson, propertyJson] = await Promise.all([
          societyResponse.json() as Promise<ApiResponse<Society>>,
          propertyResponse.json() as Promise<ApiResponse<Property>>,
        ]);

        if (!mounted) return;

        setSocieties(extractRows<Society>(societyJson));
        setProperties(extractRows<Property>(propertyJson).filter(cleanPropertyForSeo));
        setError(null);
      } catch {
        if (mounted) setError("Unable to load live SocietyFlats data right now.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadLandingData();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredSocieties = useMemo(() => {
    let rows = societies;

    if (variant === "locality") {
      const label = localityLabels[locality || ""] || readableFromSlug(locality, "");
      rows = rows.filter((society) => matchesLocality(label, society) || matchesLocality(String(locality || ""), society));
    }

    if (variant === "builder") {
      const label = builderLabels[builderSlug || ""] || readableFromSlug(builderSlug, "");
      rows = rows.filter((society) => matchesBuilder(label, society) || matchesBuilder(String(builderSlug || ""), society));
    }

    return rows
      .slice()
      .sort((a, b) => Number(b.featured || b.show_in_hero || b.search_boost) - Number(a.featured || a.show_in_hero || a.search_boost))
      .slice(0, variant === "gurgaon-properties" ? 3 : 9);
  }, [societies, variant, locality, builderSlug]);

  const filteredProperties = useMemo(() => {
    let rows = properties;

    if (variant === "locality") {
      const label = localityLabels[locality || ""] || readableFromSlug(locality, "");
      rows = rows.filter((property) => propertyMatchesLocality(label, property) || propertyMatchesLocality(String(locality || ""), property));
    }

    if (variant === "builder") {
      const label = builderLabels[builderSlug || ""] || readableFromSlug(builderSlug, "");
      rows = rows.filter((property) => propertyMatchesBuilder(label, property) || propertyMatchesBuilder(String(builderSlug || ""), property));
    }

    return rows
      .slice()
      .sort((a, b) => Number(b.featured || b.verified) - Number(a.featured || a.verified))
      .slice(0, variant === "gurgaon-societies" ? 3 : 9);
  }, [properties, variant, locality, builderSlug]);

  const hasScopedResults = filteredSocieties.length > 0 || filteredProperties.length > 0;

  return (
    <div className="min-h-screen bg-ivory-100">
      <section className="border-b border-navy-100 bg-white">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-navy-400">
              <Link to="/" className="hover:text-blue-700">Home</Link>
              <span>/</span>
              <Link to="/gurgaon" className="hover:text-blue-700">Gurgaon</Link>
              <span>/</span>
              <span className="text-navy-700">{breadcrumbLabelForLanding(variant, locality, builderSlug)}</span>
            </div>

            <Badge className="rounded-full border-blue-100 bg-blue-50 px-4 py-1 text-blue-700">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              {copy.eyebrow}
            </Badge>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-950 md:text-5xl">
              {copy.title}
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-navy-500 md:text-lg md:leading-8">
              {copy.description}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to={`/search?q=${encodeURIComponent(copy.searchQuery)}`}>
                <Button className="w-full rounded-full bg-blue-700 px-6 text-white hover:bg-blue-800 sm:w-auto">
                  Search matching societies
                  <Search className="ml-2 h-4 w-4" />
                </Button>
              </Link>

              <Link to="/sell">
                <Button variant="outline" className="w-full rounded-full border-navy-200 bg-white px-6 text-navy-800 sm:w-auto">
                  List owner property
                  <Home className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              ["Verified societies", `${societies.length || "Live"} profiles`],
              ["Live inventory", `${properties.length || "Fresh"} homes`],
              ["Society-first shortlist", "Callback + WhatsApp help"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.25rem] border border-navy-100 bg-ivory-100 p-4">
                <p className="text-sm text-navy-500">{label}</p>
                <p className="mt-1 text-xl font-black text-navy-950">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-5">
        <div className="container mx-auto">
          <div className="rounded-[1rem] border border-blue-100 bg-blue-50/40 p-4 text-sm leading-6 text-navy-600">
            {landingSeoText(variant, locality, builderSlug)}
          </div>
        </div>
      </section>

      <InternalSeoLinks
        variant="landing"
        title="Related Gurgaon searches"
        description="Continue exploring Gurgaon by society, locality, builder and live inventory paths."
      />

      <section className="container mx-auto px-4 py-8 md:py-10">
        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-[2rem] border border-navy-100 bg-white">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-4 text-navy-500">Loading live SocietyFlats data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-amber-800">
            {error}
          </div>
        ) : (
          <div className="space-y-9 md:space-y-10">
            {hasScopedResults ? null : (
              <div className="rounded-[2rem] border border-blue-100 bg-blue-50 p-8">
                <h2 className="text-2xl font-black text-navy-950">No exact live match yet</h2>
                <p className="mt-2 max-w-2xl text-navy-600">
                  We are still building live inventory for this page. You can search all Verified Gurgaon societies or request a callback for similar options.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link to="/search">
                    <Button className="rounded-full bg-blue-700 text-white hover:bg-blue-800">
                      Search all Gurgaon
                    </Button>
                  </Link>
                  <Link to="/sell">
                    <Button variant="outline" className="rounded-full bg-white">
                      Add owner listing
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {variant !== "gurgaon-properties" ? (
              <div>
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">Societies</p>
                    <h2 className="mt-2 text-2xl font-black text-navy-950 md:text-3xl">Verified society profiles</h2>
                  </div>
                  <Link to="/societies" className="hidden text-sm font-bold text-blue-700 md:inline-flex">
                    View all societies <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredSocieties.map((society) => (
                    <Link
                      key={society.id || society.slug}
                      to={`/society/${society.slug}`}
                      className="group rounded-[1.35rem] border border-navy-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft md:p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-black text-navy-950 group-hover:text-blue-700">
                            {society.name}
                          </h3>
                          <p className="mt-2 flex items-center gap-2 text-sm text-navy-500">
                            <MapPin className="h-4 w-4" />
                            {societyLocation(society)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-navy-700 px-3 py-2 text-center text-white">
                          <p className="text-[10px] uppercase text-white/60">Score</p>
                          <p className="font-black">{society.score || "8.5"}</p>
                        </div>
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-navy-500">
                        {society.description || "Verified Gurgaon society with location context, amenities and live inventory."}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl bg-ivory-200 p-3">
                          <p className="text-xs text-navy-400">Rent</p>
                          <p className="mt-1 font-bold text-navy-900">{society.rent_range || "On request"}</p>
                        </div>
                        <div className="rounded-xl bg-ivory-200 p-3">
                          <p className="text-xs text-navy-400">Buy</p>
                          <p className="mt-1 font-bold text-navy-900">{society.buy_range || "On request"}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {variant !== "gurgaon-societies" ? (
              <div>
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">Inventory</p>
                    <h2 className="mt-2 text-2xl font-black text-navy-950 md:text-3xl">Live verified properties</h2>
                  </div>
                  <Link to="/properties" className="hidden text-sm font-bold text-blue-700 md:inline-flex">
                    View all properties <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredProperties.map((property) => (
                    <Link
                      key={property.id || property.slug}
                      to={`/property/${property.slug}`}
                      className="group rounded-[1.35rem] border border-navy-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft md:p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Badge className="rounded-full bg-blue-50 text-blue-700">
                            {property.listing_type || "Rent"}
                          </Badge>
                          <h3 className="mt-3 line-clamp-2 text-lg font-black text-navy-950 group-hover:text-blue-700">
                            {property.title}
                          </h3>
                          <p className="mt-2 flex items-center gap-2 text-sm text-navy-500">
                            <MapPin className="h-4 w-4" />
                            {propertyLocation(property)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2.5">
                        <div className="rounded-xl bg-ivory-200 p-2.5 text-center">
                          <BedDouble className="mx-auto h-4 w-4 text-navy-500" />
                          <p className="mt-2 text-xs text-navy-400">BHK</p>
                          <p className="font-bold text-navy-900">{property.bedrooms || "-"}</p>
                        </div>
                        <div className="rounded-xl bg-ivory-200 p-2.5 text-center">
                          <Building2 className="mx-auto h-4 w-4 text-navy-500" />
                          <p className="mt-2 text-xs text-navy-400">Type</p>
                          <p className="font-bold text-navy-900">{property.property_type || "Flat"}</p>
                        </div>
                        <div className="rounded-xl bg-ivory-200 p-2.5 text-center">
                          <ShieldCheck className="mx-auto h-4 w-4 text-navy-500" />
                          <p className="mt-2 text-xs text-navy-400">Area</p>
                          <p className="font-bold text-navy-900">{property.area_sqft || "-"}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-navy-100 pt-3">
                        <span className="text-sm text-navy-500">{property.furnished_status || "Verified"}</span>
                        <span className="rounded-full bg-navy-700 px-4 py-2 text-sm font-bold text-white">
                          {property.price || "On request"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-[1.5rem] border border-blue-100 bg-white p-5 md:p-7">
              <div className="grid gap-8 md:grid-cols-[1.3fr_0.7fr] md:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">Need help?</p>
                  <h2 className="mt-2 text-2xl font-black text-navy-950 md:text-3xl">
                    Tell us your budget and preferred Gurgaon society
                  </h2>
                  <p className="mt-3 max-w-2xl text-navy-500">
                    SocietyFlats can shortlist matching homes, arrange callbacks and help you compare Gurgaon societies before a visit.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Link to={`/search?q=${encodeURIComponent(copy.searchQuery)}`}>
                    <Button className="w-full rounded-full bg-blue-700 text-white hover:bg-blue-800">
                      Find matching societies
                    </Button>
                  </Link>
                  <Link to="/sell">
                    <Button variant="outline" className="w-full rounded-full bg-white">
                      List owner property
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
