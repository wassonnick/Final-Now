from pathlib import Path

path = Path("frontend/src/pages/admin/AdminSocietiesPage.tsx")

path.write_text(r'''import { useEffect, useMemo, useState } from "react";
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
  deleteAdminSociety,
  fetchAdminSocieties,
  updateAdminSocietyStatus,
} from "@/lib/adminSocietyStore";
import type { AdminSociety, SocietyStatus } from "@/lib/adminSocietyStore";

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

  return (
    <AdminLayout title="Societies" subtitle="Manage society intelligence, status and public profiles">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Total societies", societies.length, "All profiles"],
            ["Verified / Premium", verifiedCount, "Public trust profiles"],
            ["Featured", featuredCount, "Highlighted societies"],
            ["Avg. score", avgScore, "Society scoring"],
          ].map(([label, value, helper]) => (
            <div
              key={String(label)}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-3 text-4xl font-bold text-slate-950">
                {loading ? "-" : value}
              </p>
              <p className="mt-2 text-sm text-blue-600">{helper}</p>
            </div>
          ))}
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

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Society directory
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search, edit and publish Gurgaon society profiles.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-slate-200"
                onClick={loadSocieties}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <Button asChild variant="outline" className="rounded-full border-slate-200">
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

          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_190px]">
            <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 px-4">
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
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            >
              {filters.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
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
                className="rounded-full border-slate-200"
                onClick={selectFiltered}
                disabled={!filteredSocieties.length}
              >
                Select all
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-slate-200"
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

          <div className="mt-6">
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
              <div className="grid gap-4">
                {filteredSocieties.map((item) => {
                  const selected = selectedIds.includes(item.id);
                  const status = getStatus(item);

                  return (
                    <article
                      key={item.id}
                      className={`rounded-[28px] border bg-white p-5 shadow-sm transition hover:border-blue-100 hover:shadow-lg ${
                        selected ? "border-blue-200 ring-2 ring-blue-50" : "border-slate-200"
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex gap-4">
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
                            </div>

                            <h3 className="mt-3 text-xl font-bold text-slate-950">
                              {item.name}
                            </h3>

                            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                              <MapPin className="h-4 w-4" />
                              {locationText(item)}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {item.builder || "Builder n/a"} • /{item.slug}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 rounded-[22px] bg-slate-50 p-3 text-center xl:min-w-[300px]">
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

                      <div className="mt-5 flex flex-wrap gap-2">
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

        <section className="rounded-[28px] border border-blue-100 bg-blue-50 p-5">
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
''', encoding="utf-8")

print("C6B AdminSocietiesPage mobile + quick actions applied.")
