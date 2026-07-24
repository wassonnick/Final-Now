// C82 admin societies list polish: compact metrics, filters and society cards without logic changes.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Edit3,
  Eye,
  Globe2,
  Image,
  Link as LinkIcon,
  MapPin,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { NcrAdminLocationFilter, type NcrAdminLocationFilterValue } from "@/components/admin/NcrAdminLocationFilter";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { SocietySeoReadinessPanel } from "@/components/admin/SocietySeoReadinessPanel";
import {
  backfillAdminSocietyPublishFields,
  bulkAutoFillNearbyIntelligence,
  bulkReEnrichAdminSocieties,
  BULK_REENRICH_MAX,
  deleteAdminSociety,
  fetchAdminSocieties,
  updateAdminSocietyStatus,
} from "@/lib/adminSocietyStore";
import type { AdminSociety, SocietyStatus } from "@/lib/adminSocietyStore";
import { bulkFetchGooglePlacesSocietyImageReferences, type BulkGooglePlacesImageFetchSummary } from "@/lib/googlePlacesImageAdminApi";
import { isNcrMulticityEnabled } from "@/config/features";

const filters = ["All", "Verified", "Premium", "Draft", "Archived"];

function locationText(item: AdminSociety) {
  return [item.sector, item.locality, item.city].filter(Boolean).join(", ") || "Gurgaon";
}

function publicSocietyUrl(item: AdminSociety) {
  return `/society/${item.slug}`;
}

function editSocietyUrl(item: AdminSociety) {
  return `/admin/societies/${item.id}/edit`;
}

function getStatus(item: AdminSociety) {
  return item.status || "Draft";
}

function publishLabel(item: AdminSociety) {
  const liveByStatus = item.status === "Verified" || item.status === "Premium";
  return item.isPublished || liveByStatus ? "Published" : "Unpublished";
}



function cleanText(value: unknown) {
  return String(value || "").trim();
}

