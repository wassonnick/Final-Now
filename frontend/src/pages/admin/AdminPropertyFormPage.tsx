// C83 admin property form UX polish: compact sections, shorter inputs, reduced scrolling, owner/publish logic unchanged.
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Home,
  ImagePlus,
  Save,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";


function c13PublicationPayload(status: string) {
  const isLive = status === "Live";

  return {
    // Keep backend-approved status values. Laravel validates this field.
    status,
    publication_status: isLive ? "published" : "draft",
    is_published: isLive,
  };
}


import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { adminFetch, adminHeaders, uploadAdminImage } from "@/lib/adminApi";
import { API_BASE_URL } from "@/config/api";

const amenitiesList = [
  "Modular Kitchen",
  "Wardrobes",
  "AC",
  "Geyser",
  "Reserved Parking",
  "Servant Room",
  "Study Room",
  "Park Facing",
  "Corner Unit",
  "Renovated",
  "Pet Friendly",
];

const emptyProperty = {
  title: "",
  listingType: "Rent",
  propertyType: "Apartment",
  status: "Draft",
  society: "",
  societyId: "",
  locality: "",
  sector: "",
  city: "Gurugram",
  builder: "",
  price: "",
  rentAmount: "",
  salePrice: "",
  securityDeposit: "",
  maintenance: "",
  maintenanceIncluded: false,
  maintenanceAmount: "",
  bedrooms: "",
  bathrooms: "",
  balconies: "",
  areaSqft: "",
  carpetAreaSqft: "",
  floor: "",
  tower: "",
  unitNumber: "",
  facing: "North-East",
  furnishedStatus: "Semi Furnished",
  availableFrom: "",
  description: "",
  amenities: [] as string[],
  inheritedSocietyAmenities: [] as string[],
  propertyAmenities: [] as string[],
  images: [] as string[],
  featured: false,
  verified: false,
  ownerName: "",
  ownerPhone: "",
  sourceLeadId: "",
  listingSource: "societyflats_inventory",
  inventoryOwnerType: "societyflats",
  ownerAccountId: "",
  brokerAccountId: "",
  ownerListingId: "",
  submittedByUserId: "",
};

type ListingSourceType =
  | "societyflats_inventory"
  | "owner_inventory"
  | "broker_inventory"
  | "owner_submitted_listing"
  | "lead_converted";

type SocietyOption = {
  id?: number | string;
  name: string;
  slug?: string;
  sector?: string;
  locality?: string;
  city?: string;
  builder?: string;
  approvedAmenities?: string[];
  address?: string;
  publishedStatus?: string;
  status?: string;
  isPublished?: boolean;
};

type AccountOption = {
  id: number | string;
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
};

const listingSourceOptions: { value: ListingSourceType; label: string; helper: string }[] = [
  {
    value: "societyflats_inventory",
    label: "SocietyFlats Inventory",
    helper: "Admin-created inventory owned and managed by SocietyFlats.",
  },
  {
    value: "owner_inventory",
    label: "Assign to Owner/User",
    helper: "Privately attach this inventory to an existing user account.",
  },
  {
    value: "broker_inventory",
    label: "Assign to Broker",
    helper: "Privately attach this inventory to a broker account.",
  },
  {
    value: "owner_submitted_listing",
    label: "Link to Existing Owner Listing",
    helper: "Preserve the owner-submitted source while creating a property draft.",
  },
  {
    value: "lead_converted",
    label: "Link to Lead",
    helper: "Preserve the lead source for a converted inventory item.",
  },
];

function inventoryOwnerTypeFor(source: ListingSourceType) {
  if (source === "owner_inventory" || source === "owner_submitted_listing") return "owner";
  if (source === "broker_inventory") return "broker";
  if (source === "lead_converted") return "lead";
  return "societyflats";
}

function normalizeListingSource(data: any, sourceLeadIdParam = ""): ListingSourceType {
  const raw = String(data?.source_type || data?.sourceType || "").trim() as ListingSourceType;
  if (listingSourceOptions.some((item) => item.value === raw)) return raw;
  if (data?.owner_listing_id || data?.ownerListingId) return "owner_submitted_listing";
  if (data?.source_lead_id || data?.sourceLeadId || sourceLeadIdParam) return "lead_converted";
  return "societyflats_inventory";
}

function accountLabel(item: AccountOption) {
  return [item.name || `Account #${item.id}`, item.role, item.phone || item.email].filter(Boolean).join(" · ");
}

function extractSocieties(payload: any): SocietyOption[] {
  const raw =
    Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.data)
          ? payload.data.data
          : Array.isArray(payload?.societies)
            ? payload.societies
            : [];

  return raw
    .map((item: any) => ({
      id: item.id ?? item.value ?? item.society_id,
      name: item.name || item.label || item.society_name || "",
      slug: item.slug || "",
      sector: item.sector || "",
      locality: item.locality || "",
      city: item.city || "Gurugram",
      builder: item.builder || "",
      approvedAmenities: parseArray(item.approved_amenities || item.approvedAmenities || item.amenities).slice(0, 20),
      address: item.address || "",
      publishedStatus: item.published_status || (item.is_published ? "published" : "draft"),
      status: item.status || "",
      isPublished: Boolean(item.is_published),
    }))
    .filter((item: SocietyOption) => Boolean(item.name))
    .sort((a: SocietyOption, b: SocietyOption) => a.name.localeCompare(b.name));
}

