import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BedDouble,
  Building2,
  Copy,
  Edit3,
  Eye,
  Home,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";


// C13_ADMIN_INVENTORY_HELPERS
type AdminInventoryStatus = "published" | "draft" | "owner_draft" | "pending" | "unknown";

const C13_PROPERTY_STATUS_FILTERS: { value: "all" | AdminInventoryStatus; label: string }[] = [
  { value: "all", label: "All inventory" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "owner_draft", label: "Owner draft" },
  { value: "pending", label: "Pending" },
];

function c13NormalizeInventoryStatus(property: any): AdminInventoryStatus {
  const raw = String(
    property?.status ||
      property?.publication_status ||
      property?.publicationStatus ||
      property?.property_status ||
      property?.propertyStatus ||
      "",
  ).toLowerCase();

  const ownerLinked = Boolean(
    property?.source_lead_id ||
      property?.sourceLeadId ||
      property?.owner_lead_id ||
      property?.ownerLeadId ||
      property?.lead_id ||
      property?.leadId,
  );

  const publishedFlag =
    property?.is_published === true ||
    property?.isPublished === true ||
    property?.published === true ||
    Boolean(property?.published_at || property?.publishedAt);

  if (publishedFlag || raw.includes("publish") || raw === "live" || raw === "active") {
    return "published";
  }

  if (ownerLinked && (raw.includes("draft") || raw.includes("pending") || !raw)) {
    return "owner_draft";
  }

  if (raw.includes("draft")) return "draft";
  if (raw.includes("pending") || raw.includes("review")) return "pending";

  return ownerLinked ? "owner_draft" : "unknown";
}

function c13InventoryStatusLabel(status: AdminInventoryStatus) {
  if (status === "published") return "Published";
  if (status === "owner_draft") return "Owner Draft";
  if (status === "draft") return "Draft";
  if (status === "pending") return "Pending";
  return "Unknown";
}

