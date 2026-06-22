import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Link as LinkIcon,
  ListChecks,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  TerminalSquare,
  Trash2,
  Upload,
} from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/adminApi";

type ImportMode = "file" | "name" | "url" | "bulk" | "names";

type ImportLog = {
  ts?: string;
  msg?: string;
};

type ImportResult = {
  id?: number;
  name?: string;
  status?: string;
  edit_url?: string;
  message?: string;
  image_reference_url?: string;
  image_url?: string;
  image_status?: string;
  image_credit?: string;
  image_approved_by_admin?: boolean;
};

type ImportJob = {
  id: number;
  type: string;
  input: string;
  source?: string;
  status: string;
  logs?: ImportLog[];
  results?: ImportResult[];
  imported_count?: number;
  failed_count?: number;
  result_society_id?: number;
  created_at?: string;
  completed_at?: string;
};

type Suggestion = {
  name: string;
  sector?: string;
  locality?: string;
};

type AiStatus = {
  provider?: string;
  available?: boolean;
  model?: string;
};

const modes: Array<{
  id: ImportMode;
  label: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  {
    id: "file",
    label: "Excel / CSV",
    description: "Upload up to 200 societies with name, city, sector, locality and builder.",
    icon: FileSpreadsheet,
  },
  {
    id: "name",
    label: "By name",
    description: "Type one society name and create a draft profile.",
    icon: Sparkles,
  },
  {
    id: "url",
    label: "By URL",
    description: "Paste a developer/listing URL and create a review draft.",
    icon: LinkIcon,
  },
  {
    id: "bulk",
    label: "Bulk source",
    description: "Use MagicBricks / 99acres / NoBroker source toggles with locality.",
    icon: Database,
  },
  {
    id: "names",
    label: "Name list",
    description: "Paste many society names and import them as review drafts.",
    icon: ListChecks,
  },
];

const sources = ["MagicBricks", "99acres", "NoBroker"];

function statusClass(status?: string) {
  const value = String(status || "").toLowerCase();

  if (value === "completed") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (value === "running") return "border-blue-100 bg-blue-50 text-blue-700";
  if (value === "queued") return "border-amber-100 bg-amber-50 text-amber-700";
  if (value === "skipped") return "border-slate-200 bg-slate-50 text-slate-600";
  if (value === "failed") return "border-rose-100 bg-rose-50 text-rose-700";

  return "border-slate-200 bg-white text-slate-600";
}

function modeLabel(type?: string) {
  if (type === "by_name") return "By name";
  if (type === "by_url") return "By URL";
  if (type === "bulk_source") return "Bulk source";
  if (type === "bulk_names") return "Name list";
  if (type === "bulk_spreadsheet") return "Excel / CSV";
  return type || "Import";
}

function jobIsLive(job: ImportJob) {
  return ["queued", "running"].includes(String(job.status || "").toLowerCase());
}

function directImageUrl(value?: string) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) && /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url) && !/google\.(com|co\.in)\/search|maps\.google|maps\.app\.goo\.gl/i.test(url);
}

function logLine(log: ImportLog, index: number) {
  return `[${log.ts || "--:--:--"}] ${log.msg || `Log ${index + 1}`}`;
}

