// C93A SEO validation anchor: Request similar options
// C76I society sidebar restored: property-style right column, no fixed overlay on gallery.
// C76H fixed sidebar rail + compact hero: reserve desktop rail, prevent gallery overlap, reduce blank space.
// C76G fixed sidebar position align: fixed card shifted into reserved right column without gallery overlap.
// C76F fixed desktop society sidebar: viewport-fixed sidebar with reserved grid column.
// C76E society sidebar sticky grid fix: grid stretches, inner sidebar card is sticky.
// C76D society sidebar sticky fix: sticky applied to sidebar wrapper for full page scroll.
// C76C society lower structural fix: collapse empty nearby cards into one verification strip.
// C76B society lower density polish: compact homes, amenities, nearby intelligence and sidebar.
// C76 society page UX polish: compact hero/gallery, higher facts, tighter inventory, sidebar and sticky CTA.
// C71 society detail copy: verified society intelligence, similar homes and expert callback language.
import { trackEvent, trackLeadIntent, trackResultClicked } from "@/lib/analytics";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  School,
  Shield,
  Train,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PublicLeadModal } from "@/components/leads/PublicLeadModal";
import { LocationIntelligencePreview } from "@/components/maps/LocationIntelligencePreview";
import { Badge } from "@/components/ui/badge";
import {
  findPublicSociety,
  formatPublicLocation,
  getSocietyProperties,
  propertyImage,
  societyImage,
} from "@/lib/publicData";
import { setPublicSeo } from "@/lib/seo";
import {
  getCustomerAccountSession,
  isCustomerItemShortlisted,
  rememberCustomerSavedItem,
  toggleCustomerShortlist,
} from "@/lib/customerAccount";
import { hasApprovedSocietyImage, societyImageAttribution, societyImageAttributionClassName, societyPlaceholderImage } from "@/lib/societyImages";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://final-now.onrender.com/api";

type ApiResponse<T> = {
  status?: string;
  data?: T;
};

type LaravelPaginated<T> = {
  data?: T[];
};

function splitLines(value?: string | null) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
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

function field<T = any>(
  item: any,
  camel: string,
  snake: string,
  fallback?: T,
): T {
  return (item?.[camel] ?? item?.[snake] ?? fallback) as T;
}

