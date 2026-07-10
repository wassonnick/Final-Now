import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Home, RefreshCw, XCircle } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/adminApi";

type OwnerListingRow = {
  id: number;
  name: string;
  phone: string;
  purpose: "rent" | "sale";
  listing_type: "apartment" | "builder_floor";
  society_name?: string | null;
  society?: { id: number; name: string; slug: string } | null;
  tower?: string | null;
  bhk?: string | null;
  size_sqft?: string | null;
  floor?: string | null;
  furnishing?: string | null;
  availability?: string | null;
  expected_price?: string | null;
  details?: string | null;
  images?: string[] | null;
  status: string;
  admin_notes?: string | null;
  property_id?: number | null;
  created_at?: string;
};

const statusTone: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700",
  under_review: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
  converted: "bg-slate-900 text-white",
};

export function AdminOwnerListingsPage() {
  const [rows, setRows] = useState<OwnerListingRow[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    adminFetch(`/admin/owner-listings${status ? `?status=${status}` : ""}`)
      .then((response) => response.json())
      .then((json) => setRows(json?.data?.data || json?.data || []))
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load listings."));
  }, [status]);
  useEffect(load, [load]);

  const act = async (key: string, path: string, method: string, body?: Record<string, unknown>) => {
    setBusy(key);
    setMessage("");
    try {
      const response = await adminFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || "Action failed.");
      setMessage(json?.message || "Done.");
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy("");
    }
  };

  return (
    <AdminLayout title="Owner Listings" subtitle="Flat and builder-floor submissions from the public intake — verify, then convert to a property draft. Nothing goes live without you.">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {["", "submitted", "under_review", "approved", "rejected", "converted"].map((value) => (
          <button key={value || "all"} onClick={() => setStatus(value)}
            className={`rounded-full px-4 py-2 text-sm font-black ${status === value ? "bg-slate-950 text-white" : "border bg-white text-slate-600"}`}>
            {value ? value.replace("_", " ") : "All"}
          </button>
        ))}
        <Button variant="ghost" size="sm" className="rounded-full" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      {message ? <p className="mb-5 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {rows.map((row) => (
          <article key={row.id} className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${statusTone[row.status] || "bg-slate-100 text-slate-700"}`}>{row.status.replace("_", " ")}</span>
                <h3 className="mt-2 text-lg font-black text-slate-950">
                  {[row.bhk ? `${row.bhk} BHK` : null, row.listing_type === "builder_floor" ? "Builder floor" : "Apartment", row.purpose === "rent" ? "· Rent" : "· Sale"].filter(Boolean).join(" ")}
                </h3>
                <p className="text-sm text-slate-600">{row.society?.name || row.society_name || "Society not specified"}{row.tower ? ` · ${row.tower}` : ""}</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p className="font-black text-slate-900">{row.expected_price || "Price on call"}</p>
                <p>{row.name} · {row.phone}</p>
                <p>{row.created_at ? new Date(row.created_at).toLocaleString("en-IN") : ""}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 md:grid-cols-4">
              {[["Size", row.size_sqft], ["Floor", row.floor], ["Furnishing", row.furnishing], ["Available", row.availability]].map(([label, value]) => (
                <p key={String(label)}><span className="text-slate-400">{label}:</span> {value || "—"}</p>
              ))}
            </div>
            {row.details ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{row.details}</p> : null}

            {row.images?.length ? (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {row.images.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="shrink-0 overflow-hidden rounded-xl border">
                    <img src={url} alt="Listing photo" className="h-20 w-28 object-cover" />
                  </a>
                ))}
              </div>
            ) : <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">No photos attached — collect during the verification call.</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              {row.status === "converted" && row.property_id ? (
                <Button asChild variant="outline" className="rounded-full"><Link to={`/admin/properties?id=${row.property_id}`}><Home className="mr-2 h-4 w-4" />Open property draft #{row.property_id}</Link></Button>
              ) : (
                <>
                  {row.status !== "approved" && row.status !== "rejected" ? (
                    <Button disabled={Boolean(busy)} onClick={() => void act(`review-${row.id}`, `/admin/owner-listings/${row.id}`, "PATCH", { status: "under_review" })} variant="outline" className="rounded-full">Mark under review</Button>
                  ) : null}
                  {row.status !== "rejected" ? (
                    <Button disabled={Boolean(busy)} onClick={() => void act(`convert-${row.id}`, `/admin/owner-listings/${row.id}/convert`, "POST")} className="rounded-full bg-emerald-700 hover:bg-emerald-800">
                      <CheckCircle2 className="mr-2 h-4 w-4" />{busy === `convert-${row.id}` ? "Converting…" : "Convert to property draft"}
                    </Button>
                  ) : null}
                  {row.status !== "rejected" ? (
                    <Button disabled={Boolean(busy)} onClick={() => void act(`reject-${row.id}`, `/admin/owner-listings/${row.id}`, "PATCH", { status: "rejected" })} variant="outline" className="rounded-full text-rose-700">
                      <XCircle className="mr-2 h-4 w-4" />Reject
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {!rows.length ? <div className="rounded-[1.5rem] border bg-white p-10 text-center font-black text-slate-500">No listings {status ? `with status "${status.replace("_", " ")}"` : "yet"} — submissions from the Sell page land here.</div> : null}
    </AdminLayout>
  );
}