export function AdminSocietyImportPage() {
  const [mode, setMode] = useState<ImportMode>("file");
  const [spreadsheet, setSpreadsheet] = useState<File | null>(null);
  const [includeImages, setIncludeImages] = useState(true);
  const [confirmedImageRights, setConfirmedImageRights] = useState<number[]>([]);
  const [reenrichingId, setReenrichingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("MagicBricks");
  const [locality, setLocality] = useState("Gurgaon");
  const [limit, setLimit] = useState(12);
  const [nameList, setNameList] = useState("");
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeJob = useMemo(() => {
    return jobs.find((job) => job.id === selectedJobId) || jobs[0] || null;
  }, [jobs, selectedJobId]);

  const hasLiveJobs = useMemo(() => jobs.some(jobIsLive), [jobs]);

  const selectedMode = modes.find((item) => item.id === mode) || modes[0];

  async function parseResponse(response: Response) {
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(json?.message || `Request failed: ${response.status}`);
    }

    return json;
  }

  async function loadJobs() {
    setLoadingJobs(true);

    try {
      const response = await adminFetch("/admin/import/jobs?limit=25");
      const json = await parseResponse(response);
      const nextJobs = Array.isArray(json?.data) ? json.data : [];
      setJobs(nextJobs);

      if (!selectedJobId && nextJobs[0]?.id) {
        setSelectedJobId(nextJobs[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load import jobs.");
    } finally {
      setLoadingJobs(false);
    }
  }

  async function loadSuggestions() {
    setLoadingSuggestions(true);

    try {
      const response = await adminFetch("/admin/import/suggestions?limit=80");
      const json = await parseResponse(response);
      setSuggestions(Array.isArray(json?.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load quick-add suggestions.");
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function loadAiStatus() {
    try {
      const response = await adminFetch("/admin/import/ai-status");
      const json = await parseResponse(response);
      setAiStatus(json?.data || null);
    } catch {
      setAiStatus(null);
    }
  }

  useEffect(() => {
    void loadJobs();
    void loadSuggestions();
    void loadAiStatus();
  }, []);

  useEffect(() => {
    if (!hasLiveJobs) return;

    const timer = window.setInterval(() => {
      void loadJobs();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [hasLiveJobs]);

  async function queueImport(path: string, payload: Record<string, unknown>) {
    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      const response = await adminFetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await parseResponse(response);
      setNotice(json?.message || "Import queued.");
      if (json?.data?.id) setSelectedJobId(json.data.id);
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not queue import.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (mode === "file") {
      if (!spreadsheet) { setError("Choose an .xlsx or .csv file first."); return; }
      setError(""); setNotice(""); setSubmitting(true);
      try {
        const formData = new FormData(); formData.append("file", spreadsheet); formData.append("include_images", includeImages ? "1" : "0");
        const response = await adminFetch("/admin/import/spreadsheet", { method: "POST", body: formData });
        const json = await parseResponse(response);
        setNotice(json?.message || "Spreadsheet import queued.");
        if (json?.data?.id) setSelectedJobId(json.data.id);
        await loadJobs();
      } catch (err) { setError(err instanceof Error ? err.message : "Could not upload spreadsheet."); }
      finally { setSubmitting(false); }
      return;
    }
    if (mode === "name") {
      await queueImport("/admin/import/by-name", { name });
      return;
    }

    if (mode === "url") {
      await queueImport("/admin/import/by-url", { url });
      return;
    }

    if (mode === "bulk") {
      await queueImport("/admin/import/bulk", { source, locality, limit });
      return;
    }

    await queueImport("/admin/import/bulk-names", { names: nameList });
  }

  async function handleQuickAddImport() {
    if (!selectedSuggestions.length) {
      setError("Select at least one society from quick-add.");
      return;
    }

    setMode("names");
    await queueImport("/admin/import/bulk-names", { names: selectedSuggestions });
  }

  async function deleteJob(jobId: number) {
    setError("");
    setNotice("");

    try {
      const response = await adminFetch(`/admin/import/jobs/${jobId}`, {
        method: "DELETE",
      });
      const json = await parseResponse(response);
      setNotice(json?.message || "Import job removed.");
      setSelectedJobId(null);
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove import job.");
    }
  }

  async function reviewImage(result: ImportResult, decision: "approve" | "reject") {
    if (!result.id) return;
    setError(""); setNotice("");
    try {
      const response = await adminFetch(`/admin/import/societies/${result.id}/image`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, rights_confirmed: confirmedImageRights.includes(result.id) }) });
      const json = await parseResponse(response); const society = json?.data || {};
      setJobs((current) => current.map((job) => ({ ...job, results: job.results?.map((item) => item.id === result.id ? { ...item, image_reference_url: society.image_reference_url, image_url: society.image_url, image_status: society.image_status, image_credit: society.image_credit, image_approved_by_admin: Boolean(society.image_approved_by_admin) } : item) })));
      setNotice(json?.message || "Image review saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not review image."); }
  }

  async function reEnrich(result: ImportResult) {
    if (!result.id) return;
    setError(""); setNotice(""); setReenrichingId(result.id);
    try {
      const response = await adminFetch(`/admin/import/societies/${result.id}/re-enrich`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ include_images: includeImages }) });
      const json = await parseResponse(response);
      setNotice(json?.message || "Draft re-enriched.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not re-enrich draft."); }
    finally { setReenrichingId(null); }
  }

  function toggleSuggestion(name: string) {
    setSelectedSuggestions((current) => (
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    ));
  }

  const terminalLogs = activeJob?.logs?.length
    ? activeJob.logs
    : [{ ts: "--:--:--", msg: "No job selected yet. Start an import to see live logs here." }];

  return (
    <AdminLayout
      title="Society Auto Importer"
      subtitle="Upload Excel/CSV or import by name and URL. Gemini creates review drafts only—never public inventory."
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
        <section className="space-y-5">
          <div className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 shadow-sm md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                  C100I importer
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                  Build society drafts faster
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Use this workspace to create draft society profiles quickly. Imported records stay unpublished until you review, verify coordinates, add official sources and publish.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="rounded-full border-slate-200 bg-white">
                  <RouterLink to="/admin/societies">All societies</RouterLink>
                </Button>
                <Button asChild className="rounded-full bg-blue-700 text-white hover:bg-blue-800">
                  <RouterLink to="/admin/societies/new-from-url">Old URL flow</RouterLink>
                </Button>
              </div>
            </div>

            <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
              aiStatus?.available
                ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                : "border-amber-100 bg-amber-50 text-amber-800"
            }`}>
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <p className="font-black">
                  AI enrichment status: {aiStatus?.available ? "Active" : "Fallback draft mode"}
                </p>
                <p className="text-xs font-semibold opacity-80">
                  Provider: {aiStatus?.provider || "gemini"} · Model: {aiStatus?.model || "not configured"}
                </p>
              </div>
              <p className="mt-1 text-xs leading-5 opacity-80">
                {aiStatus?.available
                  ? "Imports will ask AI to enrich address, builder, pricing, scores, amenities, SEO and review fields before draft creation."
                  : "Add GEMINI_API_KEY in backend/.env to enable structured AI enrichment. Without it, imports still create safe review drafts."}
              </p>
            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
              {modes.map((item) => {
                const Icon = item.icon;
                const active = mode === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`rounded-[22px] border p-4 text-left transition ${
                      active
                        ? "border-blue-200 bg-white shadow-md ring-2 ring-blue-100"
                        : "border-slate-200 bg-white/70 hover:bg-white"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-blue-700" : "text-slate-400"}`} />
                    <p className="mt-3 text-sm font-black text-slate-950">{item.label}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  {selectedMode.label}
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Import setup</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">{selectedMode.description}</p>
              </div>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-full bg-blue-700 px-5 text-white hover:bg-blue-800"
              >
                {submitting ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {mode === "file" ? "Upload and queue" : mode === "bulk" ? "Start bulk import" : "Start import"}
              </Button>
            </div>

            <div className="mt-5 space-y-5">
              {mode === "file" ? (
                <div className="space-y-4">
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-blue-200 bg-blue-50/40 px-5 py-10 text-center hover:bg-blue-50">
                    <Upload className="h-8 w-8 text-blue-700" />
                    <span className="mt-3 text-base font-black text-slate-950">{spreadsheet?.name || "Choose Excel or CSV file"}</span>
                    <span className="mt-1 text-xs text-slate-500">.xlsx or .csv · maximum 5 MB · maximum 200 society rows</span>
                    <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={(event) => setSpreadsheet(event.target.files?.[0] || null)} />
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-black text-slate-900">Required columns: society_name, city</p>
                    <p className="mt-1">Optional: sector, locality, builder, google_maps_url. Spreadsheet identity fields override Gemini; generated enrichment still needs admin review.</p>
                  </div>
                  <label className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                    <input type="checkbox" checked={includeImages} onChange={(event) => setIncludeImages(event.target.checked)} className="mt-1 h-4 w-4" />
                    <span><span className="block font-black">Find image candidates in the same Gemini import</span><span className="mt-1 block text-xs leading-5 text-blue-700">Uses Gemini Google Search grounding and Google Places when configured. Candidates remain private and require admin approval.</span></span>
                  </label>
                  <Button asChild type="button" variant="outline" className="rounded-full border-emerald-200 text-emerald-700">
                    <a href="/templates/societyflats-gemini-import-template.xlsx" download><Download className="mr-2 h-4 w-4" />Download Excel template</a>
                  </Button>
                </div>
              ) : null}
              {mode === "name" ? (
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-700">Society name</span>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Example: DLF Crest"
                    className="h-12 rounded-2xl"
                  />
                </label>
              ) : null}

              {mode === "url" ? (
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-700">Source URL</span>
                  <Input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="Paste developer, RERA, listing or project URL"
                    className="h-12 rounded-2xl"
                  />
                </label>
              ) : null}

              {mode === "bulk" ? (
                <div className="space-y-5">
                  <div>
                    <span className="text-sm font-bold text-slate-700">Source toggles</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sources.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setSource(item)}
                          className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                            source === item
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr_160px]">
                    <label className="block space-y-2">
                      <span className="text-sm font-bold text-slate-700">Locality / sector</span>
                      <Input
                        value={locality}
                        onChange={(event) => setLocality(event.target.value)}
                        placeholder="Gurgaon, Sector 65, Dwarka Expressway, SPR"
                        className="h-12 rounded-2xl"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-sm font-bold text-slate-700">Limit</span>
                      <Input
                        type="number"
                        min={1}
                        max={40}
                        value={limit}
                        onChange={(event) => setLimit(Number(event.target.value) || 12)}
                        className="h-12 rounded-2xl"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {mode === "names" ? (
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-700">Name list</span>
                  <textarea
                    value={nameList}
                    onChange={(event) => setNameList(event.target.value)}
                    placeholder={"Paste one society per line\nDLF Magnolias\nM3M Golfestate\nEmaar Palm Drive"}
                    className="min-h-[220px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              ) : null}

              {notice ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {notice}
                </div>
              ) : null}

              {error ? (
                <div className="flex gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Quick-add panel
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  Known Gurgaon societies not yet in DB
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Tick societies and batch-import them as review drafts. Existing DB duplicates are skipped.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleQuickAddImport}
                disabled={submitting || selectedSuggestions.length === 0}
                className="rounded-full border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                Import selected ({selectedSuggestions.length})
              </Button>
            </div>

            <div className="mt-4 grid max-h-[420px] gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
              {loadingSuggestions ? (
                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
                  Loading suggestions...
                </div>
              ) : suggestions.length ? (
                suggestions.map((item) => {
                  const checked = selectedSuggestions.includes(item.name);

                  return (
                    <label
                      key={item.name}
                      className={`flex cursor-pointer gap-3 rounded-2xl border p-3 transition ${
                        checked
                          ? "border-blue-200 bg-blue-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSuggestion(item.name)}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />
                      <span>
                        <span className="block text-sm font-black text-slate-950">{item.name}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {[item.sector, item.locality].filter(Boolean).join(" · ") || "Gurgaon"}
                        </span>
                      </span>
                    </label>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
                  No quick-add suggestions available.
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[28px] border border-slate-900 bg-slate-950 p-4 shadow-sm md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                  <TerminalSquare className="h-4 w-4" />
                  Live job log
                </p>
                <h3 className="mt-1 text-lg font-black text-white">
                  {activeJob ? `${modeLabel(activeJob.type)} #${activeJob.id}` : "Terminal"}
                </h3>
              </div>

              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => loadJobs()}
                className="rounded-full border-white/10 bg-white/10 text-white hover:bg-white/20"
              >
                <RefreshCw className={`h-4 w-4 ${loadingJobs ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <div className="mt-4 max-h-[320px] overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-3 font-mono text-xs leading-6 text-emerald-100">
              {terminalLogs.map((log, index) => (
                <p key={`${log.ts || "log"}-${index}`}>{logLine(log, index)}</p>
              ))}
            </div>

            {activeJob?.results?.some((result) => result.image_reference_url || result.image_url) ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">Image approval queue</p>
                {activeJob.results.filter((result) => result.image_reference_url || result.image_url).map((result) => {
                  const candidate = result.image_url || result.image_reference_url || "";
                  const canApprove = directImageUrl(candidate) || result.image_status === "google_places_reference_found";
                  return <article key={`image-${result.id}`} className="rounded-2xl border border-white/10 bg-white/10 p-3 text-white">
                    {canApprove ? <img src={candidate} alt={`${result.name || "Society"} candidate`} className="h-32 w-full rounded-xl object-cover" /> : null}
                    <p className="mt-2 text-sm font-black">{result.name}</p><p className="mt-1 text-xs text-slate-300">{result.image_credit || result.image_status || "Needs review"}</p>
                    <div className="mt-3 flex flex-wrap gap-2"><a href={candidate} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold">Open reference <ExternalLink className="h-3 w-3" /></a><button type="button" disabled={reenrichingId === result.id} onClick={() => void reEnrich(result)} className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-black">{reenrichingId === result.id ? "Researching…" : "Re-enrich fields"}</button>{canApprove && !result.image_approved_by_admin ? <><label className="flex items-center gap-1 text-[11px] text-slate-200"><input type="checkbox" checked={confirmedImageRights.includes(Number(result.id))} onChange={() => setConfirmedImageRights((items) => items.includes(Number(result.id)) ? items.filter((id) => id !== Number(result.id)) : [...items, Number(result.id)])} /> Rights confirmed</label><button type="button" onClick={() => void reviewImage(result, "approve")} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-black">Approve</button></> : null}<button type="button" onClick={() => void reviewImage(result, "reject")} className="rounded-full bg-rose-600/80 px-3 py-1.5 text-xs font-black">Reject</button></div>
                    {!canApprove ? <p className="mt-2 text-[11px] leading-4 text-amber-200">Reference/page links cannot be approved as direct images. Review them, then add a licensed direct image in the society editor.</p> : result.image_status === "google_places_reference_found" ? <p className="mt-2 text-[11px] leading-4 text-blue-200">Approval confirms Google attribution and display terms; it does not mark the photo as owned.</p> : null}
                  </article>;
                })}
              </div>
            ) : null}

            {hasLiveJobs ? (
              <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-200">
                <Clock3 className="h-4 w-4" />
                Polling every 3 seconds while jobs are running.
              </p>
            ) : (
              <p className="mt-3 text-xs font-semibold text-slate-400">
                No active running job right now.
              </p>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Recent jobs
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-950">Import queue</h3>
              </div>

              <Button type="button" variant="outline" size="sm" onClick={() => loadJobs()} className="rounded-full">
                Refresh
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {jobs.length ? (
                jobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedJobId(job.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      selectedJobId === job.id ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">
                          #{job.id} · {modeLabel(job.type)}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                          {job.source || job.input}
                        </p>
                      </div>

                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${statusClass(job.status)}`}>
                        {job.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        Created {job.imported_count || 0}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        Failed {job.failed_count || 0}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        Skipped {(job.results || []).filter((result) => result.status === "skipped").length}
                      </span>
                      {job.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Done
                        </span>
                      ) : null}
                    </div>

                    {job.results?.length ? (
                      <div className="mt-3 space-y-1">
                        {job.results.slice(0, 3).map((result, index) => (
                          <div key={`${result.name}-${index}`} className="flex items-center justify-between gap-2 rounded-xl bg-white/70 px-2.5 py-2 text-xs">
                            <span className="line-clamp-1 font-semibold text-slate-700">
                              {result.name || "Society"}
                            </span>
                            {result.edit_url ? (
                              <span className="flex items-center gap-2"><button type="button" disabled={reenrichingId === result.id} onClick={(event) => { event.stopPropagation(); void reEnrich(result); }} className="font-black text-violet-700">{reenrichingId === result.id ? "Researching…" : "Re-enrich"}</button><RouterLink
                                to={result.edit_url}
                                className="inline-flex items-center gap-1 font-black text-blue-700"
                                onClick={(event) => event.stopPropagation()}
                              >
                                Edit
                                <ExternalLink className="h-3 w-3" />
                              </RouterLink></span>
                            ) : (
                              <span className="font-bold text-slate-400">{result.status}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-3 flex justify-end">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          void deleteJob(job.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.stopPropagation();
                            void deleteJob(job.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove log
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  No importer jobs yet.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}

export default AdminSocietyImportPage;