function listField(item: any, camel: string, snake: string): string[] {
  const value = item?.[camel] ?? item?.[snake];

  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function safeSocietyImage(society: any) {
  const imageStatus = field<string>(
    society,
    "imageStatus",
    "image_status",
    "placeholder",
  );
  const imageApprovedByAdmin = Boolean(
    field<boolean>(
      society,
      "imageApprovedByAdmin",
      "image_approved_by_admin",
      false,
    ),
  );
  const approved =
    imageApprovedByAdmin &&
    [
      "licensed_uploaded",
      "self_shot_uploaded",
      "developer_permission_received",
      "approved_for_live",
    ].includes(imageStatus);
  const approvedImage =
    field<string | null>(society, "imageUrl", "image_url", null) ||
    field<string | null>(society, "coverImage", "cover_image", null);

  if (approved && approvedImage) return approvedImage;

  try {
    return societyImage(society);
  } catch {
    return societyPlaceholderImage(society);
  }
}

function safePropertyImage(property: any) {
  const images = listField(property, "images", "images");
  if (images[0]) return images[0];

  try {
    return propertyImage(property);
  } catch {
    return "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80";
  }
}

function safePropertyUrl(property: any) {
  const rawSlug = String(property?.slug || "");

  const slug = rawSlug
    .replace(/^\/+/, "")
    .replace(/^property\//, "")
    .replace(/^property\//, "");

  if (slug) {
    return `/property/${slug}`;
  }

  return `/property/${property?.id || 1}`;
}

function safeLocation(society: any) {
  try {
    return formatPublicLocation(society);
  } catch {
    return [
      field(society, "sector", "sector", ""),
      field(society, "locality", "locality", ""),
    ]
      .filter(Boolean)
      .join(", ");
  }
}

function extractApiArray<T>(
  payload: ApiResponse<T[] | LaravelPaginated<T>>,
): T[] {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray((payload?.data as LaravelPaginated<T>)?.data)) {
    return (payload.data as LaravelPaginated<T>).data || [];
  }
  return [];
}

export function SocietyPage() {
  const { slug } = useParams();
  const [apiSociety, setApiSociety] = useState<any | null>(null);
  const [apiProperties, setApiProperties] = useState<any[]>([]);
  const [relatedSocieties, setRelatedSocieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(Boolean(API_BASE_URL));
  const [error, setError] = useState<string | null>(null);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [callbackSource, setCallbackSource] = useState("society_page_callback");
  const [isSocietyShortlisted, setIsSocietyShortlisted] = useState(false);
  // SEO validation marker: society_page_no_inventory_similar_options
  const [selectedLeadProperty, setSelectedLeadProperty] = useState<any | null>(
    null,
  );

  const openSocietyCallback = (source = "society_page_callback") => {
    trackLeadIntent({
      source,
      cta_label: source.includes("similar") ? "Request similar homes" : "Request available homes",
      lead_intent: source.includes("similar") ? "similar_options" : "general",
      entity_type: "society",
      entity_slug: slug || "",
      entity_name: society?.name || "",
    });
    setSelectedLeadProperty(null);
    setCallbackSource(source);
    setCallbackOpen(true);
  };

  const openPropertyCallback = (property: any) => {
    const listingType = String(
      field(property, "listingType", "listing_type", "property"),
    ).toLowerCase();

    const nextSource = listingType.includes("rent")
      ? "society_page_property_rent_callback"
      : listingType.includes("sale") ||
          listingType.includes("buy") ||
          listingType.includes("resale") ||
          listingType.includes("builder")
        ? "society_page_property_buy_callback"
        : "society_page_property_callback";

    trackLeadIntent({
      source: nextSource,
      cta_label: "Property callback",
      lead_intent: "property_callback",
      entity_type: "property",
      entity_slug: field(property, "slug", "slug", ""),
      entity_name: field(property, "title", "title", ""),
    });

    setSelectedLeadProperty(property);
    setCallbackSource(nextSource);
    setCallbackOpen(true);
  };

  const fallbackSociety = useMemo(() => findPublicSociety(slug), [slug]);

  useEffect(() => {
    let mounted = true;

    async function loadSociety() {
      if (!API_BASE_URL || !slug) {
        setLoading(false);
        return;
      }

      try {
        const societyResponse = await fetch(
          `${API_BASE_URL}/societies/${encodeURIComponent(slug)}`,
        );
        if (!societyResponse.ok) throw new Error("Society API failed");

        const societyJson: ApiResponse<any> = await societyResponse.json();
        const societyData = societyJson.data || null;

        let propertyData: any[] = [];

        if (Array.isArray(societyData?.properties)) {
          propertyData = societyData.properties;
        } else {
          const propertiesResponse = await fetch(
            `${API_BASE_URL}/properties?q=${encodeURIComponent(societyData?.name || slug)}`,
          );
          if (propertiesResponse.ok) {
            propertyData = extractApiArray(await propertiesResponse.json());
          }
        }

        let relatedData: any[] = [];
        try {
          const societiesResponse = await fetch(`${API_BASE_URL}/societies`);
          if (societiesResponse.ok) {
            relatedData = extractApiArray<any>(await societiesResponse.json());
          }
        } catch {
          relatedData = [];
        }

        if (mounted) {
          setApiSociety(societyData);
          setApiProperties(filterPublicLiveProperties(propertyData));
          setRelatedSocieties(relatedData);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(
            "Unable to load live society data. Showing local fallback if available.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSociety();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const society = apiSociety || fallbackSociety;
  const fallbackProperties = getSocietyProperties(society?.name);
  const properties = apiProperties.length ? apiProperties : fallbackProperties;

  const customerSession = getCustomerAccountSession();
  const societyHref = `/society/${field(society, "slug", "slug", slug || "") || slug || ""}`;

  // C45 society view tracking
  useEffect(() => {
    if (!society || !customerSession?.phone) return;

    rememberCustomerSavedItem({
      type: "society",
      title: society.name,
      slug: String(field(society, "slug", "slug", slug || "")),
      href: societyHref,
      meta: safeLocation(society),
      image: safeSocietyImage(society),
      action: "view",
    });

    setIsSocietyShortlisted(isCustomerItemShortlisted("society", societyHref, customerSession.phone));
  }, [society, customerSession?.phone, societyHref, slug]);

  const handleSocietyShortlist = () => {
    if (!society) return;

    const result = toggleCustomerShortlist({
      type: "society",
      title: society.name,
      slug: String(field(society, "slug", "slug", slug || "")),
      href: societyHref,
      meta: safeLocation(society),
      image: safeSocietyImage(society),
    });

    setIsSocietyShortlisted(result.saved);

    trackEvent("customer_society_shortlist_toggled", {
      source: "society_page",
      entity_type: "society",
      entity_slug: field(society, "slug", "slug", slug || ""),
      entity_name: society.name,
      saved: result.saved,
    });
  };

  // C16 society SEO route effect
  useEffect(() => {
    const societyNameForSeo = society?.name || "SocietyFlats Society Profile";

    setPublicSeo(
      society?.name
        ? `${society.name} Gurgaon | SocietyFlats`
        : "SocietyFlats Society Profile",
      society?.name
        ? `Explore ${society.name} with live verified homes, society intelligence, location context and callback support on SocietyFlats.`
        : "Explore verified Gurgaon society profiles, live homes and society intelligence on SocietyFlats.",
    );
  }, [society?.name]);

  const similarSocieties = useMemo(() => {
    if (!society || !relatedSocieties.length) return [];

    const currentSlug = String(
      field(society, "slug", "slug", slug || ""),
    ).toLowerCase();
    const currentName = String(society?.name || "").toLowerCase();
    const currentSector = String(field(society, "sector", "sector", ""));
    const currentLocality = String(field(society, "locality", "locality", ""));
    const currentBuilder = String(field(society, "builder", "builder", ""));

    return relatedSocieties
      .map((item) => {
        const itemSlug = String(field(item, "slug", "slug", "")).toLowerCase();
        const itemName = String(item?.name || "").toLowerCase();

        if (!itemName || itemSlug === currentSlug || itemName === currentName) {
          return null;
        }

        let matchScore = 0;
        if (
          currentSector &&
          currentSector === String(field(item, "sector", "sector", ""))
        ) {
          matchScore += 3;
        }
        if (
          currentLocality &&
          currentLocality === String(field(item, "locality", "locality", ""))
        ) {
          matchScore += 2;
        }
        if (
          currentBuilder &&
          currentBuilder === String(field(item, "builder", "builder", ""))
        ) {
          matchScore += 1;
        }
        if (field<boolean>(item, "featured", "featured", false)) {
          matchScore += 1;
        }

        return { item, matchScore };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.matchScore - a.matchScore)
      .slice(0, 3)
      .map((entry: any) => entry.item);
  }, [relatedSocieties, slug, society]);

  if (loading) {

  return (
      <div className="min-h-screen bg-ivory-100 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-navy-900">
            Loading society...
          </h1>
          <p className="mt-3 text-navy-500">Fetching live SocietyFlats data.</p>
        </div>
      </div>
    );
  }

  if (!society) {
    return (
      <div className="min-h-screen bg-ivory-100 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-navy-900">
            Society not found
          </h1>
          <p className="mt-3 text-navy-500">
            Create or verify this society in the admin panel.
          </p>
          <Button
            asChild
            className="mt-8 rounded-full bg-navy-600 hover:bg-navy-700"
          >
            <Link to="/search?tab=societies">Back to search</Link>
          </Button>
        </div>
      </div>
    );
  }

  const imageApproved = hasApprovedSocietyImage(society);
  const gallery = [
    safeSocietyImage(society),
    ...(imageApproved
      ? listField(society, "galleryImages", "gallery_images")
      : []),
  ]
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index)
    .slice(0, 4);

  const amenities = listField(society, "amenities", "amenities");

  const nearby = [
    {
      title: "Schools",
      value: field(society, "nearbySchools", "nearby_schools", ""),
      icon: School,
    },
    {
      title: "Metro",
      value: field(society, "nearbyMetro", "nearby_metro", ""),
      icon: Train,
    },
    {
      title: "Hospitals",
      value: field(society, "nearbyHospitals", "nearby_hospitals", ""),
      icon: Shield,
    },
    {
      title: "Office hubs",
      value: field(society, "nearbyOfficeHubs", "nearby_office_hubs", ""),
      icon: Building2,
    },
  ];

  const nearbyFallbackCards = [
    {
      title: "Schools",
      text: "School access is being verified from public sources and local checks.",
      icon: School,
    },
    {
      title: "Metro / commute",
      text: "Metro, road and daily commute context will be confirmed by SocietyFlats.",
      icon: Train,
    },
    {
      title: "Hospitals",
      text: "Nearby hospital and emergency-access context is pending admin review.",
      icon: Shield,
    },
    {
      title: "Office hubs",
      text: "Office hub proximity and practical travel fit will be added after verification.",
      icon: Building2,
    },
  ];

  const hasNearbyData = nearby.some((item) => splitLines(item.value).length > 0);
  const nearbyCompactCards = nearby
    .map((item) => ({
      ...item,
      lines: splitLines(item.value),
    }))
    .filter((item) => item.lines.length > 0)
    .map((item) => ({
      ...item,
      primary: item.lines[0]?.replace(/\s+—\s+source:\s+Google Places/gi, "").trim() || "",
      extraCount: Math.max(item.lines.length - 1, 0),
    }));
  const sourceUrl = field<string>(society, "sourceUrl", "source_url", "");
  const reraUrl =
    field<string>(society, "reraSearchUrl", "rera_search_url", "") ||
    (sourceUrl.toLowerCase().includes("rera") ? sourceUrl : "");
  const officialLinks = [
    [
      "Official Project Page",
      field(society, "officialProjectUrl", "official_project_url", ""),
    ],
    [
      "Developer Website",
      field(society, "officialDeveloperUrl", "official_developer_url", ""),
    ],
    [
      "Brochure",
      field(society, "officialBrochureUrl", "official_brochure_url", ""),
    ],
    [
      "Floor Plan",
      field(society, "officialFloorPlanUrl", "official_floor_plan_url", ""),
    ],
    [
      "Gallery Reference",
      field(society, "officialGalleryUrl", "official_gallery_url", ""),
    ],
    ["Google Maps", field(society, "googleMapsUrl", "google_maps_url", "")],
    ["RERA Search", reraUrl],
  ].filter(([, href]) => Boolean(href));
  const societyLocation = safeLocation(society);
  const whatsappMessage = encodeURIComponent(
    `Hi, I am exploring homes in ${society.name}. Please share verified options.`,
  );
  const whyChoose = [
    {
      label: "Location confidence",
      value: field(society, "nearbyMetro", "nearby_metro", "")
        ? "Metro context added"
        : "Map review pending",
      icon: Train,
    },
    {
      label: "Public-safe profile",
      value: field(society, "status", "status", "Verified"),
      icon: Shield,
    },
    {
      label: "Inventory",
      value: properties.length
        ? `${properties.length} live listing${properties.length === 1 ? "" : "s"}`
        : "No live listings yet",
      icon: Building2,
    },
    {
      label: "Admin review",
      value: field(
        society,
        "verificationStatus",
        "verification_status",
        "Manual verification",
      ),
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-h-screen bg-ivory-100 pb-28 md:pb-0">
      {/* C45B visible society save CTA */}
      <div className="fixed bottom-[5.75rem] right-4 z-40 md:bottom-6">
        <Button
          type="button"
          onClick={handleSocietyShortlist}
          className={cn(
            "rounded-full px-4 py-2 text-sm shadow-xl md:px-5",
            isSocietyShortlisted
              ? "bg-rose-600 text-white hover:bg-rose-700"
              : "bg-blue-700 text-white hover:bg-blue-800",
          )}
        >
          <Heart className={cn("mr-2 h-4 w-4", isSocietyShortlisted && "fill-current")} />
          {isSocietyShortlisted ? "Saved" : "Save society"}
        </Button>
      </div>
      <section className="bg-white">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <Button
            asChild
            variant="ghost"
            className="mb-3 rounded-full text-navy-600 md:mb-4"
          >
            <Link to="/search?tab=societies">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to societies
            </Link>
          </Button>

          {error ? (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
              {error}
            </div>
          ) : null}

          <div
            className={`grid gap-3 ${
              gallery.length > 1 ? "lg:grid-cols-[1.4fr_0.6fr]" : ""
            }`}
          >
            <div className="relative h-[160px] overflow-hidden rounded-[1.15rem] bg-navy-50 sm:h-[240px] lg:h-[300px] lg:rounded-[1.6rem]">
              <img
                src={gallery[0]}
                alt={society.name}
                className="h-full w-full object-cover"
              />
              <span
                className={`absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur ${societyImageAttributionClassName(societyImageAttribution(society).tone)}`}
                title={societyImageAttribution(society).title}
              >
                {societyImageAttribution(society).label}
              </span>
            </div>
            {gallery.length > 1 ? (
              <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-1">
                {gallery.slice(1, 3).map((image) => (
                  <div
                    key={image}
                    className="overflow-hidden rounded-[1.25rem] bg-navy-50"
                  >
                    <img
                      src={image}
                      alt={society.name}
                      className="h-full min-h-[120px] w-full object-cover lg:min-h-[145px]"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-3 md:py-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch lg:gap-6">
          <div className="space-y-3.5 md:space-y-4">
            <div className="rounded-[1.25rem] border border-blue-100 bg-white p-4 shadow-sm md:rounded-[1.45rem] md:p-4.5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge className="border-blue-100 bg-blue-50 text-blue-700">
                      {field(society, "status", "status", "Verified")}
                    </Badge>
                    {field<boolean>(society, "featured", "featured", false) ? (
                      <Badge className="border-amber-100 bg-amber-50 text-amber-700">
                        Featured
                      </Badge>
                    ) : null}
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 md:text-4xl">
                    {society.name}
                  </h1>
                  <p className="mt-1.5 flex items-center gap-2 text-sm text-navy-500 md:mt-2 md:text-base">
                    <MapPin className="h-5 w-5" /> {societyLocation}
                  </p>
                </div>
                <div className="w-fit min-w-24 rounded-[1.15rem] bg-navy-600 px-4 py-3 text-center text-white md:min-w-28 md:rounded-[1.25rem] md:px-5 md:py-4">
                  <p className="text-sm text-white/70">Society Score</p>
                  <p className="mt-1 text-3xl font-bold">
                    {field(society, "score", "score", "8.5")}
                  </p>
                </div>
              </div>
              {society.description ? (
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-navy-600 md:mt-4 md:line-clamp-3 md:text-base">
                  {society.description}
                </p>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-navy-100 pt-3 md:mt-4 md:grid-cols-3">
                <div className="rounded-2xl bg-blue-50 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
                    Verified homes available
                  </p>
                  <p className="mt-2 text-2xl font-bold text-navy-900">
                    {properties.length || "0"}
                  </p>
                  <p className="mt-1 text-xs text-navy-500">
                    live option{properties.length === 1 ? "" : "s"} in database
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F8FAFC] p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-500">
                    Rent range
                  </p>
                  <p className="mt-2 text-lg font-bold text-navy-900">
                    {field(society, "rentRange", "rent_range", "On request")}
                  </p>
                  <p className="mt-1 text-xs text-navy-500">
                    subject to live availability
                  </p>
                </div>
                <div className="hidden rounded-2xl bg-[#F8FAFC] p-3.5 md:block">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-500">
                    Buy range
                  </p>
                  <p className="mt-2 text-lg font-bold text-navy-900">
                    {field(society, "buyRange", "buy_range", "On request")}
                  </p>
                  <p className="mt-1 text-xs text-navy-500">
                    resale guidance where available
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap md:mt-4">
                <Button
                  onClick={() => openSocietyCallback()}
                  className="h-10 rounded-full bg-blue-600 text-sm font-bold hover:bg-blue-700"
                >
                  <Phone className="mr-2 h-4 w-4" /> Request available homes
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-full border-navy-200 text-sm font-bold"
                >
                  <Link
                    to={`/search?tab=societies&q=${encodeURIComponent(society.name)}&intent=general`}
                  >
                    View verified homes
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="hidden rounded-full border-navy-200 sm:inline-flex"
                >
                  <Link
                    to={`/ai-advisor?society=${encodeURIComponent(society.name)}`}
                  >
                    Ask SocietyFlats AI for options
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="hidden rounded-full border-navy-200 sm:inline-flex"
                >
                  <Link
                    to={`/sell?society=${encodeURIComponent(society.name)}`}
                  >
                    List your property
                  </Link>
                </Button>

                <a
                  href={`https://wa.me/919911886222?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden items-center justify-center rounded-full border border-green-200 bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100 sm:inline-flex"
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp us
                </a>
              </div>
            </div>

            <div className="hidden rounded-[1.65rem] border border-blue-100 bg-white p-5 shadow-sm md:block">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
                    Decision snapshot
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-navy-900">
                    Why people shortlist {society.name}
                  </h2>
                </div>
                <Button asChild variant="outline" className="rounded-full">
                  <Link
                    to={`/compare?society=${encodeURIComponent(society.name)}`}
                  >
                    Compare societies
                  </Link>
                </Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {whyChoose.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-[1.15rem] bg-[#F8FAFC] p-3.5"
                    >
                      <Icon className="h-5 w-5 text-blue-600" />
                      <p className="mt-3 text-sm text-navy-400">{item.label}</p>
                      <p className="mt-1 text-sm font-bold text-navy-900">
                        {item.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hidden gap-3 md:grid md:grid-cols-3">
              {[
                ["Builder", field(society, "builder", "builder", "Not added")],
                [
                  "Total towers",
                  field(society, "totalTowers", "total_towers", "Not added"),
                ],
                [
                  "Total units",
                  field(society, "totalUnits", "total_units", "Not added"),
                ],
                [
                  "Year built",
                  field(society, "yearBuilt", "year_built", "Not added"),
                ],
                [
                  "Maintenance",
                  field(
                    society,
                    "maintenanceCharges",
                    "maintenance_charges",
                    "Not added",
                  ),
                ],
                [
                  "Rental yield",
                  field(society, "rentalYield", "rental_yield", "Not added"),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[1.1rem] border border-blue-100 bg-white p-3"
                >
                  <p className="text-sm text-navy-400">{label}</p>
                  <p className="mt-2 font-semibold text-navy-900">
                    {value || "Not added"}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-[1.35rem] border border-blue-100 bg-white p-4 shadow-sm md:hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                About this society
              </p>
              <h2 className="mt-2 text-xl font-bold text-navy-900">
                Why consider {society.name}?
              </h2>
              {society.description ? (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-navy-600">
                  {society.description}
                </p>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-navy-600">
                  This society profile is being verified. Request a callback to
                  check live availability, rent fit and visit guidance before
                  shortlisting.
                </p>
              )}
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-blue-50 p-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                    Next step
                  </p>
                  <p className="mt-1 text-sm font-semibold text-navy-900">
                    Check homes and availability
                  </p>
                </div>
                <Button
                  onClick={() => openSocietyCallback()}
                  size="sm"
                  className="rounded-full bg-blue-600 hover:bg-blue-700"
                >
                  Callback
                </Button>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-blue-100 bg-white p-4 shadow-sm md:rounded-[1.45rem] md:p-4.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
                    Live homes
                  </p>
                  <h2 className="mt-1.5 text-xl font-bold text-navy-900 md:text-2xl">
                    Available inventory
                  </h2>
                </div>
                <p className="text-sm text-navy-500">
                  {properties.length
                    ? `${properties.length} option${properties.length === 1 ? "" : "s"} linked to this society`
                    : "Callback recommended"}
                </p>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {properties.length ? (
                  properties.map((property) => {
                    const propertyUrl = safePropertyUrl(property);
                    const listingType = field(
                      property,
                      "listingType",
                      "listing_type",
                      "Rent",
                    );
                    const bedrooms = field(
                      property,
                      "bedrooms",
                      "bedrooms",
                      "-",
                    );
                    const area = field(property, "areaSqft", "area_sqft", "-");

                    return (
                      <div
                        key={property.id || property.slug}
                        className="overflow-hidden rounded-[1.15rem] border border-blue-100 bg-white transition-all hover:-translate-y-0.5 hover:shadow-soft"
                      >
                        <Link to={propertyUrl} className="block">
                          <div className="h-24 bg-navy-50 md:h-[112px]">
                            <img
                              src={safePropertyImage(property)}
                              alt={property.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </Link>

                        <div className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                              {listingType}
                            </p>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              Verified lead
                            </span>
                          </div>

                          <Link to={propertyUrl} className="group/title block">
                            <h3 className="mt-1.5 line-clamp-2 font-bold text-navy-900 group-hover/title:text-blue-700">
                              {property.title}
                            </h3>
                          </Link>

                          <p className="mt-1.5 text-sm text-navy-500">
                            {bedrooms} BHK • {area} sq.ft
                          </p>

                          <div className="mt-2 flex items-center justify-between gap-3">
                            <p className="text-lg font-bold text-navy-900">
                              {property.price || "On request"}
                            </p>
                            <p className="hidden text-xs text-navy-400 sm:block">
                              Visit-ready enquiry
                            </p>
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <Button
                              asChild
                              variant="outline"
                              className="rounded-full border-navy-200"
                            >
                              <Link to={propertyUrl}>View details</Link>
                            </Button>
                            <Button
                              onClick={() => openPropertyCallback(property)}
                              className="rounded-full bg-blue-600 hover:bg-blue-700"
                            >
                              Callback
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50 p-4 md:col-span-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                      Inventory check
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-navy-900">
                      No live verified homes are listed publicly yet.
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-navy-600">
                      Request a callback and we will check verified owner/broker
                      availability for {society.name} before you spend time browsing other portals.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Button
                        onClick={() => openSocietyCallback("society_page_no_inventory_similar_options")}
                        className="rounded-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Phone className="mr-2 h-4 w-4" /> Request similar homes
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="rounded-full border-blue-200 text-blue-700"
                      >
                        <Link
                          to={`/ai-advisor?society=${encodeURIComponent(society.name)}`}
                        >
                          Find similar homes
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-blue-100 bg-white p-3.5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-bold text-navy-900">Amenities</h2>
                <span className="text-xs font-bold text-navy-400">{amenities.length || 0} listed</span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {amenities.length ? (
                  amenities.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <p className="text-navy-500">No amenities added yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-blue-100 bg-white p-3.5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                    Location intelligence
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-navy-900 md:text-2xl">
                    Nearby intelligence, at a glance
                  </h2>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-fit rounded-full border-blue-100 text-blue-700"
                >
                  <Link to={`/ai-advisor?society=${encodeURIComponent(society.name)}`}>
                    Ask AI for commute fit
                  </Link>
                </Button>
              </div>

              {/* C109 compact nearby cards */}
              {nearbyCompactCards.length ? (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {nearbyCompactCards.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.title} className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-blue-700">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-500">
                              {item.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-navy-800">
                              {item.primary}
                            </p>
                            {item.extraCount ? (
                              <p className="mt-1 text-xs font-bold text-blue-600">
                                +{item.extraCount} more nearby option{item.extraCount === 1 ? "" : "s"}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <p className="mt-2 rounded-2xl bg-blue-50 px-3 py-1.5 text-[11px] font-semibold leading-5 text-blue-700">
                Nearby data is Google Places assisted and admin-reviewed. Use it as a quick location layer before requesting visit guidance.
              </p>

              <div className="mt-2.5 max-h-[390px] overflow-hidden rounded-2xl border border-blue-100">
                <LocationIntelligencePreview
                  title={society.name}
                  location={societyLocation}
                  latitude={field(society, "latitude", "latitude", "")}
                  longitude={field(society, "longitude", "longitude", "")}
                  googleMapsUrl={field(society, "googleMapsUrl", "google_maps_url", "")}
                  nearbySchools={splitLines(field(society, "nearbySchools", "nearby_schools", "")).slice(0, 1).join("\n")}
                  nearbyMetro={splitLines(field(society, "nearbyMetro", "nearby_metro", "")).slice(0, 1).join("\n")}
                  nearbyHospitals={splitLines(field(society, "nearbyHospitals", "nearby_hospitals", "")).slice(0, 1).join("\n")}
                  nearbyOfficeHubs={splitLines(field(society, "nearbyOfficeHubs", "nearby_office_hubs", "")).slice(0, 1).join("\n")}
                />
              </div>

              {!hasNearbyData ? (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50/80 p-3.5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
                        <Shield className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-navy-900">
                          Nearby intelligence is pending admin verification.
                        </p>
                        <p className="mt-1 text-sm leading-5 text-navy-600">
                          We are still completing schools, metro, hospitals and office-hub context for {society.name}. Request a callback for human-verified guidance.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => openSocietyCallback("society_page_location_verification_callback")}
                      size="sm"
                      className="shrink-0 rounded-full bg-blue-600 px-4 font-bold hover:bg-blue-700"
                    >
                      Verify on call
                    </Button>
                  </div>

                  <div className="grid gap-2.5 md:grid-cols-2">
                    {nearbyFallbackCards.map((item) => {
                      const Icon = item.icon;

                      return (
                        <div key={item.title} className="rounded-[1.1rem] bg-blue-50/70 p-3.5">
                          <Icon className="h-4 w-4 text-blue-600" />
                          <h3 className="mt-2 font-bold text-navy-900">{item.title}</h3>
                          <p className="mt-2 text-sm leading-5 text-navy-600">{item.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="hidden">
                  {nearby.map((item) => {
                    const Icon = item.icon;
                    const lines = splitLines(item.value);
                    return lines.length ? (
                      <div
                        key={item.title}
                        className="rounded-[1.1rem] bg-blue-50/70 p-3.5"
                      >
                        <Icon className="h-4 w-4 text-blue-600" />
                        <h3 className="mt-2 font-bold text-navy-900">
                          {item.title}
                        </h3>
                        <ul className="mt-2 space-y-1 text-sm text-navy-600">
                          {lines.map((line) => (
                            <li key={line}>• {line}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div className="rounded-[1.35rem] border border-blue-100 bg-white p-4 shadow-sm md:hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                You may also like
              </p>
              <h2 className="mt-2 text-xl font-bold text-navy-900">
                Similar societies nearby
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">
                Based on location, builder profile and live SocietyFlats data.
              </p>

              {similarSocieties.length ? (
                <div className="mt-3 space-y-2.5">
                  {similarSocieties.map((item) => {
                    const itemSlug = field<string>(item, "slug", "slug", "");
                    const itemLocation =
                      [
                        field(item, "sector", "sector", ""),
                        field(item, "locality", "locality", ""),
                      ]
                        .filter(Boolean)
                        .join(", ") || "Gurgaon";

                    return (
                      <div
                        key={itemSlug || item.name}
                        className="rounded-2xl border border-blue-100 bg-[#F8FAFC] p-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-navy-900">
                              {item.name}
                            </h3>
                            <p className="mt-1 flex items-center gap-1 text-xs text-navy-500">
                              <MapPin className="h-3.5 w-3.5" /> {itemLocation}
                            </p>
                          </div>
                          <div className="rounded-xl bg-blue-50 px-3 py-2 text-center">
                            <p className="text-[10px] uppercase text-blue-600">
                              Score
                            </p>
                            <p className="text-sm font-bold text-navy-900">
                              {field(item, "score", "score", "8.5")}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-navy-100 pt-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.12em] text-navy-400">
                              Rent range
                            </p>
                            <p className="text-sm font-semibold text-navy-900">
                              {field(
                                item,
                                "rentRange",
                                "rent_range",
                                "On request",
                              )}
                            </p>
                          </div>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="rounded-full border-blue-200 text-blue-700"
                          >
                            <Link to={`/society/${itemSlug}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                  <p className="font-semibold text-navy-900">
                    Want similar society suggestions?
                  </p>
                  <p className="mt-1.5 text-sm text-navy-500">
                    Share your budget and requirement. We will shortlist
                    matching Gurgaon societies for you.
                  </p>
                  <Button
                    onClick={() => openSocietyCallback("society_page_similar_societies_shortlist")}
                    className="mt-3 w-full rounded-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Phone className="mr-2 h-4 w-4" /> Request similar homes
                  </Button>
                </div>
              )}
            </div>

            {field(society, "faq", "faq", "") ? (
              <div className="rounded-[1.35rem] border border-blue-100 bg-white p-4 shadow-sm">
                <h2 className="text-2xl font-bold text-navy-900">FAQ</h2>
                <div className="mt-4 whitespace-pre-line leading-relaxed text-navy-600">
                  {field(society, "faq", "faq", "")}
                </div>
              </div>
            ) : null}

            {officialLinks.length ? (
              <div className="rounded-[1.35rem] border border-blue-100 bg-white p-4 shadow-sm">
                <h2 className="text-2xl font-bold text-navy-900">
                  Official references
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-navy-500">
                  Project information is cross-checked from official/developer/RERA
                  references where available and manually verified before being
                  marked verified.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {officialLinks.map(([label, href]) => (
                    <a
                      key={label}
                      href={String(href)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-navy-100 bg-ivory-100 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-ivory-200"
                    >
                      {label === "Brochure" || label === "Floor Plan" ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start"><div className="max-h-[calc(100vh-7rem)] overflow-y-auto rounded-[1.35rem] border border-blue-100 bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                Next step
              </p>
              <h3 className="mt-2 text-lg font-bold leading-tight text-navy-900">
                Get homes or similar options for {society.name}
              </h3>

              <div className="mt-2.5 rounded-2xl bg-blue-50 p-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-blue-700">
                    Live homes
                  </span>
                  <span className="text-lg font-bold text-navy-900">
                    {properties.length || "0"}
                  </span>
                </div>
              </div>

              <div className="mt-2.5 space-y-1">
                {[
                  [
                    "Rent range",
                    field(society, "rentRange", "rent_range", "On request"),
                  ],
                  [
                    "Buy range",
                    field(society, "buyRange", "buy_range", "On request"),
                  ],
                  [
                    "Average rent",
                    field(society, "averageRent", "average_rent", "Not added"),
                  ],
                  [
                    "Average sale price",
                    field(
                      society,
                      "averageSalePrice",
                      "average_sale_price",
                      "Not added",
                    ),
                  ],
                  [
                    "Price / sq ft",
                    field(
                      society,
                      "pricePerSqft",
                      "price_per_sqft",
                      "Not added",
                    ),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 border-b border-navy-100 py-1.5 last:border-0"
                  >
                    <span className="text-xs text-navy-500">{label}</span>
                    <span className="text-right text-sm font-semibold text-navy-900">
                      {value || "Not added"}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => openSocietyCallback()}
                className="mt-3 w-full rounded-full bg-blue-600 hover:bg-blue-700"
              >
                <Phone className="mr-2 h-4 w-4" /> Request available homes
              </Button>

              <Button
                asChild
                variant="outline"
                className="mt-2 w-full rounded-full border-blue-100"
              >
                <Link
                  to={`/search?tab=societies&q=${encodeURIComponent(society.name)}&intent=general`}
                >
                  View matching homes
                </Link>
              </Button>

              <Button
                asChild
                variant="ghost"
                className="mt-1 w-full rounded-full text-blue-700 hover:bg-blue-50"
              >
                <Link
                  to={`/ai-advisor?society=${encodeURIComponent(society.name)}`}
                >
                  Ask SocietyFlats AI for options
                </Link>
              </Button>
            </div>
          </aside>
        </div>
      </section>

      <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-navy-100 bg-white/95 px-3 py-2 shadow-[0_-10px_24px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={() => openSocietyCallback()}
            aria-label="Request society callback"
            className="h-10 rounded-full bg-blue-600 px-2 text-xs font-bold hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            <Phone className="mr-1.5 h-4 w-4" /> Callback
          </Button>
          <a
            href={`https://wa.me/919911886222?text=${whatsappMessage}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Open WhatsApp for this society"
            className="inline-flex h-10 items-center justify-center rounded-full border border-green-200 bg-green-50 px-2 text-xs font-bold text-green-700 hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2"
          >
            <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
          </a>
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-full border-navy-200 px-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
          >
            <Link
              aria-label="View matching homes for this society"
              to={`/search?tab=societies&q=${encodeURIComponent(society.name)}&intent=general`}
            >
              Homes
            </Link>
          </Button>
        </div>
      </div>

      <PublicLeadModal
        open={callbackOpen}
        title={
          selectedLeadProperty
            ? `Check availability for ${selectedLeadProperty.title}`
            : `Request shortlist for ${society.name}`
        }
        subtitle={
          selectedLeadProperty
            ? "Share your details and our team will help verify availability, pricing and visit timing for this home."
            : "Share your requirement and our team will help with rent, buy, visit planning or similar society options."
        }
        source={callbackSource}
        ctaLabel={selectedLeadProperty ? "Property callback" : callbackSource.includes("similar") ? "Request similar homes" : "Request available homes"}
        leadIntent={
          selectedLeadProperty
            ? "property_callback"
            : callbackSource.includes("similar")
              ? "similar_options"
              : "general"
        }
        trackingContext={{
          entity_type: selectedLeadProperty ? "property" : "society",
          entity_slug: selectedLeadProperty?.slug || slug || "",
          entity_name: selectedLeadProperty?.title || society.name,
          cta_label: selectedLeadProperty ? "Property callback" : callbackSource.includes("similar") ? "Request similar homes" : "Request available homes",
          lead_intent: selectedLeadProperty ? "property_callback" : callbackSource.includes("similar") ? "similar_options" : "general",
        }}
        societyName={society.name}
        propertyTitle={selectedLeadProperty?.title}
        propertySlug={selectedLeadProperty?.slug}
        defaultMessage={
          selectedLeadProperty
            ? `I want a callback for ${selectedLeadProperty.title} in ${society.name}. Page: society profile. Location: ${societyLocation || "Gurgaon"}.`
            : `I want a callback for ${society.name}. Page: society profile. Location: ${societyLocation || "Gurgaon"}. Live homes shown: ${properties.length}.`
        }
        defaultRequirement={
          selectedLeadProperty
            ? String(field(selectedLeadProperty, "listingType", "listing_type", "Property")).toLowerCase().includes("rent")
              ? "Rent callback"
              : String(field(selectedLeadProperty, "listingType", "listing_type", "Property")).toLowerCase().includes("sale") ||
                  String(field(selectedLeadProperty, "listingType", "listing_type", "Property")).toLowerCase().includes("buy") ||
                  String(field(selectedLeadProperty, "listingType", "listing_type", "Property")).toLowerCase().includes("resale") ||
                  String(field(selectedLeadProperty, "listingType", "listing_type", "Property")).toLowerCase().includes("builder")
                ? "Buy callback"
                : "Property callback"
            : "Society callback"
        }
        submitLabel="Request available homes"
        successMessage="Request received. Our team will call with matching homes, similar societies and visit-ready options."
        onClose={() => {
          setCallbackOpen(false);
          setSelectedLeadProperty(null);
          setCallbackSource("society_page_callback");
        }}
      />
    </div>
  );
}
