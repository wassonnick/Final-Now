// C83 admin society form UX polish: compact sections, shorter inputs, reduced scrolling, logic unchanged.
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
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
import { uploadAdminImage } from "@/lib/adminApi";
import {
  createEmptyAdminSociety,
  describeBrochureUpdate,
  enrichAdminSociety,
  fetchAdminSociety,
  fetchSocietyDraftFromBrochure,
  fetchGooglePlacesSocietyImageReference,
  MAX_BROCHURE_UPLOAD_BYTES,
  mergeFetchedSocietyDraft,
  saveAdminSociety,
  slugifySociety,
  societyAmenityOptions,
} from "@/lib/adminSocietyStore";
import type { AdminSociety, SocietyStatus } from "@/lib/adminSocietyStore";

const statusOptions: SocietyStatus[] = ["Draft", "Verified", "Premium", "Archived"];

function friendlyFetchError(err: unknown, fallback: string) {
  if (err instanceof Error && err.message === "Failed to fetch") {
    return "Could not complete the backend request. Refresh once and try again. If it keeps failing, log out and log back in.";
  }

  return err instanceof Error ? err.message : fallback;
}

function completionScore(society: AdminSociety) {
  const checks = [
    Boolean(society.name.trim()),
    Boolean(society.slug.trim()),
    Boolean(society.sector.trim() || society.locality.trim()),
    Boolean(society.description.trim()),
    Boolean(society.score.trim()),
    Boolean(society.rentRange.trim() || society.buyRange.trim()),
    society.amenities.length > 0,
    Boolean(society.nearbySchools.trim() || society.nearbyMetro.trim() || society.nearbyHospitals.trim()),
    Boolean(society.officialProjectUrl.trim() || society.sourceUrl.trim()),
    Boolean(society.coverImage.trim() || society.imageUrl.trim() || society.imageReferenceUrl.trim()),
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
  const [brochureExtracting, setBrochureExtracting] = useState(false);
  const [loadedSourceUrl, setLoadedSourceUrl] = useState("");
  const [error, setError] = useState("");
  const [coordinateExtractMessage, setCoordinateExtractMessage] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

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

  const activeSourceUrl = society.officialProjectUrl || society.sourceUrl;
  const sourceChanged = activeSourceUrl !== loadedSourceUrl;
  const hasBeenEnriched =
    society.dataQuality.toLowerCase().includes("auto-enriched") ||
    society.dataQuality.toLowerCase().includes("enriched from public");
  const enrichDisabled = enriching || !activeSourceUrl || (hasBeenEnriched && !sourceChanged);

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
    if (!society.imageReferenceUrl.trim()) {
      setError("Add or fetch an image reference URL before approving it.");
      return;
    }

    setSociety((current) => ({
      ...current,
      imageUrl: current.imageReferenceUrl,
      coverImage: current.imageReferenceUrl,
      imageStatus: "approved_for_live",
      imageApprovedByAdmin: true,
      imageLicenseNotes:
        current.imageLicenseNotes || "Approved by admin for live use after rights/permission review.",
    }));

    setMessage("Image approved for public display. Save changes to publish this approval.");
    setSaved(false);
  };

  const keepImageAsReferenceOnly = () => {
    setSociety((current) => ({
      ...current,
      imageUrl: "",
      coverImage: "",
      imageStatus: current.imageReferenceUrl ? "official_reference_found" : "placeholder",
      imageApprovedByAdmin: false,
    }));

    setMessage("Image kept as admin reference only. Save changes to keep it private.");
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
  };;

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
            </section>

            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-lg font-bold tracking-tight text-slate-950">Nearby Intelligence</h2>
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
                      placeholder="One item per line"
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
          </div>

          <aside className="space-y-4 md:space-y-5">
            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-base font-bold tracking-tight text-slate-950">Media</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">Upload safe images or approve a reference URL.</p>

              <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                <ImagePlus className="mx-auto h-8 w-8 text-blue-600" />
                <p className="mt-3 font-medium text-slate-950">Cover image</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">Upload admin-approved society image.</p>
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

              {(society.coverImage || society.imageUrl) ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                  <img
                    src={society.coverImage || society.imageUrl}
                    alt={society.name || "Society cover"}
                    className="h-32 w-full object-cover"
                  />
                </div>
              ) : null}

              <div className="mt-4">
                <label className="text-sm font-medium text-slate-700">
                  Image reference URL
                  <Input
                    value={society.imageReferenceUrl}
                    onChange={(event) => updateField("imageReferenceUrl", event.target.value)}
                    className="mt-2 h-10 rounded-xl border-slate-200"
                    placeholder="Developer / official image URL"
                  />
                </label>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={approveReferenceImage}
                    className="rounded-full border-blue-200 text-blue-700"
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={keepImageAsReferenceOnly}
                    className="h-10 rounded-full border-slate-200 text-sm font-bold"
                  >
                    Reference only
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={fetchGooglePlacesImageReference}
                    className="col-span-2 h-10 rounded-full border-amber-200 text-sm font-bold text-amber-700"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Fetch Google Places photo reference
                  </Button>
                </div>
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

            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-base font-bold tracking-tight text-slate-950">Brochure extraction</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">Upload text-based PDF under 20 MB.</p>
              <label className="mt-3 inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100">
                <FileText className="mr-2 h-4 w-4" />
                {brochureExtracting ? "Extracting..." : "Upload brochure PDF"}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={extractBrochure}
                  className="hidden"
                  disabled={brochureExtracting}
                />
              </label>
            </section>

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
                    Use uploaded/licensed/self-shot images or approve references only after rights review. Google Places photos must remain reference-only until attribution and usage terms are checked.
                  </p>
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
