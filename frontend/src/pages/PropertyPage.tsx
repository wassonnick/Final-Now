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
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { setPublicSeo } from "@/lib/seo";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://final-now.onrender.com/api";

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

  return photos.length
    ? photos
    : [
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
      ];
}

function safePropertyPath(property: Property): string {
  const rawSlug = String(property?.slug || "").replace(/^\/+/, "").replace(/^property\//, "");

  if (rawSlug) return `/property/${rawSlug}`;
  if (property?.id) return `/property/${property.id}`;

  return "/properties";
}

export function PropertyPage() {
  const { slug } = useParams();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
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
        const response = await fetch(`${API_BASE}/properties/${encodeURIComponent(cleanSlug)}`);

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
  const areaSqft = getField(property, "areaSqft", "area_sqft", "-");
  const furnishedStatus = getField(property, "furnishedStatus", "furnished_status", "-");
  const amenities = useMemo(() => parseList(property?.amenities), [property?.amenities]);
  const photos = useMemo(() => (property ? getPhotos(property) : []), [property]);

  // C16 property SEO route effect
  useEffect(() => {
    if (property) {
      setPublicSeo(
        `${title} | ${societyName || "Gurgaon"} | SocietyFlats`,
        `View ${title} in ${societyName || societyLocality || "Gurgaon"} with verified availability, society context, price and callback support on SocietyFlats.`,
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
  }, [property, loading, title, societyName, societyLocality]);

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
        const response = await fetch(`${API_BASE}/properties?q=${encodeURIComponent(searchTerm)}`);

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
    });

    const fallbackMessage = `${leadType === "callback" ? "Callback" : "Enquiry"} requested for ${title}. Society: ${societyName || "Not specified"}. Location: ${societyLocality || "Gurgaon"}. Listing type: ${listingType}. Price: ${price}.`;
    const enrichedMessage = [
      leadForm.message || fallbackMessage,
      selectedTime ? `Preferred callback time: ${selectedTime}.` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const response = await fetch(`${API_BASE}/leads`, {
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

  return (
    <div className="min-h-screen bg-ivory-100 pb-20 md:pb-0">
      <section className="bg-white">
        <div className="container mx-auto px-4 py-5 md:py-6">
          <Button asChild variant="ghost" className="mb-4 rounded-full text-navy-600">
            <Link to={societySlug ? `/society/${societySlug}` : "/properties"}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {societyName ? `Back to ${societyName}` : "Back to properties"}
            </Link>
          </Button>

          <div className={photos.length > 1 ? "grid gap-4 lg:grid-cols-[1fr_240px]" : "grid gap-4"}>
            <div className="relative h-[190px] overflow-hidden rounded-[1.25rem] bg-navy-50 sm:h-[260px] md:h-[440px] md:rounded-[2rem]">
              <img src={photos[activeImage] || photos[0]} alt={title} className="h-full w-full object-cover" />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                {property.verified ? (
                  <Badge className="border-0 bg-green-500 text-white">
                    <Shield className="mr-1 h-3 w-3" /> Verified
                  </Badge>
                ) : null}
                {property.featured ? (
                  <Badge className="border-0 bg-amber-50 text-amber-700">Featured</Badge>
                ) : null}
              </div>
            </div>

            {photos.length > 1 ? (
              <div className="hidden gap-3 lg:grid">
                {photos.slice(0, 3).map((photo, index) => (
                  <button
                    key={`${photo}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={cn(
                      "overflow-hidden rounded-[1.25rem] border-2 bg-navy-50",
                      activeImage === index ? "border-blue-500" : "border-transparent",
                    )}
                  >
                    <img src={photo} alt={title} className="h-full min-h-[135px] w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-[1.5rem] border border-navy-100 bg-white p-4 shadow-sm md:rounded-[2rem] md:p-7">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge className="border-blue-100 bg-blue-50 text-blue-700">{listingType}</Badge>
                    {property.status ? <Badge variant="outline">{property.status}</Badge> : null}
                  </div>

                  <h1 className="text-3xl font-extrabold tracking-tight text-navy-900 md:text-5xl">
                    {title}
                  </h1>

                  <p className="mt-3 flex items-center gap-2 text-navy-500">
                    <MapPin className="h-4 w-4" />
                    <span>{societyName || "Gurgaon"} • {societyLocality}</span>
                  </p>
                </div>

                <div className="rounded-[1.5rem] bg-blue-50 px-5 py-4 text-left md:text-right">
                  <p className="text-sm text-blue-700">Price</p>
                  <p className="mt-1 text-2xl font-bold text-navy-900">{price}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: "Type", value: propertyType, icon: Home },
                  { label: "Bedrooms", value: `${property.bedrooms || "-"} BHK`, icon: Bed },
                  { label: "Baths", value: property.bathrooms || "-", icon: Bath },
                  { label: "Area", value: `${areaSqft || "-"} sq.ft`, icon: Maximize },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-2xl bg-[#F8FAFC] p-4">
                      <Icon className="h-4 w-4 text-blue-600" />
                      <p className="mt-2 text-xs text-navy-400">{item.label}</p>
                      <p className="mt-1 font-semibold text-navy-900">{item.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap md:mt-6">
                <Button onClick={() => openLead("callback")} className="h-10 rounded-full bg-blue-600 text-sm font-bold hover:bg-blue-700">
                  <Phone className="mr-2 h-4 w-4" /> Check availability
                </Button>
                <Button onClick={() => openLead("enquiry")} variant="outline" className="h-10 rounded-full border-blue-200 text-sm font-bold text-blue-700">
                  <Mail className="mr-2 h-4 w-4" /> Ask details
                </Button>
                <Button
                  variant="outline"
                  className={cn("hidden rounded-full sm:inline-flex", isShortlisted && "border-red-200 bg-red-50 text-red-600")}
                  onClick={() => setIsShortlisted(!isShortlisted)}
                >
                  <Heart className={cn("mr-2 h-4 w-4", isShortlisted && "fill-current")} />
                  {isShortlisted ? "Saved" : "Save"}
                </Button>
                <Button variant="outline" className="hidden rounded-full sm:inline-flex">
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
              </div>
            </section>

            {societyName ? (
              <section className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4 shadow-sm md:hidden">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                  Society-first check
                </p>
                <h2 className="mt-2 text-lg font-bold text-navy-900">
                  Review {societyName} before visiting
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">
                  See society profile, location context and similar options before confirming this home.
                </p>
                {societySlug ? (
                  <Button asChild variant="outline" className="mt-4 w-full rounded-full border-blue-200 bg-white text-blue-700">
                    <Link to={`/society/${societySlug}`}>View society profile</Link>
                  </Button>
                ) : null}
              </section>
            ) : null}

            <section className="rounded-[1.75rem] border border-navy-100 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <h2 className="text-xl font-bold text-navy-900 md:text-2xl">Property details</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 md:mt-5 md:grid-cols-3 md:gap-4">
                {[
                  ["Listing type", listingType],
                  ["Price", price],
                  ["Bedrooms", property.bedrooms],
                  ["Bathrooms", property.bathrooms],
                  ["Furnished", furnishedStatus],
                  ["Facing", property.facing],
                  ["Floor", property.floor],
                  ["Maintenance", property.maintenance],
                  ["Security deposit", getField(property, "securityDeposit", "security_deposit", "-")],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <p className="text-xs text-navy-500 md:text-sm">{label}</p>
                    <p className="mt-1 text-sm font-semibold capitalize text-navy-900 md:text-base">{value || "-"}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-navy-100 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "Verified society", value: societyName || "Gurgaon inventory", icon: Shield },
                  { label: "Location context", value: societyLocality, icon: MapPin },
                  { label: "Next action", value: "Callback, visit or WhatsApp", icon: CalendarCheck },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-[1.25rem] bg-[#F8FAFC] p-4">
                      <Icon className="h-5 w-5 text-blue-600" />
                      <p className="mt-3 text-sm text-navy-400">{item.label}</p>
                      <p className="mt-1 font-semibold text-navy-900">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-navy-100 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <h2 className="text-2xl font-bold text-navy-900">Description</h2>
              <p className="mt-4 line-clamp-3 whitespace-pre-line leading-relaxed text-navy-600 md:line-clamp-none">
                {property.description || "No description available."}
              </p>
            </section>

            <section className="rounded-[1.75rem] border border-navy-100 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <h2 className="text-2xl font-bold text-navy-900">Amenities</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {amenities.length ? (
                  amenities.map((item) => (
                    <span key={item} className="rounded-full bg-ivory-200 px-4 py-2 text-sm text-navy-700">
                      {item}
                    </span>
                  ))
                ) : (
                  <p className="text-navy-500">No amenities added yet.</p>
                )}
              </div>
            </section>

            {societyName ? (
              <section className="rounded-[1.75rem] border border-navy-100 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">Society context</p>
                <h2 className="mt-2 text-2xl font-bold text-navy-900">About {societyName}</h2>
                <p className="mt-3 text-navy-500">
                  Review the society profile before requesting a visit so the property decision includes location, amenities and inventory context.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {societySlug ? (
                    <Button asChild variant="outline" className="rounded-full">
                      <Link to={`/society/${societySlug}`}>View society profile</Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to={`/compare?society=${encodeURIComponent(societyName)}`}>Compare area</Link>
                  </Button>
                </div>
              </section>
            ) : null}

            <section className="rounded-[1.75rem] border border-navy-100 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
                    Same society options
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-navy-900 md:text-2xl">
                    Similar properties in {societyName || "this society"}
                  </h2>
                  <p className="mt-2 text-sm text-navy-500">
                    Continue shortlisting without leaving the current society profile.
                  </p>
                </div>
                <Button asChild variant="outline" className="hidden rounded-full border-blue-200 text-blue-700 sm:inline-flex">
                  <Link to={`/search?tab=${listingSearchTab}&q=${encodeURIComponent(societyName || societyLocality || title)}`}>
                    View all
                  </Link>
                </Button>
              </div>

              {similarProperties.length > 0 ? (
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {similarProperties.map((item) => {
                    const itemTitle = item.title || "Similar home";
                    const itemPrice = item.price || item.rent || "On request";
                    const itemBedrooms = item.bedrooms || "-";
                    const itemArea = getField(item, "areaSqft", "area_sqft", "-");
                    const itemPath = safePropertyPath(item);
                    const itemPhoto = getPhotos(item)[0];

                    return (
                      <Link
                        key={String(item.id || item.slug || itemTitle)}
                        to={itemPath}
                        className="group overflow-hidden rounded-[1.5rem] border border-navy-100 bg-white transition-all hover:shadow-soft"
                      >
                        <div className="h-32 bg-navy-50 md:h-36">
                          <img src={itemPhoto} alt={itemTitle} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        </div>
                        <div className="p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                            {getField(item, "listingType", "listing_type", "Property")}
                          </p>
                          <h3 className="mt-2 line-clamp-2 font-bold text-navy-900 group-hover:text-blue-700">
                            {itemTitle}
                          </h3>
                          <p className="mt-2 text-sm text-navy-500">
                            {itemBedrooms} BHK • {itemArea} sq.ft
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-3 border-t border-navy-100 pt-3">
                            <p className="font-bold text-navy-900">{itemPrice}</p>
                            <span className="text-sm font-semibold text-blue-700">View</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                    No public alternatives shown yet
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-navy-900">
                    Want more options in {societyName || "this society"}?
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">
                    Request matching options and we will check owner/broker availability, matching budgets and visit-ready homes in {societyName || societyLocality || "this society"}.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Button onClick={() => openLead("callback")} className="rounded-full bg-blue-600 hover:bg-blue-700">
                      <Phone className="mr-2 h-4 w-4" /> Request matching options
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-blue-200 text-blue-700">
                      <Link to={`/search?tab=${listingSearchTab}&q=${encodeURIComponent(societyName || societyLocality || title)}`}>
                        Search nearby homes
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-20 rounded-[1.25rem] border border-navy-100 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
                    Next step
                  </p>
                  <h3 className="mt-1 text-base font-bold leading-tight text-navy-900">
                    Confirm this home
                  </h3>
                </div>
                <div className="rounded-2xl bg-blue-50 px-3 py-2 text-right">
                  <p className="text-[11px] text-blue-700">Price</p>
                  <p className="text-lg font-bold leading-tight text-navy-900">
                    {price}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ["BHK", `${property.bedrooms || "-"}`],
                  ["Area", `${areaSqft || "-"} sq.ft`],
                  ["Type", propertyType],
                  ["Society", societyName || "Gurgaon"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[#F8FAFC] px-3 py-2">
                    <p className="text-[11px] text-navy-400">{label}</p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-navy-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-xl border border-navy-100 px-3 py-2">
                <p className="text-[11px] text-navy-400">Location</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-navy-900">
                  {societyLocality}
                </p>
              </div>

              <div className="mt-3 space-y-2">
                <Button
                  onClick={() => openLead("callback")}
                  className="h-9 w-full rounded-full bg-blue-600 text-sm hover:bg-blue-700"
                >
                  <Phone className="mr-2 h-4 w-4" /> Check availability
                </Button>
                <Button
                  onClick={() => openLead("enquiry")}
                  variant="outline"
                  className="h-9 w-full rounded-full border-blue-200 text-sm text-blue-700"
                >
                  <Mail className="mr-2 h-4 w-4" /> Ask details
                </Button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/919999988888?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center justify-center rounded-full border border-green-200 bg-green-50 px-3 text-xs font-semibold text-green-700 hover:bg-green-100"
                >
                  WhatsApp
                </a>
                <Button
                  onClick={() => openLead("callback")}
                  variant="outline"
                  className="h-9 rounded-full border-navy-200 text-xs text-navy-700"
                >
                  Similar options
                </Button>
              </div>

              {societySlug ? (
                <Button
                  asChild
                  variant="ghost"
                  className="mt-2 h-9 w-full rounded-full text-sm text-blue-700 hover:bg-blue-50"
                >
                  <Link to={`/society/${societySlug}`}>
                    View society first <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-navy-100 bg-white/95 px-3 py-2 shadow-[0_-10px_24px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => openLead("callback")} className="h-10 rounded-full bg-blue-600 px-2 text-xs font-bold hover:bg-blue-700">
            <Phone className="mr-1.5 h-4 w-4" /> Callback
          </Button>
          <a
            href={`https://wa.me/919999988888?text=${whatsappMessage}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-full border border-green-200 bg-green-50 px-2 text-xs font-bold text-green-700 hover:bg-green-100"
          >
            <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
          </a>
          <Button onClick={() => openLead("enquiry")} variant="outline" className="h-10 rounded-full border-blue-200 px-2 text-xs font-bold text-blue-700">
            Enquire
          </Button>
        </div>
      </div>

      {leadOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 px-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-navy-900">
                  {leadType === "callback" ? "Check property availability" : "Ask about this property"}
                </h3>
                <p className="mt-1 text-sm text-navy-500">
                  Share your details once. We will confirm availability, price and the next visit step.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLeadOpen(false)}
                className="rounded-full border border-navy-100 p-2 text-navy-500 hover:bg-navy-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {leadSuccess ? (
              <div className="mt-6 rounded-2xl bg-green-50 p-5 text-green-700">
                Request received. SocietyFlats will call you shortly with availability, visit options and next steps.
              </div>
            ) : (
              <form onSubmit={submitLead} className="mt-6 space-y-4">
                <input
                  required
                  value={leadForm.name}
                  onChange={(event) => setLeadForm({ ...leadForm, name: event.target.value })}
                  placeholder="Your name"
                  className="w-full rounded-2xl border border-navy-100 px-4 py-3 outline-none focus:border-blue-400"
                />
                <input
                  required
                  value={leadForm.phone}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) => setLeadForm({ ...leadForm, phone: cleanLeadPhone(event.target.value) })}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-2xl border border-navy-100 px-4 py-3 outline-none focus:border-blue-400"
                />
                <input
                  type="email"
                  value={leadForm.email}
                  onChange={(event) => setLeadForm({ ...leadForm, email: event.target.value })}
                  placeholder="Email optional"
                  className="w-full rounded-2xl border border-navy-100 px-4 py-3 outline-none focus:border-blue-400"
                />
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-navy-300">
                    Preferred callback time
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {preferredTimeChips.map((chip) => {
                      const active = leadForm.preferredTime === chip;

                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setLeadForm({ ...leadForm, preferredTime: chip })}
                          className={`h-9 rounded-full border px-2 text-[11px] font-bold transition ${
                            active
                              ? "border-blue-300 bg-blue-50 text-blue-700"
                              : "border-navy-100 bg-white text-navy-500 hover:bg-navy-50"
                          }`}
                        >
                          {chip}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <textarea
                  value={leadForm.message}
                  onChange={(event) => setLeadForm({ ...leadForm, message: event.target.value })}
                  placeholder="Message"
                  rows={4}
                  className="w-full rounded-2xl border border-navy-100 px-4 py-3 outline-none focus:border-blue-400"
                />

                {leadError ? (
                  <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{leadError}</div>
                ) : null}

                <Button disabled={leadSubmitting} className="w-full rounded-full bg-blue-600 hover:bg-blue-700">
                  {leadSubmitting ? "Submitting..." : "Submit enquiry"}
                </Button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
