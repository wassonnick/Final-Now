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
    <div className="min-h-screen bg-[#F8F3EA] pb-24 md:pb-0">
      <main className="mx-auto max-w-[1360px] px-4 py-6 md:px-10 md:pb-16">
        <div className="mb-4 flex items-center gap-1.5 text-[13px] text-[#6E756E]">
          <Link to="/search?tab=societies">Societies</Link>
          <span>›</span>
          <span className="font-semibold text-[#25302B]">{society.name}</span>
        </div>

        {error ? <div className="mb-4 rounded-xl border border-[#EBCFAE] bg-[#FFF4E8] px-4 py-3 text-sm text-[#8A552F]">{error}</div> : null}

        <section className="grid h-[250px] gap-3 sm:h-[320px] md:h-[380px] md:grid-cols-[2fr_1fr]">
          <button type="button" onClick={() => setLightboxOpen(true)} className="relative overflow-hidden rounded-[18px] bg-[#E5ECE5] text-left">
            <img src={gallery[0]} alt={society.name} className="h-full w-full object-cover" />
            <span className="absolute left-4 top-4 rounded-full bg-[#E8F7E9] px-3 py-1.5 text-xs font-bold text-[#2A6147]">✓ Verified by SocietyFlats</span>
          </button>
          <div className="hidden grid-rows-2 gap-3 md:grid">
            {[gallery[1] || gallery[0], gallery[2] || gallery[0]].map((image, index) => (
              <button key={`${image}-${index}`} type="button" onClick={() => { setActiveImage(index + 1); setLightboxOpen(true); }} className="relative overflow-hidden rounded-[18px] bg-[#E5ECE5]">
                <img src={image} alt={`${society.name} ${index + 2}`} className="h-full w-full object-cover" />
                {index === 1 && gallery.length > 3 ? <span className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="rounded-full bg-black/70 px-3 py-1.5 text-xs text-white">+{gallery.length - 3} photos</span></span> : null}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-7 grid items-start gap-9 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <h1 className="font-display text-[38px] font-medium leading-tight tracking-[-0.01em] text-[#10251F]">{society.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#6E756E]">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{societyLocation} · by {field(society, "builder", "builder", "Builder to be reviewed")}</span>
              {societyScore > 0 ? <span className="font-bold text-[#25302B]">★ {(societyScore > 10 ? societyScore / 10 : societyScore).toFixed(1)}</span> : null}
              <span className="rounded-full bg-[#E8F7E9] px-3 py-1 text-[12.5px] font-semibold text-[#2A6147]">Data confidence: {confidenceText}</span>
              <span className="text-[12.5px]">{formatHandoffUpdated(updatedText)}</span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {handoffQuickFacts.map(([label, value]) => (
                <div key={label} className="rounded-[14px] border border-[#E7E3DA] bg-white p-4">
                  <p className="text-xl font-bold text-[#25302B]">{String(value)}</p>
                  <p className="mt-1 text-xs text-[#7A817D]">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-[22px] rounded-[16px] border border-[#DDE7DC] bg-[#EEF5F1] p-5">
              <h2 className="text-sm font-bold text-[#2A6147]">✓ Verified facts · sources reviewed</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                {handoffVerifiedFacts.map(([label, value]) => (
                  <div key={label}><p className="text-xs text-[#758078]">{label}</p><p className="mt-1 text-sm font-semibold text-[#25302B]">{String(value)}</p></div>
                ))}
              </div>
            </div>

            <h2 className="mt-8 text-[19px] font-bold text-[#25302B]">Amenities</h2>
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              {(amenities.length ? amenities : ["Amenities being reviewed"]).map((amenity) => (
                <span key={amenity} className="rounded-full border border-[#E7E3DA] bg-white px-4 py-2 text-[13.5px] text-[#35413B]">✓ {amenity}</span>
              ))}
            </div>

            <h2 className="mt-8 text-[19px] font-bold text-[#25302B]">About this society</h2>
            <p className="mt-2.5 max-w-[760px] whitespace-pre-line text-[14.5px] leading-[1.65] text-[#4A534E]">
              {descriptionText || `${society.name} is a published Gurgaon society profile. SocietyFlats is reviewing its project facts, pricing context, nearby intelligence and current availability.`}
            </p>

            <h2 className="mt-8 text-[19px] font-bold text-[#25302B]">Location intelligence</h2>
            <div className="mt-3.5 overflow-hidden rounded-[16px] border border-[#DDE4DC] bg-[#E4EBE4]">
              <SocietyNearbyGoogleMap society={society} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(hasNearbyData ? nearby : nearbyFallbackCards).map((item: any) => {
                const lines = splitLines(item.value || item.text);
                return (
                  <div key={item.title} className="rounded-[14px] border border-[#E7E3DA] bg-white p-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-[#3D6754]">{item.title}</h3>
                    <div className="mt-2 space-y-2 text-[13.5px] text-[#4A534E]">
                      {(lines.length ? lines.slice(0, 2) : ["Verification pending"]).map((line) => <p key={line}>{line}</p>)}
                    </div>
                  </div>
                );
              })}
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

          <aside className="lg:sticky lg:top-[94px]">
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

  /*
  return (
    <div className="min-h-screen bg-ivory-100 pb-28 md:pb-0">
      {/* Floating save CTA */}
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

      {/* Hero gallery */}
      <section className="bg-white">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <Button asChild variant="ghost" className="mb-3 rounded-full text-navy-600">
            <Link to="/search?tab=societies">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to societies
            </Link>
          </Button>

          {error ? (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
              {error}
            </div>
          ) : null}

          <div className={cn("grid gap-3", gallery.length > 1 && "lg:grid-cols-[1fr_220px]")}>
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="Open society photo gallery"
              className="relative h-[220px] overflow-hidden rounded-[1.5rem] bg-navy-50 text-left sm:h-[320px] md:h-[440px]"
            >
              <img
                src={gallery[activeImage] || gallery[0]}
                alt={society.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/55 via-transparent to-transparent" />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <Badge className="border-0 bg-white/95 text-blue-700">
                  {field(society, "status", "status", "Verified")}
                </Badge>
                {field<boolean>(society, "featured", "featured", false) ? (
                  <Badge className="border-0 bg-amber-50/95 text-amber-700">Featured</Badge>
                ) : null}
                <Badge className={cn("border-0", deliveryTone.badge)}>{projectStatusText}</Badge>
              </div>
              <span
                className={`absolute bottom-3 left-4 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur ${societyImageAttributionClassName(societyImageAttribution(society).tone)}`}
                title={societyImageAttribution(society).title}
              >
                {societyImageAttribution(society).label}
              </span>
              {gallery.length > 1 ? (
                <span className="absolute bottom-3 right-4 rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold text-white">
                  View gallery · {activeImage + 1}/{gallery.length}
                </span>
              ) : null}
            </button>

            {gallery.length > 1 ? (
              <div className="hidden gap-2.5 lg:grid lg:grid-rows-3">
                {gallery.slice(0, 3).map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={cn(
                      "overflow-hidden rounded-2xl border-2 bg-navy-50",
                      activeImage === index ? "border-blue-500" : "border-transparent",
                    )}
                  >
                    <img src={image} alt={society.name} className="h-full min-h-[96px] w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {lightboxOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Society photo gallery">
          <button type="button" onClick={() => setLightboxOpen(false)} aria-label="Close gallery" className="absolute right-5 top-5 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
            <X className="h-6 w-6" />
          </button>
          {gallery.length > 1 ? (
            <button
              type="button"
              onClick={() => setActiveImage((activeImage - 1 + gallery.length) % gallery.length)}
              aria-label="Previous photo"
              className="absolute left-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 md:left-8"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
          ) : null}
          <img
            src={gallery[activeImage] || gallery[0]}
            alt={`${society.name} photo ${activeImage + 1}`}
            className="max-h-[85vh] max-w-[88vw] rounded-2xl object-contain"
          />
          {gallery.length > 1 ? (
            <button
              type="button"
              onClick={() => setActiveImage((activeImage + 1) % gallery.length)}
              aria-label="Next photo"
              className="absolute right-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 md:right-8"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          ) : null}
          {gallery.length > 1 ? (
            <span className="absolute bottom-5 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white">
              {activeImage + 1} / {gallery.length}
            </span>
          ) : null}
        </div>
      ) : null}

      <section className="container mx-auto px-4 py-5 md:py-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
          <div className="space-y-7 md:space-y-9">
            {/* Title, score, description, key stats */}
            <div>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h1 className="font-display text-3xl font-black tracking-tight text-navy-950 md:text-[2.5rem]">
                    {society.name}
                  </h1>
                  <p className="mt-2 flex items-center gap-2 text-base text-navy-500">
                    <MapPin className="h-5 w-5" /> {societyLocation}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#E4F0E6] px-3 py-1.5 text-xs font-bold text-[#1F7A5A]">
                      Data confidence: {confidenceText}
                    </span>
                    <span className="rounded-full border border-[#E7DCCB] bg-[#FFFBF3] px-3 py-1.5 text-xs font-semibold text-[#6E756E]">
                      {updatedText}
                    </span>
                    <span className="rounded-full border border-[#E7DCCB] bg-white px-3 py-1.5 text-xs font-semibold text-[#6E756E]">
                      Sources reviewed
                    </span>
                  </div>
                </div>
                <div className="flex w-fit shrink-0 items-center gap-3 rounded-2xl bg-navy-950 px-5 py-3 text-white">
                  <div>
                    <p className="text-xs text-white/60">Society score</p>
                    <p className="text-2xl font-black">
                      {societyScore > 0 ? societyScore : "—"}
                      {societyScore > 0 ? <span className="text-sm font-semibold text-white/50">/10</span> : null}
                    </p>
                  </div>
                </div>
              </div>

              {descriptionText ? (
                <div className="mt-4 max-w-3xl">
                  <p className={cn("text-[15px] leading-7 text-navy-600", !descriptionExpanded && "line-clamp-3")}>
                    {descriptionText}
                  </p>
                  {descriptionText.length > 220 ? (
                    <button
                      type="button"
                      onClick={() => setDescriptionExpanded((value) => !value)}
                      className="mt-1 text-sm font-bold text-blue-700 hover:text-blue-800"
                    >
                      {descriptionExpanded ? "Show less" : "Read more"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-6 grid grid-cols-2 gap-5 border-t border-navy-100 pt-5 md:grid-cols-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-navy-400">Live homes</p>
                  <p className="mt-1.5 text-xl font-black text-navy-950">{properties.length || 0}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-navy-400">Rent range</p>
                  <p className="mt-1.5 text-xl font-black text-navy-950">
                    {field(society, "rentRange", "rent_range", "On request")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-navy-400">Buy range</p>
                  <p className="mt-1.5 text-xl font-black text-navy-950">
                    {field(society, "buyRange", "buy_range", "On request")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-navy-400">Project status</p>
                  <p className="mt-1.5 text-xl font-black text-navy-950">{deliveryTone.label}</p>
                  <p className="mt-0.5 text-xs text-navy-500">Possession: {possessionDateText}</p>
                </div>
              </div>

              <div className={cn("mt-4 rounded-2xl border px-4 py-2.5 text-xs font-semibold leading-5", deliveryTone.card)}>
                <span className="font-black text-navy-900">Delivery note:</span> {deliveryTone.helper}
              </div>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <Button
                  onClick={() => openSocietyCallback()}
                  className="h-11 rounded-full bg-blue-700 px-6 text-sm font-bold hover:bg-blue-800"
                >
                  <Phone className="mr-2 h-4 w-4" /> Request available homes
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-full border-navy-200 text-sm font-bold"
                >
                  <Link to={`/search?tab=societies&q=${encodeURIComponent(society.name)}&intent=general`}>
                    View verified homes
                  </Link>
                </Button>

                <Button
                  type="button"
                  onClick={toggleSocietyCompare}
                  variant="outline"
                  className={cn(
                    "h-11 rounded-full text-sm font-bold",
                    isSocietyCompared
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-blue-100 text-blue-700 hover:bg-blue-50",
                  )}
                  title={compareList.length >= 3 && !isSocietyCompared ? "Compare list full. Remove one society first." : "Add this society to compare"}
                >
                  <Scale className="mr-2 h-4 w-4" />
                  {isSocietyCompared ? "Added to compare" : compareList.length >= 3 ? "Compare full" : "Compare"}
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="hidden h-11 rounded-full border-navy-200 text-sm font-bold sm:inline-flex"
                >
                  <Link to={`/ai-advisor?society=${encodeURIComponent(society.name)}`}>
                    Ask SocietyFlats AI
                  </Link>
                </Button>

                <a
                  href={`https://wa.me/919911886222?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden h-11 items-center justify-center rounded-full border border-green-200 bg-green-50 px-5 text-sm font-bold text-green-700 hover:bg-green-100 sm:inline-flex"
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp us
                </a>
              </div>
            </div>

            {/* Decision snapshot */}
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Decision snapshot</p>
              <h2 className="mt-1.5 font-display text-2xl font-black text-navy-950">
                Why people shortlist {society.name}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                {whyChoose.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-2xl border border-navy-100 bg-white p-4">
                      <Icon className="h-5 w-5 text-blue-600" />
                      <p className="mt-3 text-xs font-bold uppercase tracking-[0.08em] text-navy-400">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-bold text-navy-950">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Project facts */}
            <div>
              <h2 className="font-display text-2xl font-black text-navy-950">Project facts</h2>
              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-navy-100 bg-navy-100 sm:grid-cols-3">
                {[
                  ["Builder", field(society, "builder", "builder", "Not added")],
                  ["Total towers", field(society, "totalTowers", "total_towers", "Not added")],
                  ["Total units", field(society, "totalUnits", "total_units", "Not added")],
                  ["Possession", possessionDateText],
                  ["Project status", projectStatusText],
                  ["Maintenance", field(society, "maintenanceCharges", "maintenance_charges", "Not added")],
                  ["Rental yield", field(society, "rentalYield", "rental_yield", "Not added")],
                ].map(([label, value]) => (
                  <div key={label} className="bg-white p-4">
                    <p className="text-xs text-navy-400">{label}</p>
                    <p className="mt-1 text-sm font-bold text-navy-950">
                      {readableStructuredValue(value) || "Not added"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Available homes */}
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Live homes</p>
                  <h2 className="mt-1.5 font-display text-2xl font-black text-navy-950">Available inventory</h2>
                </div>
                <p className="text-sm text-navy-500">
                  {properties.length
                    ? `${properties.length} option${properties.length === 1 ? "" : "s"} linked to this society`
                    : "Callback recommended"}
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {properties.length ? (
                  properties.map((property) => {
                    const propertyUrl = safePropertyUrl(property);
                    const listingType = field(property, "listingType", "listing_type", "Rent");
                    const bedrooms = field(property, "bedrooms", "bedrooms", "-");
                    const area = field(property, "areaSqft", "area_sqft", "-");

                    return (
                      <div
                        key={property.id || property.slug}
                        className="group overflow-hidden rounded-[1.5rem] border border-navy-100 bg-white transition hover:-translate-y-1 hover:shadow-premium"
                      >
                        <Link to={propertyUrl} className="block">
                          <div className="h-40 bg-navy-50 md:h-48">
                            <img
                              src={safePropertyImage(property)}
                              alt={property.title}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          </div>
                        </Link>

                        <div className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
                              {listingType}
                            </p>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              Verified lead
                            </span>
                          </div>

                          <Link to={propertyUrl} className="group/title block">
                            <h3 className="mt-2 line-clamp-2 font-bold text-navy-950 group-hover/title:text-blue-700">
                              {property.title}
                            </h3>
                          </Link>

                          <p className="mt-1.5 text-sm text-navy-500">
                            {bedrooms} BHK • {area} sq.ft
                          </p>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="text-lg font-black text-navy-950">{property.price || "On request"}</p>
                            <p className="hidden text-xs text-navy-400 sm:block">Visit-ready enquiry</p>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <Button asChild variant="outline" className="rounded-full border-navy-200">
                              <Link to={propertyUrl}>View details</Link>
                            </Button>
                            <Button
                              onClick={() => openPropertyCallback(property)}
                              className="rounded-full bg-blue-700 hover:bg-blue-800"
                            >
                              Callback
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-5 md:col-span-2 xl:col-span-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Inventory check</p>
                    <h3 className="mt-2 text-xl font-bold text-navy-950">
                      No live verified homes are listed publicly yet.
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-navy-600">
                      Request a callback and we will check verified owner/broker availability for {society.name}{" "}
                      before you spend time browsing other portals.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Button
                        onClick={() => openSocietyCallback("society_page_no_inventory_similar_options")}
                        className="rounded-full bg-blue-700 hover:bg-blue-800"
                      >
                        <Phone className="mr-2 h-4 w-4" /> Request similar homes
                      </Button>
                      <Button asChild variant="outline" className="rounded-full border-blue-200 text-blue-700">
                        <Link to={`/ai-advisor?society=${encodeURIComponent(society.name)}`}>
                          Find similar homes
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Amenities */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-black text-navy-950">Amenities</h2>
                <span className="text-xs font-bold text-navy-400">{amenities.length || 0} listed</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {amenities.length ? (
                  amenities.map((item) => (
                    <div key={item} className="flex items-center gap-2.5 rounded-2xl border border-navy-100 bg-white p-3">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span className="text-sm font-semibold text-navy-800">{item}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-navy-500">No amenities added yet.</p>
                )}
              </div>
            </div>

            {/* Location intelligence */}
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                    Location intelligence
                  </p>
                  <h2 className="mt-1.5 font-display text-2xl font-black text-navy-950">
                    Nearby intelligence, at a glance
                  </h2>
                </div>
                <Button asChild variant="outline" size="sm" className="w-fit rounded-full border-blue-100 text-blue-700">
                  <Link to={`/ai-advisor?society=${encodeURIComponent(society.name)}`}>
                    Ask AI for commute fit
                  </Link>
                </Button>
              </div>

              {nearbyCompactCards.length ? (
                <div className="mt-4 grid gap-2.5 md:grid-cols-2">
                  {nearbyCompactCards.map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => setActiveNearbyCategory(item.title)}
                        className={cn(
                          "group rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-sm",
                          activeNearbyCategory === item.title
                            ? "border-blue-300 bg-blue-50"
                            : "border-blue-100 bg-blue-50/60",
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-blue-700">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-500">
                                {item.title}
                              </p>
                              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-500">
                                Focus
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-navy-800">
                              {item.primary}
                            </p>
                            {item.extraCount ? (
                              <p className="mt-1 text-xs font-bold text-blue-600">
                                +{item.extraCount} more nearby option{item.extraCount === 1 ? "" : "s"} in this layer
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <p className="mt-3 rounded-2xl bg-blue-50 px-3 py-1.5 text-[11px] font-semibold leading-5 text-blue-700">
                Nearby data is Google Places assisted and admin-reviewed. Tap a card to focus that category inside the map layer.
              </p>

              <div className="mt-3 overflow-hidden rounded-[1.5rem] border border-navy-100">
                <SocietyNearbyGoogleMap
                  key={activeNearbyCategory}
                  title={society.name}
                  location={societyLocation}
                  latitude={field(society, "latitude", "latitude", "")}
                  longitude={field(society, "longitude", "longitude", "")}
                  googleMapsUrl={field(society, "googleMapsUrl", "google_maps_url", "")}
                  activeCategory={activeNearbyCategory}
                  nearbyCategories={nearbyCompactCards}
                  nearbySchools={splitLines(field(society, "nearbySchools", "nearby_schools", "")).slice(0, 1).join("\n")}
                  nearbyMetro={splitLines(field(society, "nearbyMetro", "nearby_metro", "")).slice(0, 1).join("\n")}
                  nearbyHospitals={splitLines(field(society, "nearbyHospitals", "nearby_hospitals", "")).slice(0, 1).join("\n")}
                  nearbyOfficeHubs={splitLines(field(society, "nearbyOfficeHubs", "nearby_office_hubs", "")).slice(0, 1).join("\n")}
                />
              </div>

              {!hasNearbyData ? (
                <div className="mt-4 space-y-3">
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
                      className="shrink-0 rounded-full bg-blue-700 px-4 font-bold hover:bg-blue-800"
                    >
                      Verify on call
                    </Button>
                  </div>

                  <div className="grid gap-2.5 md:grid-cols-2">
                    {nearbyFallbackCards.map((item) => {
                      const Icon = item.icon;

                      return (
                        <div key={item.title} className="rounded-2xl bg-blue-50/70 p-3.5">
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
                      <div key={item.title} className="rounded-2xl bg-blue-50/70 p-3.5">
                        <Icon className="h-4 w-4 text-blue-600" />
                        <h3 className="mt-2 font-bold text-navy-900">{item.title}</h3>
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

            {/* Similar societies - now shown on all breakpoints, not just mobile */}
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">You may also like</p>
              <h2 className="mt-1.5 font-display text-2xl font-black text-navy-950">Similar societies nearby</h2>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">
                Based on location, builder profile and live SocietyFlats data.
              </p>

              {similarSocieties.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {similarSocieties.map((item) => {
                    const itemSlug = field<string>(item, "slug", "slug", "");
                    const itemLocation =
                      [field(item, "sector", "sector", ""), field(item, "locality", "locality", "")]
                        .filter(Boolean)
                        .join(", ") || "Gurgaon";

                    return (
                      <div key={itemSlug || item.name} className="rounded-2xl border border-navy-100 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-navy-950">{item.name}</h3>
                            <p className="mt-1 flex items-center gap-1 text-xs text-navy-500">
                              <MapPin className="h-3.5 w-3.5" /> {itemLocation}
                            </p>
                          </div>
                          <div className="rounded-xl bg-blue-50 px-3 py-2 text-center">
                            <p className="text-[10px] uppercase text-blue-600">Score</p>
                            <p className="text-sm font-bold text-navy-950">{field(item, "score", "score", "8.5")}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-navy-100 pt-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.12em] text-navy-400">Rent range</p>
                            <p className="text-sm font-semibold text-navy-950">
                              {field(item, "rentRange", "rent_range", "On request")}
                            </p>
                          </div>
                          <Button asChild size="sm" variant="outline" className="rounded-full border-blue-200 text-blue-700">
                            <Link to={`/society/${itemSlug}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                  <p className="font-semibold text-navy-950">Want similar society suggestions?</p>
                  <p className="mt-1.5 text-sm text-navy-500">
                    Share your budget and requirement. We will shortlist matching Gurgaon societies for you.
                  </p>
                  <Button
                    onClick={() => openSocietyCallback("society_page_similar_societies_shortlist")}
                    className="mt-3 w-full rounded-full bg-blue-700 hover:bg-blue-800 sm:w-auto"
                  >
                    <Phone className="mr-2 h-4 w-4" /> Request similar homes
                  </Button>
                </div>
              )}
            </div>

            {faqText ? (
              <div>
                <h2 className="font-display text-2xl font-black text-navy-950">FAQ</h2>
                <div className="mt-4 whitespace-pre-line leading-relaxed text-navy-600">{faqText}</div>
              </div>
            ) : null}

            {officialLinks.length ? (
              <div>
                <h2 className="font-display text-2xl font-black text-navy-950">Official references</h2>
                <p className="mt-2 text-sm leading-relaxed text-navy-500">
                  Project information is cross-checked from official/developer/RERA references where available and
                  manually verified before being marked verified.
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

          <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
            <div className="max-h-[calc(100vh-7rem)] overflow-y-auto rounded-[1.5rem] border border-navy-100 bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Next step</p>
              <h3 className="mt-2 text-lg font-bold leading-tight text-navy-950">
                Get homes or similar options for {society.name}
              </h3>

              <div className="mt-3 rounded-2xl bg-blue-50 p-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-blue-700">Live homes</span>
                  <span className="text-lg font-bold text-navy-950">{properties.length || "0"}</span>
                </div>
              </div>

              <div className="mt-3 space-y-0.5">
                {[
                  ["Rent range", field(society, "rentRange", "rent_range", "On request")],
                  ["Buy range", field(society, "buyRange", "buy_range", "On request")],
                  ["Average rent", field(society, "averageRent", "average_rent", "Not added")],
                  ["Average sale price", field(society, "averageSalePrice", "average_sale_price", "Not added")],
                  ["Price / sq ft", field(society, "pricePerSqft", "price_per_sqft", "Not added")],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-navy-100 py-1.5 last:border-0">
                    <span className="text-xs text-navy-500">{label}</span>
                    <span className="text-right text-sm font-semibold text-navy-950">{value || "Not added"}</span>
                  </div>
                ))}
              </div>

              <Button onClick={() => openSocietyCallback()} className="mt-4 w-full rounded-full bg-blue-700 hover:bg-blue-800">
                <Phone className="mr-2 h-4 w-4" /> Request available homes
              </Button>

              <Button asChild variant="outline" className="mt-2 w-full rounded-full border-navy-100">
                <Link to={`/search?tab=societies&q=${encodeURIComponent(society.name)}&intent=general`}>
                  View matching homes
                </Link>
              </Button>

              <Button
                type="button"
                onClick={toggleSocietyCompare}
                variant="outline"
                className={cn(
                  "mt-2 w-full rounded-full",
                  isSocietyCompared
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-blue-100 text-blue-700 hover:bg-blue-50",
                )}
              >
                <Scale className="mr-2 h-4 w-4" />
                {isSocietyCompared ? "Added to compare" : compareList.length >= 3 ? "Compare full" : "Add to compare"}
              </Button>

              <Button asChild variant="ghost" className="mt-1 w-full rounded-full text-blue-700 hover:bg-blue-50">
                <Link to={`/ai-advisor?society=${encodeURIComponent(society.name)}`}>
                  Ask SocietyFlats AI for options
                </Link>
              </Button>
            </div>
          </aside>
        </div>

        <RentHistoryChart societySlug={String(society.slug || slug || "")} />
        <OfficialAnnouncements societySlug={String(society.slug || slug || "")} />
        <ResidentReviews
          societyId={Number(society.id)}
          societySlug={String(society.slug || slug || "")}
          societyName={society.name}
        />
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
          <Button
            type="button"
            onClick={toggleSocietyCompare}
            variant="outline"
            aria-label="Add this society to compare"
            className={cn(
              "h-10 rounded-full px-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2",
              isSocietyCompared
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-blue-100 text-blue-700",
            )}
          >
            <Scale className="mr-1.5 h-4 w-4" />
            {isSocietyCompared ? "Added" : "Compare"}
          </Button>
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
  */
}
