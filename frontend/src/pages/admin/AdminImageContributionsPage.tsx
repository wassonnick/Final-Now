import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ScanEye, ShieldCheck, XCircle } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  approveContribution,
  fetchContributions,
  rejectContribution,
  ROLE_LABELS,
  screenContribution,
  type ImageContribution,
} from "@/lib/imageContributionApi";
import { screenReasonLabel } from "@/lib/imageReharvestApi";

const TABS: Array<{ value: "pending" | "approved" | "rejected"; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function AdminImageContributionsPage() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<ImageContribution[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async (next = tab) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchContributions(next);
      setRows(data.contributions || []);
      setCounts(data.counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Contributions could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const act = async (id: number, run: () => Promise<unknown>, done: string) => {
    setBusy(id);
    setError("");
    setMessage("");
    try {
      await run();
      setMessage(done);
      await load(tab);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That action failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout
      title="Contributed images"
      subtitle="Photos sent in by residents, owners, RWAs and developers — the one source that arrives with permission to publish already attached."
    >
      {error ? (
        <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>
      ) : null}
      {message ? (
        <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</div>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={tab === option.value ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setTab(option.value)}
          >
            {option.label} ({counts[option.value]})
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-[28px] border border-slate-200 bg-white p-8 font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="font-bold text-slate-700">Nothing {tab} right now.</p>
          <p className="mt-1 text-sm text-slate-500">
            Contributions arrive from the “Add a photo” action on a society page and from the RWA and builder portals.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {rows.map((row) => (
            <article key={row.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              {row.image_url ? (
                <img
                  src={row.image_url}
                  alt={row.caption || "Contributed society image"}
                  className="h-56 w-full bg-slate-100 object-cover"
                  loading="lazy"
                />
              ) : null}

              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-xl font-black text-slate-950">{row.society?.name || `Society #${row.society_id}`}</h2>
                    <p className="text-sm text-slate-500">
                      {ROLE_LABELS[row.contributor_role] || row.contributor_role} · {row.contributor_name || "unnamed"}
                      {row.width ? ` · ${row.width}×${row.height}` : ""}
                    </p>
                  </div>
                  {row.used_as_cover ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">used as cover</span>
                  ) : null}
                </div>

                {row.caption ? <p className="mt-2 text-sm font-semibold text-slate-700">“{row.caption}”</p> : null}

                {/* The grant is what makes publishing defensible, so show the exact
                    wording agreed to rather than a tick. */}
                <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  <span className="font-bold text-slate-800">Rights granted: </span>
                  {row.rights_statement || "No statement recorded."}
                </p>

                {row.screen?.verdict === "rejected" ? (
                  <p className="mt-2 text-xs font-bold text-red-700">
                    Screen says: {(row.screen.reasons || []).map(screenReasonLabel).join(", ") || "unsuitable"}
                  </p>
                ) : row.screen?.verdict === "ok" ? (
                  <p className="mt-2 text-xs font-bold text-emerald-700">Screen: looks publishable</p>
                ) : row.screen ? (
                  <p className="mt-2 text-xs font-bold text-amber-700">Not screened{row.screen.note ? `: ${row.screen.note}` : ""}</p>
                ) : null}

                {row.review_notes ? <p className="mt-2 text-xs text-slate-500">Note: {row.review_notes}</p> : null}

                {row.status === "pending" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="rounded-full"
                      disabled={busy === row.id}
                      onClick={() => void act(row.id, () => approveContribution(row.id, true), "Published as the society cover.")}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Approve as cover
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      disabled={busy === row.id}
                      onClick={() => void act(row.id, () => approveContribution(row.id, false), "Added to the society gallery.")}
                    >
                      Add to gallery
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      disabled={busy === row.id}
                      onClick={() => void act(row.id, () => screenContribution(row.id), "Screened.")}
                    >
                      <ScanEye className="mr-2 h-4 w-4" /> Screen
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full text-red-700"
                      disabled={busy === row.id}
                      onClick={() => {
                        const notes = window.prompt("Why is this being rejected? (optional)") || undefined;
                        void act(row.id, () => rejectContribution(row.id, notes), "Rejected.");
                      }}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
