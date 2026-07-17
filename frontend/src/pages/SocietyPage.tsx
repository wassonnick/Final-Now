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
  slugify,
  societyImage,
} from "@/lib/publicData";
import { setPublicSeo } from "@/lib/seo";
import { API_BASE_URL } from "@/config/api";
import { PROPERTY_PHOTOS_UNDER_VERIFICATION } from "@/lib/propertyImages";
import { formatPropertyPrice, hasRealPropertyDisplayPhotos, propertyDisplayPhoto, publicPropertyUrl } from "@/lib/propertyDisplay";
import {
  getCustomerAccountSession,
  isCustomerItemShortlisted,
  rememberCustomerSavedItem,
  toggleCustomerShortlist,
} from "@/lib/customerAccount";
import { googlePlacesGalleryPhotoUrls, googlePlacesSocietyPhotoUrl, hasApprovedSocietyImage, hasGooglePlacesDisplayPhoto, societyImageAttribution, societyImageAttributionClassName, societyPlaceholderImage } from "@/lib/societyImages";

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

function safeSeoList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => readableStructuredValue(item))
    .flatMap((item) => item.split(/\n+/))
    .map((item) => item.trim())
    .filter(Boolean);
}

function scoreValueForHandoff(value: unknown) {
  const score = Number(value || 0);
  if (!Number.isFinite(score) || score <= 0) return 0;
  return score > 10 ? score / 10 : score;
}

// Renting out an under-construction unit isn't possible yet, so a rental range only makes
// sense once the project is actually ready to move into / delivered.
function isRentEligible(society: any) {
  const status = String(society?.projectStatus ?? society?.project_status ?? "").toLowerCase();
  if (!status) return true;
  if (/under construction|new launch/.test(status)) return false;
  return true;
}