function mergeSocietyOptions(existing: SocietyOption[], next: SocietyOption[]) {
  const map = new Map<string, SocietyOption>();

  [...existing, ...next].forEach((item) => {
    const key = String(item.id || item.name).toLowerCase();
    if (!map.has(key)) map.set(key, item);
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function societyLabel(item: SocietyOption) {
  const location = [item.sector, item.locality].filter(Boolean).join(", ");
  return location ? `${item.name} — ${location}` : item.name;
}

function parseArray(value: any): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function getSocietyName(data: any): string {
  if (typeof data?.society === "string") return data.society;
  if (data?.society?.name) return data.society.name;
  return data?.society_name || data?.societyName || "";
}

function getSocietyId(data: any): string {
  if (data?.society_id) return String(data.society_id);
  if (data?.societyId) return String(data.societyId);
  if (typeof data?.society === "object" && data?.society?.id) return String(data.society.id);
  return "";
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/^\/+/, "")
    .replace(/^property\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function fieldSummary(label: string, value: string) {
  return value ? `${label}: ${value}` : `${label}: missing`;
}

function isRentalListing(listingType: string) {
  return String(listingType || "").toLowerCase().includes("rent");
}

function isSaleListing(listingType: string) {
  const value = String(listingType || "").toLowerCase();
  return value.includes("sale") || value.includes("buy") || value.includes("sell") || value.includes("resale");
}

function pricingLabels(listingType: string) {
  if (isRentalListing(listingType)) {
    return {
      price: "Monthly Rent",
      pricePlaceholder: "₹85,000/mo",
      deposit: "Security Deposit",
      depositPlaceholder: "₹1,70,000",
      maintenance: "Maintenance",
      maintenancePlaceholder: "Included / ₹12,000",
    };
  }

  if (String(listingType || "").toLowerCase().includes("builder")) {
    return {
      price: "Asking Price",
      pricePlaceholder: "₹4.2 Cr",
      deposit: "Booking Amount",
      depositPlaceholder: "₹5,00,000",
      maintenance: "Maintenance",
      maintenancePlaceholder: "₹12,000 / Included",
    };
  }

  return {
    price: "Sale Price",
    pricePlaceholder: "₹4.2 Cr",
    deposit: "Token / Booking Amount",
    depositPlaceholder: "₹5,00,000",
    maintenance: "Maintenance",
    maintenancePlaceholder: "₹12,000 / Included",
  };
}

function isBuilderFloorListing(listingType: string) {
  return String(listingType || "").toLowerCase().includes("builder");
}

function requiredFieldHint(listingType: string) {
  if (isRentalListing(listingType)) {
    return "Drafts only need listing type, property type and a society/locality/sector. Publishing requires verified property details, society, price and final checks.";
  }

  if (isBuilderFloorListing(listingType)) {
    return "Builder floor drafts can start with locality or sector. Add area, price and verification before publishing.";
  }

  return "Sale drafts only need a society/locality/sector to start. Add total sale price and verification before publishing.";
}

function numberValue(value: string | number | undefined | null) {
  const cleaned = String(value ?? "").replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? String(parsed) : "";
}

function generatedPropertyTitle(property: typeof emptyProperty) {
  const listing = isRentalListing(property.listingType) ? "for Rent" : isSaleListing(property.listingType) ? "for Sale" : "Listing";
  const bhk = String(property.bedrooms || "").trim();
  const type = String(property.propertyType || "Apartment").trim();
  const location = [property.society, property.sector || property.locality || property.city].filter(Boolean).join(", ");
  return [bhk ? `${bhk} BHK` : "", type, location ? `in ${location}` : "in Gurugram", listing].filter(Boolean).join(" ");
}


function parseOwnerBhk(value: string) {
  const match = String(value || "").match(/(\d+(?:\.\d+)?)\s*bhk/i);
  return match ? match[1] : "";
}

function parseOwnerArea(value: string) {
  const match = String(value || "").match(/(\d[\d,]*(?:\.\d+)?)\s*(?:sq\.?\s*ft|sqft|sq\.?\s*yd|sqyd|yds|yards)/i);
  return match ? match[1].replace(/,/g, "") : "";
}

function inferOwnerListingType(requirement: string, listingTypeParam: string) {
  const explicit = String(listingTypeParam || "").trim();
  if (/rent/i.test(explicit)) return "Rent";
  if (/sale|sell|buy|resale/i.test(explicit)) return "Sale";

  const value = String(requirement || "").toLowerCase();
  if (value.includes("rent") || value.includes("rental")) return "Rent";
  if (value.includes("sale") || value.includes("sell") || value.includes("buy") || value.includes("resale")) return "Sale";

  return "Rent";
}

function titleCaseWords(value: string) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1) : "")
    .join(" ");
}

function cleanSocietyForTitle(value: string) {
  return titleCaseWords(
    String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function ownerDraftTitleFromParams(titleParam: string, propertyParam: string, society: string, listingType: string) {
  const bhk = parseOwnerBhk(propertyParam);
  const societyName = cleanSocietyForTitle(society);
  const flatType = listingType === "Rent" ? "Flat" : "Flat";

  if (bhk && societyName) return `${bhk} BHK ${flatType} in ${societyName}`;
  if (bhk) return `${bhk} BHK ${flatType} in Gurgaon`;
  if (societyName) return `${listingType === "Rent" ? "Rental" : "Sale"} ${flatType} in ${societyName}`;

  const title = String(titleParam || "").trim();
  return title || `Owner ${listingType === "Rent" ? "rental" : "sale"} listing draft`;
}

function ownerDraftDescription(params: {
  ownerName: string;
  ownerPhone: string;
  society: string;
  property: string;
  expectedPrice: string;
  requirement: string;
  sourceLeadId: string;
  listingType: string;
}) {
  const societyName = cleanSocietyForTitle(params.society) || "the selected society";
  const bhk = parseOwnerBhk(params.property);
  const area = parseOwnerArea(params.property);
  const listingWord = params.listingType === "Rent" ? "available for rent" : "available for sale";

  const lines = [
    `${bhk ? `${bhk} BHK flat` : "Flat"} in ${societyName}, Gurgaon, ${listingWord}.`,
    area ? `Approx. super area: ${area} sq.ft.` : "",
    params.expectedPrice
      ? `${params.listingType === "Rent" ? "Expected monthly rent" : "Expected sale price"}: ${params.expectedPrice}.`
      : "",
    "Owner details and availability are pending verification by SocietyFlats admin.",
    "Photos, furnishing, floor details and visit timing should be confirmed before publishing.",
  ].filter(Boolean);

  return lines.join("\\n");
}


function isOwnerDraftSource(sourceLeadId: string) {
  return Boolean(String(sourceLeadId || "").trim());
}

function ownerPublishQualityIssues(args: {
  sourceLeadId: string;
  verified: boolean;
  description: string;
  floor: string;
  furnishedStatus: string;
  securityDeposit: string;
  rentalListing: boolean;
}) {
  if (!isOwnerDraftSource(args.sourceLeadId)) return [];

  const issues: string[] = [];

  if (!args.verified) issues.push("Mark as verified after confirming property details.");
  if (!String(args.description || "").trim()) issues.push("Generate or write a clean public description.");
  if (!String(args.floor || "").trim()) issues.push("Confirm floor details before publishing.");
  if (!String(args.furnishedStatus || "").trim()) issues.push("Confirm furnishing status before publishing.");
  if (args.rentalListing && !String(args.securityDeposit || "").trim()) {
    issues.push("Confirm security deposit before publishing this rental listing.");
  }

  return issues;
}

function cleanPublicDescription(value: string) {
  const raw = String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  return raw
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
}

export function AdminPropertyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = Boolean(id);

  const [property, setProperty] = useState(emptyProperty);
  const [societyOptions, setSocietyOptions] = useState<SocietyOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([]);
  const [societiesLoading, setSocietiesLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<"Draft" | "Verification" | "Live" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadSocieties() {
      try {
        setSocietiesLoading(true);
        const response = await adminFetch("/admin/societies/lookup?q=");
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json?.message || "Failed to load societies");
        setSocietyOptions(extractSocieties(json));
      } catch (err) {
        console.error(err);
        setError("Unable to load society lookup. Existing selected society will still be preserved.");
      } finally {
        setSocietiesLoading(false);
      }
    }

    void loadSocieties();
  }, []);

  useEffect(() => {
    async function loadAccounts() {
      try {
        setAccountsLoading(true);
        const response = await adminFetch("/admin/accounts?per_page=100");
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json?.message || "Failed to load accounts");

        const raw = Array.isArray(json?.data) ? json.data : [];
        setAccountOptions(raw.map((item: any) => ({
          id: item.id,
          name: item.name,
          phone: item.phone,
          email: item.email,
          role: item.role,
        })).filter((item: AccountOption) => Boolean(item.id)));
      } catch (err) {
        console.error(err);
        setError("Unable to load account assignment search. You can still paste account IDs manually.");
      } finally {
        setAccountsLoading(false);
      }
    }

    void loadAccounts();
  }, []);


  useEffect(() => {
    const currentSociety = String((property as any).society || "").trim();
    const currentSocietyId = String((property as any).societyId || "").trim();

    if (currentSociety || !currentSocietyId || !societyOptions.length) return;

    const matched = societyOptions.find((item) => String(item.id || "") === currentSocietyId);
    if (matched?.name) {
      setProperty((current: any) => ({
        ...current,
        society: matched.name,
      }));
    }
  }, [(property as any).society, (property as any).societyId, societyOptions]);

  useEffect(() => {
    async function loadProperty() {
      if (!id) {
        setProperty(emptyProperty);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await adminFetch(`/admin/properties/${id}`);
        if (!response.ok) throw new Error("Failed to fetch property");

        const json = await response.json();
        const data = json.data || {};

        setProperty({
          title: data.title || "",
          listingType: data.listing_type || data.listingType || "Rent",
          propertyType: data.property_type || data.propertyType || "Apartment",
          status: data.status || "Draft",
          society: getSocietyName(data),
          societyId: getSocietyId(data),
          locality: data.locality || "",
          sector: data.sector || "",
          city: data.city || "Gurugram",
          builder: data.builder || data.society?.builder || "",
          price: data.price || "",
          rentAmount: data.rent_amount || data.rentAmount || "",
          salePrice: data.sale_price || data.salePrice || "",
          securityDeposit: data.security_deposit || data.securityDeposit || "",
          maintenance: data.maintenance || "",
          maintenanceIncluded: Boolean(data.maintenance_included || data.maintenanceIncluded),
          maintenanceAmount: data.maintenance_amount || data.maintenanceAmount || "",
          bedrooms: data.bedrooms || "",
          bathrooms: data.bathrooms || "",
          balconies: data.balconies || "",
          areaSqft: data.area_sqft || data.areaSqft || "",
          carpetAreaSqft: data.carpet_area_sqft || data.carpetAreaSqft || "",
          floor: data.floor || "",
          tower: data.tower || "",
          unitNumber: data.unit_number || data.unitNumber || "",
          facing: data.facing || "North-East",
          furnishedStatus: data.furnished_status || data.furnishedStatus || "Semi Furnished",
          availableFrom: data.available_from || data.availableFrom || "",
          description: data.description || "",
          amenities: parseArray(data.amenities),
          inheritedSocietyAmenities: parseArray(data.inherited_society_amenities || data.inheritedSocietyAmenities),
          propertyAmenities: parseArray(data.property_amenities || data.propertyAmenities || data.amenities),
          images: parseArray(data.images),
          featured: Boolean(data.featured),
          verified: Boolean(data.verified),
          ownerName: data.owner_name || "",
          ownerPhone: data.owner_phone || "",
          sourceLeadId: data.source_lead_id ? String(data.source_lead_id) : "",
          listingSource: normalizeListingSource(data, sourceLeadIdParam),
          inventoryOwnerType: data.inventory_owner_type || data.inventoryOwnerType || inventoryOwnerTypeFor(normalizeListingSource(data, sourceLeadIdParam)),
          ownerAccountId: data.owner_account_id ? String(data.owner_account_id) : "",
          brokerAccountId: data.broker_account_id ? String(data.broker_account_id) : "",
          ownerListingId: data.owner_listing_id ? String(data.owner_listing_id) : "",
          submittedByUserId: data.submitted_by_user_id ? String(data.submitted_by_user_id) : "",
        });
      } catch (err) {
        console.error(err);
        setError("Unable to load property.");
      } finally {
        setLoading(false);
      }
    }

    void loadProperty();
  }, [id]);

  const propertyImages = parseArray(property.images);
  const inheritedSocietyAmenities = parseArray((property as any).inheritedSocietyAmenities);
  const propertyAmenities = parseArray((property as any).propertyAmenities || property.amenities);

  const completion = useMemo(() => {
    const checks = [
      Boolean(property.title.trim()),
      Boolean(property.society || (property as any).locality || (property as any).sector),
      Boolean(property.price),
      Boolean(property.bedrooms),
      Boolean(property.areaSqft),
      Boolean(property.description.trim()),
    ];

    const done = checks.filter(Boolean).length;

    return {
      done,
      total: checks.length,
      percent: Math.round((done / checks.length) * 100),
    };
  }, [property]);


  const sourceLeadIdParam = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("sourceLeadId") || "";
  }, [location.search]);

  const ownerNameParam = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("ownerName") || "";
  }, [location.search]);

  const ownerPhoneParam = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("ownerPhone") || "";
  }, [location.search]);

  const sourceLeadId = String((property as any).sourceLeadId || sourceLeadIdParam);
  const ownerName = String((property as any).ownerName || ownerNameParam);
  const ownerPhone = String((property as any).ownerPhone || ownerPhoneParam);
  const listingSource = normalizeListingSource({
    source_type: (property as any).listingSource,
    source_lead_id: sourceLeadId,
    owner_listing_id: (property as any).ownerListingId,
  }) as ListingSourceType;
  const ownerAccountId = String((property as any).ownerAccountId || "");
  const brokerAccountId = String((property as any).brokerAccountId || "");
  const ownerListingId = String((property as any).ownerListingId || "");


  const labels = pricingLabels(property.listingType);
  const rentalListing = isRentalListing(property.listingType);
  const saleListing = isSaleListing(property.listingType);
  const builderFloorListing = isBuilderFloorListing(property.listingType);
  const validationHint = requiredFieldHint(property.listingType);

  const societyDropdownOptions = useMemo(() => {
    const currentSociety = String(property.society || "").trim();
    const currentSocietyId = String((property as any).societyId || "").trim();

    const existsByName = societyOptions.some((item) => item.name === currentSociety);
    const existsById = currentSocietyId
      ? societyOptions.some((item) => String(item.id || "") === currentSocietyId)
      : false;

    if (currentSociety && !existsByName) {
      return [
        {
          id: currentSocietyId || "current",
          name: currentSociety,
          status: "Current",
        },
        ...societyOptions,
      ];
    }

    if (!currentSociety && currentSocietyId && !existsById) {
      return [
        {
          id: currentSocietyId,
          name: `Saved society #${currentSocietyId}`,
          status: "Current",
        },
        ...societyOptions,
      ];
    }

    return societyOptions;
  }, [property.society, (property as any).societyId, societyOptions]);


  const publishValidationError = useMemo(() => {
    const title = String(property.title || "").trim();
    const society = String(property.society || "").trim();
    const locality = String(property.locality || "").trim();
    const price = String(property.price || (rentalListing ? (property as any).rentAmount : (property as any).salePrice) || "").trim();
    const deposit = String(property.securityDeposit || "").trim();
    const area = String(property.areaSqft || "").trim();

    if (!title) return "Property title is required before publishing.";
    if (!locality) return "Locality is required before publishing.";
    if (!price) return `${labels.price} is required before publishing.`;
    if (!society) return "A published society is required before publishing.";
    if (!property.verified) return "Verify the property details before publishing.";

    if (rentalListing) {
      if (!society) return "Society is required before publishing a rent listing.";
      if (!deposit) return "Security deposit is required before publishing a rent listing.";
    }

    if (saleListing && !builderFloorListing && !society) {
      return "Society is required before publishing a sale/resale listing.";
    }

    if (builderFloorListing && !area) {
      return "Area is required before publishing a builder floor listing.";
    }

    return "";
  }, [
    property.title,
    property.society,
    property.locality,
    property.price,
    property.securityDeposit,
    property.areaSqft,
    property.verified,
    ownerName,
    ownerPhone,
    labels.price,
    rentalListing,
    saleListing,
    builderFloorListing,
  ]);


  const ownerQualityIssues = useMemo(() => ownerPublishQualityIssues({
    sourceLeadId,
    verified: Boolean(property.verified),
    description: property.description,
    floor: property.floor,
    furnishedStatus: property.furnishedStatus,
    securityDeposit: property.securityDeposit,
    rentalListing,
  }), [
    sourceLeadId,
    property.verified,
    property.description,
    property.floor,
    property.furnishedStatus,
    property.securityDeposit,
    rentalListing,
  ]);

  const ownerPublishBlocked = sourceLeadId && ownerQualityIssues.length > 0;

  const applySocietyOption = (option?: SocietyOption, fallbackName = "") => {
    setProperty((current: any) => ({
      ...current,
      society: option?.name || fallbackName,
      societyId: option?.id ? String(option.id) : "",
      sector: option?.sector || current.sector || "",
      locality: option?.locality || current.locality || "",
      city: option?.city || current.city || "Gurugram",
      builder: option?.builder || current.builder || "",
      inheritedSocietyAmenities: option?.approvedAmenities?.length ? option.approvedAmenities : current.inheritedSocietyAmenities,
    }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const updateSocietySearch = async (value: string) => {
    const exactMatch = societyOptions.find((item) => item.name.toLowerCase() === value.trim().toLowerCase());
    if (exactMatch) {
      applySocietyOption(exactMatch, value);
      return;
    }

    setProperty((current: any) => ({ ...current, society: value, societyId: "" }));
    if (value.trim().length >= 2) {
      try {
        const response = await adminFetch(`/admin/societies/lookup?q=${encodeURIComponent(value.trim())}`);
        const json = await response.json().catch(() => ({}));
        if (response.ok) setSocietyOptions((current) => mergeSocietyOptions(current, extractSocieties(json)));
      } catch {
        // Locality free-text still works even if lookup fails.
      }
    }
    if (error) setError("");
    if (success) setSuccess("");
  };

  const updateField = (key: string, value: any) => {
    setProperty((current: any) => {
      const next = { ...current, [key]: value };
      if (key === "rentAmount") next.price = value;
      if (key === "salePrice") next.price = value;
      if (key === "propertyAmenities") next.amenities = value;
      return next;
    });
    if (error) setError("");
    if (success) setSuccess("");
  };

  const toggleAmenity = (amenity: string, checked: boolean | "indeterminate") => {
    setProperty((current: any) => {
      const enabled = checked === true;
      const currentAmenities = parseArray(current.propertyAmenities || current.amenities);
      const nextAmenities = enabled
        ? Array.from(new Set([...currentAmenities, amenity]))
        : currentAmenities.filter((item: string) => item !== amenity);

      return {
        ...current,
        propertyAmenities: nextAmenities,
        amenities: nextAmenities,
      };
    });
  };

  const readImages = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));

    if (!files.length) {
      setError("Please select JPG, PNG or WebP images only.");
      return;
    }

    try {
      const images = await Promise.all(files.map((file) => uploadAdminImage(file, "properties")));
      setProperty((current: any) => ({
        ...current,
        images: [...parseArray(current.images), ...images].slice(0, 8),
      }));
      setError("");
      setSuccess(`${images.length} image${images.length > 1 ? "s" : ""} added.`);
    } catch {
      setError("Could not upload the selected images. Please try again.");
    }
  };

  const handleImages = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) await readImages(event.target.files);
    event.target.value = "";
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files) await readImages(event.dataTransfer.files);
  };

  const removeImage = (image: string) => {
    setProperty((current: any) => ({
      ...current,
      images: parseArray(current.images).filter((item) => item !== image),
    }));
  };

  const continueWithoutPhotos = () => {
    setSuccess("Continuing without photos. Published listings will show the SocietyFlats “Photos under verification” placeholder until real photos are uploaded.");
    setError("");
  };

  const validate = () => {
    const listingType = String(property.listingType || "").trim();
    const propertyType = String((property as any).propertyType || "").trim();
    const hasLocation = [property.society, property.locality, (property as any).sector].some((item) => String(item || "").trim());

    if (!listingType) return "Listing type is required.";
    if (!propertyType) return "Property type is required.";
    if (!hasLocation) return "Add a society, locality or sector to save the draft.";

    return "";
  };

  const handleSave = async (status: string) => {
    const title = String(property.title || "").trim() || generatedPropertyTitle(property);
    const society = String(property.society || "").trim();
    const locality = String(property.locality || "").trim();
    const price = String(property.price || (rentalListing ? (property as any).rentAmount : (property as any).salePrice) || "").trim();
    const deposit = String(property.securityDeposit || "").trim();
    const area = String(property.areaSqft || "").trim();

    const listingTypeValue = String(property.listingType || "").toLowerCase();
    const isRent = listingTypeValue.includes("rent");
    const isBuilderFloor = listingTypeValue.includes("builder");
    const isSaleLike =
      listingTypeValue.includes("sale") ||
      listingTypeValue.includes("buy") ||
      listingTypeValue.includes("sell") ||
      listingTypeValue.includes("resale");

    const priceLabel = isRent
      ? "Monthly rent"
      : isBuilderFloor
        ? "Asking price"
        : "Sale price";

    let validationError = "";

    if (!locality && !String((property as any).sector || "").trim() && !society) {
      validationError = "Locality is required.";
    } else if (!price) {
      validationError = `${priceLabel} is required.`;
    } else if (isRent && !society) {
      validationError = "Society is required for rent listings.";
    } else if (isRent && !deposit) {
      validationError = "Security deposit is required for rent listings.";
    } else if (isSaleLike && !isBuilderFloor && !society) {
      validationError = "Society is required for sale/resale listings.";
    } else if (isBuilderFloor && !area) {
      validationError = "Area is required for builder floor listings.";
    }

    if (status === "Live" && publishValidationError) {
      setError(publishValidationError);
      setSuccess("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (status === "Live" && ownerPublishBlocked) {
      setError(`Owner draft publish blocked: ${ownerQualityIssues[0]}`);
      setSuccess("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (status === "Live" && validationError) {
      setError(validationError);
      setSuccess("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (status !== "Live") {
      const draftError = validate();
      if (draftError) {
        setError(draftError);
        setSuccess("");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    if (status === "Verification" && !title) {
      setError("Property title is required to mark as verification.");
      setSuccess("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSaving(true);
      setSaveMode(status as "Draft" | "Verification" | "Live");
      setError("");

      const uniqueSlug = sourceLeadId && !isEdit
        ? `${makeSlug(title)}-owner-lead-${sourceLeadId}-${Date.now()}`
        : makeSlug(title);
      const selectedSource = listingSource;
      const selectedInventoryOwnerType = inventoryOwnerTypeFor(selectedSource);

      const payload = {
        title,
        slug: uniqueSlug,
        listing_type: property.listingType,
        status,
        society: property.society,
        society_id: (property as any).societyId || undefined,
        region_id: (property as any).regionId || undefined,
        city_id: (property as any).cityId || undefined,
        zone_id: (property as any).zoneId || undefined,
        locality_id: (property as any).localityId || undefined,
        property_type: (property as any).propertyType || "Apartment",
        property_category: (property as any).propertyCategory || undefined,
        transaction_type: (property as any).transactionType || undefined,
        source_type: selectedSource,
        inventory_owner_type: selectedInventoryOwnerType,
        owner_account_id: selectedSource === "owner_inventory" ? Number(ownerAccountId) : null,
        broker_account_id: selectedSource === "broker_inventory" ? Number(brokerAccountId) : null,
        owner_listing_id: selectedSource === "owner_submitted_listing" ? Number(ownerListingId) : null,
        submitted_by_user_id: selectedSource === "owner_inventory" ? Number(ownerAccountId) : null,
        source_lead_id: selectedSource === "lead_converted" && sourceLeadId ? Number(sourceLeadId) : null,
        owner_name: ownerName || undefined,
        owner_phone: ownerPhone || undefined,
        owner_verification_status: status === "Live" ? "Verified" : sourceLeadId ? "Draft Created" : undefined,
        ...c13PublicationPayload(status),
        owner_notes: sourceLeadId
          ? [
              ownerName ? `Owner: ${ownerName}` : "",
              ownerPhone ? `Phone: ${ownerPhone}` : "",
              sourceLeadId ? `Source lead ID: ${sourceLeadId}` : "",
            ]
              .filter(Boolean)
              .join("\n")
          : undefined,
        locality: property.locality,
        sector: (property as any).sector || undefined,
        city: (property as any).city || "Gurugram",
        tower: (property as any).tower || undefined,
        unit_number: (property as any).unitNumber || undefined,
        price: price || "On Request",
        rent_amount: numberValue((property as any).rentAmount || (rentalListing ? price : "")) || undefined,
        rent_unit: "monthly",
        sale_price: numberValue((property as any).salePrice || (saleListing ? price : "")) || undefined,
        sale_price_unit: "total",
        security_deposit: property.securityDeposit,
        maintenance: property.maintenance,
        maintenance_included: Boolean((property as any).maintenanceIncluded),
        maintenance_amount: numberValue((property as any).maintenanceAmount) || undefined,
        maintenance_unit: "monthly",
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        balconies: (property as any).balconies || undefined,
        area_sqft: property.areaSqft,
        carpet_area_sqft: (property as any).carpetAreaSqft || undefined,
        floor: property.floor,
        facing: property.facing,
        furnished_status: property.furnishedStatus,
        available_from: (property as any).availableFrom || undefined,
        description: cleanPublicDescription(property.description),
        amenities: propertyAmenities,
        inherited_society_amenities: inheritedSocietyAmenities,
        property_amenities: propertyAmenities,
        images: parseArray(property.images),
        featured: Boolean(property.featured),
        verified: status === "Verification" ? true : Boolean(property.verified),
      };

      const response = await adminFetch(isEdit ? `/admin/properties/${id}` : "/admin/properties", {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...adminHeaders(),
        },
        body: JSON.stringify(
          isEdit
            ? (() => {
                // C13 slug edit fix: Laravel currently rejects the existing slug as duplicate on update/publish.
                // Do not resend slug while editing; backend should keep the current slug.
                const updatePayload = { ...(payload as any) };
                delete updatePayload.slug;
                return updatePayload;
              })()
            : payload,
        ),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error(json);
        throw new Error(json?.message || "Save failed");
      }

      setSuccess(
        sourceLeadId && status === "Draft"
          ? `Draft property saved from Owner CRM lead #${sourceLeadId}.`
          : status === "Draft"
            ? "Property draft saved."
            : "Property listing saved and published.",
      );

      if (sourceLeadId && status === "Draft") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        navigate("/admin/properties");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not save the property. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
      setSaveMode(null);
    }
  };

  const generateDescription = () => {
    const listingKind = rentalListing
      ? "available for rent"
      : saleListing
        ? "available for sale"
        : "available in Gurgaon";

    const societyName = String(property.society || "").trim();
    const localityName = String(property.locality || "").trim();
    const bhk = String(property.bedrooms || "").trim();
    const area = String(property.areaSqft || "").trim();
    const priceValue = String(property.price || "").trim();
    const furnishing = String(property.furnishedStatus || "").trim();
    const floor = String(property.floor || "").trim();

    const titleLine = [
      bhk ? `${bhk} BHK flat` : "Flat",
      societyName ? `in ${societyName}` : localityName ? `in ${localityName}` : "in Gurgaon",
      listingKind,
    ].join(" ");

    const sizeLine = area
      ? `Spread across approx. ${area} sq.ft., this society-first listing is suitable for families looking for verified homes in Gurgaon.`
      : "This society-first listing is suitable for families looking for verified homes in Gurgaon.";

    const priceLine = priceValue
      ? rentalListing
        ? `Expected monthly rent is ${priceValue}.`
        : `Expected sale price is ${priceValue}.`
      : "";

    const detailLine = [
      furnishing ? `${furnishing} furnishing` : "",
      floor ? `floor: ${floor}` : "",
      property.maintenance ? `maintenance: ${property.maintenance}` : "",
      property.securityDeposit && rentalListing ? `security deposit: ${property.securityDeposit}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    const amenityLine = parseArray(property.amenities).length
      ? `Key amenities include ${parseArray(property.amenities).slice(0, 5).join(", ")}.`
      : "Society amenities, photos and final availability should be verified before publishing.";

    const seoDescription = [
      `${titleLine}.`,
      sizeLine,
      priceLine,
      detailLine ? `Additional details: ${detailLine}.` : "",
      amenityLine,
      "SocietyFlats admin should verify ownership, photos, furnishing, price and visit availability before making this listing live.",
    ]
      .filter(Boolean)
      .join("\n\n");

    updateField("description", seoDescription);
  };

  useEffect(() => {
    if (isEdit) return;

    const params = new URLSearchParams(location.search);
    const ownerName = params.get("ownerName") || "";
    const ownerPhone = params.get("ownerPhone") || "";
    const society = params.get("society") || "";
    const propertyParam = params.get("property") || "";
    const expectedPrice = params.get("expectedPrice") || "";
    const requirement = params.get("requirement") || "";
    const sourceLeadId = params.get("sourceLeadId") || "";
    const listingTypeParam = params.get("listingType") || "";
    const titleParam = params.get("title") || "";

    if (!ownerName && !ownerPhone && !society && !propertyParam && !expectedPrice && !sourceLeadId) return;

    const inferredListingType = inferOwnerListingType(requirement, listingTypeParam);
    const parsedBhk = parseOwnerBhk(propertyParam);
    const parsedArea = parseOwnerArea(propertyParam);
    const draftTitle = ownerDraftTitleFromParams(titleParam, propertyParam, society, inferredListingType);

    setProperty((current) => ({
      ...current,
      title: draftTitle,
      listingType: inferredListingType,
      status: current.status || "Draft",
      society: current.society || society,
      locality: current.locality || "Gurgaon",
      price: current.price || expectedPrice,
      bedrooms: current.bedrooms || parsedBhk,
      bathrooms: current.bathrooms || parsedBhk,
      areaSqft: parsedArea || current.areaSqft,
      ownerName: current.ownerName || ownerName,
      ownerPhone: current.ownerPhone || ownerPhone,
      sourceLeadId: current.sourceLeadId || sourceLeadId,
      listingSource: sourceLeadId ? "lead_converted" : current.listingSource,
      inventoryOwnerType: sourceLeadId ? "lead" : current.inventoryOwnerType,
      description: ownerDraftDescription({
        ownerName,
        ownerPhone,
        society,
        property: propertyParam,
        expectedPrice,
        requirement,
        sourceLeadId,
        listingType: inferredListingType,
      }).replace(/\\n/g, "\n"),
    }));
  }, [isEdit, location.search]);

  if (loading) {
    return (
      <AdminLayout title={isEdit ? "Edit Property" : "Add Property"}>
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-slate-500">Loading property...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isEdit ? "Edit Property" : "Add Property"}
      subtitle="Create society-first listings with clean details, media and publishing controls"
    >
      <div className="pb-24 lg:pb-0">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Button asChild variant="ghost" className="w-fit rounded-full text-slate-600">
            <Link to="/admin/properties">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Properties
            </Link>
          </Button>

          <div className="hidden gap-3 lg:flex">
            <Button
              type="button"
              onClick={() => handleSave("Draft")}
              disabled={saving}
              variant="outline"
              className="h-10 rounded-full border-slate-200 text-sm font-bold"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving && saveMode === "Draft" ? "Saving..." : "Save Draft"}
            </Button>

            <Button
              type="button"
              onClick={() => handleSave("Verification")}
              disabled={saving}
              variant="outline"
              className="h-10 rounded-full border-blue-200 text-sm font-bold text-blue-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {saving && saveMode === "Verification" ? "Saving..." : "Save & Mark Verified"}
            </Button>

            <Button
              type="button"
              onClick={() => handleSave("Live")}
              disabled={saving || Boolean(publishValidationError) || Boolean(ownerPublishBlocked)}
              className="rounded-full bg-blue-600 px-5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {saving && saveMode === "Live" ? "Publishing..." : "Publish Listing"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-3 rounded-xl bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        ) : null}

        {sourceLeadId ? (
          <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-500">
                  Owner draft pipeline
                </p>
                <p className="mt-1 font-semibold text-blue-950">
                  This draft property was started from owner lead #{sourceLeadId}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.12em]">
                  <span className="rounded-full bg-white px-3 py-1 text-blue-700">1. Verify owner</span>
                  <span className="rounded-full bg-white px-3 py-1 text-blue-700">2. Add photos</span>
                  <span className="rounded-full bg-white px-3 py-1 text-blue-700">3. Save draft</span>
                  <span className="rounded-full bg-white px-3 py-1 text-emerald-700">4. Publish when ready</span>
                </div>
              </div>
              <Link
                to={`/admin/leads/${sourceLeadId}`}
                className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                View source lead
              </Link>
            </div>
          </div>
        ) : null}

        {publishValidationError ? (
          <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-medium text-blue-700">
            Publish blocked: {publishValidationError}
          </div>
        ) : null}

        {sourceLeadId ? (
          <div className={`mb-5 rounded-2xl border px-5 py-4 text-sm shadow-sm ${
            ownerQualityIssues.length
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}>
            <p className="font-black uppercase tracking-[0.14em]">
              Owner draft quality check
            </p>
            {ownerQualityIssues.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 font-medium">
                {ownerQualityIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 font-semibold">
                Ready to publish after final admin review.
              </p>
            )}
          </div>
        ) : null}

        <section className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
            <p className="text-sm font-medium text-slate-500">Listing readiness</p>
            <div className="mt-3 flex items-end justify-between">
              <p className="text-3xl font-bold text-slate-950">{completion.percent}%</p>
              <p className="text-sm text-blue-600">
                {completion.done}/{completion.total} fields
              </p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${completion.percent}%` }}
              />
            </div>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Mode</p>
            <p className="mt-2 text-xl font-bold text-slate-950">{property.listingType}</p>
            <p className="mt-1.5 text-xs font-semibold text-blue-600">
              {rentalListing ? "Rental listing" : saleListing ? "Sale / resale listing" : property.status}
            </p>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Images</p>
            <p className="mt-2 text-xl font-bold text-slate-950">{propertyImages.length}</p>
              <p className="mt-1.5 text-xs font-semibold text-blue-600">
                {propertyImages.length ? "Max 8 images" : "Placeholder used until photos are verified"}
              </p>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="space-y-4 md:space-y-5">
            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="flex items-start gap-3">
                <Home className="mt-1 h-5 w-5 text-blue-600" />
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-950">Basic Details</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                    Keep the title clear and society-first for better enquiry quality.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="md:col-span-2 text-sm font-medium text-slate-700">
                  Property Title <span className="text-rose-500">*</span>
                  <Input
                    value={property.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="3 BHK in DLF Crest with park view"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Listing Type
                  <select
                    value={property.listingType}
                    onChange={(event) => updateField("listingType", event.target.value)}
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  >
                    <option>Rent</option>
                    <option>Sale</option>
                    <option>Buy / Resale</option>
                    <option>Sell Listing</option>
                    <option>Builder Floor</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Property Type
                  <select
                    value={(property as any).propertyType}
                    onChange={(event) => updateField("propertyType", event.target.value)}
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  >
                    <option>Apartment</option>
                    <option>Builder Floor</option>
                    <option>Villa</option>
                    <option>Penthouse</option>
                    <option>Studio</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Status
                  <select
                    value={property.status}
                    onChange={(event) => updateField("status", event.target.value)}
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  >
                    <option>Live</option>
                    <option>Verification</option>
                    <option>Draft</option>
                    <option>Archived</option>
                  </select>
                </label>

                <label className="md:col-span-2 text-sm font-medium text-slate-700">
                  Society
                  <Input
                    list="admin-property-societies"
                    value={property.society}
                    onChange={(event) => { void updateSocietySearch(event.target.value); }}
                    onBlur={() => {
                      const selectedOption = societyDropdownOptions.find((item) => item.name.toLowerCase() === String(property.society || "").trim().toLowerCase());
                      if (selectedOption) applySocietyOption(selectedOption, property.society);
                    }}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder={societiesLoading ? "Loading societies..." : "Start typing society name"}
                  />
                  <datalist id="admin-property-societies">
                    {societyDropdownOptions.map((item) => (
                      <option key={`${item.id || item.name}-${item.name}`} value={item.name} label={societyLabel(item)} />
                    ))}
                  </datalist>
                  <span className="mt-1 block text-xs font-normal text-slate-400">
                    {societiesLoading
                      ? "Fetching societies..."
                      : societyOptions.length
                        ? `${societyOptions.length} society matches loaded. Selecting one autofills location and society amenities.`
                        : "Type a new society/locality and save as draft."}
                  </span>
                </label>

                <div className="md:col-span-2 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">Assign Listing Source</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Admin-created properties are treated as SocietyFlats inventory unless assigned to an owner, broker, lead, or submitted listing.
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-blue-700">
                      {listingSourceOptions.find((item) => item.value === listingSource)?.label || "SocietyFlats Inventory"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">
                      Listing Source
                      <select
                        value={listingSource}
                        onChange={(event) => {
                          const nextSource = event.target.value as ListingSourceType;
                          setProperty((current: any) => ({
                            ...current,
                            listingSource: nextSource,
                            inventoryOwnerType: inventoryOwnerTypeFor(nextSource),
                            ownerAccountId: nextSource === "owner_inventory" ? current.ownerAccountId : "",
                            brokerAccountId: nextSource === "broker_inventory" ? current.brokerAccountId : "",
                            ownerListingId: nextSource === "owner_submitted_listing" ? current.ownerListingId : "",
                            sourceLeadId: nextSource === "lead_converted" ? current.sourceLeadId || sourceLeadIdParam : "",
                            submittedByUserId: nextSource === "owner_inventory" ? current.ownerAccountId : "",
                          }));
                        }}
                        className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      >
                        {listingSourceOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-xs font-normal text-slate-400">
                        {listingSourceOptions.find((item) => item.value === listingSource)?.helper}
                      </span>
                    </label>

                    {listingSource === "owner_inventory" ? (
                      <label className="text-sm font-medium text-slate-700">
                        Owner/User Account
                        <Input
                          list="admin-property-owner-accounts"
                          value={ownerAccountId}
                          onChange={(event) => updateField("ownerAccountId", event.target.value)}
                          className="mt-2 h-10 rounded-xl border-slate-200 bg-white"
                          placeholder={accountsLoading ? "Loading accounts..." : "Type or paste account ID"}
                        />
                        <datalist id="admin-property-owner-accounts">
                          {accountOptions.filter((item) => item.role !== "broker").map((item) => (
                            <option key={`owner-${item.id}`} value={String(item.id)} label={accountLabel(item)} />
                          ))}
                        </datalist>
                        <span className="mt-1 block text-xs font-normal text-slate-400">Private admin link only; no owner details are exposed publicly.</span>
                      </label>
                    ) : null}

                    {listingSource === "broker_inventory" ? (
                      <label className="text-sm font-medium text-slate-700">
                        Broker Account
                        <Input
                          list="admin-property-broker-accounts"
                          value={brokerAccountId}
                          onChange={(event) => updateField("brokerAccountId", event.target.value)}
                          className="mt-2 h-10 rounded-xl border-slate-200 bg-white"
                          placeholder={accountsLoading ? "Loading accounts..." : "Type or paste broker account ID"}
                        />
                        <datalist id="admin-property-broker-accounts">
                          {accountOptions.filter((item) => item.role === "broker").map((item) => (
                            <option key={`broker-${item.id}`} value={String(item.id)} label={accountLabel(item)} />
                          ))}
                        </datalist>
                        <span className="mt-1 block text-xs font-normal text-slate-400">Public CTA still routes through SocietyFlats lead capture.</span>
                      </label>
                    ) : null}

                    {listingSource === "owner_submitted_listing" ? (
                      <label className="text-sm font-medium text-slate-700">
                        Owner Listing ID
                        <Input
                          value={ownerListingId}
                          onChange={(event) => updateField("ownerListingId", event.target.value)}
                          className="mt-2 h-10 rounded-xl border-slate-200 bg-white"
                          placeholder="Existing owner listing ID"
                          inputMode="numeric"
                        />
                        <span className="mt-1 block text-xs font-normal text-slate-400">Use this only when converting or linking an owner-submitted listing.</span>
                      </label>
                    ) : null}

                    {listingSource === "lead_converted" ? (
                      <label className="text-sm font-medium text-slate-700">
                        Lead ID
                        <Input
                          value={sourceLeadId}
                          onChange={(event) => updateField("sourceLeadId", event.target.value)}
                          className="mt-2 h-10 rounded-xl border-slate-200 bg-white"
                          placeholder="Existing lead ID"
                          inputMode="numeric"
                        />
                        <span className="mt-1 block text-xs font-normal text-slate-400">Lead-converted inventory keeps the source lead link privately.</span>
                      </label>
                    ) : null}
                  </div>
                </div>

                <label className="text-sm font-medium text-slate-700">
                  Owner / authorised broker <span className="text-xs font-normal text-slate-400">(optional private note)</span>
                  <Input
                    value={ownerName}
                    onChange={(event) => updateField("ownerName", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="Internal contact name"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Contact phone <span className="text-xs font-normal text-slate-400">(optional private note)</span>
                  <Input
                    value={ownerPhone}
                    onChange={(event) => updateField("ownerPhone", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="10-digit mobile number"
                  />
                  <span className="mt-1 block text-xs font-normal text-slate-400">Stored for admin verification; not shown publicly.</span>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Sector
                  <Input
                    value={(property as any).sector}
                    onChange={(event) => updateField("sector", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="Sector 54"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Locality
                  <Input
                    value={property.locality}
                    onChange={(event) => updateField("locality", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="Golf Course Road"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  City
                  <Input
                    value={(property as any).city}
                    onChange={(event) => updateField("city", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="Gurugram"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Builder / Developer
                  <Input
                    value={(property as any).builder}
                    onChange={(event) => updateField("builder", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="Autofills from society when available"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-lg font-bold tracking-tight text-slate-950">
                {rentalListing ? "Rent & Configuration" : "Sale Price & Configuration"}
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                {rentalListing
                  ? "Add rent, deposit and configuration details for rental inventory."
                  : "Add asking price, booking/token amount and configuration details for sale inventory."}
              </p>
              <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-semibold leading-5 text-blue-700 md:text-sm">
                {validationHint}
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {rentalListing ? (
                  <label className="text-sm font-medium text-slate-700">
                    Monthly Rent
                    <Input
                      value={(property as any).rentAmount}
                      onChange={(event) => updateField("rentAmount", event.target.value)}
                      className="mt-2 h-10 rounded-xl border-slate-200"
                      placeholder="85000"
                      inputMode="numeric"
                    />
                    <span className="mt-1 block text-xs font-normal text-slate-400">Always monthly. No unit dropdown.</span>
                  </label>
                ) : null}

                {saleListing ? (
                  <label className="text-sm font-medium text-slate-700">
                    Total Sale Price
                    <Input
                      value={(property as any).salePrice}
                      onChange={(event) => updateField("salePrice", event.target.value)}
                      className="mt-2 h-10 rounded-xl border-slate-200"
                      placeholder="42500000"
                      inputMode="numeric"
                    />
                    <span className="mt-1 block text-xs font-normal text-slate-400">Total price only. Price / sq.ft. is calculated from sale price and area.</span>
                  </label>
                ) : null}

                <label className="text-sm font-medium text-slate-700">
                  Display Price
                  <Input
                    value={property.price}
                    onChange={(event) => updateField("price", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder={labels.pricePlaceholder}
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  {labels.deposit} {rentalListing ? <span className="text-rose-500">*</span> : <span className="text-xs font-normal text-slate-400">(optional)</span>}
                  <Input
                    value={property.securityDeposit}
                    onChange={(event) => updateField("securityDeposit", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder={labels.depositPlaceholder}
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Maintenance Amount
                  <Input
                    value={(property as any).maintenanceAmount}
                    onChange={(event) => updateField("maintenanceAmount", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="12000"
                    inputMode="numeric"
                  />
                  <span className="mt-1 block text-xs font-normal text-slate-400">Monthly maintenance.</span>
                </label>

                <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
                  <Checkbox
                    checked={(property as any).maintenanceIncluded}
                    onCheckedChange={(checked) => updateField("maintenanceIncluded", checked === true)}
                  />
                  Maintenance included
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Bedrooms
                  <Input
                    value={property.bedrooms}
                    onChange={(event) => updateField("bedrooms", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Bathrooms
                  <Input
                    value={property.bathrooms}
                    onChange={(event) => updateField("bathrooms", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Area (sq ft) {builderFloorListing ? <span className="text-rose-500">*</span> : null}
                  <Input
                    value={property.areaSqft}
                    onChange={(event) => updateField("areaSqft", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="2200"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Carpet Area (sq ft)
                  <Input
                    value={(property as any).carpetAreaSqft}
                    onChange={(event) => updateField("carpetAreaSqft", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="1650"
                    inputMode="numeric"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Tower / Block
                  <Input
                    value={(property as any).tower}
                    onChange={(event) => updateField("tower", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="Tower A"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Unit Number
                  <Input
                    value={(property as any).unitNumber}
                    onChange={(event) => updateField("unitNumber", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="Private, admin only"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Floor
                  <Input
                    value={property.floor}
                    onChange={(event) => updateField("floor", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="12 of 28"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Facing
                  <select
                    value={property.facing}
                    onChange={(event) => updateField("facing", event.target.value)}
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  >
                    <option>North-East</option>
                    <option>East</option>
                    <option>North</option>
                    <option>South</option>
                    <option>West</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Furnished Status
                  <select
                    value={property.furnishedStatus}
                    onChange={(event) => updateField("furnishedStatus", event.target.value)}
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  >
                    <option>Semi Furnished</option>
                    <option>Fully Furnished</option>
                    <option>Unfurnished</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Balconies
                  <Input
                    value={(property as any).balconies}
                    onChange={(event) => updateField("balconies", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="2"
                    inputMode="numeric"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Available From
                  <Input
                    type="date"
                    value={(property as any).availableFrom}
                    onChange={(event) => updateField("availableFrom", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-950">Description & Amenities</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                    Write a clean, society-first description for buyers and tenants.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateDescription}
                  className="w-fit rounded-full border-blue-200 text-blue-700"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate copy
                </Button>
              </div>

              <label className="mt-5 block text-sm font-medium text-slate-700">
                Description
                <textarea
                  value={property.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  className="mt-2 min-h-32 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  placeholder="Describe the property, society, view, floor, furnishing, nearby offices and ideal tenant/buyer profile."
                />
              </label>

              <div className="mt-4">
                <p className="text-sm font-medium text-slate-700">Included from society</p>
                {inheritedSocietyAmenities.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {inheritedSocietyAmenities.slice(0, 16).map((item) => (
                      <span key={item} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Select a society to autofill approved society amenities. Keep property-specific features separate below.
                  </p>
                )}
              </div>

              <div className="mt-5">
                <p className="text-sm font-medium text-slate-700">Property-specific amenities</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {amenitiesList.map((item) => (
                    <label
                      key={item}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                    >
                      <Checkbox
                        checked={propertyAmenities.includes(item)}
                        onCheckedChange={(checked) => toggleAmenity(item, checked)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4 md:space-y-5">
            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-base font-bold tracking-tight text-slate-950">Media</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                Upload real property photos when available. If none are uploaded, published listings use a SocietyFlats placeholder marked “Photos under verification.”
              </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={continueWithoutPhotos}
                    className="rounded-full border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Use verification placeholder
                  </Button>
                </div>

              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <p className="mt-3 font-medium text-slate-950">Drop property photos here</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">JPG, PNG or WebP.</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload Images
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImages}
                  className="hidden"
                />
              </div>

              {propertyImages.length ? (
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  {propertyImages.map((image) => (
                    <div key={image} className="group relative overflow-hidden rounded-xl border border-slate-200">
                      <img src={image} alt="Property preview" className="h-28 w-full object-cover" />
                      <button
                        type="button"
                        aria-label="Remove image"
                        onClick={() => removeImage(image)}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-base font-bold tracking-tight text-slate-950">Publishing</h2>
              <div className="mt-3 space-y-2.5">
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                  <Checkbox
                    checked={property.featured}
                    onCheckedChange={(checked) => updateField("featured", checked === true)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-950">Feature this property</span>
                    <span className="block text-sm text-slate-500">Show on homepage and society page.</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                  <Checkbox
                    checked={property.verified}
                    onCheckedChange={(checked) => updateField("verified", checked === true)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-950">Mark as verified</span>
                    <span className="block text-sm text-slate-500">Use only after owner/broker verification.</span>
                  </span>
                </label>
              </div>
            </section>

            <section className="rounded-[20px] border border-blue-100 bg-blue-50 p-4">
              <h2 className="font-bold text-slate-950">Listing checklist</h2>
              <p className="mt-2 text-sm text-blue-700">{validationHint}</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>{fieldSummary("Title", property.title)}</p>
                <p>{fieldSummary("Society", property.society)}</p>
                <p>{fieldSummary(labels.price, property.price)}</p>
                <p>{fieldSummary("Photos", propertyImages.length ? `${propertyImages.length}` : "verification placeholder")}</p>
              </div>
            </section>
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              onClick={() => handleSave("Draft")}
              disabled={saving}
              variant="outline"
              className="h-10 rounded-full border-slate-200 text-sm font-bold"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving && saveMode === "Draft" ? "Saving..." : "Draft"}
            </Button>
            <Button
              type="button"
              onClick={() => handleSave("Verification")}
              disabled={saving}
              variant="outline"
              className="h-11 rounded-full border-blue-200 text-blue-700"
            >
              {saving && saveMode === "Verification" ? "Saving..." : "Verify"}
            </Button>
<Button
              type="button"
              onClick={() => handleSave("Live")}
              disabled={saving || Boolean(publishValidationError) || Boolean(ownerPublishBlocked)}
              className="h-11 rounded-full bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {saving && saveMode === "Live" ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
