import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { backendApi } from "@/services/backendApi";

const statuses = ["submitted", "reviewing", "accepted", "rejected", "disputed"];

export function AdminIntelligenceCorrectionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = () => {
    setLoading(true);
    backendApi
      .request("/admin/intelligence-corrections?per_page=100")
      .then((payload) => setItems(payload?.data?.data || []))
      .catch((error) => setMessage(error?.message || "Unable to load corrections."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const patchItem = async (item: any) => {
    setMessage("");
    try {
      const payload = await backendApi.request(`/admin/intelligence-corrections/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: item.status || "reviewing",
          admin_resolution_note: item.admin_resolution_note || "",
        }),
      });
      setItems((current) => current.map((entry) => (entry.id === item.id ? payload.data : entry)));
      setMessage("Correction updated.");
    } catch (error: any) {
      setMessage(error?.message || "Unable to update correction.");
    }
  };

  return (
    <AdminLayout title="Intelligence corrections" subtitle="Review public challenges before changing any society intelligence.">
      <div className="mb-4 flex flex-wrap gap-3">
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/admin/societies"><ArrowLeft className="mr-2 h-4 w-4" /> Societies</Link>
        </Button>
        <Button onClick={load} variant="outline" className="rounded-full">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {message ? <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-700">{message}</div> : null}

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-3xl border bg-white p-8 text-slate-500">Loading corrections…</div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border bg-white p-8 text-slate-500">No correction submissions yet.</div>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">#{item.id} · {item.information_key || "General correction"}</p>
                  <h2 className="mt-1 text-xl font-black">{item.society?.name || item.society_name || "Society not specified"}</h2>
                  <p className="mt-1 text-sm text-slate-500">{item.name} · {item.email} {item.phone ? `· ${item.phone}` : ""}</p>
                </div>
                <select
                  value={item.status || "submitted"}
                  onChange={(event) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: event.target.value } : entry))}
                  className="rounded-full border px-4 py-2 text-sm font-bold"
                >
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Information challenged</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6">{item.information_challenged}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Suggested correction</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6">{item.suggested_correction}</p>
                  {item.supporting_url ? <a className="mt-2 inline-block text-sm font-bold text-blue-700 underline" href={item.supporting_url} target="_blank" rel="noreferrer">Supporting URL</a> : null}
                </div>
              </div>
              <label className="mt-4 block">
                <span className="text-sm font-bold text-slate-600">Admin resolution note</span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded-2xl border p-3"
                  value={item.admin_resolution_note || ""}
                  onChange={(event) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, admin_resolution_note: event.target.value } : entry))}
                />
              </label>
              <div className="mt-4 flex gap-3">
                {item.society?.id ? (
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to={`/admin/societies/${item.society.id}/intelligence`}>Open intelligence</Link>
                  </Button>
                ) : null}
                <Button onClick={() => patchItem(item)} className="rounded-full bg-slate-950 text-white">
                  <Save className="mr-2 h-4 w-4" /> Save review
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminIntelligenceCorrectionsPage;
