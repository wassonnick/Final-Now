// C83 admin society form UX polish: compact sections, shorter inputs, reduced scrolling, logic unchanged.
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  ImagePlus,
  Link as LinkIcon,
  MapPin,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { VerifiedImportImageCard, type VerifiedImportImage } from "@/components/admin/VerifiedImportImageCard";
import { NcrLocationSelector } from "@/components/admin/NcrLocationSelector";
import { SocietySeoStudio } from "@/components/admin/SocietySeoStudio";
import { adminFetch, uploadAdminImage } from "@/lib/adminApi";
import { googlePlacesSocietyPhotoUrl, societyPlaceholderImage } from "@/lib/societyImages";
import {
  createEmptyAdminSociety,
  describeBrochureUpdate,
  enrichAdminSociety,
  autoFillNearbyIntelligence,
  type NearbyIntelligenceSuggestions,
  fetchAdminSociety,
  fetchSocietyDraftFromBrochure,
  fetchGooglePlacesSocietyImageReference,
  MAX_BROCHURE_UPLOAD_BYTES,
  mergeFetchedSocietyDraft,
  reEnrichAdminSociety,
  saveAdminSociety,
  slugifySociety,
  societyAmenityOptions,
} from "@/lib/adminSocietyStore";
import type { AdminSociety, SocietyStatus } from "@/lib/adminSocietyStore";
import { approveVerifiedImportImage, rejectVerifiedImportImage, setVerifiedImportCoverImage } from "@/lib/verifiedImporterApi";
import { isNcrMulticityEnabled } from "@/config/features";

const statusOptions: SocietyStatus[] = ["Draft", "Verified", "Premium", "Archived"];



function isGoogleReferenceUrl(value: string) {
  return /maps\.google|google\.com\/maps|maps\.app\.goo\.gl|maps\.googleapis\.com\/maps\/api\/place\/photo/i.test(value);
}

function isDirectRenderableImageUrl(value: string) {
  const url = value.trim();

  if (!url) return false;
  if (url.startsWith("data:image/") || url.startsWith("blob:")) return true;
  if (!/^https?:\/\//i.test(url)) return false;
  if (isGoogleReferenceUrl(url)) return false;

  return /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url);
}

function imageStatusLabel(society: AdminSociety) {
  if (society.imageApprovedByAdmin) return "Approved for public display";

  switch (society.imageStatus) {
    case "google_places_reference_found":
      return "Google Places reference only";
    case "official_reference_found":
      return "Official/reference URL only";
    case "needs_review":
      return "Needs rights review";
    case "approved_for_live":
      return "Approval pending save";
    default:
      return "Placeholder shown publicly";
  }
}

