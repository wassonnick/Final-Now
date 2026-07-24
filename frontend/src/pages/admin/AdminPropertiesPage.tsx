// C82 admin properties list polish: compact metrics, filters and property cards without publish logic changes.
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
  MessageSquareText,
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

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { NcrAdminLocationFilter, type NcrAdminLocationFilterValue } from "@/components/admin/NcrAdminLocationFilter";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { adminFetch, adminHeaders } from "@/lib/adminApi";
import { isNcrMulticityEnabled } from "@/config/features";
import { propertyDisplayImage } from "@/lib/propertyImages";

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


function c42PropertyQualityIssues(item: any) {
  const issues: string[] = [];
  const ownerLinked = Boolean(c14SourceLeadId(item));
  const description = String(item?.description || "").trim();
  const listingType = String(getListingType(item) || "").toLowerCase();

  if (!String(item?.title || "").trim()) issues.push("title missing");
  if (!String(item?.locality || "").trim()) issues.push("locality missing");
  if (!String(item?.price || "").trim()) issues.push("price missing");
  if (listingType.includes("rent") && !String(item?.security_deposit || item?.securityDeposit || "").trim()) {
    issues.push("security deposit missing");
  }

  if (ownerLinked) {
    if (!description) issues.push("description missing");
    if (!item?.verified) issues.push("owner verification missing");
  }

  return issues;
}

