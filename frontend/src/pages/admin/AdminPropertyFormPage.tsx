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

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { adminFetch, adminHeaders, uploadAdminImage } from "@/lib/adminApi";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://final-now.onrender.com/api";

const localities = [
  "Sector 54, Gurgaon",
  "Golf Course Road, Gurgaon",
  "Sector 65, Gurgaon",
  "Sector 72, Gurgaon",
  "DLF Phase 5, Gurgaon",
  "Sohna Road, Gurgaon",
];

const amenitiesList = [
  "Power Backup",
  "Clubhouse",
  "Swimming Pool",
  "Gym",
  "Security",
  "Pet Friendly",
  "Park View",
  "Servant Room",
];

const emptyProperty = {
  title: "",
  listingType: "Rent",
  status: "Draft",
  society: "",
  societyId: "",
  locality: "",
  price: "",
  securityDeposit: "",
  maintenance: "",
  bedrooms: "",
  bathrooms: "",
  areaSqft: "",
  floor: "",
  facing: "North-East",
  furnishedStatus: "Semi Furnished",
  description: "",
  amenities: [] as string[],
  images: [] as string[],
  featured: false,
  verified: false,
};

type SocietyOption = {
  id?: number | string;
  name: string;
  slug?: string;
  sector?: string;
  locality?: string;
  status?: string;
};

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
      status: item.status || "",
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
    return "For rent listings, title, society, locality, monthly rent and security deposit are required.";
  }

  if (isBuilderFloorListing(listingType)) {
    return "For builder floors, title, locality, asking price and area are required. Booking amount is optional.";
  }

  return "For sale/resale listings, title, society, locality and sale price are required. Token amount is optional.";
}