function c13InventoryStatusClass(status: AdminInventoryStatus) {
  if (status === "published") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "owner_draft") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "draft") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "pending") return "border-purple-200 bg-purple-50 text-purple-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function C13InventoryBadge({ property }: { property: any }) {
  const status = c13NormalizeInventoryStatus(property);

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${c13InventoryStatusClass(status)}`}>
{c13InventoryStatusLabel(status)}
    </span>
  );
}

function c13SourceLeadId(property: any) {
  return (
    property?.source_lead_id ||
    property?.sourceLeadId ||
    property?.owner_lead_id ||
    property?.ownerLeadId ||
    property?.lead_id ||
    property?.leadId ||
    ""
  );
}
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { adminFetch, adminHeaders } from "@/lib/adminApi";

const statusTone: Record<string, string> = {
  Live: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Verification: "bg-amber-50 text-amber-700 border-amber-100",
  Draft: "bg-slate-100 text-slate-600 border-slate-200",
  Archived: "bg-rose-50 text-rose-700 border-rose-100",
};

const typeTone: Record<string, string> = {
  Rent: "bg-blue-50 text-blue-700 border-blue-100",
  Sale: "bg-violet-50 text-violet-700 border-violet-100",
  "Buy / Resale": "bg-violet-50 text-violet-700 border-violet-100",
  "Sell Listing": "bg-amber-50 text-amber-700 border-amber-100",
  "Builder Floor": "bg-slate-50 text-slate-700 border-slate-100",
};

function c14SourceLeadId(property: any) {
  return (
    property?.source_lead_id ||
    property?.sourceLeadId ||
    property?.owner_lead_id ||
    property?.ownerLeadId ||
    property?.lead_id ||
    property?.leadId ||
    ""
  );
}

const statuses = ["All", "Live", "Verification", "Draft", "Archived"];
const listingTypes = ["All", "Rent", "Sale", "Buy / Resale", "Sell Listing", "Builder Floor"];

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

function getPropertyImage(item: any) {
  const images = parseArray(item?.images);
  if (images[0]) return images[0];

  if (item?.cover_image) return item.cover_image;
  if (item?.coverImage) return item.coverImage;

  return "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80";
}

function getSocietyName(item: any) {
  if (typeof item?.society === "string") return item.society;
  if (typeof item?.society === "object" && item?.society?.name) return item.society.name;
  return item?.society_name || item?.societyName || "-";
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

function getListingType(item: any) {
  return item?.listingType || item?.listing_type || "-";
}

function getPropertySlug(item: any) {
  return String(item?.slug || item?.id || "").replace(/^\/+/, "").replace(/^property\//, "");
}

function getPropertyUrl(item: any) {
  return `/property/${getPropertySlug(item)}`;
}

function getStatus(item: any) {
  return item?.status || "Live";
}

function getArea(item: any) {
  return item?.area_sqft || item?.areaSqft || "-";
}

export function AdminPropertiesPage() {
  const [c13StatusFilter, setC13StatusFilter] = useState<"all" | AdminInventoryStatus>("all");
const [properties, setProperties] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [duplicatingId, setDuplicatingId] = useState<number | string | null>(null);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

  const loadProperties = async () => {
    setLoading(true);

    try {
      const res = await adminFetch("/admin/properties");
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.message || "Failed to load properties");
      }

      const items = Array.isArray(json?.data) ? json.data : json?.data?.data || [];
      setProperties(items);
      setErrorMessage("");
    } catch (err) {
      console.error(err);
      setErrorMessage("Unable to load properties from the live backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProperties();
  }, []);

  const baseFiltered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return properties.filter((item: any) => {
      const searchable = [
        item?.title || "",
        getSocietyName(item),
        item?.locality || "",
        item?.price || "",
        getListingType(item),
        getStatus(item),
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !term || searchable.includes(term);
      const matchesStatus = status === "All" || getStatus(item) === status;
      const matchesType = type === "All" || getListingType(item) === type;

      return matchesQuery && matchesStatus && matchesType;
    });
  }, [properties, query, status, type]);

  const filtered = useMemo(() => {
    return baseFiltered.filter((item: any) => {
      return c13StatusFilter === "all" || c13NormalizeInventoryStatus(item) === c13StatusFilter;
    });
  }, [baseFiltered, c13StatusFilter]);

  const stats = useMemo(() => {
    return {
      total: properties.length,
      live: properties.filter((item: any) => getStatus(item) === "Live").length,
      verification: properties.filter((item: any) => getStatus(item) === "Verification").length,
      draft: properties.filter((item: any) => getStatus(item) === "Draft").length,
      featured: properties.filter((item: any) => item?.featured).length,
    };
  }, [properties]);

  const duplicateProperty = async (item: any) => {
    if (duplicatingId) return;

    const title = `${item?.title || "Untitled property"}
                              <div className="mt-2"><C13InventoryBadge property={item} /></div> Copy`;
    const baseSlug = makeSlug(item?.slug || item?.title || "property");

    const payload = {
      title,
      slug: `${baseSlug}-copy-${Date.now().toString(36)}`,
      listing_type: getListingType(item) === "-" ? "Rent" : getListingType(item),
      status: "Draft",
      society: getSocietyName(item) === "-" ? "" : getSocietyName(item),
      locality: item?.locality || "",
      price: item?.price || "",
      security_deposit: item?.security_deposit || item?.securityDeposit || "",
      maintenance: item?.maintenance || "",
      bedrooms: item?.bedrooms || "",
      bathrooms: item?.bathrooms || "",
      area_sqft: item?.area_sqft || item?.areaSqft || "",
      floor: item?.floor || "",
      facing: item?.facing || "",
      furnished_status: item?.furnished_status || item?.furnishedStatus || "",
      description: item?.description || "",
      amenities: parseArray(item?.amenities),
      images: parseArray(item?.images),
      featured: false,
      verified: false,
    };

    try {
      setDuplicatingId(item.id);
      setActionMessage("");
      setErrorMessage("");

      const response = await adminFetch("/admin/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...adminHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || "Duplicate failed");
      }

      if (json?.data) {
        setProperties((current) => [json.data, ...current]);
      }

      setActionMessage(`Duplicated "${item?.title || "property"}" as a draft.`);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to duplicate property. Please try again.");
    } finally {
      setDuplicatingId(null);
    }
  };

  const deleteProperty = async (item: any) => {
    if (deletingId) return;

    const confirmed = window.confirm(`Delete "${item?.title || "this property"}"?\n\nThis removes it from admin inventory. Continue only if you are sure.`);
    if (!confirmed) return;

    try {
      setDeletingId(item.id);
      setActionMessage("");
      setErrorMessage("");

      const response = await adminFetch(`/admin/properties/${item.id}`, {
        method: "DELETE",
        headers: {
          ...adminHeaders(),
        },
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || "Delete failed");
      }

      setProperties((prev) => prev.filter((property) => property.id !== item.id));
      setActionMessage(`Deleted "${item?.title || "property"}".`);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to delete property. Please refresh and try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout title="Properties" subtitle="Manage live inventory, drafts and property actions">
      <div className="space-y-4 md:space-y-6">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[
            ["Total", stats.total, "All properties"],
            ["Live", stats.live, "Public listings"],
            ["Draft", stats.draft, "Hidden/admin only"],
            ["Featured", stats.featured, "Highlighted"],
          ].map(([label, value, helper]) => (
            <div key={String(label)} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[28px] md:p-5">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950 md:mt-3 md:text-4xl">{loading ? "-" : value}</p>
              <p className="mt-2 text-sm text-blue-600">{helper}</p>
            </div>
          ))}
        </section>

        {actionMessage ? (
          <div className="rounded-2xl bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">
            {actionMessage}
          </div>
        ) : null}


        {/* C13 inventory filter */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Inventory
          </span>
          {C13_PROPERTY_STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setC13StatusFilter(filter.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                c13StatusFilter === filter.value
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {errorMessage ? (
          <div className="rounded-2xl bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[32px] md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">Property inventory</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search, edit and manage Gurgaon listings.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-slate-200 px-3 text-xs sm:text-sm"
                onClick={loadProperties}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700">
                <Link to="/admin/properties/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 lg:mt-6 lg:grid-cols-[1fr_180px_190px] lg:gap-3">
            <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 px-4">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                placeholder="Search title, society, locality or price"
              />
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            >
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            >
              {listingTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 md:mt-6">
            {loading ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
                Loading properties...
              </div>
            ) : null}

            {!loading && filtered.length === 0 ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-10 text-center">
                <p className="text-lg font-bold text-slate-950">No properties found</p>
                <p className="mt-2 text-sm text-slate-500">
                  Try changing filters or create a new property listing.
                </p>
                <Button asChild className="mt-5 rounded-full bg-blue-600 hover:bg-blue-700">
                  <Link to="/admin/properties/new">Add Property</Link>
                </Button>
              </div>
            ) : null}

            {!loading && filtered.length ? (
              <div className="grid gap-3 md:gap-4">
                {filtered.map((item: any) => {
                  const itemStatus = getStatus(item);
                  const listingType = getListingType(item);
                  const propertyUrl = getPropertyUrl(item);
                  const editUrl = `/admin/properties/${item.id}/edit`;

                  return (
                    <article
                      key={item.id || item.slug}
                      className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm transition hover:border-blue-100 hover:shadow-lg md:rounded-[28px] xl:grid xl:grid-cols-[220px_1fr]"
                    >
                      <Link to={propertyUrl} className="block h-32 bg-slate-100 sm:h-44 xl:h-full">
                        <img
                          src={getPropertyImage(item)}
                          alt={item?.title || "Property"}
                          className="h-full w-full object-cover"
                        />
                      </Link>

                      <div className="p-4 md:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap gap-2">
                              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone[itemStatus] || statusTone.Live}`}>
                                {itemStatus}
                              </span>
                              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${typeTone[listingType] || "bg-slate-50 text-slate-600 border-slate-100"}`}>
                                {listingType}
                              </span>
                              {item?.featured ? (
                                <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                  Featured
                                </span>
                              ) : null}
                              {item?.verified ? (
                                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                  Verified
                                </span>
                              ) : null}
                            </div>

                            <h3 className="mt-2 line-clamp-2 text-lg font-bold text-slate-950 md:mt-3 md:text-xl">
                              {item?.title || "Untitled property"}
                            </h3>

                            <p className="mt-1.5 text-base font-bold text-blue-700 md:mt-2 md:text-lg">
                              {item?.price || "Price pending"}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-500 md:mt-3 md:text-sm">
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                {getSocietyName(item)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {item?.locality || "Gurgaon"}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 rounded-[18px] bg-slate-50 p-2.5 text-center lg:min-w-[230px] lg:rounded-[22px] lg:p-3">
                            <div>
                              <p className="text-xs text-slate-400">BHK</p>
                              <p className="mt-1 font-bold text-slate-950">{item?.bedrooms || "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Area</p>
                              <p className="mt-1 font-bold text-slate-950">{getArea(item)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Floor</p>
                              <p className="mt-1 font-bold text-slate-950">{item?.floor || "-"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 sm:flex sm:flex-wrap sm:border-t-0 sm:pt-0 md:mt-5">
                          <Button asChild size="sm" variant="outline" className="rounded-full border-slate-200">
                            <Link to={propertyUrl}>
                              <Eye className="mr-1.5 h-4 w-4" />
                              View
                            </Link>
                          </Button>

                          <Button asChild size="sm" variant="outline" className="rounded-full border-slate-200">
                            <Link to={editUrl}>
                              <Edit3 className="mr-1.5 h-4 w-4" />
                              Edit
                            </Link>
                          </Button>

                          {/* C14-B source lead link */}
                          {c14SourceLeadId(item) ? (
                            <Button asChild size="sm" variant="outline" className="rounded-full border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 sm:text-sm">
                              <a href={`/admin/leads/${c14SourceLeadId(item)}`}>
                                Source lead
                              </a>
                            </Button>
                          ) : null}

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-full border-slate-200"
                            onClick={() => duplicateProperty(item)}
                            disabled={duplicatingId === item.id}
                          >
                            <Copy className="mr-1.5 h-4 w-4" />
                            {duplicatingId === item.id ? "Copying..." : "Copy"}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="rounded-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => deleteProperty(item)}
                            disabled={deletingId === item.id}
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            {deletingId === item.id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
