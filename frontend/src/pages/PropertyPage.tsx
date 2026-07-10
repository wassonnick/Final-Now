// C90 detail CTA safety: Share button is wired, similar society links have safe fallback.
// C89B exact fix: Similar options scrolls to similar properties instead of opening callback popup.
// C89 property similar options fix: similar CTA scrolls to property matches instead of opening callback popup.
// C77 property page UX polish: compact hero, tighter details, preserved property-style sidebar.
// C71 property detail copy: legal verification, society intelligence and stronger enquiry CTAs.
import { trackEvent, trackLeadIntent, trackLeadSubmitted, trackResultClicked } from "@/lib/analytics";
import { cleanLeadTrackingPayload } from "@/lib/leadTracking";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  Bed,
  CalendarCheck,
  Calculator,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Heart,
  Home,
  Mail,
  MapPin,
  Maximize,
  MessageCircle,
  Phone,
  Share2,
  Shield,
  ExternalLink,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { setPublicSeo } from "@/lib/seo";
import { API_BASE_URL } from "@/config/api";
import {
  getCustomerAccountSession,
  isCustomerItemShortlisted,
  rememberCustomerSavedItem,
  toggleCustomerShortlist,
} from "@/lib/customerAccount";

interface SocietyRef {
  name?: string;
  slug?: string;
  locality?: string;
  sector?: string;
}

interface Property {
  id?: number | string;
  title?: string;
  slug?: string;
  description?: string | null;
  listing_type?: string | null;
  listingType?: string | null;
  property_type?: string | null;
  propertyType?: string | null;
  status?: string | null;
  price?: string | null;
  rent?: string | null;
  area_sqft?: number | string | null;
  areaSqft?: number | string | null;
  bedrooms?: number | string | null;
  bathrooms?: number | string | null;
  furnished_status?: string | null;
  furnishedStatus?: string | null;
  maintenance?: string | null;
  security_deposit?: string | null;
  securityDeposit?: string | null;
  floor?: string | null;
  facing?: string | null;
  locality?: string | null;
  featured?: boolean | null;
  verified?: boolean | null;
  amenities?: string[] | string | null;
  images?: string[] | string | null;
  cover_image?: string | null;
  coverImage?: string | null;
  gallery_images?: string[] | string | null;
  galleryImages?: string[] | string | null;
  virtual_tour_url?: string | null;
  virtualTourUrl?: string | null;
  floor_plan_url?: string | null;
  floorPlanUrl?: string | null;
  society?: string | SocietyRef | null;
  society_name?: string | null;
  societyName?: string | null;
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

function getField<T = string>(item: any, camel: string, snake: string, fallback: T): T {
  return (item?.[camel] ?? item?.[snake] ?? fallback) as T;
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((item) => item.trim()).filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function extractProperty(payload: any): Property | null {
  if (!payload) return null;
  if (payload.data?.data && typeof payload.data.data === "object") return payload.data.data;
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) return payload.data;
  if (payload.property && typeof payload.property === "object") return payload.property;
  if (typeof payload === "object" && !Array.isArray(payload)) return payload;
  return null;
}

function getSocietyName(property: Property | null): string {
  if (!property) return "";
  if (typeof property.society === "object" && property.society?.name) return property.society.name;
  if (typeof property.society === "string") return property.society;
  return property.societyName || property.society_name || "";
}

function getSocietySlug(property: Property | null): string {
  if (!property) return "";
  if (typeof property.society === "object" && property.society?.slug) return property.society.slug;
  return "";
}

function getSocietyLocality(property: Property | null): string {
  if (!property) return "Gurgaon";

  if (typeof property.society === "object") {
    const location = [property.society?.sector, property.society?.locality]
      .filter(Boolean)
      .join(", ");
    if (location) return location;
  }

  return property.locality || "Gurgaon";
}

function cleanLeadPhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function isValidLeadPhone(value: string) {
  return /^[6-9]\d{9}$/.test(value);
}


function publicPropertyDescription(value?: string | null) {
  const clean = String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      const lower = line.toLowerCase();
      return (
        line &&
        !lower.startsWith("draft property created from owner crm lead") &&
        !lower.startsWith("source lead id") &&
        !lower.startsWith("owner:") &&
        !lower.startsWith("phone:") &&
        !lower.startsWith("next admin step") &&
        !lower.includes("societyflats admin should verify")
      );
    })
    .join("\n\n")
    .trim();

  return clean || "This property is part of SocietyFlats verified Gurgaon inventory. Request a callback to confirm latest price, availability, photos and visit timing.";
}

