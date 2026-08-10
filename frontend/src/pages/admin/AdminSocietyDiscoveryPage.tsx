import { useEffect, useState } from "react";
import { AlertTriangle, Compass, ExternalLink, MapPin, RefreshCw, Search, Undo2, X } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  dismissCandidate, fetchDiscovery, importCandidate, restoreCandidate, scanArea,
  type DiscoveryCandidate, type DiscoveryIndex, type ScanResult,
} from "@/lib/societyDiscoveryApi";

const FILTERS = [
  { id: "open", label: "Needs a decision" },
  { id: "new", label: "Missing" },
  { id: "likely_duplicate", label: "Maybe duplicates" },
  { id: "imported", label: "Handled" },
  { id: "dismissed", label: "Dismissed" },
  { id: "all", label: "Everything" },
];

function StatusBadge({ candidate }: { candidate: DiscoveryCandidate }) {
  const tone =
    candidate.status === "new" ? "bg-emerald-50 text-emerald-700"
    : candidate.status === "likely_duplicate" ? "bg-amber-50 text-amber-700"
    : candidate.status === "imported" ? "bg-blue-50 text-blue-700"
    : "bg-slate-100 text-slate-500";
  const label =
    candidate.status === "new" ? "Not in catalogue"
    : candidate.status === "likely_duplicate" ? "Maybe a duplicate"
    : candidate.status === "imported" ? "Handled"
    : "Dismissed";

  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{label}</span>;
}

export function AdminSocietyDiscoveryPage() {
  const [data, setData] = useState<DiscoveryIndex | null>(null);
  const [filter, setFilter] = useState("open");
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  const load = async (status = filter) => {
    try {
      setData(await fetchDiscovery(status));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the queue.");
    }
  };

  useEffect(() => { void load(filter); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const act = async (run: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await run();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  const runScan = () => act(async () => { setScan(await scanArea(area.trim())); });

  const candidates = data?.candidates ?? [];

  return (
    <AdminLayout
      title="Discovery"
      subtitle="Societies the market has that the catalogue does not. Scan an area, then import what is genuinely missing."
    >
      {data && !data.configured ? (
        <div className="mb-4 flex gap-2 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Google Places is not configured, so scanning is unavailable. Existing candidates are still listed.
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 flex gap-2 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : null}

      {/* SCAN — one paid Places call per area, so it never runs on page load. */}
      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black"><Compass className="h-5 w-5 text-blue-700" />Scan an area</h2>
        <p className="mt-1 text-sm text-slate-500">
          Name the area the way you would say it out loud — “Sector 65 Gurgaon”, “Paschim Vihar Delhi”.
          Each scan costs one Google Places lookup, so it only runs when you ask.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Input
            className="min-w-[260px] flex-1"
            value={area}
            placeholder="Sector 65 Gurgaon"
            onChange={(e) => setArea(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && area.trim() && !busy) void runScan(); }}
          />
          <Button disabled={busy || area.trim().length < 3} className="bg-blue-700" onClick={() => void runScan()}>
            {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Scan
          </Button>
        </div>

        {scan ? (
          <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-5">
            {[
              ["Seen", scan.scanned],
              ["Missing", scan.new],
              ["Maybe duplicates", scan.likely_duplicate],
              ["Already have", scan.known],
              ["Not societies", scan.rejected],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="text-xl font-black">{value as number}</p>
              </div>
            ))}
          </div>
        ) : null}

        {data?.areas?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {data.areas.map((row) => (
              <button
                key={row.area}
                type="button"
                onClick={() => setArea(row.area)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                {row.area} <span className="text-slate-400">{row.c}</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {/* QUEUE */}
      <div className="mt-5 flex flex-wrap gap-2 rounded-[24px] border border-slate-200 bg-white p-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`rounded-2xl px-4 py-2.5 text-sm font-bold ${filter === item.id ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {item.label}
            {data?.counts?.[item.id] ? <span className="ml-1.5 opacity-70">{data.counts[item.id]}</span> : null}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {candidates.length === 0 ? (
          <p className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
            Nothing here. Scan an area above to find what the catalogue is missing.
          </p>
        ) : null}

        {candidates.map((candidate) => (
          <article key={candidate.id} className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[17px] font-black">{candidate.name}</h3>
                  <StatusBadge candidate={candidate} />
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />{candidate.address || candidate.area}
                </p>
                {candidate.status_reason ? (
                  <p className="mt-1.5 text-[12.5px] font-semibold text-slate-600">{candidate.status_reason}</p>
                ) : null}
                {candidate.society ? (
                  <a
                    href={`/admin/societies/${candidate.society.id}/edit`}
                    className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-bold text-blue-700"
                  >
                    Open {candidate.society.name}<ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
              <p className="shrink-0 text-right text-[11px] font-semibold text-slate-400">
                {candidate.rating_count ? `${candidate.rating_count} Google reviews` : "No Google reviews"}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {candidate.status === "dismissed" ? (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(() => restoreCandidate(candidate.id))}>
                  <Undo2 className="mr-1.5 h-3.5 w-3.5" />Put back
                </Button>
              ) : candidate.status === "imported" ? null : (
                <>
                  <Button size="sm" className="bg-blue-700" disabled={busy} onClick={() => void act(() => importCandidate(candidate.id, true))}>
                    Import
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(() => importCandidate(candidate.id, false))}>
                    Import as draft
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      const reason = window.prompt("Why is this not a society we want?", candidate.status === "likely_duplicate" ? "Already in the catalogue" : "Not a residential society");
                      if (reason !== null) void act(() => dismissCandidate(candidate.id, reason));
                    }}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />Dismiss
                  </Button>
                </>
              )}
              {candidate.latitude && candidate.longitude ? (
                <a
                  className="inline-flex items-center gap-1 rounded-md px-2 text-[12.5px] font-bold text-slate-500 hover:text-slate-800"
                  href={`https://www.google.com/maps/search/?api=1&query=${candidate.latitude},${candidate.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Look at it<ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </AdminLayout>
  );
}
