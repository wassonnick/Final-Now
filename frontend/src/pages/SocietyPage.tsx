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
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  School,
  Scale,
  Shield,
  Train,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import { PublicLeadModal } from "@/components/leads/PublicLeadModal";
import { SocietyNearbyGoogleMap } from "@/components/maps/SocietyNearbyGoogleMap";
import { ResidentReviews } from "@/components/society/ResidentReviews";
import { RentHistoryChart } from "@/components/society/RentHistoryChart";
import { OfficialAnnouncements } from "@/components/society/OfficialAnnouncements";
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

function readableStructuredValue(value: unknown): string {
  if (value === undefined || value === null || value === false) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return value
      .map(readableStructuredValue)
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = [
      record.name,
      record.title,
      record.label,
      record.type,
      record.distance,
      record.distance_text,
      record.travel_time,
      record.time,
      record.notes,
      record.description,
    ]
      .map(readableStructuredValue)
      .filter(Boolean);

    if (preferred.length) return preferred.join(" — ");

    return Object.values(record)
      .map(readableStructuredValue)
      .filter(Boolean)
      .join(" — ");
  }

  return "";
}

function splitLines(value?: unknown) {
  return readableStructuredValue(value)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function scoreValueForHandoff(value: unknown) {
  const score = Number(value || 0);
  if (!Number.isFinite(score) || score <= 0) return 0;
  return score > 10 ? score / 10 : score;
}

function rentTextForHandoff(society: any) {
  return readableStructuredValue(
    society?.rentRange || society?.rent_range || society?.averageRent || society?.average_rent,
  ) || "On request";
}

function buyTextForHandoff(society: any) {
  return readableStructuredValue(
    society?.buyRange || society?.buy_range || society?.resaleRange || society?.resale_range,
  ) || "On request";
}

function formatHandoffUpdated(value: string) {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return `Updated ${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  }
  return value;
}

function deliveryStatusTone(status: string) {
  const value = status.toLowerCase();

  if (/delivered|ready|completed|complete|possession/i.test(value)) {
    return {
      badge: "border-emerald-100 bg-emerald-50 text-emerald-700",
      card: "border-emerald-100 bg-emerald-50",
      label: "Delivered / ready",
      helper: "Still verify tower and unit-level possession before payment.",
    };
  }

  if (/under construction|construction|ongoing/i.test(value)) {
    return {
      badge: "border-amber-100 bg-amber-50 text-amber-700",
      card: "border-amber-100 bg-amber-50",
      label: "Under construction",
      helper: "Confirm RERA timeline, tower phase and grace period.",
    };
  }

  if (/new launch|launch/i.test(value)) {
    return {
      badge: "border-blue-100 bg-blue-50 text-blue-700",
      card: "border-blue-100 bg-blue-50",
      label: "New launch",
      helper: "Check launch approvals, RERA registration and payment plan.",
    };
  }

  return {
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    card: "border-slate-200 bg-slate-50",
    label: "Needs review",
    helper: "Delivery status is pending admin/source verification.",
  };
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
    return "/brand/societyflats-icon-512.png";
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
  const [activeNearbyCategory, setActiveNearbyCategory] = useState("All");
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
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

  const { compareList, addToCompare, removeFromCompare } = useAppStore();
  const isSocietyCompared = Boolean(
    society?.id && compareList.some((item: any) => String(item.id) === String(society.id)),
  );

  const toggleSocietyCompare = () => {
    if (!society?.id) return;

    if (isSocietyCompared) {
      removeFromCompare(society.id);
      trackEvent("society_removed_from_compare", {
        source: "society_page",
        entity_type: "society",
        entity_slug: slug || "",
        entity_name: society?.name || "",
      });
      return;
    }

    if (compareList.length >= 3) {
      trackEvent("compare_limit_reached", {
        source: "society_page",
        entity_type: "society",
        entity_slug: slug || "",
        entity_name: society?.name || "",
      });
      return;
    }

    addToCompare(society);
    trackEvent("society_added_to_compare", {
      source: "society_page",
      entity_type: "society",
      entity_slug: slug || "",
      entity_name: society?.name || "",
    });
  };
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

  useEffect(() => {
    setActiveImage(0);
    setLightboxOpen(false);
    setDescriptionExpanded(false);
  }, [slug]);

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
  const faqText = readableStructuredValue(field(society, "faq", "faq", ""));

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
  const sourceUrl = readableStructuredValue(field(society, "sourceUrl", "source_url", ""));
  const reraUrl =
    readableStructuredValue(field(society, "reraSearchUrl", "rera_search_url", "")) ||
    (sourceUrl.toLowerCase().includes("rera") ? sourceUrl : "");
  const officialLinks = [
    [
      "Official Project Page",
      readableStructuredValue(field(society, "officialProjectUrl", "official_project_url", "")),
    ],
    [
      "Developer Website",
      readableStructuredValue(field(society, "officialDeveloperUrl", "official_developer_url", "")),
    ],
    [
      "Brochure",
      readableStructuredValue(field(society, "officialBrochureUrl", "official_brochure_url", "")),
    ],
    [
      "Floor Plan",
      readableStructuredValue(field(society, "officialFloorPlanUrl", "official_floor_plan_url", "")),
    ],
    [
      "Gallery Reference",
      readableStructuredValue(field(society, "officialGalleryUrl", "official_gallery_url", "")),
    ],
    ["Google Maps", readableStructuredValue(field(society, "googleMapsUrl", "google_maps_url", ""))],
    ["RERA Search", reraUrl],
  ].filter(([, href]) => Boolean(href));
  const societyLocation = safeLocation(society);
  const descriptionText = readableStructuredValue(society.description);
  const societyScore = Number(field(society, "score", "score", 0));
  const confidenceText =
    readableStructuredValue(field(society, "dataConfidence", "data_confidence", "")) ||
    "Review pending";
  const updatedText =
    readableStructuredValue(field(society, "updatedAt", "updated_at", "")) ||
    "Admin-reviewed profile";
  const projectStatusText =
    readableStructuredValue(field(society, "projectStatus", "project_status", "")) ||
    "Needs Review";
  const possessionDateText =
    readableStructuredValue(field(society, "possessionDate", "possession_date", "")) ||
    readableStructuredValue(field(society, "yearBuilt", "year_built", "")) ||
    "Needs Review";
  const deliveryTone = deliveryStatusTone(`${projectStatusText} ${possessionDateText}`);
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

  const handoffQuickFacts = [
    ["Units", field(society, "totalUnits", "total_units", "To be reviewed")],
    ["Towers", field(society, "totalTowers", "total_towers", "To be reviewed")],
    ["Floors", field(society, "totalFloors", "total_floors", "To be reviewed")],
    ["Possession", possessionDateText],
  ];
  const handoffVerifiedFacts = [
    ["Project status", projectStatusText],
    ["Maintenance", field(society, "maintenanceCharges", "maintenance_charges", "To be reviewed")],
    ["Builder", field(society, "builder", "builder", "To be reviewed")],
    ["Data confidence", confidenceText],
  ];
  const handoffPros = [
    scoreValueForHandoff(field(society, "connectivityScore", "connectivity_score", 0)) >= 8 ? "Strong connectivity" : "",
    amenities.length ? `${amenities.length} amenities recorded` : "",
    hasNearbyData ? "Nearby intelligence available" : "",
    properties.length ? "Live homes available" : "",
  ].filter(Boolean).slice(0, 3);
  const handoffCons = [
    rentTextForHandoff(society) === "On request" ? "Rent range needs verification" : "",
    buyTextForHandoff(society) === "On request" ? "Resale range needs verification" : "",
    !hasNearbyData ? "Nearby context is still being reviewed" : "",
  ].filter(Boolean).slice(0, 2);

  return (
    <div className="min-h-screen bg-[#F8F3EA] pb-40 md:pb-0">
      <main className="mx-auto max-w-[1360px] px-4 py-6 md:px-10 md:pb-16">
        <div className="mb-4 flex items-center gap-1.5 text-[13px] text-[#6E756E]">
          <Link to="/search?tab=societies">Societies</Link>
          <span>›</span>
          <span className="font-semibold text-[#25302B]">{society.name}</span>
        </div>

        {error ? <div className="mb-4 rounded-xl border border-[#EBCFAE] bg-[#FFF4E8] px-4 py-3 text-sm text-[#8A552F]">{error}</div> : null}

        <section className="grid h-[250px] gap-3 sm:h-[320px] md:h-[380px] md:grid-cols-[2fr_1fr]">
          <button type="button" onClick={() => setLightboxOpen(true)} className="relative h-full min-h-0 overflow-hidden rounded-[18px] bg-[#E5ECE5] text-left">
            <img src={gallery[0]} alt={society.name} className="h-full w-full object-cover" />
            <span className="absolute left-4 top-4 rounded-full bg-[#E8F7E9] px-3 py-1.5 text-xs font-bold text-[#2A6147]">✓ Verified by SocietyFlats</span>
          </button>
          <div className="hidden h-full min-h-0 grid-rows-2 gap-3 overflow-hidden md:grid">
            {[gallery[1] || gallery[0], gallery[2] || gallery[0]].map((image, index) => (
              <button key={`${image}-${index}`} type="button" onClick={() => { setActiveImage(index + 1); setLightboxOpen(true); }} className="relative overflow-hidden rounded-[18px] bg-[#E5ECE5]">
                <img src={image} alt={`${society.name} ${index + 2}`} className="h-full w-full object-cover" />
                {index === 1 && gallery.length > 3 ? <span className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="rounded-full bg-black/70 px-3 py-1.5 text-xs text-white">+{gallery.length - 3} photos</span></span> : null}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-7 grid items-stretch gap-9 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <h1 className="font-display text-[38px] font-medium leading-tight tracking-[-0.01em] text-[#10251F]">{society.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#6E756E]">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{societyLocation} · by {field(society, "builder", "builder", "Builder to be reviewed")}</span>
              {societyScore > 0 ? <span className="font-bold text-[#25302B]">★ {(societyScore > 10 ? societyScore / 10 : societyScore).toFixed(1)}</span> : null}
              <span className="rounded-full bg-[#E8F7E9] px-3 py-1 text-[12.5px] font-semibold text-[#2A6147]">Data confidence: {confidenceText}</span>
              <span className="text-[12.5px]">{formatHandoffUpdated(updatedText)}</span>
            </div>

            <div className="mt-6 rounded-[16px] border border-[#DDE7DC] bg-[#EEF5F1] p-5">
              <h2 className="text-sm font-bold text-[#2A6147]">✓ Verified facts · sources reviewed</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[...handoffQuickFacts, ...handoffVerifiedFacts].map(([label, value]) => (
                  <div key={label} className="rounded-[12px] bg-white p-3.5">
                    <p className="text-base font-bold text-[#25302B]">{String(value)}</p>
                    <p className="mt-1 text-xs text-[#7A817D]">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <h2 className="mt-8 text-[19px] font-bold text-[#25302B]">Amenities</h2>
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              {(amenities.length ? amenities : ["Amenities being reviewed"]).slice(0, showAllAmenities ? undefined : 8).map((amenity) => (
                <span key={amenity} className="rounded-full border border-[#E7E3DA] bg-white px-4 py-2 text-[13.5px] text-[#35413B]">✓ {amenity}</span>
              ))}
              {amenities.length > 8 ? (
                <button
                  type="button"
                  onClick={() => setShowAllAmenities((value) => !value)}
                  className="rounded-full border border-[#DDE7DC] bg-[#EEF5F1] px-4 py-2 text-[13.5px] font-semibold text-[#2A6147]"
                >
                  {showAllAmenities ? "Show less" : `+${amenities.length - 8} more`}
                </button>
              ) : null}
            </div>

            <h2 className="mt-8 text-[19px] font-bold text-[#25302B]">About this society</h2>
            <p className="mt-2.5 max-w-[760px] whitespace-pre-line text-[14.5px] leading-[1.65] text-[#4A534E]">
              {descriptionText || `${society.name} is a published Gurgaon society profile. SocietyFlats is reviewing its project facts, pricing context, nearby intelligence and current availability.`}
            </p>

            <h2 className="mt-8 text-[19px] font-bold text-[#25302B]">Location intelligence</h2>
            <div className="mt-3.5 overflow-hidden rounded-[16px] border border-[#DDE4DC] bg-[#E4EBE4]">
              <SocietyNearbyGoogleMap
                title={society.name}
                location={societyLocation}
                latitude={field(society, "latitude", "latitude", null)}
                longitude={field(society, "longitude", "longitude", null)}
                googleMapsUrl={readableStructuredValue(field(society, "googleMapsUrl", "google_maps_url", "")) || null}
                activeCategory={activeNearbyCategory}
                nearbyCategories={nearbyCompactCards}
                nearbySchools={field(society, "nearbySchools", "nearby_schools", "")}
                nearbyMetro={field(society, "nearbyMetro", "nearby_metro", "")}
                nearbyHospitals={field(society, "nearbyHospitals", "nearby_hospitals", "")}
                nearbyOfficeHubs={field(society, "nearbyOfficeHubs", "nearby_office_hubs", "")}
              />
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[16px] border border-[#E7E3DA] bg-white p-[18px]">
                <h3 className="text-sm font-bold text-[#2A6147]">Pros</h3>
                <div className="mt-3 space-y-2 text-[13.5px] text-[#4A534E]">{(handoffPros.length ? handoffPros : ["Published society context available"]).map((item) => <p key={item}>+ {item}</p>)}</div>
              </div>
              <div className="rounded-[16px] border border-[#E7E3DA] bg-white p-[18px]">
                <h3 className="text-sm font-bold text-[#A45F32]">Cons</h3>
                <div className="mt-3 space-y-2 text-[13.5px] text-[#4A534E]">{(handoffCons.length ? handoffCons : ["Verify tower and unit-level pricing before deciding"]).map((item) => <p key={item}>– {item}</p>)}</div>
              </div>
            </div>
          </section>

          <aside>
            <div className="lg:sticky lg:top-[94px]">
              <div className="rounded-[20px] border border-[#E7E3DA] bg-white p-[22px] shadow-[0_14px_36px_-26px_rgba(0,0,0,.4)]">
                <p className="text-xs text-[#7A817D]">Price range</p>
                <p className="mt-1 text-2xl font-extrabold text-[#123C32]">{buyTextForHandoff(society)}</p>
                <p className="mt-1 text-[13px] text-[#6E756E]">Rent {rentTextForHandoff(society)} / month</p>
                <div className="mt-[18px] grid gap-2.5">
                  <button type="button" onClick={() => openSocietyCallback("society_page_rent_options")} className="rounded-[12px] bg-[#123C32] px-5 py-3.5 text-[14.5px] font-bold text-white">Get rental options</button>
                  <button type="button" onClick={() => openSocietyCallback("society_page_availability")} className="rounded-[12px] border-2 border-[#123C32] bg-white px-5 py-3 text-[14.5px] font-bold text-[#123C32]">Check current availability</button>
                  <a href={`https://wa.me/919911886222?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-[12px] bg-[#449B4E] px-5 py-3 text-[14.5px] font-bold text-white"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp SocietyFlats</a>
                  <button type="button" onClick={toggleSocietyCompare} className="px-4 py-2 text-[13.5px] font-semibold text-[#2A6147]">{isSocietyCompared ? "✓ Added to compare" : "+ Add to compare"}</button>
                </div>
                <p className="mt-3.5 border-t border-[#EEEAE1] pt-3.5 text-[11.5px] leading-5 text-[#7A817D]">We use your phone number only to verify your request and connect you with relevant options.</p>
              </div>
              <Link to={`/ai-advisor?q=${encodeURIComponent(`Compare ${society.name} with similar Gurgaon societies`)}`} className="mt-3.5 block rounded-[16px] border border-[#DDE7DC] bg-[#EEF5F1] p-4">
                <strong className="text-sm text-[#123C32]">Not sure about this society?</strong>
                <p className="mt-1 text-[12.5px] text-[#6E756E]">Ask SocietyFlats AI to compare it with similar options →</p>
              </Link>
            </div>
          </aside>
        </div>

        <h2 className="mb-4 mt-11 text-[22px] font-bold text-[#25302B]">Available homes</h2>
        {properties.length ? (
          <div className="grid gap-[18px] md:grid-cols-3">
            {properties.slice(0, 3).map((property) => (
              <Link key={property.id || property.slug} to={safePropertyUrl(property)} className="overflow-hidden rounded-[16px] border border-[#E7E3DA] bg-white">
                <div className="relative h-[150px] bg-[#E5ECE5]"><img src={safePropertyImage(property)} alt={property.title || "Available home"} className="h-full w-full object-cover" /><span className="absolute left-2.5 top-2.5 rounded-full bg-[#E8F7E9] px-2.5 py-1 text-[11px] font-bold text-[#2A6147]">Verified · {field(property, "listedBy", "listed_by", "Source reviewed")}</span></div>
                <div className="p-4"><div className="flex items-center justify-between gap-3"><strong>{property.title || "Available home"}</strong><strong className="text-[#123C32]">{field(property, "price", "price", "On request")}</strong></div><p className="mt-1 text-[12.5px] text-[#6E756E]">{field(property, "areaSqft", "area_sqft", "Area on request")} sq.ft · {field(property, "floor", "floor", "Floor on request")} · {field(property, "furnishedStatus", "furnished_status", "Status on request")}</p></div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-[#D8D4CA] bg-white p-6 text-sm text-[#6E756E]">No verified homes are listed right now. Request current availability and SocietyFlats will check owner or broker options.</div>
        )}
      </main>

      <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 lg:hidden">
        <div className="flex items-center gap-2 rounded-[1.25rem] border border-[#E7E3DA] bg-white/95 p-2.5 shadow-[0_14px_36px_-26px_rgba(0,0,0,.4)] backdrop-blur-xl">
          <div className="min-w-0 flex-1 pl-1.5">
            <p className="truncate text-[11px] text-[#7A817D]">Price range</p>
            <p className="truncate text-[15px] font-extrabold text-[#123C32]">{buyTextForHandoff(society)}</p>
          </div>
          <button type="button" onClick={() => openSocietyCallback("society_page_availability")} className="whitespace-nowrap rounded-[12px] border-2 border-[#123C32] bg-white px-3.5 py-2.5 text-[13px] font-bold text-[#123C32]">Check availability</button>
          <a href={`https://wa.me/919911886222?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#449B4E] text-white"><MessageCircle className="h-4 w-4" /></a>
        </div>
      </div>

      {lightboxOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true">
          <button type="button" onClick={() => setLightboxOpen(false)} className="absolute right-5 top-5 rounded-full bg-white/10 p-3 text-white"><X className="h-6 w-6" /></button>
          <img src={gallery[activeImage] || gallery[0]} alt={society.name} className="max-h-[85vh] max-w-[88vw] rounded-2xl object-contain" />
        </div>
      ) : null}

      <PublicLeadModal
        open={callbackOpen}
        title={selectedLeadProperty ? `Check availability for ${selectedLeadProperty.title}` : `Request shortlist for ${society.name}`}
        subtitle={selectedLeadProperty ? "Share your details and our team will help verify availability, pricing and visit timing for this home." : "Share your requirement and our team will help with rent, buy, visit planning or similar society options."}
        source={callbackSource}
        ctaLabel={selectedLeadProperty ? "Property callback" : "Request available homes"}
        leadIntent={selectedLeadProperty ? "property_callback" : "general"}
        trackingContext={{ entity_type: selectedLeadProperty ? "property" : "society", entity_slug: selectedLeadProperty?.slug || slug || "", entity_name: selectedLeadProperty?.title || society.name, cta_label: selectedLeadProperty ? "Property callback" : "Request available homes", lead_intent: selectedLeadProperty ? "property_callback" : "general" }}
        societyName={society.name}
        propertyTitle={selectedLeadProperty?.title}
        propertySlug={selectedLeadProperty?.slug}
        defaultMessage={selectedLeadProperty ? `I want a callback for ${selectedLeadProperty.title} in ${society.name}.` : `I want current availability for ${society.name}. Location: ${societyLocation || "Gurgaon"}.`}
        defaultRequirement={selectedLeadProperty ? "Property callback" : "Society callback"}
        submitLabel="Request available homes"
        successMessage="Request received. Our team will call with matching homes, similar societies and visit-ready options."
        onClose={() => { setCallbackOpen(false); setSelectedLeadProperty(null); setCallbackSource("society_page_callback"); }}
      />
    </div>
  );

}
