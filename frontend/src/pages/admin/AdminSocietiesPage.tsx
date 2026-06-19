// C82 admin societies list polish: compact metrics, filters and society cards without logic changes.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Building2,
  Edit3,
  Eye,
  Image,
  Link as LinkIcon,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  bulkAutoFillNearbyIntelligence,
  deleteAdminSociety,
  fetchAdminSocieties,
  updateAdminSocietyStatus,
} from "@/lib/adminSocietyStore";
import type { AdminSociety, SocietyStatus } from "@/lib/adminSocietyStore";
import { bulkFetchGooglePlacesSocietyImageReferences, type BulkGooglePlacesImageFetchSummary } from "@/lib/googlePlacesImageAdminApi";

const filters = ["All", "Verified", "Premium", "Draft", "Archived"];

const statusTone: Record<string, string> = {
  Verified: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Premium: "bg-blue-50 text-blue-700 border-blue-100",
  Draft: "bg-slate-100 text-slate-600 border-slate-200",
  Archived: "bg-rose-50 text-rose-700 border-rose-100",
};

function locationText(item: AdminSociety) {
  return [item.sector, item.locality].filter(Boolean).join(", ") || "Gurgaon";
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
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
      setSocieties(await fetchAdminSocieties());
    } catch (err) {
      console.error(err);
      setError("Unable to load societies from the live backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSocieties();
  }, []);

  const filteredSocieties = useMemo(() => {
    return societies.filter((society) => {
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

      return matchesQuery && matchesFilter;
    });
  }, [societies, query, filter]);

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

    const eligible = selectedSocieties
      .filter((item) => hasValidAdminCoordinates(item))
      .slice(0, 5);

    if (!eligible.length) {
      setError("Select societies with valid coordinates before running nearby autofill.");
      return;
    }

    if (!window.confirm(`Auto-fill nearby intelligence for ${eligible.length} selected societ${eligible.length === 1 ? "y" : "ies"}? This uses Google Places and fills only empty nearby fields.`)) {
      return;
    }

    try {
      setBulkNearbyAutoFillLoading(true);
      setError("");
      setMessage("");

      const result = await bulkAutoFillNearbyIntelligence(eligible.map((item) => item.id));
      setMessage(result.message);
      await loadSocieties();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Bulk nearby autofill failed.");
    } finally {
      setBulkNearbyAutoFillLoading(false);
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

  return (
    <AdminLayout title="Societies" subtitle="Manage society intelligence, status and public profiles">
      <div className="space-y-3.5 md:space-y-5">
        <section className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
          {[
            ["Total societies", societies.length, "All profiles"],
            ["Verified / Premium", verifiedCount, "Public trust profiles"],
            ["Featured", featuredCount, "Highlighted societies"],
            ["Avg. score", avgScore, "Society scoring"],
          ].map(([label, value, helper]) => (
            <div
              key={String(label)}
              className="rounded-[18px] border border-slate-200 bg-white p-3.5 shadow-sm md:rounded-[22px] md:p-4"
            >
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-1.5 text-2xl font-bold text-slate-950 md:mt-2 md:text-3xl">
                {loading ? "-" : value}
              </p>
              <p className="mt-1.5 text-xs font-semibold text-blue-600 md:text-sm">{helper}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[20px] border border-blue-100 bg-blue-50/60 p-3.5 shadow-sm md:rounded-[24px] md:p-4">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                C106 data completion
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">
                Location and nearby intelligence readiness
              </h2>
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Use this before publishing or featuring society pages.
            </p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Map ready", locationDataSummary.mapReady, "Valid coordinates"],
              ["Google URL", locationDataSummary.googleMapReady, "Map link saved"],
              ["Nearby partial", locationDataSummary.nearbyPartial, "Some nearby data"],
              ["Nearby complete", locationDataSummary.nearbyComplete, "All nearby fields"],
              ["Launch ready", locationDataSummary.launchReady, "Map + nearby complete"],
            ].map(([label, value, helper]) => (
              <div key={String(label)} className="rounded-2xl border border-blue-100 bg-white px-3 py-2.5">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-blue-500">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">{loading ? "-" : value}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{helper}</p>
              </div>
            ))}
          </div>
        </section>

        {message ? (
          <div className="rounded-2xl bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-sm md:rounded-[24px] md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Society directory
              </h2>
              <p className="mt-1 text-xs text-slate-500 md:text-sm">
                Search, edit and publish Gurgaon society profiles.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-slate-200 px-3 text-xs sm:text-sm"
                onClick={loadSocieties}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-amber-200 bg-amber-50 px-3 text-xs text-amber-800 hover:bg-amber-100 sm:text-sm"
                onClick={() => void handleBulkGoogleImageFetch()}
                disabled={googleImageFetchLoading}
              >
                <Image className={`mr-2 h-4 w-4 ${googleImageFetchLoading ? "animate-pulse" : ""}`} />
                {googleImageFetchLoading ? "Fetching refs..." : "Fetch Google refs"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="rounded-full border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 sm:text-sm"
                onClick={() => void handleBulkNearbyAutoFill()}
                disabled={bulkNearbyAutoFillLoading || !selectedSocieties.length}
                title="Select up to 5 societies with valid coordinates. Only empty nearby fields are filled."
              >
                <MapPin className={`mr-2 h-4 w-4 ${bulkNearbyAutoFillLoading ? "animate-pulse" : ""}`} />
                {bulkNearbyAutoFillLoading ? "Filling nearby..." : "Auto-fill nearby"}
              </Button>


              <Button asChild variant="outline" className="rounded-full border-blue-100 bg-blue-50 px-3 text-xs text-blue-700 hover:bg-blue-100 sm:text-sm">
                <Link to="/admin/societies/import">
                  Auto Import
                </Link>
              </Button>

              <Button asChild variant="outline" className="rounded-full border-slate-200 px-3 text-xs sm:text-sm">
                <Link to="/admin/societies/new-from-url">
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Add from URL
                </Link>
              </Button>

              <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700">
                <Link to="/admin/societies/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Society
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-3 grid gap-2.5 lg:mt-4 lg:grid-cols-[1fr_180px] lg:gap-3">
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
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            >
              {filters.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-col gap-2.5 rounded-[18px] border border-slate-200 bg-slate-50 p-3 md:mt-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-900">{filteredSocieties.length}</span>{" "}
              matching societies.{" "}
              <span className="font-semibold text-slate-900">{selectedSocieties.length}</span>{" "}
              selected.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-slate-200 px-3 text-xs sm:text-sm"
                onClick={selectFiltered}
                disabled={!filteredSocieties.length}
              >
                Select all
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-slate-200 px-3 text-xs sm:text-sm"
                onClick={() => setSelectedIds([])}
                disabled={!selectedIds.length}
              >
                Clear
              </Button>

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

              <Button
                type="button"
                size="sm"
                className="rounded-full bg-blue-600 hover:bg-blue-700"
                onClick={applyBulkStatus}
                disabled={!selectedIds.length || bulkWorking}
              >
                {bulkWorking ? "Applying..." : "Apply status"}
              </Button>
            </div>
          </div>

          <div className="mt-3 md:mt-4">
  
          {googleImageFetchError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {googleImageFetchError}
            </div>
          )}

          {googleImageFetchSummary && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-950">
                    Google Places image reference fetch complete
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    Reference-only images remain unapproved for ownership/licensing review.
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-white/80 px-3 py-2">
                    <p className="text-amber-700">Checked</p>
                    <p className="font-semibold text-amber-950">{googleImageFetchSummary.total_checked}</p>
                  </div>
                  <div className="rounded-xl bg-white/80 px-3 py-2">
                    <p className="text-amber-700">Updated</p>
                    <p className="font-semibold text-amber-950">{googleImageFetchSummary.updated}</p>
                  </div>
                  <div className="rounded-xl bg-white/80 px-3 py-2">
                    <p className="text-amber-700">Failed</p>
                    <p className="font-semibold text-amber-950">{googleImageFetchSummary.failed}</p>
                  </div>
                  <div className="rounded-xl bg-white/80 px-3 py-2">
                    <p className="text-amber-700">Limit</p>
                    <p className="font-semibold text-amber-950">{googleImageFetchSummary.limit}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
                Loading societies...
              </div>
            ) : null}

            {!loading && !filteredSocieties.length ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-10 text-center">
                <p className="text-lg font-bold text-slate-950">No societies found</p>
                <p className="mt-2 text-sm text-slate-500">
                  Try changing filters or create a new society profile.
                </p>
                <Button asChild className="mt-5 rounded-full bg-blue-600 hover:bg-blue-700">
                  <Link to="/admin/societies/new">Add Society</Link>
                </Button>
              </div>
            ) : null}

            {!loading && filteredSocieties.length ? (
              <div className="grid gap-2.5 md:gap-3">
                {filteredSocieties.map((item) => {
                  const selected = selectedIds.includes(item.id);
                  const status = getStatus(item);

                  return (
                    <article
                      key={item.id}
                      className={`rounded-[18px] border bg-white p-3.5 shadow-sm transition hover:border-blue-100 hover:shadow-md md:rounded-[22px] md:p-4 ${
                        selected ? "border-blue-200 ring-2 ring-blue-50" : "border-slate-200"
                      }`}
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex gap-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) => toggleSelected(item.id, event.target.checked)}
                            aria-label={`Select ${item.name}`}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />

                          <div className="min-w-0">
                            <div className="flex flex-wrap gap-2">
                              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone[status] || statusTone.Draft}`}>
                                {status}
                              </span>

                              {item.featured ? (
                                <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                  <Star className="mr-1 h-3 w-3" />
                                  Featured
                                </span>
                              ) : null}

                              {item.coverImage ? (
                                <span className="inline-flex items-center rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                                  <Image className="mr-1 h-3 w-3" />
                                  Image
                                </span>
                              ) : null}

                              {(() => {
                                const completion = dataCompletionStatus(item);

                                return (
                                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${completion.tone}`} title={completion.helper}>
                                    <MapPin className="mr-1 h-3 w-3" />
                                    {completion.label}
                                  </span>
                                );
                              })()}
                            </div>

                            <h3 className="mt-2 text-base font-bold text-slate-950 md:text-lg">
                              {item.name}
                            </h3>

                            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 md:text-sm">
                              <MapPin className="h-4 w-4" />
                              {locationText(item)}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {item.builder || "Builder n/a"} • /{item.slug}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                              <span className={`rounded-full px-2 py-1 ${hasValidAdminCoordinates(item) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                {hasValidAdminCoordinates(item) ? "Coordinates OK" : "Coordinates missing"}
                              </span>
                              <span className={`rounded-full px-2 py-1 ${hasGoogleMapLink(item) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                {hasGoogleMapLink(item) ? "Google map URL" : "No map URL"}
                              </span>
                              <span className={`rounded-full px-2 py-1 ${hasFullNearbyIntelligence(item) ? "bg-emerald-50 text-emerald-700" : hasNearbyIntelligence(item) ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                                {hasFullNearbyIntelligence(item) ? "Nearby complete" : hasNearbyIntelligence(item) ? "Nearby partial" : "Nearby pending"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 rounded-[16px] bg-slate-50 p-2.5 text-center xl:min-w-[280px]">
                          <div>
                            <p className="text-xs text-slate-400">Score</p>
                            <p className="mt-1 font-bold text-slate-950">{item.score || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Rent</p>
                            <p className="mt-1 truncate font-bold text-slate-950">
                              {item.rentRange || "n/a"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Listings</p>
                            <p className="mt-1 font-bold text-slate-950">
                              {item.propertiesCount || 0}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 sm:flex sm:flex-wrap sm:border-t-0 sm:pt-0 md:mt-4">
                        <Button asChild size="sm" variant="outline" className="rounded-full border-slate-200">
                          <Link to={publicSocietyUrl(item)}>
                            <Eye className="mr-1.5 h-4 w-4" />
                            View
                          </Link>
                        </Button>

                        <Button asChild size="sm" variant="outline" className="rounded-full border-slate-200">
                          <Link to={editSocietyUrl(item)}>
                            <Edit3 className="mr-1.5 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>

                        <Button asChild size="sm" variant="outline" className="rounded-full border-slate-200">
                          <Link to={`/admin/properties?society=${encodeURIComponent(item.name)}`}>
                            <Building2 className="mr-1.5 h-4 w-4" />
                            Properties
                          </Link>
                        </Button>

                        <Button asChild size="sm" variant="outline" className="rounded-full border-slate-200">
                          <Link to={`/admin/societies/new-from-url?name=${encodeURIComponent(item.name)}`}>
                            <LinkIcon className="mr-1.5 h-4 w-4" />
                            Enrich URL
                          </Link>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant={quickSocietyPrimaryAction(status).nextStatus === "Verified" ? "default" : "outline"}
                          className={
                            quickSocietyPrimaryAction(status).nextStatus === "Verified"
                              ? "rounded-full bg-emerald-600 px-3 text-xs font-bold hover:bg-emerald-700 sm:text-sm"
                              : "rounded-full border-blue-200 px-3 text-xs font-bold text-blue-700 sm:text-sm"
                          }
                          onClick={() => quickUpdateSocietyStatus(item, quickSocietyPrimaryAction(status).nextStatus)}
                          disabled={statusUpdatingId === item.id}
                        >
                          {statusUpdatingId === item.id ? "Updating..." : quickSocietyPrimaryAction(status).label}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={
                            quickSocietyArchiveAction(status).nextStatus === "Archived"
                              ? "rounded-full border-rose-200 px-3 text-xs font-bold text-rose-700 sm:text-sm"
                              : "rounded-full border-slate-200 px-3 text-xs font-bold text-slate-700 sm:text-sm"
                          }
                          onClick={() => quickUpdateSocietyStatus(item, quickSocietyArchiveAction(status).nextStatus)}
                          disabled={statusUpdatingId === item.id}
                        >
                          {quickSocietyArchiveAction(status).label}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="rounded-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" />
                          {deletingId === item.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[20px] border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <BarChart3 className="mt-1 h-5 w-5 text-blue-700" />
            <div>
              <h3 className="font-bold text-slate-950">Society workflow note</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Keep societies in Draft while data/images are being verified. Move them
                to Verified or Premium only after public-safe details are ready.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
