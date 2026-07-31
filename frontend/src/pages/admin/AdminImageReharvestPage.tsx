import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ImageIcon, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  fetchReharvestRun,
  fetchReharvestRuns,
  startReharvestRun,
  type ReharvestRun,
  type ReharvestScope,
} from "@/lib/imageReharvestApi";

const SCOPES: Array<{ value: ReharvestScope; label: string; help: string }> = [
  {
    value: "missing_images",
    label: "Societies without an approved image",
    help: "The 'missing photos' number on the dashboard. Start here.",
  },
  {
    value: "unscreened",
    label: "Never screened",
    help: "Imported before the image screen existed; their candidates have never been checked for posters, phone numbers or people.",
  },
  { value: "all", label: "Everything", help: "A full pass over the catalogue. Slowest and most expensive." },
];

function Stat({ label, value, tone = "slate" }: { label: string; value: number; tone?: string }) {
  const tones: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-black ${tones[tone] || tones.slate}`}>{value}</p>
    </div>
  );
}

function statusChip(status: string) {
  const map: Record<string, string> = {
    refreshed: "bg-emerald-50 text-emerald-700",
    no_candidates: "bg-amber-50 text-amber-700",
    all_rejected: "bg-amber-50 text-amber-700",
    failed: "bg-red-50 text-red-700",
  };
  return map[status] || "bg-slate-100 text-slate-700";
}

export function AdminImageReharvestPage() {
  const [scope, setScope] = useState<ReharvestScope>("missing_images");
  const [screen, setScreen] = useState(true);
  const [republish, setRepublish] = useState(true);
  const [limit, setLimit] = useState(50);
  const [run, setRun] = useState<ReharvestRun | null>(null);
  const [history, setHistory] = useState<ReharvestRun[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const poll = useRef<number | null>(null);

  const loadHistory = async () => {
    try {
      setHistory(await fetchReharvestRuns());
    } catch {
      /* history is a convenience; a failure here must not block starting a run */
    }
  };

  useEffect(() => {
    void loadHistory();
    return () => {
      if (poll.current) window.clearInterval(poll.current);
    };
  }, []);

  // A bulk run is queue-backed, so the page has to ask rather than be told.
  useEffect(() => {
    if (poll.current) window.clearInterval(poll.current);
    if (!run || run.finished_at || run.completed >= run.queued) return;

    poll.current = window.setInterval(async () => {
      try {
        const next = await fetchReharvestRun(run.id);
        setRun(next.run);
        if (next.finished) {
          if (poll.current) window.clearInterval(poll.current);
          void loadHistory();
        }
      } catch {
        /* transient; the next tick retries */
      }
    }, 4000);

    return () => {
      if (poll.current) window.clearInterval(poll.current);
    };
  }, [run?.id, run?.completed, run?.finished_at]);

  const start = async () => {
    setStarting(true);
    setError("");
    try {
      setRun(await startReharvestRun({ scope, screen, republish, limit }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk re-harvest could not be started.");
    } finally {
      setStarting(false);
    }
  };

  const active = run && !run.finished_at && run.completed < run.queued;
  const percent = run && run.queued > 0 ? Math.round((run.completed / run.queued) * 100) : 0;

  return (
    <AdminLayout
      title="Re-harvest images"
      subtitle="Re-run image discovery for societies already in the catalogue, and screen out posters, phone numbers, people and floor plans."
    >
      {error ? (
        <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-serif text-2xl font-black text-slate-950">Start a run</h2>

        <div className="mt-4 space-y-2">
          {SCOPES.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${
                scope === option.value ? "border-blue-500 bg-blue-50/60" : "border-slate-200"
              }`}
            >
              <input
                type="radio"
                className="mt-1"
                name="scope"
                checked={scope === option.value}
                onChange={() => setScope(option.value)}
              />
              <span>
                <span className="block font-bold text-slate-900">{option.label}</span>
                <span className="block text-sm text-slate-500">{option.help}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={screen} onChange={(e) => setScreen(e.target.checked)} />
            Screen images with AI
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={republish} onChange={(e) => setRepublish(e.target.checked)} />
            Re-publish the cover automatically
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            Limit
            <input
              type="number"
              min={1}
              max={400}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(400, Number(e.target.value) || 1)))}
              className="w-24 rounded-xl border border-slate-200 px-3 py-1.5"
            />
          </label>
        </div>

        <p className="mt-3 text-sm text-slate-500">
          Screening costs roughly one AI unit per image and is cached, so re-running a society is free. Only Google
          Places photos are ever auto-published; official-site images always wait for a rights check.
        </p>

        <Button type="button" className="mt-4 rounded-full" onClick={() => void start()} disabled={starting || !!active}>
          {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {active ? "Run in progress" : "Start re-harvest"}
        </Button>
      </section>

      {run ? (
        <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl font-black text-slate-950">
              Run #{run.id} · {run.scope.replace(/_/g, " ")}
            </h2>
            <span className="flex items-center gap-2 text-sm font-bold text-slate-600">
              {active ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              {run.completed} / {run.queued}
            </span>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${percent}%` }} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Stat label="Refreshed" value={run.refreshed} tone="emerald" />
            <Stat label="Covers republished" value={run.republished} tone="emerald" />
            <Stat label="Images rejected" value={run.rejected_images} tone="amber" />
            <Stat label="Nothing usable" value={run.no_candidates} tone="amber" />
            <Stat label="Failed" value={run.failed} tone="red" />
          </div>

          {run.results && run.results.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-slate-400">
                  <tr>
                    <th className="py-2">Society</th>
                    <th className="py-2">Outcome</th>
                    <th className="py-2 text-right">Before → after</th>
                    <th className="py-2 text-right">Rejected</th>
                    <th className="py-2">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {run.results.map((row, i) => (
                    <tr key={`${row.society_id}-${i}`}>
                      <td className="py-3 font-bold text-slate-800">{row.name || `#${row.society_id}`}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusChip(row.status)}`}>
                          {row.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-600">
                        {row.before} → {row.after}
                      </td>
                      <td className="py-3 text-right text-slate-600">{row.rejected}</td>
                      <td className="py-3 max-w-[320px] text-slate-500">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-serif text-2xl font-black text-slate-950">Recent runs</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-slate-400">
              <tr>
                <th className="py-2">Started</th>
                <th className="py-2">Scope</th>
                <th className="py-2 text-right">Done</th>
                <th className="py-2 text-right">Republished</th>
                <th className="py-2 text-right">Rejected</th>
                <th className="py-2">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((item) => (
                <tr key={item.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setRun(item)}>
                  <td className="py-3 text-slate-500">
                    {item.created_at ? new Date(item.created_at).toLocaleString("en-IN") : "—"}
                  </td>
                  <td className="py-3 font-bold text-slate-800">{item.scope.replace(/_/g, " ")}</td>
                  <td className="py-3 text-right text-slate-600">
                    {item.completed}/{item.queued}
                  </td>
                  <td className="py-3 text-right text-slate-600">{item.republished}</td>
                  <td className="py-3 text-right text-slate-600">{item.rejected_images}</td>
                  <td className="py-3">
                    {item.finished_at ? (
                      <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                        <ShieldCheck className="h-4 w-4" /> finished
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-bold text-amber-700">
                        <AlertTriangle className="h-4 w-4" /> running
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center font-semibold text-slate-500">
                    <ImageIcon className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                    No re-harvest has been run yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