export function AdminPropertyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = Boolean(id);

  const [property, setProperty] = useState(emptyProperty);
  const [societyOptions, setSocietyOptions] = useState<SocietyOption[]>([]);
  const [societiesLoading, setSocietiesLoading] = useState(true);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<"Draft" | "Live" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadSocieties() {
      try {
        setSocietiesLoading(true);

        let allSocieties: SocietyOption[] = [];
        const maxPages = 20;

        for (let page = 1; page <= maxPages; page += 1) {
          const response = await adminFetch(`/admin/societies?page=${page}&per_page=100`);
          const json = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(json?.message || "Failed to load societies");
          }

          const pageItems = extractSocieties(json);
          allSocieties = mergeSocietyOptions(allSocieties, pageItems);

          const paginated = json?.data && !Array.isArray(json.data) ? json.data : null;
          const currentPage = Number(paginated?.current_page || page);
          const lastPage = Number(paginated?.last_page || page);
          const hasNext = Boolean(paginated?.next_page_url);

          if (!pageItems.length || currentPage >= lastPage || !hasNext) {
            break;
          }
        }

        setSocietyOptions(allSocieties);
      } catch (err) {
        console.error(err);
        setError("Unable to load all live societies. Existing selected society will still be preserved.");
      } finally {
        setSocietiesLoading(false);
      }
    }

    void loadSocieties();
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
          status: data.status || "Draft",
          society: getSocietyName(data),
          societyId: getSocietyId(data),
          locality: data.locality || "",
          price: data.price || "",
          securityDeposit: data.security_deposit || data.securityDeposit || "",
          maintenance: data.maintenance || "",
          bedrooms: data.bedrooms || "",
          bathrooms: data.bathrooms || "",
          areaSqft: data.area_sqft || data.areaSqft || "",
          floor: data.floor || "",
          facing: data.facing || "North-East",
          furnishedStatus: data.furnished_status || data.furnishedStatus || "Semi Furnished",
          description: data.description || "",
          amenities: parseArray(data.amenities),
          images: parseArray(data.images),
          featured: Boolean(data.featured),
          verified: Boolean(data.verified),
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
  const propertyAmenities = parseArray(property.amenities);

  const completion = useMemo(() => {
    const checks = [
      Boolean(property.title.trim()),
      Boolean(property.society),
      Boolean(property.locality),
      Boolean(property.price),
      Boolean(property.bedrooms),
      Boolean(property.areaSqft),
      Boolean(property.description.trim()),
      propertyImages.length > 0,
    ];

    const done = checks.filter(Boolean).length;

    return {
      done,
      total: checks.length,
      percent: Math.round((done / checks.length) * 100),
    };
  }, [property, propertyImages.length]);


  const sourceLeadId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("sourceLeadId") || "";
  }, [location.search]);

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
    const price = String(property.price || "").trim();
    const deposit = String(property.securityDeposit || "").trim();
    const area = String(property.areaSqft || "").trim();

    if (!title) return "Property title is required before publishing.";
    if (!locality) return "Locality is required before publishing.";
    if (!price) return `${labels.price} is required before publishing.`;

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
    labels.price,
    rentalListing,
    saleListing,
    builderFloorListing,
  ]);


  const updateField = (key: string, value: any) => {
    setProperty((current: any) => ({ ...current, [key]: value }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const toggleAmenity = (amenity: string, checked: boolean | "indeterminate") => {
    setProperty((current: any) => {
      const enabled = checked === true;
      const currentAmenities = parseArray(current.amenities);

      return {
        ...current,
        amenities: enabled
          ? Array.from(new Set([...currentAmenities, amenity]))
          : currentAmenities.filter((item: string) => item !== amenity),
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

  const validate = () => {
    const title = String(property.title || "").trim();
    const price = String(property.price || "").trim();
    const deposit = String(property.securityDeposit || "").trim();
    const society = String(property.society || "").trim();
    const locality = String(property.locality || "").trim();
    const area = String(property.areaSqft || "").trim();

    if (!title) return "Property title is required.";
    if (!locality) return "Please select a locality.";
    if (!price) return `${labels.price} is required.`;

    if (rentalListing) {
      if (!society) return "Please select a society for the rental listing.";
      if (!deposit) return "Security deposit is required for rent listings.";
    }

    if (saleListing && !builderFloorListing) {
      if (!society) return "Please select a society for the sale/resale listing.";
    }

    if (builderFloorListing && !area) {
      return "Area is required for builder floor listings.";
    }

    return "";
  };

  const handleSave = async (status: string) => {
    const title = String(property.title || "").trim();
    const society = String(property.society || "").trim();
    const locality = String(property.locality || "").trim();
    const price = String(property.price || "").trim();
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

    if (!title) {
      validationError = "Property title is required.";
    } else if (!locality) {
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

    if (status === "Live" && validationError) {
      setError(validationError);
      setSuccess("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (status === "Draft" && !title) {
      setError("Property title is required to save a draft.");
      setSuccess("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSaving(true);
      setSaveMode(status as "Draft" | "Live");
      setError("");

      const uniqueSlug = sourceLeadId && !isEdit
        ? `${makeSlug(title)}-owner-lead-${sourceLeadId}-${Date.now()}`
        : makeSlug(title);

      const payload = {
        title,
        slug: uniqueSlug,
        listing_type: property.listingType,
        status,
        society: property.society,
        society_id: (property as any).societyId || undefined,
        locality: property.locality,
        price: property.price || "On Request",
        security_deposit: property.securityDeposit,
        maintenance: property.maintenance,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area_sqft: property.areaSqft,
        floor: property.floor,
        facing: property.facing,
        furnished_status: property.furnishedStatus,
        description: property.description,
        amenities: parseArray(property.amenities),
        images: parseArray(property.images),
        featured: Boolean(property.featured),
        verified: Boolean(property.verified),
      };

      const response = await adminFetch(isEdit ? `/admin/properties/${id}` : "/admin/properties", {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...adminHeaders(),
        },
        body: JSON.stringify(payload),
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
      ? "rental home"
      : saleListing
        ? "resale home"
        : "property";

    const audience = rentalListing
      ? "tenants and families looking for verified rental options"
      : "buyers and investors looking for verified resale options";

    const text = `${property.bedrooms || "Spacious"} BHK ${listingKind} in ${property.society || "this society"}, ${
      property.locality || "Gurgaon"
    }. Suitable for ${audience}, with strong society context, connectivity, security and lifestyle amenities.`;

    updateField("description", text);
  };


  useEffect(() => {
    if (isEdit) return;

    const params = new URLSearchParams(location.search);
    const ownerName = params.get("ownerName") || "";
    const ownerPhone = params.get("ownerPhone") || "";
    const society = params.get("society") || "";
    const property = params.get("property") || "";
    const expectedPrice = params.get("expectedPrice") || "";
    const requirement = params.get("requirement") || "";
    const sourceLeadId = params.get("sourceLeadId") || "";

    if (!ownerName && !ownerPhone && !society && !property && !expectedPrice && !sourceLeadId) return;

    setProperty((current) => ({
      ...current,
      title: current.title || property || `${society || "Owner"} property draft`,
      listingType: requirement.toLowerCase().includes("rent") ? "Rent" : "Sale",
      status: current.status || "Draft",
      society: current.society || society,
      locality: current.locality || "Gurgaon",
      price: current.price || expectedPrice,
      bedrooms: current.bedrooms || "3",
      bathrooms: current.bathrooms || "3",
      areaSqft: current.areaSqft || "1000",
      description:
        current.description ||
        [
          "Draft property created from Owner CRM lead.",
          ownerName ? `Owner: ${ownerName}` : "",
          ownerPhone ? `Phone: ${ownerPhone}` : "",
          society ? `Society: ${society}` : "",
          property ? `Property details: ${property}` : "",
          expectedPrice ? `Expected price/rent: ${expectedPrice}` : "",
          requirement ? `Requirement: ${requirement}` : "",
          sourceLeadId ? `Source lead ID: ${sourceLeadId}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
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
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
              className="rounded-full border-slate-200"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving && saveMode === "Draft" ? "Saving..." : "Save Draft"}
            </Button>

            <Button
              type="button"
              onClick={() => handleSave("Live")}
              disabled={saving || Boolean(publishValidationError)}
              className="rounded-full bg-blue-600 px-5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {saving && saveMode === "Live" ? "Publishing..." : "Publish Listing"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-5 rounded-2xl bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        ) : null}

        {sourceLeadId ? (
          <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-500">
                  Owner CRM source
                </p>
                <p className="mt-1 font-semibold text-blue-950">
                  This draft property was started from owner lead #{sourceLeadId}.
                </p>
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
          <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-medium text-blue-700">
            Publish blocked: {publishValidationError}
          </div>
        ) : null}

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <p className="text-sm font-medium text-slate-500">Listing readiness</p>
            <div className="mt-3 flex items-end justify-between">
              <p className="text-4xl font-bold text-slate-950">{completion.percent}%</p>
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

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Mode</p>
            <p className="mt-3 text-2xl font-bold text-slate-950">{property.listingType}</p>
            <p className="mt-2 text-sm text-blue-600">
              {rentalListing ? "Rental listing" : saleListing ? "Sale / resale listing" : property.status}
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Images</p>
            <p className="mt-3 text-2xl font-bold text-slate-950">{propertyImages.length}</p>
            <p className="mt-2 text-sm text-blue-600">Max 8 images</p>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-start gap-3">
                <Home className="mt-1 h-5 w-5 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-950">Basic Details</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Keep the title clear and society-first for better enquiry quality.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="md:col-span-2 text-sm font-medium text-slate-700">
                  Property Title <span className="text-rose-500">*</span>
                  <Input
                    value={property.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder="3 BHK in DLF Crest with park view"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Listing Type
                  <select
                    value={property.listingType}
                    onChange={(event) => updateField("listingType", event.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  >
                    <option>Rent</option>
                    <option>Sale</option>
                    <option>Buy / Resale</option>
                    <option>Sell Listing</option>
                    <option>Builder Floor</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Status
                  <select
                    value={property.status}
                    onChange={(event) => updateField("status", event.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  >
                    <option>Live</option>
                    <option>Verification</option>
                    <option>Draft</option>
                    <option>Archived</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Society {!builderFloorListing ? <span className="text-rose-500">*</span> : <span className="text-xs font-normal text-slate-400">(optional for builder floor)</span>}
                  <select
                    value={property.society}
                    onChange={(event) => {
                      const selectedName = event.target.value;
                      const selectedOption = societyDropdownOptions.find((item) => item.name === selectedName);
                      setProperty((current: any) => ({
                        ...current,
                        society: selectedName,
                        societyId: selectedOption?.id ? String(selectedOption.id) : "",
                      }));
                      if (error) setError("");
                      if (success) setSuccess("");
                    }}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="">
                      {societiesLoading ? "Loading societies..." : "Select Society"}
                    </option>
                    {societyDropdownOptions.map((item) => (
                      <option key={`${item.id || item.name}-${item.name}`} value={item.name}>
                        {societyLabel(item)}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs font-normal text-slate-400">
                    {societiesLoading
                      ? "Fetching live societies..."
                      : societyOptions.length
                        ? `${societyOptions.length} live societies loaded`
                        : "No live societies loaded"}
                  </span>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Locality <span className="text-rose-500">*</span>
                  <select
                    value={property.locality}
                    onChange={(event) => updateField("locality", event.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="">Select Locality</option>
                    {localities.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                {rentalListing ? "Rent & Configuration" : "Sale Price & Configuration"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {rentalListing
                  ? "Add rent, deposit and configuration details for rental inventory."
                  : "Add asking price, booking/token amount and configuration details for sale inventory."}
              </p>
              <p className="mt-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                {validationHint}
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <label className="text-sm font-medium text-slate-700">
                  {labels.price} <span className="text-rose-500">*</span>
                  <Input
                    value={property.price}
                    onChange={(event) => updateField("price", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder={labels.pricePlaceholder}
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  {labels.deposit} {rentalListing ? <span className="text-rose-500">*</span> : <span className="text-xs font-normal text-slate-400">(optional)</span>}
                  <Input
                    value={property.securityDeposit}
                    onChange={(event) => updateField("securityDeposit", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder={labels.depositPlaceholder}
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  {labels.maintenance}
                  <Input
                    value={property.maintenance}
                    onChange={(event) => updateField("maintenance", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder={labels.maintenancePlaceholder}
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Bedrooms
                  <Input
                    value={property.bedrooms}
                    onChange={(event) => updateField("bedrooms", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder="3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Bathrooms
                  <Input
                    value={property.bathrooms}
                    onChange={(event) => updateField("bathrooms", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder="3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Area (sq ft) {builderFloorListing ? <span className="text-rose-500">*</span> : null}
                  <Input
                    value={property.areaSqft}
                    onChange={(event) => updateField("areaSqft", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder="2200"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Floor
                  <Input
                    value={property.floor}
                    onChange={(event) => updateField("floor", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder="12 of 28"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Facing
                  <select
                    value={property.facing}
                    onChange={(event) => updateField("facing", event.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
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
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  >
                    <option>Semi Furnished</option>
                    <option>Fully Furnished</option>
                    <option>Unfurnished</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-950">Description & Amenities</h2>
                  <p className="mt-1 text-sm text-slate-500">
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

              <div className="mt-6">
                <p className="text-sm font-medium text-slate-700">Amenities</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {amenitiesList.map((item) => (
                    <label
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
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

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Media</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload cover and gallery images. Use real society/property images.
              </p>

              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <p className="mt-3 font-medium text-slate-950">Drop property photos here</p>
                <p className="mt-1 text-sm text-slate-500">JPG, PNG or WebP.</p>
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
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {propertyImages.map((image) => (
                    <div key={image} className="group relative overflow-hidden rounded-2xl border border-slate-200">
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

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Publishing</h2>
              <div className="mt-4 space-y-3">
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                  <Checkbox
                    checked={property.featured}
                    onCheckedChange={(checked) => updateField("featured", checked === true)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-950">Feature this property</span>
                    <span className="block text-sm text-slate-500">Show on homepage and society page.</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
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

            <section className="rounded-[28px] border border-blue-100 bg-blue-50 p-5">
              <h2 className="font-bold text-slate-950">Listing checklist</h2>
              <p className="mt-2 text-sm text-blue-700">{validationHint}</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>{fieldSummary("Title", property.title)}</p>
                <p>{fieldSummary("Society", property.society)}</p>
                <p>{fieldSummary(labels.price, property.price)}</p>
                <p>{fieldSummary("Images", propertyImages.length ? `${propertyImages.length}` : "")}</p>
              </div>
            </section>
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              onClick={() => handleSave("Draft")}
              disabled={saving}
              variant="outline"
              className="h-11 rounded-full border-slate-200"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving && saveMode === "Draft" ? "Saving..." : "Draft"}
            </Button>

            <Button
              type="button"
              onClick={() => handleSave("Live")}
              disabled={saving || Boolean(publishValidationError)}
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