function searchTabForListingType(listingType: string) {
  const cleanType = String(listingType || "").toLowerCase();

  if (
    cleanType.includes("sale") ||
    cleanType.includes("buy") ||
    cleanType.includes("resale") ||
    cleanType.includes("builder")
  ) {
    return "buy";
  }

  if (cleanType.includes("rent") || cleanType.includes("lease")) {
    return "rent";
  }

  return "societies";
}

function leadRequirementFor(listingType: string, leadType: "callback" | "enquiry") {
  const cleanType = String(listingType || "Property").toLowerCase();

  const intent =
    cleanType.includes("rent")
      ? "Rent"
      : cleanType.includes("sale") ||
          cleanType.includes("buy") ||
          cleanType.includes("resale") ||
          cleanType.includes("builder")
        ? "Buy"
        : "Property";

  return leadType === "callback" ? `${intent} callback` : `${intent} enquiry`;
}

function getPhotos(property: Property): string[] {
  const savedImages = parseList(property.images);
  const galleryImages = parseList(property.galleryImages ?? property.gallery_images);
  const coverImage = property.coverImage || property.cover_image;

  const photos = [...savedImages, ...galleryImages, coverImage]
    .filter(Boolean)
    .map(String)
    .filter((value, index, self) => self.indexOf(value) === index);

  return photos.length ? photos : ["/brand/societyflats-icon-512.png"];
}