function hasValidAdminCoordinates(item: AdminSociety) {
  const lat = Number(cleanText(item.latitude));
  const lng = Number(cleanText(item.longitude));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;

  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function hasNearbyIntelligence(item: AdminSociety) {
  return Boolean(
    cleanText(item.nearbySchools) ||
      cleanText(item.nearbyMetro) ||
      cleanText(item.nearbyHospitals) ||
      cleanText(item.nearbyOfficeHubs),
  );
}

function hasFullNearbyIntelligence(item: AdminSociety) {
  return Boolean(
    cleanText(item.nearbySchools) &&
      cleanText(item.nearbyMetro) &&
      cleanText(item.nearbyHospitals) &&
      cleanText(item.nearbyOfficeHubs),
  );
}

function hasGoogleMapLink(item: AdminSociety) {
  return Boolean(cleanText(item.googleMapsUrl));
}

function dataCompletionStatus(item: AdminSociety) {
  const mapReady = hasValidAdminCoordinates(item);
  const nearbyReady = hasNearbyIntelligence(item);
  const fullNearbyReady = hasFullNearbyIntelligence(item);
  const googleMapReady = hasGoogleMapLink(item);

  if (mapReady && fullNearbyReady && googleMapReady) {
    return {
      label: "Launch ready",
      tone: "border-emerald-100 bg-emerald-50 text-emerald-700",
      helper: "Map, Google URL and nearby intelligence complete",
    };
  }

  if (mapReady && nearbyReady) {
    return {
      label: "Data partial",
      tone: "border-blue-100 bg-blue-50 text-blue-700",
      helper: "Map ready, nearby data partly complete",
    };
  }

  if (!mapReady) {
    return {
      label: "Needs coordinates",
      tone: "border-amber-100 bg-amber-50 text-amber-700",
      helper: "Add latitude and longitude",
    };
  }

  return {
    label: "Needs nearby",
    tone: "border-slate-200 bg-slate-50 text-slate-600",
    helper: "Add schools, metro, hospitals and office hubs",
  };
}

export function AdminSocietiesPage() {
  const ncrEnabled = isNcrMulticityEnabled();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("score");
  const [ncrFilter, setNcrFilter] = useState<NcrAdminLocationFilterValue>({ cityId: "", zoneId: "", localityId: "" });
  const [societies, setSocieties] = useState<AdminSociety[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<SocietyStatus>("Draft");
  const [bulkWorking, setBulkWorking] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [googleImageFetchLoading, setGoogleImageFetchLoading] = useState(false);
  const [googleImageFetchSummary, setGoogleImageFetchSummary] =
    useState<BulkGooglePlacesImageFetchSummary | null>(null);
  const [googleImageFetchError, setGoogleImageFetchError] = useState("");
  const [bulkNearbyAutoFillLoading, setBulkNearbyAutoFillLoading] = useState(false);
  const [bulkReEnrichLoading, setBulkReEnrichLoading] = useState(false);
  const [publishBackfillLoading, setPublishBackfillLoading] = useState(false);


  const handlePublishFieldBackfill = async () => {
    if (publishBackfillLoading) return;

    if (!window.confirm("Backfill publish fields for all societies? Verified/Premium will become published; Draft/Archived will become unpublished.")) {
      return;
    }

    try {
      setPublishBackfillLoading(true);
      setError("");
      setMessage("");

      const result = await backfillAdminSocietyPublishFields();
      const summary = result.summary;

      setMessage(
        `C112E-B publish field backfill complete: ${summary.updated} updated, ${summary.skipped} already synced, ${summary.published} published, ${summary.unpublished} unpublished.`,
      );

      await loadSocieties();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Publish field backfill failed.");
    } finally {
      setPublishBackfillLoading(false);
    }
  };

  const handleBulkGoogleImageFetch = async () => {
    try {
      setGoogleImageFetchLoading(true);
      setGoogleImageFetchError("");
      setMessage("");

      const result = await bulkFetchGooglePlacesSocietyImageReferences(5);
      setGoogleImageFetchSummary(result.summary);
      setMessage(
        `Google image reference fetch complete: ${result.summary.updated} updated, ${result.summary.failed} failed.`
      );

      await loadSocieties();
    } catch (err) {
      console.error(err);
      setGoogleImageFetchError(
        err instanceof Error ? err.message : "Bulk Google image reference fetch failed."
      );
    } finally {
      setGoogleImageFetchLoading(false);
    }
  };

  const loadSocieties = async () => {
    try {
      setLoading(true);
      setError("");
      setSocieties(await fetchAdminSocieties(ncrEnabled ? ncrFilter : {}));
    } catch (err) {
      console.error(err);
      setError("Unable to load societies from the live backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSocieties();
  }, [ncrFilter.cityId, ncrFilter.zoneId, ncrFilter.localityId]);

  const filteredSocieties = useMemo(() => {
    const rows = societies.filter((society) => {
      const searchText = [
        society.name,
        society.builder,
        society.locality,
        society.sector,
        society.status,
        society.slug,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = searchText.includes(query.toLowerCase());
      const matchesFilter = filter === "All" || society.status === filter;
      const matchesNcrCity = !ncrEnabled || !ncrFilter.cityId || Number(society.cityId) === Number(ncrFilter.cityId);
      const matchesNcrZone = !ncrEnabled || !ncrFilter.zoneId || Number(society.zoneId) === Number(ncrFilter.zoneId);
      const matchesNcrLocality = !ncrEnabled || !ncrFilter.localityId || society.localityId === ncrFilter.localityId;

      return matchesQuery && matchesFilter && matchesNcrCity && matchesNcrZone && matchesNcrLocality;
    });

    const sorted = [...rows];
    if (sortBy === "name") sorted.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    else if (sortBy === "listings") sorted.sort((a, b) => Number(b.propertiesCount || 0) - Number(a.propertiesCount || 0));
    else if (sortBy === "newest") sorted.sort((a, b) => Number(b.id) - Number(a.id));
    else sorted.sort((a, b) => Number(b.score || 0) - Number(a.score || 0)); // default: score high→low
    return sorted;
  }, [societies, query, filter, sortBy, ncrEnabled, ncrFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: societies.length };
    for (const item of societies) {
      const status = item.status || "Draft";
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [societies]);

  const publishedCount = societies.filter((item) => item.isPublished || item.status === "Verified" || item.status === "Premium").length;
  const featuredCount = societies.filter((item) => item.featured).length;
  const verifiedCount = societies.filter(
    (item) => item.status === "Verified" || item.status === "Premium",
  ).length;
  const premiumCount = societies.filter((item) => item.status === "Premium").length;
  const avgScore = societies.length
    ? (
        societies.reduce((sum, item) => sum + Number(item.score || 0), 0) /
        societies.length
      ).toFixed(1)
    : "0.0";
  const selectedSocieties = societies.filter((item) => selectedIds.includes(item.id));

  const locationDataSummary = {
    mapReady: societies.filter(hasValidAdminCoordinates).length,
    googleMapReady: societies.filter(hasGoogleMapLink).length,
    nearbyPartial: societies.filter(hasNearbyIntelligence).length,
    nearbyComplete: societies.filter(hasFullNearbyIntelligence).length,
    launchReady: societies.filter((society) => {
      return (
        hasValidAdminCoordinates(society) &&
        hasGoogleMapLink(society) &&
        hasFullNearbyIntelligence(society)
      );
    }).length,
  };

  const handleDelete = async (society: AdminSociety) => {
    if (deletingId) return;
    if (!window.confirm(`Delete "${society.name}" from the live backend?`)) return;

    try {
      setDeletingId(society.id);
      setError("");
      setMessage("");

      await deleteAdminSociety(society.id);
      setSocieties((current) => current.filter((item) => item.id !== society.id));
      setSelectedIds((current) => current.filter((id) => id !== society.id));
      setMessage(`Deleted "${society.name}".`);
    } catch (err) {
      console.error(err);
      setError("Failed to delete society. Please refresh and try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelected = (id: number, checked: boolean) => {
    setSelectedIds((current) =>
      checked
        ? Array.from(new Set([...current, id]))
        : current.filter((item) => item !== id),
    );
  };

  const selectFiltered = () => {
    setSelectedIds(filteredSocieties.map((item) => item.id));
  };

  const handleBulkNearbyAutoFill = async () => {
    if (!selectedSocieties.length || bulkNearbyAutoFillLoading) return;

    const batch = selectedSocieties.slice(0, 5);

    if (!window.confirm(`Auto-fill nearby intelligence for ${batch.length} selected societ${batch.length === 1 ? "y" : "ies"}? Backend will skip societies without valid coordinates and fill only empty nearby fields.`)) {
      return;
    }

    try {
      setBulkNearbyAutoFillLoading(true);
      setError("");
      setMessage("");

      const result = await bulkAutoFillNearbyIntelligence(batch.map((item) => item.id));
      const bulkResultDetails = result.results
        .filter((item) => item.status === "failed" || item.status === "skipped")
        .slice(0, 5)
        .map((item) => {
          const name = typeof item.name === "string" ? item.name : `ID ${item.id || ""}`;
          const message = typeof item.message === "string" ? item.message : "No detail returned.";
          return `${name}: ${message}`;
        });

      setMessage(
        bulkResultDetails.length
          ? `Selected ${batch.length}. ${result.message} ${bulkResultDetails.join(" | ")}`
          : `Selected ${batch.length}. ${result.message}`,
      );
      await loadSocieties();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Bulk nearby autofill failed.");
    } finally {
      setBulkNearbyAutoFillLoading(false);
    }
  };

  const handleBulkReEnrich = async () => {
    if (!selectedSocieties.length || bulkReEnrichLoading) return;

    const batch = selectedSocieties.slice(0, BULK_REENRICH_MAX);
    const publishedCount = batch.filter((item) => item.isPublished).length;
    const warning = publishedCount
      ? ` ${publishedCount} of them ${publishedCount === 1 ? "is" : "are"} published and will be unpublished, marked Needs Review, and require a manual republish after you check the new fields.`
      : "";

    if (
      !window.confirm(
        `Re-enrich ${batch.length} selected societ${batch.length === 1 ? "y" : "ies"} with grounded AI research?${warning}`,
      )
    ) {
      return;
    }

    try {
      setBulkReEnrichLoading(true);
      setError("");
      setMessage("");

      const result = await bulkReEnrichAdminSocieties(batch.map((item) => item.id), {
        confirmUnpublish: publishedCount > 0,
      });
      const bulkResultDetails = result.results
        .filter((item) => item.status === "failed")
        .slice(0, 5)
        .map((item) => {
          const name = typeof item.name === "string" ? item.name : `ID ${item.id || ""}`;
          const detail = typeof item.message === "string" ? item.message : "No detail returned.";
          return `${name}: ${detail}`;
        });

      setMessage(
        bulkResultDetails.length
          ? `${result.message} ${bulkResultDetails.join(" | ")}`
          : result.message,
      );
      await loadSocieties();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Bulk re-enrichment failed.");
    } finally {
      setBulkReEnrichLoading(false);
    }
  };

  const applyBulkStatus = async () => {
    if (!selectedSocieties.length || bulkWorking) return;

    if (!window.confirm(`Set ${selectedSocieties.length} selected societies to ${bulkStatus}?`)) {
      return;
    }

    try {
      setBulkWorking(true);
      setError("");
      setMessage("");

      const updated = await Promise.all(
        selectedSocieties.map((item) => updateAdminSocietyStatus(item.id, bulkStatus)),
      );

      setSocieties((current) =>
        current.map((item) => updated.find((next) => next.id === item.id) || item),
      );
      setMessage(`Updated ${updated.length} societies to ${bulkStatus}.`);
    } catch (err) {
      console.error(err);
      setError("Bulk update failed. Refresh and try again.");
    } finally {
      setBulkWorking(false);
    }
  };

  const quickSocietyPrimaryAction = (status: string): { label: string; nextStatus: SocietyStatus } => {
    if (status === "Verified") return { label: "Premium", nextStatus: "Premium" };
    if (status === "Premium") return { label: "Move Draft", nextStatus: "Draft" };
    return { label: "Verify", nextStatus: "Verified" };
  };

  const quickSocietyArchiveAction = (status: string): { label: string; nextStatus: SocietyStatus } => {
    if (status === "Archived") return { label: "Restore", nextStatus: "Draft" };
    return { label: "Archive", nextStatus: "Archived" };
  };

  const quickUpdateSocietyStatus = async (society: AdminSociety, nextStatus: SocietyStatus) => {
    if (statusUpdatingId) return;

    try {
      setStatusUpdatingId(society.id);
      setError("");
      setMessage("");

      const updated = await updateAdminSocietyStatus(society.id, nextStatus);

      setSocieties((current) =>
        current.map((item) => (item.id === society.id ? updated : item)),
      );

      setSelectedIds((current) =>
        nextStatus === "Archived" ? current.filter((id) => id !== society.id) : current,
      );

      setMessage(`Updated "${society.name}" to ${nextStatus}.`);
    } catch (err) {
      console.error(err);
      setError("Failed to update society status. Open Edit and save if this profile needs required fields.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const tabTone = (item: string) =>
    filter === item
      ? "bg-slate-900 text-white"
      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50";

  return (
    <AdminLayout title="Societies" subtitle="Manage society intelligence, status and public profiles">
      <div className="space-y-4">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Total societies", societies.length, "All profiles"],
            ["Published", publishedCount, "Live public profiles"],
            ["Featured", featuredCount, "Highlighted societies"],
            ["Avg. score", avgScore, "Society scoring"],
          ].map(([label, value, helper]) => (
            <AdminMetricCard key={String(label)} label={String(label)} value={loading ? "-" : value} helper={helper} />
          ))}
        </section>

        {message ? (
          <div className="rounded-2xl bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">{message}</div>
        ) : null}
        {error ? (
          <div className="rounded-2xl bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">{error}</div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">Society directory</h2>
              <p className="mt-0.5 text-sm text-slate-500">Search, sort, edit and publish Gurgaon society profiles.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="rounded-full border-slate-200 text-sm" onClick={loadSocieties} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button asChild variant="outline" className="rounded-full border-blue-100 bg-blue-50 text-sm font-bold text-blue-700 hover:bg-blue-100">
                <Link to="/admin/verified-society-importer">Auto Import</Link>
              </Button>
              <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700">
                <Link to="/admin/societies/new"><Plus className="mr-2 h-4 w-4" />Add Society</Link>
              </Button>
            </div>
          </div>

          {/* Status tabs with live counts */}
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold transition ${tabTone(item)}`}
              >
                {item}
                <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${filter === item ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                  {statusCounts[item] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search + sort */}
          <div className="mt-3 grid gap-2.5 lg:grid-cols-[1fr_200px]">
            <div className="flex h-10 items-center gap-2.5 rounded-xl border border-slate-200 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search society, builder, sector or locality"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
              aria-label="Sort societies"
            >
              <option value="score">Sort: Score (high→low)</option>
              <option value="name">Sort: Name (A→Z)</option>
              <option value="listings">Sort: Most listings</option>
              <option value="newest">Sort: Newest added</option>
            </select>
          </div>

          {ncrEnabled ? (
            <div className="mt-3">
              <NcrAdminLocationFilter
                value={ncrFilter}
                onChange={setNcrFilter}
                label="Filter societies by NCR city / zone / locality"
              />
            </div>
          ) : null}

          {/* Bulk action bar — only when rows are selected */}
          {selectedSocieties.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-2.5">
              <span className="px-1 text-sm font-bold text-blue-900">{selectedSocieties.length} selected</span>
              <select
                value={bulkStatus}
                onChange={(event) => setBulkStatus(event.target.value as SocietyStatus)}
                className="h-9 rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300"
              >
                <option>Draft</option>
                <option>Verified</option>
                <option>Premium</option>
                <option>Archived</option>
              </select>
              <Button type="button" size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700" onClick={applyBulkStatus} disabled={bulkWorking}>
                {bulkWorking ? "Applying..." : "Apply status"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full border-violet-200 text-violet-700"
                onClick={handleBulkReEnrich}
                disabled={bulkReEnrichLoading}
                title={`Re-runs grounded AI research + scoring for up to ${BULK_REENRICH_MAX} selected societies per click. Published ones are unpublished for review.`}
              >
                {bulkReEnrichLoading ? "Re-enriching..." : `Re-enrich with AI${selectedIds.length > BULK_REENRICH_MAX ? ` (first ${BULK_REENRICH_MAX})` : ""}`}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="rounded-full text-slate-500" onClick={() => setSelectedIds([])}>
                Clear
              </Button>
            </div>
          ) : null}

          {googleImageFetchError && (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{googleImageFetchError}</div>
          )}
          {googleImageFetchSummary && (
            <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
              Google Places image fetch complete — checked {googleImageFetchSummary.total_checked}, updated {googleImageFetchSummary.updated}, failed {googleImageFetchSummary.failed}. Reference-only images stay unapproved for licensing review.
            </div>
          )}

          {/* Table */}
          <div className="mt-4">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">Loading societies...</div>
            ) : !filteredSocieties.length ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
                <p className="text-lg font-bold text-slate-950">No societies found</p>
                <p className="mt-2 text-sm text-slate-500">Try changing filters or create a new society profile.</p>
                <Button asChild className="mt-5 rounded-full bg-blue-600 hover:bg-blue-700"><Link to="/admin/societies/new">Add Society</Link></Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                      <th className="w-10 px-3 py-2.5">
                        <input
                          type="checkbox"
                          aria-label="Select all filtered"
                          checked={filteredSocieties.length > 0 && filteredSocieties.every((s) => selectedIds.includes(s.id))}
                          onChange={(event) => (event.target.checked ? selectFiltered() : setSelectedIds([]))}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-3 py-2.5">Society</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-center">Score</th>
                      <th className="px-3 py-2.5 text-center">Listings</th>
                      <th className="px-3 py-2.5">Data</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSocieties.map((item) => {
                      const selected = selectedIds.includes(item.id);
                      const status = getStatus(item);
                      const completion = dataCompletionStatus(item);
                      const primary = quickSocietyPrimaryAction(status);
                      const archive = quickSocietyArchiveAction(status);

                      return (
                        <tr key={item.id} className={`border-b border-slate-100 align-middle transition hover:bg-slate-50/70 ${selected ? "bg-blue-50/40" : "bg-white"}`}>
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(event) => toggleSelected(item.id, event.target.checked)}
                              aria-label={`Select ${item.name}`}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-950">{item.name}</span>
                              {item.featured ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : null}
                              {item.coverImage ? <Image className="h-3.5 w-3.5 text-slate-400" /> : null}
                            </div>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="h-3 w-3" />
                              {locationText(item)} · {item.builder || "Builder n/a"}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <AdminBadge value={status}>{status}</AdminBadge>
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${publishLabel(item) === "Published" ? "text-emerald-600" : "text-slate-400"}`}>
                                <Globe2 className="h-3 w-3" />{publishLabel(item)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-slate-950">{item.score || "-"}</td>
                          <td className="px-3 py-3 text-center font-semibold text-slate-700">{item.propertiesCount || 0}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${completion.tone}`} title={completion.helper}>
                              {completion.label}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-full text-slate-500 hover:text-blue-700" title="View public profile">
                                <Link to={publicSocietyUrl(item)}><Eye className="h-4 w-4" /></Link>
                              </Button>
                              <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-full text-slate-500 hover:text-blue-700" title="Edit">
                                <Link to={editSocietyUrl(item)}><Edit3 className="h-4 w-4" /></Link>
                              </Button>
                              <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-full text-slate-500 hover:text-blue-700" title="Properties">
                                <Link to={`/admin/properties?society=${encodeURIComponent(item.name)}`}><Building2 className="h-4 w-4" /></Link>
                              </Button>
                              <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-full text-slate-500 hover:text-blue-700" title="Leads">
                                <Link to={`/admin/leads?q=${encodeURIComponent(item.name)}`}><MessageSquareText className="h-4 w-4" /></Link>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className={primary.nextStatus === "Verified" ? "h-8 rounded-full bg-emerald-600 px-3 text-xs font-bold hover:bg-emerald-700" : "h-8 rounded-full bg-blue-600 px-3 text-xs font-bold hover:bg-blue-700"}
                                onClick={() => quickUpdateSocietyStatus(item, primary.nextStatus)}
                                disabled={statusUpdatingId === item.id}
                              >
                                {statusUpdatingId === item.id ? "..." : primary.label}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className={archive.nextStatus === "Archived" ? "h-8 rounded-full border-rose-200 px-3 text-xs font-bold text-rose-700" : "h-8 rounded-full border-slate-200 px-3 text-xs font-bold text-slate-600"}
                                onClick={() => quickUpdateSocietyStatus(item, archive.nextStatus)}
                                disabled={statusUpdatingId === item.id}
                              >
                                {archive.label}
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() => handleDelete(item)}
                                disabled={deletingId === item.id}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Secondary readiness panels, de-emphasized below the directory */}
        <details className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-5 py-4 text-sm font-bold text-slate-700">
            Data completion & SEO readiness
          </summary>
          <div className="space-y-3 border-t border-slate-100 p-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Map ready", locationDataSummary.mapReady],
                ["Google URL", locationDataSummary.googleMapReady],
                ["Nearby partial", locationDataSummary.nearbyPartial],
                ["Nearby complete", locationDataSummary.nearbyComplete],
                ["Launch ready", locationDataSummary.launchReady],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{loading ? "-" : value}</p>
                </div>
              ))}
            </div>
            <SocietySeoReadinessPanel />
          </div>
        </details>
      </div>
    </AdminLayout>
  );
}