function imageStatusTone(society: AdminSociety) {
  if (society.imageApprovedByAdmin) return "border-emerald-200 bg-emerald-50 text-emerald-700";

  switch (society.imageStatus) {
    case "google_places_reference_found":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "official_reference_found":
    case "needs_review":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function isDirectImageReference(url: string) {
  return /^https?:\/\/.+\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url.trim());
}

function friendlyFetchError(err: unknown, fallback: string) {
  if (err instanceof Error && err.message === "Failed to fetch") {
    return "Could not complete the backend request. Refresh once and try again. If it keeps failing, log out and log back in.";
  }

  return err instanceof Error ? err.message : fallback;
}

function completionScore(society: AdminSociety) {
  const importedImages = society.importedImages || [];
  const checks = [
    Boolean(society.name.trim()),
    Boolean(society.builder.trim()),
    Boolean(society.city.trim()),
    Boolean(society.sector.trim() || society.locality.trim()),
    Boolean(society.address.trim()),
    isValidLatLng(society.latitude, society.longitude),
    Boolean(society.googleMapsUrl.trim()),
    Boolean(society.placeId.trim()),
    Boolean(society.reraNumber.trim() || society.officialReraSourceUrl.trim()),
    society.amenities.length > 0,
    Boolean(society.nearbySchools.trim()),
    Boolean(society.nearbyHospitals.trim()),
    Boolean(society.nearbyMetro.trim()),
    Boolean(society.nearbyOfficeHubs.trim()),
    Boolean(society.coverImage.trim() || society.imageUrl.trim() || society.imagePhotoReference.trim() || importedImages.some((image) => image.image_type === "cover")),
    Boolean(society.galleryImages.length || society.approvedGalleryImageUrls.length || importedImages.some((image) => image.image_type === "gallery")),
    Boolean(society.description.trim()),
    Boolean(society.metaTitle.trim() && society.metaDescription.trim()),
    Boolean(society.score.trim()),
    Boolean(society.rentRange.trim() || society.buyRange.trim()),
    Boolean(society.maintenanceCharges.trim()),
  ];

  const done = checks.filter(Boolean).length;

  return {
    done,
    total: checks.length,
    percent: Math.round((done / checks.length) * 100),
  };
}

function fieldSummary(label: string, value: string) {
  return value ? `${label}: ${value}` : `${label}: missing`;
}

function statusTone(status: SocietyStatus) {
  switch (status) {
    case "Premium":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "Verified":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "Archived":
      return "bg-rose-50 text-rose-700 border-rose-100";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}


function normalizeCoordinate(value: string) {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) return "";

  return String(Number(parsed.toFixed(7)));
}

function isValidLatLng(latitude: string, longitude: string) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;

  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function extractGoogleMapsCoordinates(url: string) {
  const raw = url.trim();
  if (!raw) return null;

  const decoded = decodeURIComponent(raw);

  const patterns = [
    {
      pattern: /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
      source: "Google place pin",
      confidence: "exact",
      warning: "",
    },
    {
      pattern: /[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
      source: "coordinate search",
      confidence: "approximate",
      warning: "This looks like a coordinate search result, not the society's official Google place pin.",
    },
    {
      pattern: /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
      source: "map view center",
      confidence: "approximate",
      warning: "This is the Google Maps camera/view center and may be near the society, not exactly on the society pin.",
    },
  ] as const;

  for (const item of patterns) {
    const match = decoded.match(item.pattern);
    if (!match) continue;

    const latitude = normalizeCoordinate(match[1] || "");
    const longitude = normalizeCoordinate(match[2] || "");

    if (isValidLatLng(latitude, longitude)) {
      return {
        latitude,
        longitude,
        source: item.source,
        confidence: item.confidence,
        warning: item.warning,
      };
    }
  }

  return null;
}


export function AdminSocietyFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [society, setSociety] = useState<AdminSociety>(() => createEmptyAdminSociety());
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<"draft" | "publish" | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [reEnriching, setReEnriching] = useState(false);
  const [brochureExtracting, setBrochureExtracting] = useState(false);
  const [loadedSourceUrl, setLoadedSourceUrl] = useState("");
  const [error, setError] = useState("");
  const [coordinateExtractMessage, setCoordinateExtractMessage] = useState("");
  const [nearbyAutoFillLoading, setNearbyAutoFillLoading] = useState(false);
  const [nearbyAutoFillMessage, setNearbyAutoFillMessage] = useState("");
  const [nearbyAutoFillSuggestions, setNearbyAutoFillSuggestions] =
    useState<NearbyIntelligenceSuggestions | null>(null);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [googleImageRightsConfirmed, setGoogleImageRightsConfirmed] = useState(false);
  const [reviewingImage, setReviewingImage] = useState(false);
  const [googlePlacesPreviewUrl, setGooglePlacesPreviewUrl] = useState("");
  const [marketLocking, setMarketLocking] = useState(false);
  const [marketLockMessage, setMarketLockMessage] = useState("");
  const [marketLocked, setMarketLocked] = useState<string[]>([]);

  // Seed the market-lock indicator from the loaded society's provenance.
  useEffect(() => {
    const locked = society.fieldSources?.market?.locked;
    setMarketLocked(Array.isArray(locked) ? locked : []);
  }, [society.fieldSources]);

  // Save the current Rent/Buy/Price-per-sqft values as the exact portal figure and lock
  // them so the automated market refresh never overwrites them. Web search cannot reliably
  // read a portal's client-rendered headline price range, so flagship societies are pinned
  // here by hand once.
  const handleLockMarketToPortal = async () => {
    if (!society.id) return;
    setMarketLocking(true);
    setMarketLockMessage("");
    try {
      const res = await adminFetch(`/admin/import/societies/${society.id}/market-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rent_range: society.rentRange,
          buy_range: society.buyRange,
          price_per_sqft: society.pricePerSqft,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMarketLockMessage(json.message || "Could not lock market data.");
        return;
      }
      setMarketLocked(Array.isArray(json.locked) ? json.locked : []);
      setMarketLockMessage(json.message || "Market data saved and locked.");
    } catch {
      setMarketLockMessage("Could not reach the server.");
    } finally {
      setMarketLocking(false);
    }
  };

  const handleUnlockMarket = async () => {
    if (!society.id || marketLocked.length === 0) return;
    setMarketLocking(true);
    setMarketLockMessage("");
    try {
      const res = await adminFetch(`/admin/import/societies/${society.id}/market-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlock: marketLocked }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMarketLockMessage(json.message || "Could not unlock market data.");
        return;
      }
      setMarketLocked(Array.isArray(json.locked) ? json.locked : []);
      setMarketLockMessage("Market data unlocked — automated refresh will resume.");
    } catch {
      setMarketLockMessage("Could not reach the server.");
    } finally {
      setMarketLocking(false);
    }
  };

  // Preview the cover photo via the admin proxy (works pre-publish, unlike the public
  // google-place-photo route which only serves published Verified/Premium societies).
  useEffect(() => {
    if (society.imageStatus !== "google_places_reference_found" || !society.imagePhotoReference) {
      setGooglePlacesPreviewUrl("");
      return;
    }
    let cancelled = false;
    let objectUrl = "";
    void (async () => {
      try {
        const res = await adminFetch(`/admin/import/place-photo?reference=${encodeURIComponent(society.imagePhotoReference)}&w=900`);
        if (!res.ok || cancelled) return;
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setGooglePlacesPreviewUrl(objectUrl);
      } catch {
        if (!cancelled) setGooglePlacesPreviewUrl("");
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [society.imageStatus, society.imagePhotoReference]);

  useEffect(() => {
    async function loadSociety() {
      if (!id) {
        setSociety(createEmptyAdminSociety());
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const loadedSociety = await fetchAdminSociety(id);
        setSociety(loadedSociety);
        setLoadedSourceUrl(loadedSociety.officialProjectUrl || loadedSociety.sourceUrl);
      } catch (err) {
        console.error(err);
        setError("Unable to load society from the live backend.");
      } finally {
        setLoading(false);
      }
    }

    void loadSociety();
  }, [id]);

  const readiness = useMemo(() => completionScore(society), [society]);

  const hasValidCoordinates = isValidLatLng(society.latitude, society.longitude);
  const locationReadinessChecks = [
    {
      label: "Coordinates",
      done: hasValidCoordinates,
      helper: hasValidCoordinates ? "Valid map pin ready" : "Add valid latitude and longitude",
    },
    {
      label: "Google Maps URL",
      done: Boolean(society.googleMapsUrl.trim()),
      helper: society.googleMapsUrl.trim() ? "Map source saved" : "Paste exact Google Maps place URL",
    },
    {
      label: "Schools",
      done: Boolean(society.nearbySchools.trim()),
      helper: society.nearbySchools.trim() ? "School context added" : "Add nearby schools",
    },
    {
      label: "Metro / commute",
      done: Boolean(society.nearbyMetro.trim()),
      helper: society.nearbyMetro.trim() ? "Commute context added" : "Add metro/commute notes",
    },
    {
      label: "Hospitals",
      done: Boolean(society.nearbyHospitals.trim()),
      helper: society.nearbyHospitals.trim() ? "Hospital context added" : "Add nearby hospitals",
    },
    {
      label: "Office hubs",
      done: Boolean(society.nearbyOfficeHubs.trim()),
      helper: society.nearbyOfficeHubs.trim() ? "Office hub context added" : "Add office hubs / business districts",
    },
  ];
  const locationReadinessDone = locationReadinessChecks.filter((item) => item.done).length;

  const activeSourceUrl = society.officialProjectUrl || society.sourceUrl;
  const sourceChanged = activeSourceUrl !== loadedSourceUrl;
  const hasBeenEnriched =
    society.dataQuality.toLowerCase().includes("auto-enriched") ||
    society.dataQuality.toLowerCase().includes("enriched from public");
  const enrichDisabled = enriching || !activeSourceUrl || (hasBeenEnriched && !sourceChanged);
  const ncrMulticityEnabled = isNcrMulticityEnabled();

  const updateField = <K extends keyof AdminSociety>(field: K, value: AdminSociety[K]) => {
    setSociety((current) => ({
      ...current,
      [field]: value,
      ...(field === "name" && !isEdit ? { slug: slugifySociety(String(value)) } : {}),
    }));

    setError("");
    setMessage("");
    setSaved(false);
  };

  const reviewImportedImage = async (image: VerifiedImportImage, action: "cover" | "gallery" | "reject") => {
    if (!id) return;
    const hasApprovedCover = society.imageApprovedByAdmin && Boolean(society.coverImage || society.imageUrl || society.imagePhotoReference);
    const replace = action === "cover" && hasApprovedCover
      ? window.confirm("An approved cover already exists. Replace it with this imported candidate?")
      : false;
    if (action === "cover" && hasApprovedCover && !replace) return;
    try {
      setReviewingImage(true); setError("");
      if (action === "cover") await setVerifiedImportCoverImage(image.id, replace);
      if (action === "gallery") await approveVerifiedImportImage(image.id);
      if (action === "reject") await rejectVerifiedImportImage(image.id);
      const loadedSociety = await fetchAdminSociety(id);
      setSociety(loadedSociety);
      setMessage(action === "cover" ? "Imported image approved as cover. Society remains unpublished." : action === "gallery" ? "Imported image approved to gallery. Society remains unpublished." : "Imported image rejected and removed from public-use fields.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not review imported image."); }
    finally { setReviewingImage(false); }
  };

  const toggleAmenity = (amenity: string, checked: boolean | "indeterminate") => {
    setSociety((current) => {
      const enabled = checked === true;
      const amenities = enabled
        ? Array.from(new Set([...current.amenities, amenity]))
        : current.amenities.filter((item) => item !== amenity);

      return { ...current, amenities };
    });

    setSaved(false);
  };

  const readImages = async (
    event: ChangeEvent<HTMLInputElement>,
    target: "coverImage" | "galleryImages",
  ) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) return;

    try {
      setError("");
      const images = await Promise.all(files.map((file) => uploadAdminImage(file, "societies")));

      setSociety((current) =>
        target === "coverImage"
          ? {
              ...current,
              coverImage: images[0],
              imageUrl: images[0],
              imageStatus: current.imageStatus === "placeholder" ? "needs_review" : current.imageStatus,
            }
          : {
              ...current,
              galleryImages: [...current.galleryImages, ...images].slice(0, 10),
            },
      );

      setMessage(`${images.length} image${images.length > 1 ? "s" : ""} uploaded. Save to keep changes.`);
      setSaved(false);
    } catch (err) {
      console.error(err);
      setError("Could not upload image. Please try again.");
    }
  };

  const removeGalleryImage = (image: string) => {
    setSociety((current) => ({
      ...current,
      galleryImages: current.galleryImages.filter((item) => item !== image),
    }));
    setSaved(false);
  };

  const extractBrochure = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Upload a PDF brochure only.");
      return;
    }

    if (file.size > MAX_BROCHURE_UPLOAD_BYTES) {
      setError("This brochure is too large for live upload. Compress it below 20 MB, then upload again.");
      return;
    }

    try {
      setBrochureExtracting(true);
      setError("");
      setMessage("");

      const result = await fetchSocietyDraftFromBrochure(file, society);
      const merged = mergeFetchedSocietyDraft(society, result.society);
      setSociety(merged);
      setMessage(describeBrochureUpdate(society, result.society, merged, result.diagnostics));
      setSaved(false);
    } catch (err) {
      console.error(err);
      setError(friendlyFetchError(err, "Unable to extract details from this brochure."));
    } finally {
      setBrochureExtracting(false);
    }
  };

  const fetchGooglePlacesImageReference = async () => {
    const societyId = Number(society.id || 0);

    if (!societyId) {
      setError("Save the society first before fetching a Google Places image reference.");
      return;
    }

    setError(null);
    setMessage("Fetching Google Places photo reference...");

    try {
      const result = await fetchGooglePlacesSocietyImageReference(societyId);

      setSociety((current) => ({
        ...current,
        ...result.society,
        imageApprovedByAdmin: false,
      }));

      setMessage(result.message);
      setSaved(false);
    } catch (err) {
      console.error(err);
      setError(friendlyFetchError(err, "Unable to fetch Google Places image reference."));
    }
  };

  const approveReferenceImage = () => {
    const reference = society.imageReferenceUrl.trim();

    if (!reference) {
      setError("Add an approved/licensed direct image URL before approving it for public display.");
      return;
    }

    if (isGoogleReferenceUrl(reference) || society.imageStatus === "google_places_reference_found") {
      setError("Google Places references cannot be approved as owned/uploaded public images. Keep them as Google reference/display mode or upload a licensed/self-shot image.");
      return;
    }

    if (!isDirectRenderableImageUrl(reference)) {
      setError("Only a direct renderable image URL can be approved. Use a JPG, PNG, WebP, GIF, or AVIF URL after rights are verified.");
      return;
    }

    setSociety((current) => ({
      ...current,
      imageUrl: reference,
      coverImage: reference,
      imageStatus: "approved_for_live",
      imageApprovedByAdmin: true,
      imageCredit: current.imageCredit || "Approved source",
      imageLicenseNotes:
        current.imageLicenseNotes || "Approved by admin for live use after rights/permission review.",
    }));

    setMessage("Direct image marked approved for public display. Save only if rights/permission and attribution are verified.");
    setSaved(false);
  };

  const approveGooglePlacesImage = async () => {
    const societyId = Number(society.id || 0);

    if (!societyId) {
      setError("Save the society first before approving a Google Places image.");
      return;
    }

    if (society.imageStatus !== "google_places_reference_found" || !society.placeId) {
      setError("Fetch a Google Places photo reference before approving Google display.");
      return;
    }

    if (!googleImageRightsConfirmed) {
      setError("Confirm Google attribution/display terms before approving this reference image.");
      return;
    }

    try {
      setReviewingImage(true);
      setError("");
      setMessage("");

      const response = await adminFetch(`/admin/import/societies/${societyId}/image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approve", rights_confirmed: true }),
      });
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || "Could not approve Google Places image.");
      }

      const approved = json?.data;

      if (approved) {
        setSociety((current) => ({
          ...current,
          imageApprovedByAdmin: Boolean(approved.image_approved_by_admin),
          imageLicenseNotes: approved.image_license_notes || current.imageLicenseNotes,
          imageStatus: approved.image_status || current.imageStatus,
          imageCredit: approved.image_credit || current.imageCredit,
        }));
      }

      setGoogleImageRightsConfirmed(false);
      setMessage(json?.message || "Google Places image approved for attributed display after the society is published.");
      setSaved(true);
    } catch (err) {
      console.error(err);
      setError(friendlyFetchError(err, "Could not approve Google Places image."));
    } finally {
      setReviewingImage(false);
    }
  };

  const keepImageAsReferenceOnly = () => {
    setSociety((current) => ({
      ...current,
      imageUrl: "",
      coverImage: "",
      imageStatus: current.imageStatus === "google_places_reference_found" ? "google_places_reference_found" : current.imageReferenceUrl ? "official_reference_found" : "placeholder",
      imageApprovedByAdmin: false,
    }));

    setMessage("Image kept as admin reference only. Save changes to keep it private.");
    setSaved(false);
  };

  const clearImageReference = () => {
    setSociety((current) => ({
      ...current,
      imageReferenceUrl: "",
      imageUrl: "",
      coverImage: "",
      imageStatus: "placeholder",
      imageApprovedByAdmin: false,
      imageCredit: "",
      imageLicenseNotes: "",
    }));

    setMessage("Image reference cleared. Save changes to keep this update.");
    setSaved(false);
  };

  const validate = (mode: "draft" | "publish" = "draft") => {
    if (!society.name.trim()) return "Society name is required.";
    if (!society.slug.trim()) return "SEO slug is required.";
    if (!society.locality.trim() && !society.sector.trim()) {
      return "Add at least one location field: sector or locality.";
    }

    if (mode === "publish" && !String(society.score || "").trim()) {
      return "Society score is required before publishing. Add a score like 8.0 or save as draft.";
    }

    return "";
  };

  const handleSave = async (mode: "draft" | "publish" = "draft") => {
    const validationError = validate(mode);

    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSaving(true);
      setSaveMode(mode);
      setError("");
      setMessage("");

      const nextSociety: AdminSociety = {
        ...society,
        slug: society.slug || slugifySociety(society.name),
        score: String(society.score || "").trim() || "0",
        securityScore: String(society.securityScore || "").trim() || "0",
        maintenanceScore: String(society.maintenanceScore || "").trim() || "0",
        connectivityScore: String(society.connectivityScore || "").trim() || "0",
        lifestyleScore: String(society.lifestyleScore || "").trim() || "0",
        investmentScore: String(society.investmentScore || "").trim() || "0",
        status: mode === "publish" ? "Verified" : "Draft",
        isPublished: mode === "publish",
        city: society.city || "Gurgaon",
        state: society.state || "Haryana",
        amenities: Array.isArray(society.amenities) ? society.amenities : [],
        galleryImages: Array.isArray(society.galleryImages) ? society.galleryImages : [],
      };

      await saveAdminSociety(nextSociety, isEdit);
      setSaved(true);
      setMessage(
        mode === "publish"
          ? "Society saved and published."
          : "Society saved as draft and removed from public publishing."
      );
      navigate("/admin/societies");
    } catch (err) {
      console.error(err);
      setError("Unable to save society to the live backend.");
    } finally {
      setSaving(false);
      setSaveMode(null);
    }
  };


  const handleExtractCoordinatesFromGoogleMaps = () => {
    const coordinates = extractGoogleMapsCoordinates(society.googleMapsUrl || "");

    if (!coordinates) {
      setCoordinateExtractMessage(
        "Could not find coordinates in this Google Maps URL. Open the exact Google Maps place page, copy its URL, or paste coordinates manually.",
      );
      return;
    }

    updateField("latitude", coordinates.latitude);
    updateField("longitude", coordinates.longitude);

    const trustLabel =
      coordinates.confidence === "exact"
        ? "Trusted exact Google place pin"
        : "Approximate coordinate - verify manually";

    setCoordinateExtractMessage(
      `${trustLabel}. Source: ${coordinates.source}. Coordinates: ${coordinates.latitude}, ${coordinates.longitude}.${coordinates.warning ? ` ${coordinates.warning}` : ""}`,
    );
  };

  const nearbyResearchLocation = [
    society.name,
    society.sector,
    society.locality,
    society.city || "Gurugram",
  ]
    .filter(Boolean)
    .join(" ");

  const openResearchUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const googleSearchUrl = (query: string) => {
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  };

  const googleMapsSearchUrl = (query: string) => {
    return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  };

  const nearbyResearchActions = [
    {
      label: "Schools",
      field: "nearbySchools",
      status: society.nearbySchools.trim() ? "Added" : "Missing",
      helper: "Find school names, drive time and distance from verified public results.",
      searchQuery: `schools near ${nearbyResearchLocation}`,
      mapsQuery: `schools near ${nearbyResearchLocation}`,
    },
    {
      label: "Metro / commute",
      field: "nearbyMetro",
      status: society.nearbyMetro.trim() ? "Added" : "Missing",
      helper: "Check nearest metro/rapid metro station, arterial roads and practical commute.",
      searchQuery: `nearest metro station to ${nearbyResearchLocation}`,
      mapsQuery: `metro station near ${nearbyResearchLocation}`,
    },
    {
      label: "Hospitals",
      field: "nearbyHospitals",
      status: society.nearbyHospitals.trim() ? "Added" : "Missing",
      helper: "Verify nearby hospitals or emergency-care access before adding.",
      searchQuery: `hospitals near ${nearbyResearchLocation}`,
      mapsQuery: `hospitals near ${nearbyResearchLocation}`,
    },
    {
      label: "Office hubs",
      field: "nearbyOfficeHubs",
      status: society.nearbyOfficeHubs.trim() ? "Added" : "Missing",
      helper: "Check Cyber Hub, Golf Course Road, Sohna Road, SPR, Udyog Vihar or relevant hubs.",
      searchQuery: `office hubs near ${nearbyResearchLocation}`,
      mapsQuery: `business parks near ${nearbyResearchLocation}`,
    },
  ] as const;

  const handleNearbyAutoFill = async () => {
    if (!isEdit || nearbyAutoFillLoading) return;

    try {
      setNearbyAutoFillLoading(true);
      setNearbyAutoFillMessage("");
      setError("");

      const result = await autoFillNearbyIntelligence(society.id);
      setNearbyAutoFillSuggestions(result.suggestions);
      setNearbyAutoFillMessage(result.message);
    } catch (err) {
      console.error(err);
      setNearbyAutoFillMessage(
        err instanceof Error ? err.message : "Nearby auto-fill failed. Check coordinates and backend Google Places key.",
      );
    } finally {
      setNearbyAutoFillLoading(false);
    }
  };

  const applyNearbyAutoFillSuggestions = () => {
    if (!nearbyAutoFillSuggestions) return;

    setSociety((current) => ({
      ...current,
      nearbySchools: nearbyAutoFillSuggestions.nearby_schools || current.nearbySchools,
      nearbyMetro: nearbyAutoFillSuggestions.nearby_metro || current.nearbyMetro,
      nearbyHospitals: nearbyAutoFillSuggestions.nearby_hospitals || current.nearbyHospitals,
      nearbyOfficeHubs: nearbyAutoFillSuggestions.nearby_office_hubs || current.nearbyOfficeHubs,
      fieldsToVerify: [
        current.fieldsToVerify,
        "Nearby intelligence auto-filled from Google Places; admin review required.",
      ]
        .filter(Boolean)
        .join("\n"),
      dataQuality: current.dataQuality.includes("Google Places nearby")
        ? current.dataQuality
        : [current.dataQuality, "Google Places nearby suggestions applied; admin review required."]
            .filter(Boolean)
            .join(" | "),
    }));

    setSaved(false);
    setNearbyAutoFillMessage("Suggestions applied to the form. Review/edit, then save.");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await handleSave("draft");
  };

  const handleEnrich = async () => {
    if (!isEdit || enrichDisabled) return;

    if (!activeSourceUrl.trim()) {
      setError("Add an official project/RERA source URL before enriching this society.");
      return;
    }

    try {
      setEnriching(true);
      setError("");
      setMessage("");

      const result = await enrichAdminSociety(society.id);
      setSociety(result.society);
      setLoadedSourceUrl(result.society.officialProjectUrl || result.society.sourceUrl);

      const fieldText = result.updatedFields.length
        ? `Updated: ${result.updatedFields.join(", ")}.`
        : "No new fields changed.";
      const diagnosticText = [
        result.diagnostics.source,
        result.diagnostics.geocode,
        result.diagnostics.nearby,
      ]
        .filter(Boolean)
        .join(" ");

      setMessage(`${fieldText} ${diagnosticText}`.trim());
      setSaved(false);
    } catch (err) {
      console.error(err);
      setError("Unable to enrich from this source. Check that the URL is public and try again.");
    } finally {
      setEnriching(false);
    }
  };

  const handleReEnrich = async () => {
    if (!isEdit || reEnriching) return;

    if (society.isPublished) {
      const confirmed = window.confirm(
        "This society is published. Re-enriching will pull it off the public site and mark it Needs Review until you check the new fields and republish. Continue?",
      );
      if (!confirmed) return;
    }

    try {
      setReEnriching(true);
      setError("");
      setMessage("");

      const updated = await reEnrichAdminSociety(society.id, {
        confirmUnpublish: society.isPublished,
      });
      setSociety(updated);
      setSaved(false);
      setMessage(
        "Re-enriched with grounded research. Review every field below" +
          (updated.isPublished ? "." : " before republishing — it's now an unpublished Draft."),
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to re-enrich this society. Try again shortly.");
    } finally {
      setReEnriching(false);
    }
  };

  const generateDescription = () => {
    const location = [society.sector, society.locality].filter(Boolean).join(", ") || "Gurgaon";
    const text = `${society.name || "This society"} is a Gurgaon residential society in ${location}. The profile includes verified society context, amenities, nearby intelligence, rental/resale ranges and official references to help users shortlist before choosing a home.`;

    updateField("description", text);
  };

  if (loading) {
    return (
      <AdminLayout title={isEdit ? "Edit Society" : "Add Society"}>
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-slate-500">Loading society...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }


  const mediaPreviewImage =
    society.imageStatus === "google_places_reference_found" && (googlePlacesPreviewUrl || googlePlacesSocietyPhotoUrl(society))
      ? googlePlacesPreviewUrl || googlePlacesSocietyPhotoUrl(society)
      : society.imageApprovedByAdmin && (society.coverImage || society.imageUrl)
      ? society.coverImage || society.imageUrl
      : societyPlaceholderImage(society);

  const referenceUrl = society.imageReferenceUrl.trim();
  const canPreviewReferenceImage = Boolean(referenceUrl) && isDirectImageReference(referenceUrl);
  const referenceIsGoogle = society.imageStatus === "google_places_reference_found" || society.imageCredit === "Google Places";

  return (
    <AdminLayout
      title={isEdit ? "Edit Society" : "Add Society"}
      subtitle="Create society-first intelligence profiles for public discovery"
    >
      <form onSubmit={handleSubmit} className="pb-24 lg:pb-0">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Button asChild variant="ghost" className="w-fit rounded-full text-slate-600">
            <Link to="/admin/societies">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to societies
            </Link>
          </Button>

          <div className="hidden flex-wrap gap-3 lg:flex">
            {isEdit ? (
              <Button
                type="button"
                onClick={handleEnrich}
                disabled={enrichDisabled}
                variant="outline"
                className="rounded-full border-blue-200 text-blue-700"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {hasBeenEnriched && !sourceChanged ? "Already enriched" : enriching ? "Enriching..." : "Enrich profile"}
              </Button>
            ) : null}

            {isEdit && society.id ? (
              <Button asChild type="button" variant="outline" className="rounded-full border-emerald-200 text-emerald-700">
                <Link to={`/admin/societies/${society.id}/intelligence`}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Decision Intelligence
                </Link>
              </Button>
            ) : null}

            {isEdit ? (
              <Button
                type="button"
                onClick={handleReEnrich}
                disabled={reEnriching}
                variant="outline"
                className="rounded-full border-violet-200 text-violet-700"
                title="Re-runs Google Places + neighborhood + grounded AI research and deterministic scoring. Publishes societies are unpublished for review."
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {reEnriching ? "Re-enriching..." : "Re-enrich with AI"}
              </Button>
            ) : null}

            <Button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={saving}
              variant="outline"
              className="h-10 rounded-full border-slate-200 text-sm font-bold"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving && saveMode === "draft"
                ? "Saving..."
                : society.isPublished || society.status !== "Draft"
                  ? "Unpublish / Save Draft"
                  : "Save Draft"}
            </Button>

            <Button
              type="button"
              onClick={() => handleSave("publish")}
              disabled={saving}
              className="h-10 rounded-full bg-blue-600 px-4 text-sm font-bold hover:bg-blue-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {saving && saveMode === "publish"
                ? "Publishing..."
                : society.isPublished
                  ? "Update Published"
                  : "Publish / Verify"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">
            {error}
          </div>
        ) : null}

        {saved ? (
          <div className="mb-3 rounded-xl bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">
            Society saved to the live backend.
          </div>
        ) : null}

        {message ? (
          <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-medium text-blue-700">
            {message}
          </div>
        ) : null}

        <section className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
            <p className="text-sm font-medium text-slate-500">Profile readiness</p>
            <div className="mt-3 flex items-end justify-between">
              <p className="text-3xl font-bold text-slate-950">{readiness.percent}%</p>
              <p className="text-sm text-blue-600">
                {readiness.done}/{readiness.total} fields
              </p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${readiness.percent}%` }} />
            </div>
          </div>

          <div className={`rounded-[24px] border p-5 shadow-sm ${statusTone(society.status)}`}>
            <p className="text-sm font-medium opacity-80">Status</p>
            <p className="mt-2 text-xl font-bold">{society.status}</p>
            <p className="mt-2 text-sm opacity-80">{society.isPublished ? "Published" : "Not published"}</p>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Score</p>
            <p className="mt-2 text-xl font-bold text-slate-950">{society.score || "-"}</p>
            <p className="mt-1.5 text-xs font-semibold text-blue-600">Society intelligence</p>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="space-y-4 md:space-y-5">
            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="flex items-start gap-3">
                <Building2 className="mt-1 h-5 w-5 text-blue-600" />
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-950">Basic information</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">These details appear on the public society profile.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="md:col-span-2 text-sm font-medium text-slate-700">
                  Society Name <span className="text-rose-500">*</span>
                  <Input
                    value={society.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="DLF Crest"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  SEO Slug <span className="text-rose-500">*</span>
                  <Input
                    value={society.slug}
                    onChange={(event) => updateField("slug", slugifySociety(event.target.value))}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="dlf-crest"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Builder / Developer
                  <Input
                    value={society.builder}
                    onChange={(event) => updateField("builder", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="DLF"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Status
                  <select
                    value={society.status}
                    onChange={(event) => updateField("status", event.target.value as SocietyStatus)}
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  >
                    {statusOptions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Verification Status
                  <Input
                    value={society.verificationStatus}
                    onChange={(event) => updateField("verificationStatus", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="needs_verification"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Project Status
                  <Input
                    value={society.projectStatus}
                    onChange={(event) => updateField("projectStatus", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="Delivered / Ready to Move / Under Construction"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Possession Date
                  <Input
                    value={society.possessionDate}
                    onChange={(event) => updateField("possessionDate", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="Delivered / Dec 2026 / Q4 2028"
                  />
                </label>

                <label className="md:col-span-2 text-sm font-medium text-slate-700">
                  Description
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <textarea
                      value={society.description}
                      onChange={(event) => updateField("description", event.target.value)}
                      className="min-h-24 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      placeholder="Short society overview for public users."
                    />
                    <Button
                      type="button"
                      onClick={generateDescription}
                      variant="outline"
                      className="h-10 rounded-full border-blue-200 text-sm font-bold text-blue-700"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate
                    </Button>
                  </div>
                </label>
              </div>
            </section>

            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 text-blue-600" />
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-950">Location</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">At least sector or locality is required.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Sector
                  <Input
                    value={society.sector}
                    onChange={(event) => updateField("sector", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="Sector 54"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Locality
                  <Input
                    value={society.locality}
                    onChange={(event) => updateField("locality", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="Golf Course Road"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  City
                  <Input
                    value={society.city}
                    onChange={(event) => updateField("city", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  State
                  <Input
                    value={society.state}
                    onChange={(event) => updateField("state", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                  />
                </label>

                <label className="md:col-span-2 text-sm font-medium text-slate-700">
                  Address
                  <Input
                    value={society.address}
                    onChange={(event) => updateField("address", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="Full address"
                  />
                </label>

                {ncrMulticityEnabled && (
                  <div className="md:col-span-2">
                    <NcrLocationSelector
                      value={{
                        regionId: society.regionId,
                        cityId: society.cityId,
                        zoneId: society.zoneId,
                        localityId: society.localityId,
                        city: society.city,
                        state: society.state,
                        locality: society.locality,
                        sector: society.sector,
                        microMarket: society.microMarket,
                        authority: society.authority,
                        pincode: society.pincode,
                      }}
                      onChange={(next) => {
                        if (next.regionId !== undefined) updateField("regionId", next.regionId);
                        if (next.cityId !== undefined) updateField("cityId", next.cityId);
                        if (next.zoneId !== undefined) updateField("zoneId", next.zoneId);
                        if (next.localityId !== undefined) updateField("localityId", next.localityId);
                        if (next.city !== undefined) updateField("city", next.city);
                        if (next.state !== undefined) updateField("state", next.state);
                        if (next.locality !== undefined) updateField("locality", next.locality);
                        if (next.sector !== undefined) updateField("sector", next.sector);
                        if (next.microMarket !== undefined) updateField("microMarket", next.microMarket);
                        if (next.authority !== undefined) updateField("authority", next.authority);
                        if (next.pincode !== undefined) updateField("pincode", next.pincode);
                      }}
                    />
                  </div>
                )}

                <label className="text-sm font-medium text-slate-700">
                  Google Maps URL
                  <Input
                    value={society.googleMapsUrl}
                    onChange={(event) => updateField("googleMapsUrl", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="https://maps.google.com/..."
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Latitude / Longitude
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Input
                      value={society.latitude}
                      onChange={(event) => updateField("latitude", event.target.value)}
                      className="h-10 rounded-xl border-slate-200"
                      placeholder="Lat"
                    />
                    <Input
                      value={society.longitude}
                      onChange={(event) => updateField("longitude", event.target.value)}
                      className="h-10 rounded-xl border-slate-200"
                      placeholder="Long"
                    />
                  </div>
                </label>
              
                <div className="md:col-span-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">Map coordinate tools</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        Best result is Google place pin. If result says approximate, verify manually before saving.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleExtractCoordinatesFromGoogleMaps}
                        className="rounded-full border-blue-100 text-blue-700 hover:bg-blue-50"
                      >
                        Extract coordinates
                      </Button>

                      {society.latitude && society.longitude ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-full text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            window.open(
                              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${society.latitude},${society.longitude}`)}`,
                              "_blank",
                              "noopener,noreferrer",
                            );
                          }}
                        >
                          Open extracted pin
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {coordinateExtractMessage ? (
                    <p className={`mt-3 rounded-2xl border px-3 py-2 text-xs font-semibold ${coordinateExtractMessage.includes("Approximate") ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-100 bg-white text-blue-700"}`}>
                      {coordinateExtractMessage}
                    </p>
                  ) : null}
                </div>
</div>
            </section>

            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-lg font-bold tracking-tight text-slate-950">Scores & Market Ranges</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">Keep this practical and useful for users.</p>
              <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-semibold leading-5 text-blue-700 md:text-sm">
                Score is required before publishing because the live database requires a non-empty society score. Use values like 7.5, 8.0 or 9.2.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  ["Score *", "score"],
                  ["Security Score", "securityScore"],
                  ["Maintenance Score", "maintenanceScore"],
                  ["Connectivity Score", "connectivityScore"],
                  ["Lifestyle Score", "lifestyleScore"],
                  ["Investment Score", "investmentScore"],
                  ["Rent Range", "rentRange"],
                  ["Buy Range", "buyRange"],
                  ["Average Rent", "averageRent"],
                  ["Average Sale Price", "averageSalePrice"],
                  ["Price / sq ft", "pricePerSqft"],
                  ["Rental Yield", "rentalYield"],
                ].map(([label, key]) => (
                  <label key={key} className="text-sm font-medium text-slate-700">
                    {label}
                    <Input
                      value={String(society[key as keyof AdminSociety] || "")}
                      onChange={(event) => updateField(key as keyof AdminSociety, event.target.value as never)}
                      className="mt-2 h-10 rounded-xl border-slate-200"
                    />
                  </label>
                ))}
              </div>

              {isEdit && society.id ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 md:p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-amber-900">Match the portal price range</span>
                    {marketLocked.length > 0 ? (
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">
                        🔒 Locked: {marketLocked.join(", ")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-amber-800">
                    Automated refresh reads resale listings, which can sit below a portal&apos;s headline
                    &ldquo;Price Range&rdquo; banner. For flagship societies, type the exact 99acres/Housing figure into
                    Rent&nbsp;Range, Buy&nbsp;Range and Price&nbsp;/&nbsp;sq&nbsp;ft above, then lock it here so the daily
                    refresh never overwrites it.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    <Button
                      type="button"
                      onClick={handleLockMarketToPortal}
                      disabled={marketLocking}
                      className="h-9 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"
                    >
                      {marketLocking ? "Saving…" : "Save & lock to portal"}
                    </Button>
                    {marketLocked.length > 0 ? (
                      <Button
                        type="button"
                        onClick={handleUnlockMarket}
                        disabled={marketLocking}
                        variant="outline"
                        className="h-9 rounded-xl border-amber-300 px-4 text-sm font-semibold text-amber-800"
                      >
                        Unlock (resume auto-refresh)
                      </Button>
                    ) : null}
                    {marketLockMessage ? (
                      <span className="text-xs font-medium text-amber-900">{marketLockMessage}</span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-lg font-bold tracking-tight text-slate-950">Amenities</h2>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {societyAmenityOptions.map((amenity) => (
                  <label
                    key={amenity}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                  >
                    <Checkbox
                      checked={society.amenities.includes(amenity)}
                      onCheckedChange={(checked) => toggleAmenity(amenity, checked)}
                    />
                    {amenity}
                  </label>
                ))}
              </div>

              {society.amenities.some((item) => !societyAmenityOptions.includes(item)) ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Other amenities (not in the checklist above — AI-sourced or manually added)
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {society.amenities
                      .filter((item) => !societyAmenityOptions.includes(item))
                      .map((amenity) => (
                        <span
                          key={amenity}
                          className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm text-violet-700"
                        >
                          {amenity}
                          <button
                            type="button"
                            onClick={() => toggleAmenity(amenity, false)}
                            className="text-violet-400 hover:text-violet-700"
                            aria-label={`Remove ${amenity}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-[20px] border border-blue-100 bg-blue-50/60 p-4 shadow-sm md:p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                    C106 location checklist
                  </p>
                  <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950">
                    Society data completion
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                    Complete this before featuring the society or relying on public map intelligence.
                  </p>
                </div>
                <span className="w-fit rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black text-blue-700">
                  {locationReadinessDone}/{locationReadinessChecks.length} complete
                </span>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {locationReadinessChecks.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-2xl border px-3 py-2.5 ${
                      item.done
                        ? "border-emerald-100 bg-white text-emerald-700"
                        : "border-amber-100 bg-white text-amber-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-950">{item.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${item.done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {item.done ? "Done" : "Missing"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.helper}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-950">Nearby Intelligence</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                    Add verified, public-safe nearby data. Use one item per line.
                  </p>
                </div>
                <p className="text-xs font-bold text-blue-600">
                  Schools · Metro · Hospitals · Office hubs
                </p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  ["Nearby Schools", "nearbySchools"],
                  ["Nearby Metro", "nearbyMetro"],
                  ["Nearby Hospitals", "nearbyHospitals"],
                  ["Office Hubs", "nearbyOfficeHubs"],
                ].map(([label, key]) => (
                  <label key={key} className="text-sm font-medium text-slate-700">
                    {label}
                    <textarea
                      value={String(society[key as keyof AdminSociety] || "")}
                      onChange={(event) => updateField(key as keyof AdminSociety, event.target.value as never)}
                      className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      placeholder="One verified item per line. Example: Metro station name — approx distance/time"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-lg font-bold tracking-tight text-slate-950">Official Links & SEO</h2>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  ["Official Project URL", "officialProjectUrl"],
                  ["Developer URL", "officialDeveloperUrl"],
                  ["Brochure URL", "officialBrochureUrl"],
                  ["Floor Plan URL", "officialFloorPlanUrl"],
                  ["Gallery URL", "officialGalleryUrl"],
                  ["RERA Search URL", "reraSearchUrl"],
                  ["Source URL", "sourceUrl"],
                  ["Meta Title", "metaTitle"],
                  ["Meta Description", "metaDescription"],
                ].map(([label, key]) => (
                  <label key={key} className="text-sm font-medium text-slate-700">
                    {label}
                    <Input
                      value={String(society[key as keyof AdminSociety] || "")}
                      onChange={(event) => updateField(key as keyof AdminSociety, event.target.value as never)}
                      className="mt-2 h-10 rounded-xl border-slate-200"
                    />
                  </label>
                ))}

                <label className="md:col-span-2 text-sm font-medium text-slate-700">
                  FAQ
                  <textarea
                    value={society.faq}
                    onChange={(event) => updateField("faq", event.target.value)}
                    className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                    placeholder="Add public FAQ text"
                  />
                </label>
              </div>
            </section>

            {isEdit && society.id ? <SocietySeoStudio society={society} /> : null}
          </div>

          <aside className="space-y-4 md:space-y-5">
            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-950">Media</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                    Upload safe images or keep external sources as admin references.
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${imageStatusTone(society)}`}>
                  {imageStatusLabel(society)}
                </span>
              </div>

              <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                <ImagePlus className="mx-auto h-8 w-8 text-blue-600" />
                <p className="mt-3 font-medium text-slate-950">Cover image</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                  Upload self-shot, licensed, or developer-approved society image.
                </p>
                <label className="mt-3 inline-flex cursor-pointer items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload Cover
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => readImages(event, "coverImage")}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <img
                  src={mediaPreviewImage}
                  alt={society.name || "Society media preview"}
                  className="h-32 w-full object-cover"
                />
                <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                  {society.imageApprovedByAdmin
                    ? "Approved direct image can appear publicly after save."
                    : referenceIsGoogle
                      ? "Google Places display is reference-labeled publicly; it is not treated as an owned/uploaded image."
                      : "Public pages show the branded SocietyFlats placeholder until a direct image is manually approved."}
                </div>
              </div>

              {referenceUrl ? (
                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                        {referenceIsGoogle ? "Google Places reference" : "Admin reference"}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-800">{referenceUrl}</p>
                    </div>
                    <Button asChild type="button" variant="outline" className="h-8 shrink-0 rounded-full border-amber-200 px-3 text-xs font-bold text-amber-700">
                      <a href={referenceUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Open
                      </a>
                    </Button>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-amber-700">
                    {referenceIsGoogle
                      ? "Google Places reference/display mode. Do not approve this as an owned uploaded image. Public pages may show it only with Google/source attribution."
                      : "Reference only until rights, permission, direct image URL and attribution are confirmed."}
                  </p>
                  {canPreviewReferenceImage ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-amber-100 bg-white">
                      <img src={referenceUrl} alt={`${society.name || "Society"} reference preview`} className="h-24 w-full object-cover" />
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4">
                <label className="text-sm font-medium text-slate-700">
                  Image reference URL
                  <Input
                    value={society.imageReferenceUrl}
                    onChange={(event) => updateField("imageReferenceUrl", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="Official source URL / Google place source URL"
                  />
                </label>

                <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">
                  Approval is only for direct licensed/self-shot/developer-permitted image URLs. Google/map links must remain reference/display mode.
                </div>

                {referenceIsGoogle ? (
                  <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    <p className="font-bold">Google Places display approval</p>
                    <p className="mt-1">
                      This approves attributed Google Places display through SocietyFlats&apos; backend proxy. It does not mark the image as owned, and it still stays hidden from public pages until the society itself is published.
                    </p>
                    {!society.imageApprovedByAdmin ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-2 font-semibold">
                          <Checkbox
                            checked={googleImageRightsConfirmed}
                            onCheckedChange={(checked) => setGoogleImageRightsConfirmed(checked === true)}
                          />
                          Google attribution/display terms reviewed
                        </label>
                        <Button
                          type="button"
                          onClick={approveGooglePlacesImage}
                          disabled={reviewingImage || !googleImageRightsConfirmed}
                          className="h-9 rounded-full bg-emerald-600 px-3 text-xs font-black hover:bg-emerald-700"
                        >
                          {reviewingImage ? "Approving…" : "Approve Google display"}
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-2 font-bold text-emerald-700">Approved for attributed Google Places display.</p>
                    )}
                    {/* Alternate harvested photos are reviewed in the Imported images section below. */}
                  </div>
                ) : null}

              </div>

              <div className="mt-4">
                <label className="inline-flex cursor-pointer items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload Gallery
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => readImages(event, "galleryImages")}
                    className="hidden"
                  />
                </label>

                {society.galleryImages.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    {society.galleryImages.map((image) => (
                      <div key={image} className="group relative overflow-hidden rounded-xl border border-slate-200">
                        <img src={image} alt="Gallery preview" className="h-20 w-full object-cover" />
                        <button
                          type="button"
                          aria-label="Remove image"
                          onClick={() => removeGalleryImage(image)}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>

            {society.importedImages?.length ? <section className="rounded-[20px] border border-blue-100 bg-blue-50 p-4 shadow-sm md:p-5">
              <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-bold tracking-tight text-slate-950">Imported Image Candidates</h2><p className="mt-1 text-xs leading-5 text-slate-600">Review Google photo references and builder image URLs. Nothing is approved automatically.</p></div><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-blue-700">{society.importedImages.length} candidates</span></div>
              <div className="mt-4 grid gap-3">{society.importedImages.map((image) => <VerifiedImportImageCard key={image.id} image={image} busy={reviewingImage} onCover={(item) => void reviewImportedImage(item,"cover")} onGallery={(item) => void reviewImportedImage(item,"gallery")} onReject={(item) => void reviewImportedImage(item,"reject")} />)}</div>
            </section> : null}

            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-base font-bold tracking-tight text-slate-950">Publishing Controls</h2>
              <div className="mt-3 space-y-2.5">
                {[
                  ["Published", "isPublished"],
                  ["Featured", "featured"],
                  ["Show in Hero", "showInHero"],
                  ["Search Boost", "searchBoost"],
                ].map(([label, key]) => (
                  <label key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                    <Checkbox
                      checked={Boolean(society[key as keyof AdminSociety])}
                      onCheckedChange={(checked) => updateField(key as keyof AdminSociety, (checked === true) as never)}
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-950">{label}</span>
                      <span className="block text-sm text-slate-500">Controls public visibility and ranking.</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-[20px] border border-blue-100 bg-blue-50 p-4">
              <h2 className="font-bold text-slate-950">Profile checklist</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>{fieldSummary("Name", society.name)}</p>
                <p>{fieldSummary("Slug", society.slug)}</p>
                <p>{fieldSummary("Location", society.sector || society.locality)}</p>
                <p>{fieldSummary("Score", society.score)}</p>
                <p>{fieldSummary("Source", society.officialProjectUrl || society.sourceUrl)}</p>
              </div>

              {activeSourceUrl ? (
                <a
                  href={activeSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center text-sm font-bold text-blue-700"
                >
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Open source URL
                </a>
              ) : null}
            </section>

            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 text-blue-600" />
                <div>
                  <h2 className="font-bold text-slate-950">Image safety note</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">
                    Approve only direct images that are self-shot, licensed, or developer-permitted. Keep Google Places and map links as reference/display mode with attribution.
                  </p>
                  <div className="mt-3 space-y-1.5 text-xs font-medium text-slate-600">
                    <p>✓ Direct renderable image URL checked</p>
                    <p>✓ Rights or permission verified</p>
                    <p>✓ Credit/attribution added where needed</p>
                    <p>✓ Google references not marked as owned uploads</p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={saving}
              variant="outline"
              className="h-10 rounded-full border-slate-200 text-sm font-bold"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving && saveMode === "draft"
                ? "Saving..."
                : society.isPublished || society.status !== "Draft"
                  ? "Unpublish"
                  : "Draft"}
            </Button>

            <Button
              type="button"
              onClick={() => handleSave("publish")}
              disabled={saving}
              className="h-10 rounded-full bg-blue-600 text-sm font-bold hover:bg-blue-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {saving && saveMode === "publish"
                ? "Publishing..."
                : society.isPublished
                  ? "Update"
                  : "Publish"}
            </Button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