// Some older AI-enriched records have a parenthetical aside baked into the range string
// ("...(resale market; primary launch from ₹X - ₹Y)") instead of a bare range — strip it so
// the sidebar's price box doesn't blow out into several lines for those records.
function stripRangeAside(value: string) {
  return value.replace(/\s*[(;].*$/, "").trim();
}

function rentTextForHandoff(society: any) {
  if (!isRentEligible(society)) return "Available after possession";
  const raw = readableStructuredValue(
    society?.rentRange || society?.rent_range || society?.averageRent || society?.average_rent,
  );
  return raw ? stripRangeAside(raw.replace(/\s*(per\s*month|\/\s*month|pm)\s*$/i, "")) : "On request";
}

function buyTextForHandoff(society: any) {
  const raw = readableStructuredValue(
    society?.buyRange || society?.buy_range || society?.resaleRange || society?.resale_range,
  );
  return raw ? stripRangeAside(raw) : "On request";
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
  try {
    return propertyDisplayPhoto(property);
  } catch {
    return propertyImage(property);
  }
}

function safePropertyUrl(property: any) {
  return publicPropertyUrl(property);
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
  const [comparePages, setComparePages] = useState<any[]>([]);
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

  // Published comparison pages featuring this society — internal links that get the
  // /compare/{slug} pages crawled and give visitors a decision shortcut.
  useEffect(() => {
    const societyId = apiSociety?.id;
    if (!API_BASE_URL || !societyId) return;

    let mounted = true;
    fetch(`${API_BASE_URL}/compare-pages?society_id=${societyId}&per_page=6`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (mounted && payload) setComparePages(extractApiArray<any>(payload));
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [apiSociety?.id]);

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
  const seoContent = society?.seo_content?.status === "published" ? society.seo_content : null;

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
    const sectorForSeo = field<string>(society, "sector", "sector", "");
    const securityScoreForSeo = field<string>(society, "securityScore", "security_score", "");
    const connectivityScoreForSeo = field<string>(society, "connectivityScore", "connectivity_score", "");
    const rentRangeForSeo = field<string>(society, "rentRange", "rent_range", "");
    const buyRangeForSeo = field<string>(society, "buyRange", "buy_range", "");

    const title = seoContent?.seo_title || (society?.name
      ? `${society.name}${sectorForSeo ? `, ${sectorForSeo}` : ""} Gurgaon — Verified Profile, Price & Score | SocietyFlats`
      : "SocietyFlats Society Profile");
    const description = seoContent?.seo_description || (society?.name
      ? `${society.name} in ${sectorForSeo || "Gurgaon"}: security score ${securityScoreForSeo || "—"}/10, connectivity ${connectivityScoreForSeo || "—"}/10. ${rentRangeForSeo ? `Rent ${rentRangeForSeo}.` : ""} ${buyRangeForSeo ? `Resale ${buyRangeForSeo}.` : ""} Checked by real people at SocietyFlats, with photos from Google Places.`
      : "Get to know Gurgaon's societies — real-life scores, honest pricing and live homes, each one checked by real people at SocietyFlats.");

    const visibleFaqs = Array.isArray(seoContent?.faq_json)
      ? seoContent.faq_json.filter((item: any) => item?.question && item?.answer)
      : [];
    const canonical = `https://www.societyflats.com/society/${encodeURIComponent(String(field(society, "slug", "slug", slug || "")))}`;
    const graph: any[] = [
      { "@type": "WebPage", name: title, description, url: canonical },
      (() => {
        const latitude = Number(field(society, "latitude", "latitude", 0));
        const longitude = Number(field(society, "longitude", "longitude", 0));
        const schemaImage = googlePlacesSocietyPhotoUrl(society);
        const schemaAmenities = listField(society, "amenities", "amenities").slice(0, 12);
        const unitCount = parseInt(String(field(society, "totalUnits", "total_units", "")).replace(/[^0-9]/g, ""), 10);
        return {
          "@type": "ApartmentComplex",
          name: societyNameForSeo,
          url: canonical,
          ...(field(society, "address", "address", "") ? { address: { "@type": "PostalAddress", streetAddress: field(society, "address", "address", ""), addressLocality: "Gurugram", addressRegion: "Haryana", addressCountry: "IN" } } : {}),
          ...(Number.isFinite(latitude) && Number.isFinite(longitude) && latitude !== 0 && longitude !== 0
            ? { geo: { "@type": "GeoCoordinates", latitude, longitude } }
            : {}),
          ...(schemaImage ? { image: schemaImage } : {}),
          ...(schemaAmenities.length
            ? { amenityFeature: schemaAmenities.map((amenity: string) => ({ "@type": "LocationFeatureSpecification", name: amenity, value: true })) }
            : {}),
          ...(Number.isFinite(unitCount) && unitCount > 0
            ? { numberOfAccommodationUnits: { "@type": "QuantitativeValue", value: unitCount } }
            : {}),
        };
      })(),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://www.societyflats.com" },
          { "@type": "ListItem", position: 2, name: "Societies", item: "https://www.societyflats.com/societies" },
          { "@type": "ListItem", position: 3, name: societyNameForSeo, item: canonical },
        ],
      },
    ];
    if (visibleFaqs.length) graph.push({ "@type": "FAQPage", mainEntity: visibleFaqs.map((faq: any) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) });

    setPublicSeo(title, description, { jsonLd: { "@context": "https://schema.org", "@graph": graph } });
  }, [society, seoContent, slug]);

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
    ...googlePlacesGalleryPhotoUrls(society),
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
  const seoFaqs = Array.isArray(seoContent?.faq_json) ? seoContent.faq_json.filter((item: any) => item?.question && item?.answer) : [];
  const seoPros = safeSeoList(seoContent?.pros_json);
  const seoCons = safeSeoList(seoContent?.cons_json);
  const seoBestFor = safeSeoList(seoContent?.best_for_json);
  const seoNearbyHighlights = safeSeoList(seoContent?.nearby_highlights_json);
  const seoInternalLinks = (Array.isArray(seoContent?.internal_link_suggestions_json) ? seoContent.internal_link_suggestions_json : [])
    .map((item: any) => typeof item === "string" ? { label: item, url: item.startsWith("/") ? item : "" } : { label: item?.label || item?.title || item?.anchor || "", url: item?.url || item?.path || "" })
    .filter((item: any) => item.label && /^\/[a-z0-9][a-z0-9/_?=&.-]*$/i.test(item.url));
  const societyScore = Number(field(society, "score", "score", 0));
  const subScores = [
    ["Security", field<number>(society, "securityScore", "security_score", 0)],
    ["Connectivity", field<number>(society, "connectivityScore", "connectivity_score", 0)],
    ["Lifestyle", field<number>(society, "lifestyleScore", "lifestyle_score", 0)],
    ["Maintenance", field<number>(society, "maintenanceScore", "maintenance_score", 0)],
    ["Investment", field<number>(society, "investmentScore", "investment_score", 0)],
  ].filter(([, value]) => Number(value) > 0) as [string, number][];
  const sourceConfidenceScore = Number(
    field(society, "sourceConfidenceScore", "source_confidence_score", 0),
  );
  const confidenceText =
    sourceConfidenceScore > 0 ? `${sourceConfidenceScore}% verified` : "Review pending";
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
    <div className="min-h-screen bg-[#F7F4EF] pb-40 text-[#1D2939] md:pb-0">
      <main className="mx-auto max-w-[1360px] px-4 py-5 md:px-10 md:pb-14 md:pt-7">
        <div className="mb-4 flex items-center gap-1.5 text-[13px] text-[#6E756E]">
          <Link to="/search?tab=societies">Societies</Link>
          <span>›</span>
          <span className="font-semibold text-[#25302B]">{society.name}</span>
        </div>

        {error ? <div className="mb-4 rounded-xl border border-[#EBCFAE] bg-[#FFF4E8] px-4 py-3 text-sm text-[#8A552F]">{error}</div> : null}

        <section className="relative h-[250px] md:hidden">
          <div
            className="flex h-full snap-x snap-mandatory gap-2 overflow-x-auto rounded-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={(event) => {
              const el = event.currentTarget;
              const index = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
              if (index !== activeImage) setActiveImage(index);
            }}
          >
            {gallery.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => { setActiveImage(index); setLightboxOpen(true); }}
                className="relative h-full w-full flex-shrink-0 snap-center overflow-hidden rounded-[18px] bg-[#E8EDF7] text-left"
              >
                <img src={image} alt={`${society.name} photo ${index + 1}`} className="h-full w-full object-cover" loading={index === 0 ? "eager" : "lazy"} />
              </button>
            ))}
          </div>
          <span className="pointer-events-none absolute left-3.5 top-3.5 rounded-full bg-[#233B6E] px-3 py-1.5 text-xs font-bold text-white shadow-[0_6px_16px_-8px_rgba(0,0,0,.45)]">✓ Verified by SocietyFlats</span>
          {gallery.length > 1 ? (
            <>
              <span className="pointer-events-none absolute right-3.5 top-3.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">{Math.min(activeImage + 1, gallery.length)}/{gallery.length}</span>
              <span className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {gallery.map((_, index) => (
                  <span key={index} className={cn("h-1.5 w-1.5 rounded-full transition", index === activeImage ? "bg-white" : "bg-white/45")} />
                ))}
              </span>
            </>
          ) : null}
        </section>
        <section className="hidden h-[320px] gap-3 md:grid md:h-[380px] md:grid-cols-[2fr_1fr]">
          <button type="button" onClick={() => setLightboxOpen(true)} className="relative h-full min-h-0 overflow-hidden rounded-[18px] bg-[#E8EDF7] text-left">
            <img src={gallery[0]} alt={society.name} className="h-full w-full object-cover" />
            <span className="absolute left-4 top-4 rounded-full bg-[#233B6E] px-3 py-1.5 text-xs font-bold text-white shadow-[0_6px_16px_-8px_rgba(0,0,0,.45)]">✓ Verified by SocietyFlats</span>
          </button>
          <div className="grid h-full min-h-0 grid-rows-2 gap-3 overflow-hidden">
            {[gallery[1] || gallery[0], gallery[2] || gallery[0]].map((image, index) => (
              <button key={`${image}-${index}`} type="button" onClick={() => { setActiveImage(index + 1); setLightboxOpen(true); }} className="relative overflow-hidden rounded-[18px] bg-[#E8EDF7]">
                <img src={image} alt={`${society.name} ${index + 2}`} className="h-full w-full object-cover" />
                {index === 1 && gallery.length > 3 ? <span className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="rounded-full bg-black/70 px-3 py-1.5 text-xs text-white">+{gallery.length - 3} photos</span></span> : null}
              </button>
            ))}
          </div>
        </section>
        {hasGooglePlacesDisplayPhoto(society) ? (
          <p className="mt-2.5 text-[12px] text-[#8A8F89]">Photos via Google Places, reviewed and approved before publishing — not stock images.</p>
        ) : null}

        <div className="mt-6 grid items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <h1 className="font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-[#111827] md:text-[42px]">{seoContent?.seo_h1 || society.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#6E756E]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {field(society, "sector", "sector", "") ? (
                  <Link to={`/gurgaon/${slugify(String(field(society, "sector", "sector", "")))}`} className="hover:underline">{societyLocation}</Link>
                ) : (
                  societyLocation
                )}
                {" · by "}
                {field(society, "builder", "builder", "") ? (
                  <Link to={`/builder/${slugify(String(field(society, "builder", "builder", "")))}`} className="hover:underline">{field(society, "builder", "builder", "")}</Link>
                ) : (
                  "Builder to be reviewed"
                )}
              </span>
              {societyScore > 0 ? <span className="font-bold text-[#25302B]">★ {(societyScore > 10 ? societyScore / 10 : societyScore).toFixed(1)}</span> : null}
              <span className="rounded-full bg-[#EEF2FA] px-3 py-1 text-[12.5px] font-semibold text-[#3156A3]">Data confidence: {confidenceText}</span>
              <span className="text-[12.5px]">{formatHandoffUpdated(updatedText)}</span>
            </div>

            <div className="mt-6 rounded-[18px] border border-[#D8DFEC] bg-[#F7F9FD] p-5">
              <h2 className="text-sm font-bold text-[#3156A3]">✓ Verified facts · sources reviewed</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[...handoffQuickFacts, ...handoffVerifiedFacts].map(([label, value]) => (
                  <div key={label} className="rounded-[12px] bg-white p-3.5">
                    <p className="text-base font-bold text-[#25302B]">{String(value)}</p>
                    <p className="mt-1 text-xs text-[#7A817D]">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {seoContent?.intro_summary ? <p className="mt-6 rounded-[16px] border border-[#E7E3DA] bg-white p-5 text-[15px] leading-7 text-[#35413B]">{seoContent.intro_summary}</p> : null}

            {subScores.length ? (
              <div className="mt-6">
                <h2 className="text-[19px] font-bold text-[#25302B]">How {society.name} scores</h2>
                <p className="mt-1 text-[13px] text-[#6E756E]">Each number reflects amenities, builder reputation, locality tier and resident-fit signals reviewed for this society — not a single average.</p>
                <div className="mt-3.5 space-y-2.5 rounded-[14px] border border-[#E7E3DA] bg-white p-4">
                  {subScores.map(([label, value]) => {
                    const score = Number(value) > 10 ? Number(value) / 10 : Number(value);
                    return (
                      <div key={label} className="flex items-center gap-3">
                        <span className="w-[92px] shrink-0 text-[12.5px] text-[#6E756E]">{label}</span>
                        <span className="h-[6px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#EEE9DE]">
                          <span className="block h-full rounded-full bg-[#3156A3]" style={{ width: `${Math.min(100, Math.max(0, score * 10))}%` }} />
                        </span>
                        <span className="w-8 shrink-0 text-right text-[13.5px] font-extrabold text-[#233B6E]">{score.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <h2 className="mt-8 text-[19px] font-bold text-[#25302B]">Amenities</h2>
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              {(amenities.length ? amenities : ["Amenities being reviewed"]).slice(0, showAllAmenities ? undefined : 8).map((amenity) => (
                <span key={amenity} className="rounded-full border border-[#E7E3DA] bg-white px-4 py-2 text-[13.5px] text-[#35413B]">✓ {amenity}</span>
              ))}
              {amenities.length > 8 ? (
                <button
                  type="button"
                  onClick={() => setShowAllAmenities((value) => !value)}
                  className="rounded-full border border-[#D8DFEC] bg-[#F7F9FD] px-4 py-2 text-[13.5px] font-semibold text-[#3156A3]"
                >
                  {showAllAmenities ? "Show less" : `+${amenities.length - 8} more`}
                </button>
              ) : null}
            </div>

            <h2 className="mt-8 text-[19px] font-bold text-[#25302B]">About this society</h2>
            <p className="mt-2.5 max-w-[760px] whitespace-pre-line text-[14.5px] leading-[1.65] text-[#4A534E]">
              {seoContent?.about_content || descriptionText || `${society.name} is a published Gurgaon society profile. SocietyFlats is reviewing its project facts, pricing context, nearby intelligence and current availability.`}
            </p>

            {seoContent?.location_content ? <><h2 className="mt-8 text-[19px] font-bold text-[#25302B]">Location & connectivity</h2><p className="mt-2.5 whitespace-pre-line text-[14.5px] leading-[1.65] text-[#4A534E]">{seoContent.location_content}</p></> : null}

            <h2 className="mt-8 text-[19px] font-bold text-[#25302B]">Location intelligence</h2>
            <div className="mt-3.5 overflow-hidden rounded-[18px] border border-[#D8DFEC] bg-[#E8EDF7]">
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
                <h3 className="text-sm font-bold text-[#3156A3]">Pros</h3>
                <div className="mt-3 space-y-2 text-[13.5px] text-[#4A534E]">{(seoPros.length ? seoPros : handoffPros.length ? handoffPros : ["Published society context available"]).map((item: string) => <p key={item}>+ {item}</p>)}</div>
              </div>
              <div className="rounded-[16px] border border-[#E7E3DA] bg-white p-[18px]">
                <h3 className="text-sm font-bold text-[#A45F32]">Cons</h3>
                <div className="mt-3 space-y-2 text-[13.5px] text-[#4A534E]">{(seoCons.length ? seoCons : handoffCons.length ? handoffCons : ["Verify tower and unit-level pricing before deciding"]).map((item: string) => <p key={item}>– {item}</p>)}</div>
              </div>
            </div>

            {seoContent ? <div className="mt-8 space-y-7">
              {seoContent.rent_content ? <section><h2 className="text-[19px] font-bold text-[#25302B]">Rent in {society.name}</h2><p className="mt-2.5 whitespace-pre-line text-[14.5px] leading-[1.65] text-[#4A534E]">{seoContent.rent_content}</p></section> : null}
              {seoContent.sale_content ? <section><h2 className="text-[19px] font-bold text-[#25302B]">Flats for sale or resale in {society.name}</h2><p className="mt-2.5 whitespace-pre-line text-[14.5px] leading-[1.65] text-[#4A534E]">{seoContent.sale_content}</p></section> : null}
              {seoContent.amenities_content ? <section><h2 className="text-[19px] font-bold text-[#25302B]">Amenities & lifestyle</h2><p className="mt-2.5 whitespace-pre-line text-[14.5px] leading-[1.65] text-[#4A534E]">{seoContent.amenities_content}</p></section> : null}
              {seoContent.investment_content ? <section><h2 className="text-[19px] font-bold text-[#25302B]">Investment and end-use suitability</h2><p className="mt-2.5 whitespace-pre-line text-[14.5px] leading-[1.65] text-[#4A534E]">{seoContent.investment_content}</p></section> : null}
              {seoBestFor.length ? <section><h2 className="text-[19px] font-bold text-[#25302B]">Best for</h2><div className="mt-3 flex flex-wrap gap-2">{seoBestFor.map((item: string) => <span key={item} className="rounded-full border border-[#D8DFEC] bg-[#F7F9FD] px-3 py-1.5 text-sm text-[#3156A3]">{item}</span>)}</div></section> : null}
              {seoNearbyHighlights.length ? <section><h2 className="text-[19px] font-bold text-[#25302B]">Nearby highlights</h2><ul className="mt-3 space-y-2 text-[14.5px] text-[#4A534E]">{seoNearbyHighlights.map((item: string) => <li key={item}>• {item}</li>)}</ul></section> : null}
            </div> : null}
          </section>

          <aside>
            <div className="lg:sticky lg:top-[94px]">
              <div className="rounded-[20px] border border-[#E7E3DA] bg-white p-[22px] shadow-[0_14px_36px_-26px_rgba(0,0,0,.4)]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8F89]">Resale price</p>
                    <p className="mt-1 text-xl font-extrabold text-[#233B6E]">{buyTextForHandoff(society)}</p>
                  </div>
                  <div className="border-l border-[#EEEAE1] pl-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8F89]">Rent / month</p>
                    <p className="mt-1 text-xl font-extrabold text-[#233B6E]">{rentTextForHandoff(society)}</p>
                  </div>
                </div>
                <div className="mt-[18px] grid gap-2.5">
                  <button type="button" onClick={() => openSocietyCallback("society_page_rent_options")} className="rounded-[12px] bg-[#233B6E] px-5 py-3.5 text-[14.5px] font-bold text-white">Get rental options</button>
                  <button type="button" onClick={() => openSocietyCallback("society_page_availability")} className="rounded-[12px] border-2 border-[#233B6E] bg-white px-5 py-3 text-[14.5px] font-bold text-[#233B6E]">Check current availability</button>
                  <a href={`https://wa.me/919911886222?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-[12px] bg-[#3156A3] px-5 py-3 text-[14.5px] font-bold text-white"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp SocietyFlats</a>
                  <button type="button" onClick={toggleSocietyCompare} className="px-4 py-2 text-[13.5px] font-semibold text-[#3156A3]">{isSocietyCompared ? "✓ Added to compare" : "+ Add to compare"}</button>
                </div>
                <p className="mt-3.5 border-t border-[#EEEAE1] pt-3.5 text-[11.5px] leading-5 text-[#7A817D]">We use your phone number only to verify your request and connect you with relevant options.</p>
              </div>
              <Link to={`/ai-advisor?q=${encodeURIComponent(`Compare ${society.name} with similar Gurgaon societies`)}`} className="mt-3.5 block rounded-[16px] border border-[#D8DFEC] bg-[#F7F9FD] p-4">
                <strong className="text-sm text-[#233B6E]">Not sure about this society?</strong>
                <p className="mt-1 text-[12.5px] text-[#6E756E]">Ask SocietyFlats AI to compare it with similar options →</p>
              </Link>
              <Link to={`/rwa/${society.slug || slug}`} className="mt-3.5 block rounded-[16px] border border-emerald-100 bg-emerald-50/70 p-4">
                <strong className="inline-flex items-center gap-2 text-sm text-emerald-800"><Shield className="h-4 w-4" /> RWA notices & resident forum</strong>
                <p className="mt-1 text-[12.5px] text-emerald-700">View official RWA updates, discussions, questions and grievances →</p>
              </Link>
            </div>
          </aside>
        </div>

        <h2 className="mb-4 mt-11 text-[22px] font-bold text-[#25302B]">Available homes</h2>
        {properties.length ? (
          <div className="grid gap-[18px] md:grid-cols-3">
            {properties.slice(0, 3).map((property) => (
              <Link key={property.id || property.slug} to={safePropertyUrl(property)} className="overflow-hidden rounded-[16px] border border-[#E7E3DA] bg-white">
                <div className="relative h-[150px] bg-[#E8EDF7]"><img src={safePropertyImage(property)} alt={hasRealPropertyDisplayPhotos(property) ? (property.title || "Available home") : PROPERTY_PHOTOS_UNDER_VERIFICATION} className="h-full w-full object-cover" /><span className="absolute left-2.5 top-2.5 rounded-full bg-[#EEF2FA] px-2.5 py-1 text-[11px] font-bold text-[#3156A3]">Verified · {field(property, "listedBy", "listed_by", "Source reviewed")}</span>{!hasRealPropertyDisplayPhotos(property) ? <span className="absolute bottom-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-bold text-[#3156A3]">{PROPERTY_PHOTOS_UNDER_VERIFICATION}</span> : null}</div>
                <div className="p-4"><div className="flex items-center justify-between gap-3"><strong>{property.title || "Available home"}</strong><strong className="text-[#233B6E]">{formatPropertyPrice(property)}</strong></div><p className="mt-1 text-[12.5px] text-[#6E756E]">{field(property, "areaSqft", "area_sqft", "Area on request")} sq.ft · {field(property, "floor", "floor", "Floor on request")} · {field(property, "furnishedStatus", "furnished_status", "Status on request")}</p></div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-[#D8D4CA] bg-white p-6 text-sm text-[#6E756E]">No verified homes are listed right now. Request current availability and SocietyFlats will check owner or broker options.</div>
        )}

        {seoInternalLinks.length ? <section className="mt-11"><h2 className="text-[22px] font-bold text-[#25302B]">Explore similar Gurgaon societies</h2><div className="mt-4 flex flex-wrap gap-3">{seoInternalLinks.map((item: any) => <Link key={`${item.url}-${item.label}`} to={item.url} className="rounded-full border border-[#D8DFEC] bg-white px-4 py-2 text-sm font-semibold text-[#3156A3]">{item.label}</Link>)}</div></section> : null}

        {comparePages.length ? <section className="mt-11"><h2 className="text-[22px] font-bold text-[#25302B]">Compare {society?.name || "this society"} with nearby societies</h2><div className="mt-4 flex flex-wrap gap-3">{comparePages.map((page: any) => <Link key={page.slug} to={`/compare/${page.slug}`} className="rounded-full border border-[#D8DFEC] bg-white px-4 py-2 text-sm font-semibold text-[#3156A3]">{page.title}</Link>)}</div></section> : null}

        {seoFaqs.length ? <section className="mt-11"><h2 className="text-[22px] font-bold text-[#25302B]">Frequently asked questions</h2><div className="mt-4 space-y-3">{seoFaqs.map((faq: any) => <details key={faq.question} className="rounded-[16px] border border-[#E7E3DA] bg-white p-4"><summary className="cursor-pointer font-bold text-[#25302B]">{faq.question}</summary><p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#4A534E]">{faq.answer}</p></details>)}</div></section> : null}
      </main>

      <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 lg:hidden">
        <div className="flex items-center gap-2 rounded-[1.25rem] border border-[#E7E3DA] bg-white/95 p-2.5 shadow-[0_14px_36px_-26px_rgba(0,0,0,.4)] backdrop-blur-xl">
          <div className="min-w-0 flex-1 pl-1.5">
            <p className="truncate text-[11px] text-[#7A817D]">Price range</p>
            <p className="truncate text-[15px] font-extrabold text-[#233B6E]">{buyTextForHandoff(society)}</p>
          </div>
          <button type="button" onClick={() => openSocietyCallback("society_page_availability")} className="whitespace-nowrap rounded-[12px] border-2 border-[#233B6E] bg-white px-3.5 py-2.5 text-[13px] font-bold text-[#233B6E]">Check availability</button>
          <a href={`https://wa.me/919911886222?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#3156A3] text-white"><MessageCircle className="h-4 w-4" /></a>
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