function getPropertyImage(item: any) {
  const images = parseArray(item?.images);
  if (images[0]) return images[0];

  if (item?.cover_image) return item.cover_image;
  if (item?.coverImage) return item.coverImage;

  return propertyDisplayImage([]);
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

function getStructuredLocationId(item: any, key: "city" | "zone" | "locality") {
  const snake = `${key}_id`;
  const camel = `${key}Id`;
  return item?.[snake] || item?.[camel] || item?.society?.[snake] || item?.society?.[camel] || "";
}

function getSourceBadge(item: any) {
  const raw = String(item?.source_label || item?.sourceLabel || item?.source_type || item?.sourceType || "").toLowerCase();

  if (raw.includes("owner submitted") || raw.includes("owner_submitted") || item?.owner_listing_id || item?.ownerListingId) {
    return { label: "Owner Submitted", className: "border-indigo-100 bg-indigo-50 text-indigo-700" };
  }

  if (raw.includes("lead converted") || raw.includes("lead_converted") || c14SourceLeadId(item)) {
    return { label: "Lead Converted", className: "border-blue-100 bg-blue-50 text-blue-700" };
  }

  if (raw.includes("broker") || item?.broker_account_id || item?.brokerAccountId) {
    return { label: "Broker Assigned", className: "border-violet-100 bg-violet-50 text-violet-700" };
  }

  if (raw.includes("owner") || item?.owner_account_id || item?.ownerAccountId) {
    return { label: "Owner Assigned", className: "border-sky-100 bg-sky-50 text-sky-700" };
  }

  return { label: "SocietyFlats Inventory", className: "border-emerald-100 bg-emerald-50 text-emerald-700" };
}

export function AdminPropertiesPage() {
  const ncrEnabled = isNcrMulticityEnabled();
  const [c13StatusFilter, setC13StatusFilter] = useState<"all" | AdminInventoryStatus>("all");
const [properties, setProperties] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");
  const [ncrFilter, setNcrFilter] = useState<NcrAdminLocationFilterValue>({ cityId: "", zoneId: "", localityId: "" });
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [duplicatingId, setDuplicatingId] = useState<number | string | null>(null);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [publishingId, setPublishingId] = useState<number | string | null>(null);

  const loadProperties = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ per_page: "100" });
      if (ncrEnabled && ncrFilter.cityId) params.set("city_id", ncrFilter.cityId);
      if (ncrEnabled && ncrFilter.zoneId) params.set("zone_id", ncrFilter.zoneId);
      if (ncrEnabled && ncrFilter.localityId) params.set("locality_id", ncrFilter.localityId);

      const res = await adminFetch(`/admin/properties?${params.toString()}`);
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
  }, [ncrFilter.cityId, ncrFilter.zoneId, ncrFilter.localityId]);

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
      const matchesNcrCity = !ncrEnabled || !ncrFilter.cityId || Number(getStructuredLocationId(item, "city")) === Number(ncrFilter.cityId);
      const matchesNcrZone = !ncrEnabled || !ncrFilter.zoneId || Number(getStructuredLocationId(item, "zone")) === Number(ncrFilter.zoneId);
      const matchesNcrLocality = !ncrEnabled || !ncrFilter.localityId || getStructuredLocationId(item, "locality") === ncrFilter.localityId;

      return matchesQuery && matchesStatus && matchesType && matchesNcrCity && matchesNcrZone && matchesNcrLocality;
    });
  }, [properties, query, status, type, ncrEnabled, ncrFilter]);

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

    const title = `${item?.title || "Untitled property"} Copy`;
    const baseSlug = makeSlug(item?.slug || item?.title || "property");

    const payload = {
      title,
      slug: `${baseSlug}-copy-${Date.now().toString(36)}`,
      listing_type: getListingType(item) === "-" ? "Rent" : getListingType(item),
      source_type: "societyflats_inventory",
      inventory_owner_type: "societyflats",
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

  const quickSetPropertyStatus = async (item: any, nextStatus: "Draft" | "Live") => {
    if (publishingId) return;

    const currentTitle = item?.title || "Untitled property";
    const nextPublicationStatus = nextStatus === "Live" ? "published" : "draft";

    if (nextStatus === "Live") {
      const qualityIssues = c42PropertyQualityIssues(item);
      if (qualityIssues.length) {
        setErrorMessage(`Cannot publish yet: ${qualityIssues[0]}. Open Edit to complete the listing.`);
        return;
      }
    }

    try {
      setPublishingId(item.id);
      setActionMessage("");
      setErrorMessage("");

      const payload = {
        title: currentTitle,
        listing_type: getListingType(item) === "-" ? "Rent" : getListingType(item),
        status: nextStatus,
        publication_status: nextPublicationStatus,
        is_published: nextStatus === "Live",
        society: getSocietyName(item) === "-" ? "" : getSocietyName(item),
        locality: item?.locality || "",
        price: item?.price || "",
        bedrooms: item?.bedrooms || "",
        bathrooms: item?.bathrooms || "",
        area_sqft: item?.area_sqft || item?.areaSqft || "",
        floor: item?.floor || "",
        facing: item?.facing || "",
        furnished_status: item?.furnished_status || item?.furnishedStatus || "",
        description: item?.description || "",
        amenities: parseArray(item?.amenities),
        images: parseArray(item?.images),
        featured: Boolean(item?.featured),
        verified: Boolean(item?.verified),
      };

      const response = await adminFetch(`/admin/properties/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...adminHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || "Status update failed");
      }

      const updated = json?.data || {
        ...item,
        status: nextStatus,
        publication_status: nextPublicationStatus,
        is_published: nextStatus === "Live",
      };

      setProperties((current) =>
        current.map((property) => (property.id === item.id ? updated : property)),
      );

      setActionMessage(
        nextStatus === "Live"
          ? `Published "${currentTitle}" to public inventory.`
          : `Moved "${currentTitle}" back to Draft.`,
      );
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to update property status. Open Edit and save if this listing needs required fields.");
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <AdminLayout title="Properties" subtitle="Manage live inventory, drafts and property actions">
      <div className="space-y-3.5 md:space-y-5">
        <section className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
          {[
            ["Total", stats.total, "All properties"],
            ["Live", stats.live, "Public listings"],
            ["Draft", stats.draft, "Hidden/admin only"],
            ["Featured", stats.featured, "Highlighted"],
          ].map(([label, value, helper]) => (
            <AdminMetricCard key={String(label)} label={String(label)} value={loading ? "-" : value} helper={helper} />
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

        <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-sm md:rounded-[24px] md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
            <div className="flex h-10 items-center gap-2.5 rounded-xl border border-slate-200 px-3">
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
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            >
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            >
              {listingTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          {ncrEnabled ? (
            <div className="mt-3">
              <NcrAdminLocationFilter
                value={ncrFilter}
                onChange={setNcrFilter}
                label="Filter properties by NCR city / zone / locality"
              />
            </div>
          ) : null}

          <div className="mt-3 md:mt-4">
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
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                      <th className="px-3 py-2.5">Property</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Price</th>
                      <th className="px-3 py-2.5">Config</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item: any) => {
                      const itemStatus = getStatus(item);
                      const listingType = getListingType(item);
                      const propertyUrl = getPropertyUrl(item);
                      const editUrl = `/admin/properties/${item.id}/edit`;
                      const img = getPropertyImage(item);

                      return (
                        <tr key={item.id || item.slug} className="border-b border-slate-100 align-middle transition hover:bg-slate-50/70">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              <Link to={propertyUrl} className="block h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[9px] text-slate-400">No photo</span>}
                              </Link>
                              <div className="min-w-0">
                                <p className="max-w-[260px] truncate font-bold text-slate-950">{item?.title || "Untitled property"}</p>
                                <p className="max-w-[260px] truncate text-xs text-slate-500">{getSocietyName(item)} · {item?.locality || "Gurgaon"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3"><AdminBadge value={listingType}>{listingType}</AdminBadge></td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <AdminBadge value={itemStatus}>{itemStatus}</AdminBadge>
                              {item?.featured ? <span className="text-[10px] font-black uppercase tracking-wide text-amber-600">Featured</span> : null}
                            </div>
                          </td>
                          <td className="px-3 py-3 font-bold text-blue-700">{item?.price || "—"}</td>
                          <td className="px-3 py-3 text-xs text-slate-600">
                            {(item?.bedrooms || "-")} BHK · {getArea(item)} · Fl {item?.floor || "-"}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-slate-500 hover:text-blue-700" title="View"><Link to={propertyUrl}><Eye className="h-4 w-4" /></Link></Button>
                              <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-slate-500 hover:text-blue-700" title="Edit"><Link to={editUrl}><Edit3 className="h-4 w-4" /></Link></Button>
                              {c14SourceLeadId(item) ? (
                                <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-slate-500 hover:text-blue-700" title="Source lead"><a href={`/admin/leads/${c14SourceLeadId(item)}`}><MessageSquareText className="h-4 w-4" /></a></Button>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                className={itemStatus === "Live" ? "h-8 rounded-lg border border-amber-200 bg-white px-2.5 text-xs font-bold text-amber-700 hover:bg-amber-50" : "h-8 rounded-lg bg-emerald-600 px-2.5 text-xs font-bold hover:bg-emerald-700"}
                                onClick={() => quickSetPropertyStatus(item, itemStatus === "Live" ? "Draft" : "Live")}
                                disabled={publishingId === item.id}
                              >
                                {publishingId === item.id ? "…" : itemStatus === "Live" ? "Unpublish" : "Publish"}
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900" onClick={() => duplicateProperty(item)} disabled={duplicatingId === item.id} title="Duplicate"><Copy className="h-4 w-4" /></Button>
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50" onClick={() => deleteProperty(item)} disabled={deletingId === item.id} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