function safePropertyPath(property: Property): string {
  const rawSlug = String(property?.slug || "").replace(/^\/+/, "").replace(/^property\//, "");

  if (rawSlug) return `/property/${rawSlug}`;
  if (property?.id) return `/property/${property.id}`;

  return "/properties";
}

function moneyValue(value: unknown): number {
  const text = String(value || '').toLowerCase();
  const amount = Number(text.replace(/[^0-9.]/g, '')) || 0;
  if (text.includes('cr')) return amount * 10_000_000;
  if (text.includes('lakh') || /\bl\b/.test(text)) return amount * 100_000;
  if (text.includes('k')) return amount * 1_000;
  return amount;
}

export function PropertyPage() {
  const { slug } = useParams();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loanPercent, setLoanPercent] = useState(80);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenureYears, setTenureYears] = useState(20);
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [similarProperties, setSimilarProperties] = useState<Property[]>([]);

  const [leadOpen, setLeadOpen] = useState(false);
  const [leadType, setLeadType] = useState<"callback" | "enquiry">("callback");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadError, setLeadError] = useState("");

  const [leadForm, setLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
    preferredTime: "",
  });

  const preferredTimeChips = ["Now", "Today", "Tomorrow", "Weekend"];

  useEffect(() => {
    let mounted = true;

    async function fetchProperty() {
      if (!slug) {
        setLoading(false);
        setFetchError("Property URL is missing.");
        return;
      }

      try {
        setLoading(true);
        setFetchError("");
        const cleanSlug = String(slug).replace(/^property\//, "");
        const response = await fetch(`${API_BASE_URL}/properties/${encodeURIComponent(cleanSlug)}`);

        if (!response.ok) {
          throw new Error(`Property API failed with status ${response.status}`);
        }

        const json = await response.json();
        const nextProperty = extractProperty(json);

        if (!nextProperty || !isPublicLiveProperty(nextProperty)) {
          throw new Error("Property not found in public inventory");
        }

        if (mounted) {
          setProperty(nextProperty);
          setActiveImage(0);
        }
      } catch (error) {
        console.error("Property fetch failed:", error);
        if (mounted) {
          setFetchError("Unable to load this property right now.");
          setProperty(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchProperty();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const title = property?.title || "Property";
  const societyName = getSocietyName(property);
  const societySlug = getSocietySlug(property);
  const societyLocality = getSocietyLocality(property);
  const price = property?.price || property?.rent || "On request";
  const listingType = getField(property, "listingType", "listing_type", "Property");
  const listingSearchTab = searchTabForListingType(listingType);
  const propertyType = getField(property, "propertyType", "property_type", "Apartment");
  const listedByValue = String(
    getField(property, "listedBy", "listed_by", "") ||
    getField(property, "sourceType", "source_type", ""),
  ).toLowerCase();
  const listingSourceLabel = listedByValue.includes("owner")
    ? "Listed by owner"
    : listedByValue.includes("broker")
      ? "Broker partner"
      : "Source reviewed";
  const areaSqft = getField(property, "areaSqft", "area_sqft", "-");
  const furnishedStatus = getField(property, "furnishedStatus", "furnished_status", "-");
  const amenities = useMemo(() => parseList(property?.amenities), [property?.amenities]);
  const photos = useMemo(() => (property ? getPhotos(property) : []), [property]);
  const saleListing = /sale|buy|resale|builder/i.test(String(listingType));
  const propertyPrice = moneyValue(price);
  const loanAmount = propertyPrice * (loanPercent / 100);
  const monthlyRate = interestRate / 1200;
  const months = tenureYears * 12;
  const monthlyEmi = loanAmount > 0 && monthlyRate > 0
    ? loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1)
    : months > 0 ? loanAmount / months : 0;
  const totalPayable = monthlyEmi * months;
  const virtualTourUrl = property?.virtualTourUrl || property?.virtual_tour_url;
  const floorPlanUrl = property?.floorPlanUrl || property?.floor_plan_url;
  const customerSession = getCustomerAccountSession();
  const propertyHref = property ? safePropertyPath(property) : `/property/${slug || ""}`;

  // C45 property view tracking
  useEffect(() => {
    if (!property || !customerSession?.phone) return;

    rememberCustomerSavedItem({
      type: "property",
      title,
      slug: String(property.slug || slug || ""),
      href: propertyHref,
      meta: [societyName || "Gurgaon", listingType, String(price || "On request")].filter(Boolean).join(" · "),
      image: photos[0],
      action: "view",
    });

    setIsShortlisted(isCustomerItemShortlisted("property", propertyHref, customerSession.phone));
  }, [property, customerSession?.phone, propertyHref, title, societyName, listingType, price, photos, slug]);

  const handlePropertyShortlist = () => {
    if (!property) return;

    const result = toggleCustomerShortlist({
      type: "property",
      title,
      slug: String(property.slug || slug || ""),
      href: propertyHref,
      meta: [societyName || "Gurgaon", listingType, String(price || "On request")].filter(Boolean).join(" · "),
      image: photos[0],
    });

    setIsShortlisted(result.saved);

    trackEvent("customer_property_shortlist_toggled", {
      source: "property_page",
      entity_type: "property",
      entity_slug: property.slug || slug || "",
      entity_name: title,
      saved: result.saved,
    });
  };

  const handlePropertyShare = async () => {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${propertyHref}`
        : propertyHref;

    trackEvent("property_page_share_clicked", {
      entity_type: "property",
      entity_slug: property?.slug || slug || "",
      entity_name: title,
    });

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title,
          text: `${title} on SocietyFlats`,
          url: shareUrl,
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        return;
      }
    } catch (error) {
      console.error("Property share failed:", error);
    }
  };

  // Listing SEO: data-rich meta (price/area/society), share image, and RealEstateListing +
  // BreadcrumbList JSON-LD so flats and builder floors are rich-result eligible — this page
  // is the core inventory surface, so every listing must earn its clicks.
  useEffect(() => {
    if (property) {
      const priceText = price && String(price) !== "On request" ? String(price) : "";
      const facts = [
        priceText ? (saleListing ? `Price ${priceText}` : `Rent ${priceText}`) : null,
        areaSqft && String(areaSqft) !== "-" ? `${areaSqft} sq.ft.` : null,
        furnishedStatus && String(furnishedStatus) !== "-" ? String(furnishedStatus) : null,
      ].filter(Boolean).join(" · ");
      const canonicalPath = `/property/${property.slug || slug}`;

      const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "RealEstateListing",
            name: title,
            url: `https://www.societyflats.com${canonicalPath}`,
            ...(photos.length ? { image: photos.slice(0, 6) } : {}),
            description: `${title} in ${societyName || societyLocality || "Gurgaon"}${facts ? ` — ${facts}` : ""}. Verified by SocietyFlats.`,
            ...(propertyPrice > 0
              ? { offers: { "@type": "Offer", price: propertyPrice, priceCurrency: "INR", availability: "https://schema.org/InStock" } }
              : {}),
            ...(societyName || societyLocality
              ? { address: { "@type": "PostalAddress", streetAddress: [societyName, societyLocality].filter(Boolean).join(", "), addressLocality: "Gurugram", addressRegion: "Haryana", addressCountry: "IN" } }
              : {}),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://www.societyflats.com" },
              { "@type": "ListItem", position: 2, name: "Properties", item: "https://www.societyflats.com/properties" },
              ...(societySlug ? [{ "@type": "ListItem", position: 3, name: societyName, item: `https://www.societyflats.com/society/${societySlug}` }] : []),
              { "@type": "ListItem", position: societySlug ? 4 : 3, name: title, item: `https://www.societyflats.com${canonicalPath}` },
            ],
          },
        ],
      };

      setPublicSeo(
        `${title}${priceText ? ` — ${priceText}` : ""} | SocietyFlats`,
        `${title} in ${societyName || societyLocality || "Gurgaon"}${facts ? ` — ${facts}` : ""}. Inside a society verified by real people. Check current availability or ask about this home on SocietyFlats.`,
        { canonical: canonicalPath, jsonLd, ...(photos.length ? { image: photos[0] } : {}) },
      );
      return;
    }

    if (!loading) {
      setPublicSeo(
        "Property unavailable | SocietyFlats",
        "This property is not currently available in the public SocietyFlats live inventory.",
        true,
      );
    }
  }, [property, loading, title, societyName, societyLocality, societySlug, price, propertyPrice, saleListing, areaSqft, furnishedStatus, photos, slug]);

  useEffect(() => {
    let mounted = true;

    async function fetchSimilarProperties() {
      if (!property) {
        setSimilarProperties([]);
        return;
      }

      const searchTerm = societyName || property.locality || societyLocality || "";

      if (!searchTerm) {
        setSimilarProperties([]);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/properties?q=${encodeURIComponent(searchTerm)}`);

        if (!response.ok) throw new Error("Similar properties API failed");

        const json = await response.json();
        const items = Array.isArray(json?.data?.data)
          ? json.data.data
          : Array.isArray(json?.data)
            ? json.data
            : [];

        const currentSlug = String(property.slug || slug || "").toLowerCase();
        const currentId = String(property.id || "");

        const matches = items
          .filter((item: Property) => {
            const itemSlug = String(item.slug || "").toLowerCase();
            const itemId = String(item.id || "");

            if (currentSlug && itemSlug && itemSlug === currentSlug) return false;
            if (currentId && itemId && itemId === currentId) return false;
            if (!isPublicLiveProperty(item)) return false;

            return Boolean(item?.title || item?.slug || item?.id);
          })
          .slice(0, 3);

        if (mounted) setSimilarProperties(matches);
      } catch {
        if (mounted) setSimilarProperties([]);
      }
    }

    fetchSimilarProperties();

    return () => {
      mounted = false;
    };
  }, [property, societyName, societyLocality, slug]);

  const whatsappMessage = encodeURIComponent(
    `Hi, I am interested in ${title}. Please share details.`,
  );

  const propertyLeadContext = (type: "callback" | "enquiry") =>
    [
      "Property lead context:",
      `Source: ${type === "callback" ? "property_page_callback" : "property_page_enquiry"}`,
      `CTA: ${type === "callback" ? "Check availability" : "Ask about this property"}`,
      `Intent: ${leadRequirementFor(listingType, type)}`,
      `Entity: property · ${property?.slug || slug || ""}`,
      `Property: ${title}`,
      societyName ? `Society: ${societyName}` : "",
      societyLocality ? `Location: ${societyLocality}` : "Location: Gurgaon",
      listingType ? `Listing type: ${listingType}` : "",
      price ? `Price: ${price}` : "",
      typeof window !== "undefined" ? `Page URL: ${window.location.href}` : "",
      typeof document !== "undefined" && document.referrer ? `Referrer: ${document.referrer}` : "",
    ]
      .filter(Boolean)
      .join("\n");

  const openLead = (type: "callback" | "enquiry") => {
    trackLeadIntent({
      source: type === "callback" ? "property_page_callback" : "property_page_enquiry",
      cta_label: type === "callback" ? "Check availability" : "Ask about this property",
      lead_intent: leadRequirementFor(listingType, type),
      entity_type: "property",
      entity_slug: property?.slug || slug || "",
      entity_name: title,
    });
    setLeadType(type);
    setLeadOpen(true);
    setLeadSuccess(false);
    setLeadError("");
    setLeadForm((current) => ({
      ...current,
      message:
        type === "callback"
          ? `I want a callback for ${title}. Society: ${societyName || "Not specified"}. Location: ${societyLocality || "Gurgaon"}. Listing type: ${listingType}. Price: ${price}.`
          : `I am interested in ${title}. Society: ${societyName || "Not specified"}. Location: ${societyLocality || "Gurgaon"}. Listing type: ${listingType}. Price: ${price}. Please share details.`,
    }));
  };

  const submitLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (leadSubmitting || leadSuccess) return;
    if (!property) return;

    const normalizedPhone = cleanLeadPhone(leadForm.phone);

    if (!isValidLeadPhone(normalizedPhone)) {
      setLeadError("Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.");
      return;
    }

    setLeadSubmitting(true);
    setLeadError("");

    const selectedTime = leadForm.preferredTime.trim();
    const baseRequirement = leadRequirementFor(listingType, leadType);
    const enrichedRequirement = selectedTime
      ? `${baseRequirement} · Preferred time: ${selectedTime}`
      : baseRequirement;
    const trackingPayload = cleanLeadTrackingPayload({
      cta_label: leadType === "callback" ? "Check availability" : "Ask about this property",
      lead_intent: leadRequirementFor(listingType, leadType),
      entity_type: "property",
      entity_slug: property.slug || slug || "",
      entity_name: title,
      search_query: societyName || societyLocality || "",
    });

    const fallbackMessage = `${leadType === "callback" ? "Callback" : "Verified enquiry"} requested for ${title}. Society: ${societyName || "Not specified"}. Location: ${societyLocality || "Gurgaon"}. Listing type: ${listingType}. Price: ${price}.`;
    const enrichedMessage = [
      leadForm.message || fallbackMessage,
      selectedTime ? `Preferred callback time: ${selectedTime}.` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const response = await fetch(`${API_BASE_URL}/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: leadForm.name.trim(),
          phone: normalizedPhone,
          email: leadForm.email || null,
          message: enrichedMessage,
          property_title: title,
          property_slug: property.slug || slug,
          society_name: societyName || property.locality || "Gurgaon",
          source: leadType === "callback" ? "property_page_callback" : "property_page_enquiry",
          ...trackingPayload,
          requirement: enrichedRequirement,
        }),
      });

      if (!response.ok) throw new Error("Lead submission failed");

      trackLeadSubmitted({
        ...trackingPayload,
        source: leadType === "callback" ? "property_page_callback" : "property_page_enquiry",
        property_slug: property.slug || slug || "",
      });
      setLeadSuccess(true);
      setLeadForm({ name: "", phone: "", email: "", message: "", preferredTime: "" });
    } catch {
      setLeadError("Unable to submit enquiry. Please try again.");
    } finally {
      setLeadSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory-100 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-navy-900">Loading property...</h1>
          <p className="mt-3 text-navy-500">Fetching live property details.</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-ivory-100 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-navy-900">Property not found</h1>
          <p className="mx-auto mt-3 max-w-xl text-navy-500">
            {fetchError || "This property is not available in the public live inventory."}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild className="rounded-full bg-navy-600 hover:bg-navy-700">
              <Link to="/properties">Back to properties</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/search">Search homes</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handoffPropertyFacts = [
    ["Carpet area", areaSqft && areaSqft !== "-" ? `${areaSqft} ft²` : "To be verified"],
    ["Floor", property.floor || "To be verified"],
    ["Facing", property.facing || "To be verified"],
    ["Bathrooms", property.bathrooms || "To be verified"],
    ["Furnishing", furnishedStatus || "To be verified"],
    ["Parking", getField(property, "parking", "parking", "To be verified")],
  ];
  const ownerInitials = listingSourceLabel
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8F3EA] pb-40 md:pb-0">
      <main className="mx-auto max-w-[1360px] px-4 py-6 md:px-10 md:pb-16">
        <div className="mb-4 flex items-center gap-1.5 text-[13px] text-[#6E756E]">
          <Link to={societySlug ? `/society/${societySlug}` : "/properties"}>{societyName || "Properties"}</Link>
          <span>›</span>
          <span className="font-semibold text-[#25302B]">{title}</span>
        </div>

        <div className="grid items-stretch gap-9 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <div className="grid h-[250px] gap-3 sm:h-[320px] md:h-[360px] md:grid-cols-[2fr_1fr]">
              <button type="button" onClick={() => setLightboxOpen(true)} className="relative h-full min-h-0 overflow-hidden rounded-[18px] bg-[#E5ECE5] text-left">
                <img src={photos[0]} alt={title} className="h-full w-full object-cover" />
              </button>
              <div className="hidden h-full min-h-0 grid-rows-2 gap-3 overflow-hidden md:grid">
                {[photos[1] || photos[0], photos[2] || photos[0]].map((photo, index) => (
                  <button key={`${photo}-${index}`} type="button" onClick={() => { setActiveImage(index + 1); setLightboxOpen(true); }} className="h-full min-h-0 overflow-hidden rounded-[18px] bg-[#E5ECE5]">
                    <img src={photo} alt={`${title} ${index + 2}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#E8F7E9] px-3 py-1.5 text-xs font-bold text-[#2A6147]">✓ Verified listing</span>
              <span className="rounded-full bg-[#F0F0EC] px-3 py-1.5 text-xs font-semibold text-[#59635E]">{listingSourceLabel}</span>
              <span className="rounded-full bg-[#F0F0EC] px-3 py-1.5 text-xs font-semibold text-[#59635E]">{property.status || listingType}</span>
            </div>

            <h1 className="mt-3 font-display text-[34px] font-medium leading-tight text-[#10251F]">{title}</h1>
            <p className="mt-1.5 text-[14.5px] text-[#6E756E]">{societyName || "Gurgaon"} · {societyLocality || property.locality || "Gurgaon"}</p>
            {societyName ? (
              <Link to={societySlug ? `/society/${societySlug}` : `/search?q=${encodeURIComponent(societyName)}&tab=societies`} className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#2A6147] hover:underline">
                Inside {societyName} → see security score, commute & resident fit
              </Link>
            ) : null}

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
              {handoffPropertyFacts.map(([label, value]) => (
                <div key={label} className="rounded-[14px] border border-[#E7E3DA] bg-white p-[15px]">
                  <p className="text-[11px] text-[#7A817D]">{label}</p>
                  <p className="mt-1 text-base font-bold text-[#25302B]">{String(value)}</p>
                </div>
              ))}
            </div>

            <h2 className="mt-8 text-[19px] font-bold text-[#25302B]">About this flat</h2>
            <p className="mt-2.5 max-w-[760px] whitespace-pre-line text-[14.5px] leading-[1.65] text-[#4A534E]">{publicPropertyDescription(property.description)}</p>

            <h2 className="mt-8 text-[19px] font-bold text-[#25302B]">Floor plan</h2>
            <div className="mt-3.5 flex h-[240px] items-center justify-center overflow-hidden rounded-[16px] border border-[#E7E3DA] bg-[repeating-linear-gradient(135deg,#E5EAE5_0_1px,transparent_1px_15px)]">
              {floorPlanUrl ? <img src={floorPlanUrl} alt={`${title} floor plan`} className="h-full w-full object-contain" /> : <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#66716B]">Floor plan under review</span>}
            </div>
          </section>

          <aside>
            <div className="space-y-3.5 lg:sticky lg:top-[94px]">
              <div className="rounded-[20px] border border-[#E7E3DA] bg-white p-[22px] shadow-[0_14px_36px_-26px_rgba(0,0,0,.4)]">
                <p className="text-[28px] font-extrabold text-[#123C32]">{price}</p>
                {saleListing && monthlyEmi > 0 ? <p className="mt-1 text-[13px] text-[#6E756E]">≈ ₹{(monthlyEmi / 100000).toFixed(1)} L/mo EMI</p> : <p className="mt-1 text-[13px] text-[#6E756E]">{listingType}</p>}
                <div className="mt-4 flex items-center gap-3 rounded-[12px] bg-[#F1F3EF] p-3">
                  <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#DDE9DF] text-[13px] font-bold text-[#2A6147]">{ownerInitials || "SF"}</span>
                  <div><p className="text-sm font-semibold text-[#25302B]">{listingSourceLabel}</p><p className="text-[11.5px] text-[#2A6147]">{property.verified ? "Verified contact" : "Contact reviewed before sharing"}</p></div>
                </div>
                <div className="mt-4 grid gap-2.5">
                  <button type="button" onClick={() => openLead("enquiry")} className="rounded-[12px] bg-[#C8783F] px-5 py-3.5 text-[14.5px] font-bold text-white">{listedByValue.includes("owner") ? "Contact owner" : "Ask about this home"}</button>
                  <a href={`https://wa.me/919911886222?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-[12px] bg-[#449B4E] px-5 py-3 text-[14.5px] font-bold text-white"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</a>
                  <button type="button" onClick={() => openLead("callback")} className="rounded-[12px] border-2 border-[#123C32] bg-white px-5 py-3 text-[14.5px] font-bold text-[#123C32]">Request callback</button>
                </div>
                <p className="mt-3.5 rounded-[11px] bg-[#EEF5F1] p-3 text-[11.5px] leading-5 text-[#486154]">🛡 Never pay before visiting. SocietyFlats reviews listings, but always inspect in person.</p>
              </div>

              {societyName ? (
                <Link to={societySlug ? `/society/${societySlug}` : `/search?q=${encodeURIComponent(societyName)}&tab=societies`} className="flex items-center gap-3 rounded-[16px] border border-[#E7E3DA] bg-white p-3.5">
                  <div className="h-[50px] w-[50px] rounded-[11px] bg-[repeating-linear-gradient(135deg,#DDE5DE_0_1px,transparent_1px_10px)]" />
                  <div className="min-w-0"><strong className="text-sm text-[#25302B]">{societyName}</strong><p className="mt-1 text-xs text-[#6E756E]">View society profile →</p></div>
                </Link>
              ) : null}
            </div>
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 lg:hidden">
        <div className="flex items-center gap-2 rounded-[1.25rem] border border-[#E7E3DA] bg-white/95 p-2.5 shadow-[0_14px_36px_-26px_rgba(0,0,0,.4)] backdrop-blur-xl">
          <div className="min-w-0 flex-1 pl-1.5">
            <p className="truncate text-[11px] text-[#7A817D]">{listingType}</p>
            <p className="truncate text-[15px] font-extrabold text-[#123C32]">{price}</p>
          </div>
          <button type="button" onClick={() => openLead("enquiry")} className="whitespace-nowrap rounded-[12px] bg-[#C8783F] px-3.5 py-2.5 text-[13px] font-bold text-white">{listedByValue.includes("owner") ? "Contact owner" : "Ask about this"}</button>
          <a href={`https://wa.me/919911886222?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#449B4E] text-white"><MessageCircle className="h-4 w-4" /></a>
        </div>
      </div>

      {lightboxOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true">
          <button type="button" onClick={() => setLightboxOpen(false)} className="absolute right-5 top-5 rounded-full bg-white/10 p-3 text-white"><X className="h-6 w-6" /></button>
          <img src={photos[activeImage] || photos[0]} alt={title} className="max-h-[85vh] max-w-[88vw] rounded-2xl object-contain" />
        </div>
      ) : null}

      {leadOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10251F]/60 px-4">
          <div className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="font-display text-2xl font-medium text-[#10251F]">{leadType === "callback" ? "Check property availability" : "Ask about this property"}</h3><p className="mt-1 text-sm text-[#6E756E]">Share your details once. We will confirm availability, price and the next visit step.</p></div>
              <button type="button" onClick={() => setLeadOpen(false)} className="rounded-full border border-[#E7E3DA] p-2 text-[#6E756E]"><X className="h-4 w-4" /></button>
            </div>
            {leadSuccess ? <div className="mt-6 rounded-2xl bg-[#EEF5F1] p-5 text-[#2A6147]"><strong>Request received</strong><p className="mt-2 text-sm">A SocietyFlats advisor will review your requirement and get back to you shortly.</p></div> : (
              <form onSubmit={submitLead} className="mt-6 space-y-4">
                <input required value={leadForm.name} onChange={(event) => setLeadForm({ ...leadForm, name: event.target.value })} placeholder="Your name" className="w-full rounded-xl border border-[#E7E3DA] px-4 py-3 outline-none" />
                <input required value={leadForm.phone} inputMode="numeric" maxLength={10} onChange={(event) => setLeadForm({ ...leadForm, phone: cleanLeadPhone(event.target.value) })} placeholder="10-digit mobile number" className="w-full rounded-xl border border-[#E7E3DA] px-4 py-3 outline-none" />
                <input type="email" value={leadForm.email} onChange={(event) => setLeadForm({ ...leadForm, email: event.target.value })} placeholder="Email optional" className="w-full rounded-xl border border-[#E7E3DA] px-4 py-3 outline-none" />
                <textarea value={leadForm.message} onChange={(event) => setLeadForm({ ...leadForm, message: event.target.value })} placeholder="Message" rows={4} className="w-full rounded-xl border border-[#E7E3DA] px-4 py-3 outline-none" />
                {leadError ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{leadError}</div> : null}
                <Button disabled={leadSubmitting || leadSuccess} className="w-full rounded-xl bg-[#123C32] hover:bg-[#10251F]">{leadSubmitting ? "Sending..." : "Submit enquiry"}</Button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );

}
