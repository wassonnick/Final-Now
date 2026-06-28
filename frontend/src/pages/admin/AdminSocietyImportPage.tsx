import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Gauge,
  ImageIcon,
  ListChecks,
  MapPin,
  Play,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Trash2,
  Upload,
} from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/adminApi";

type ImportMode = "single" | "bulk" | "file";

type ImportLog = { ts?: string; msg?: string };

type ImportResult = {
  id?: number;
  name?: string;
  status?: string;
  edit_url?: string;
  message?: string;
  image_candidate_count?: number;
  image_status?: string;
  score?: number | string;
  source_confidence_score?: number;
};

type ImportJob = {
  id: number;
  type: string;
  source?: string;
  status: string;
  logs?: ImportLog[];
  results?: ImportResult[];
  imported_count?: number;
  failed_count?: number;
  created_at?: string;
  completed_at?: string;
};

type AiStatus = { provider?: string; available?: boolean; model?: string; grounding?: boolean };

type FieldSource = { source?: string; confidence?: number };

type ScoreSignal = { present?: boolean; value?: number | null; weight?: number; label?: string };

type ScoreCategory = {
  value?: number;
  confidence?: number;
  signals?: Record<string, ScoreSignal>;
};

type ScoreBreakdown = Record<string, ScoreCategory & { raw?: number; confidence_penalty?: number }>;

type ImageCandidate = {
  url?: string | null;
  source?: string;
  credit?: string;
  license_note?: string;
  rights_confirmed?: boolean;
  approved?: boolean;
  is_cover?: boolean;
  photo_reference?: string;
};

type SocietyDraft = {
  id: number;
  name: string;
  slug?: string;
  status?: string;
  is_published?: boolean;
  image_approved_by_admin?: boolean;
  score?: number | string;
  latitude?: string | null;
  longitude?: string | null;
  data_quality?: string;
  fields_to_verify?: string[];
  field_sources?: Record<string, FieldSource>;
  score_breakdown?: ScoreBreakdown;
  image_candidates?: ImageCandidate[];
};

const modes: Array<{ id: ImportMode; label: string; description: string; icon: typeof Sparkles }> = [
  { id: "single", label: "Single", description: "Import one society by project name + location.", icon: Sparkles },
  { id: "bulk", label: "Bulk list", description: "Paste many societies, one per line (Name, Location).", icon: ListChecks },
  { id: "file", label: "Excel / CSV", description: "Upload a spreadsheet of societies to import.", icon: FileSpreadsheet },
];

const CATEGORY_ORDER = ["overall", "connectivity", "lifestyle", "security", "maintenance", "investment"];

const SOURCE_STYLE: Record<string, string> = {
  google_places: "border-emerald-200 bg-emerald-50 text-emerald-700",
  neighborhood_measured: "border-blue-200 bg-blue-50 text-blue-700",
  gemini_grounded: "border-amber-200 bg-amber-50 text-amber-700",
  admin_seed: "border-violet-200 bg-violet-50 text-violet-700",
  computed: "border-slate-200 bg-slate-50 text-slate-600",
};

function sourceLabel(source?: string) {
  switch (source) {
    case "google_places": return "Google Places";
    case "neighborhood_measured": return "Measured";
    case "gemini_grounded": return "Gemini (review)";
    case "admin_seed": return "Admin";
    case "computed": return "Computed";
    default: return source || "—";
  }
}

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
  if (type === "single") return "Single";
  if (type === "bulk_names") return "Bulk list";
  if (type === "bulk_spreadsheet") return "Excel / CSV";
  return type || "Import";
}

function jobIsLive(job: ImportJob) {
  return ["queued", "running"].includes(String(job.status || "").toLowerCase());
}

function directImageUrl(value?: string | null) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) && /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url);
}

function confidencePct(value?: number) {
  return Math.round(Math.max(0, Math.min(1, Number(value || 0))) * 100);
}

// JSON columns can arrive as already-parsed values or as raw JSON strings depending on the
// driver; coerce defensively so the review panel never throws on an unexpected shape.
function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string" && value.trim() !== "") {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? (parsed as T[]) : []; } catch { return []; }
  }
  return [];
}

function asRecord<T>(value: unknown): Record<string, T> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, T>;
  if (typeof value === "string" && value.trim() !== "") {
    try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, T>) : {}; } catch { return {}; }
  }
  return {};
}

function normalizeDraft(data: unknown): SocietyDraft | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  return {
    ...(raw as unknown as SocietyDraft),
    image_candidates: asArray<ImageCandidate>(raw.image_candidates),
    score_breakdown: asRecord<ScoreCategory & { raw?: number; confidence_penalty?: number }>(raw.score_breakdown),
    field_sources: asRecord<FieldSource>(raw.field_sources),
  };
}

// Keeps a render error in the review panel from white-screening the whole admin, and shows
// the underlying message so issues are diagnosable instead of a blank page.
class PanelErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-black">This panel hit a render error.</p>
          <p className="mt-1 break-words opacity-80">{this.state.error.message}</p>
          <button type="button" onClick={() => this.setState({ error: null })} className="mt-2 rounded-full bg-rose-600 px-3 py-1 text-xs font-black text-white">Dismiss</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AdminSocietyImportPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<ImportMode>("single");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [spreadsheet, setSpreadsheet] = useState<File | null>(null);
  const [includeImages, setIncludeImages] = useState(true);

  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reenrichingId, setReenrichingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [draft, setDraft] = useState<SocietyDraft | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState<Record<number, boolean>>({});
  const [placePreviews, setPlacePreviews] = useState<Record<number, string>>({});

  const activeJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) || jobs[0] || null, [jobs, selectedJobId]);
  const hasLiveJobs = useMemo(() => jobs.some(jobIsLive), [jobs]);
  const selectedMode = modes.find((item) => item.id === mode) || modes[0];

  async function parseResponse(response: Response) {
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.message || `Request failed: ${response.status}`);
    return json;
  }

  async function loadJobs() {
    setLoadingJobs(true);
    try {
      const json = await parseResponse(await adminFetch("/admin/import/jobs?limit=25"));
      const next = Array.isArray(json?.data) ? json.data : [];
      setJobs(next);
      if (!selectedJobId && next[0]?.id) setSelectedJobId(next[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load import jobs.");
    } finally {
      setLoadingJobs(false);
    }
  }

  async function loadAiStatus() {
    try {
      const json = await parseResponse(await adminFetch("/admin/import/ai-status"));
      setAiStatus(json?.data || null);
    } catch {
      setAiStatus(null);
    }
  }

  useEffect(() => {
    void loadJobs();
    void loadAiStatus();
    const societyId = Number(searchParams.get("societyId"));
    if (societyId > 0) void openDraft(societyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasLiveJobs) return;
    const timer = window.setInterval(() => void loadJobs(), 3000);
    return () => window.clearInterval(timer);
  }, [hasLiveJobs]);

  const candidateSignature = useMemo(
    () => (draft?.image_candidates || []).map((c) => c.photo_reference || c.url || "").join("|"),
    [draft],
  );

  // Inline-preview Google Places candidate photos via the admin proxy (key stays server-side).
  useEffect(() => {
    const candidates = draft?.image_candidates || [];
    if (!candidates.length) { setPlacePreviews({}); return; }
    let cancelled = false;
    const created: string[] = [];
    setPlacePreviews({});
    void (async () => {
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        if (candidate.source !== "google_places" || !candidate.photo_reference) continue;
        try {
          const res = await adminFetch(`/admin/import/place-photo?reference=${encodeURIComponent(candidate.photo_reference)}&w=640`);
          if (!res.ok || cancelled) continue;
          const blob = await res.blob();
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          created.push(objectUrl);
          setPlacePreviews((prev) => ({ ...prev, [i]: objectUrl }));
        } catch {
          /* skip unavailable photo */
        }
      }
    })();
    return () => { cancelled = true; created.forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id, candidateSignature]);

  async function queueImport(path: string, payload: Record<string, unknown>) {
    setError(""); setNotice(""); setSubmitting(true);
    try {
      const json = await parseResponse(await adminFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }));
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
    if (mode === "single") {
      if (name.trim().length < 3) { setError("Enter a society name (min 3 characters)."); return; }
      await queueImport("/admin/import/single", {
        name: name.trim(),
        location: location.trim() || undefined,
        url: url.trim() || undefined,
        include_images: includeImages,
      });
      return;
    }
    if (mode === "bulk") {
      if (!bulkText.trim()) { setError("Paste at least one society."); return; }
      await queueImport("/admin/import/bulk", { items: bulkText, include_images: includeImages });
      return;
    }
    // file
    if (!spreadsheet) { setError("Choose an .xlsx or .csv file first."); return; }
    setError(""); setNotice(""); setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", spreadsheet);
      formData.append("include_images", includeImages ? "1" : "0");
      const json = await parseResponse(await adminFetch("/admin/import/spreadsheet", { method: "POST", body: formData }));
      setNotice(json?.message || "Spreadsheet import queued.");
      if (json?.data?.id) setSelectedJobId(json.data.id);
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload spreadsheet.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteJob(jobId: number) {
    setError(""); setNotice("");
    try {
      const json = await parseResponse(await adminFetch(`/admin/import/jobs/${jobId}`, { method: "DELETE" }));
      setNotice(json?.message || "Import job removed.");
      setSelectedJobId(null);
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove import job.");
    }
  }

  async function reEnrich(result: ImportResult) {
    if (!result.id) return;
    setError(""); setNotice(""); setReenrichingId(result.id);
    try {
      const json = await parseResponse(await adminFetch(`/admin/import/societies/${result.id}/re-enrich`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ include_images: includeImages }),
      }));
      setNotice(json?.message || "Draft re-enriched.");
      if (draft?.id === result.id) await openDraft(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not re-enrich draft.");
    } finally {
      setReenrichingId(null);
    }
  }

  async function openDraft(societyId: number) {
    setLoadingDraft(true); setError("");
    try {
      const json = await parseResponse(await adminFetch(`/admin/societies/${societyId}`));
      setDraft(normalizeDraft(json?.data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load draft.");
    } finally {
      setLoadingDraft(false);
    }
  }

  async function publishDraft() {
    if (!draft) return;
    if (!draft.image_approved_by_admin && !window.confirm("No cover image is approved yet. Publish this society live without an image?")) {
      return;
    }
    setPublishing(true); setError(""); setNotice("");
    try {
      const json = await parseResponse(await adminFetch(`/admin/import/societies/${draft.id}/publish`, { method: "POST" }));
      setNotice(json?.message || "Society published.");
      setDraft(normalizeDraft(json?.data) || draft);
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish society.");
    } finally {
      setPublishing(false);
    }
  }

  async function candidateDecision(index: number, action: "approve" | "reject" | "cover") {
    if (!draft) return;
    setError(""); setNotice("");
    try {
      const json = await parseResponse(await adminFetch(`/admin/import/societies/${draft.id}/image-candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index, action, rights_confirmed: Boolean(rightsConfirmed[index]) }),
      }));
      setNotice(json?.message || "Image candidate updated.");
      setDraft(normalizeDraft(json?.data) || draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update image candidate.");
    }
  }

  const terminalLogs = activeJob?.logs?.length
    ? activeJob.logs
    : [{ ts: "--:--:--", msg: "No job selected yet. Start an import to see live logs here." }];

  return (
    <AdminLayout
      title="Society Importer"
      subtitle="Authoritative facts from Google, grounded gaps from Gemini, deterministic scores. Imports create review-only drafts — never public inventory."
    >
      <PanelErrorBoundary>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
        <section className="space-y-5">
          {/* Setup */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="grid gap-2 sm:grid-cols-3">
              {modes.map((item) => {
                const Icon = item.icon;
                const active = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`rounded-[22px] border p-4 text-left transition ${active ? "border-blue-200 bg-blue-50 shadow-sm ring-2 ring-blue-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-blue-700" : "text-slate-400"}`} />
                    <p className="mt-3 text-sm font-black text-slate-950">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <div>
                <h3 className="text-lg font-black text-slate-950">{selectedMode.label} import</h3>
                <p className="text-sm text-slate-500">{selectedMode.description}</p>
              </div>
              <Button type="button" onClick={handleSubmit} disabled={submitting} className="rounded-full bg-blue-700 px-5 text-white hover:bg-blue-800">
                {submitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {mode === "file" ? "Upload & queue" : "Start import"}
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              {mode === "single" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-bold text-slate-700">Project name</span>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="DLF The Crest" className="h-12 rounded-2xl" />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-bold text-slate-700">Location (sector / locality / city)</span>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Sector 54, Golf Course Road, Gurgaon" className="h-12 rounded-2xl" />
                  </label>
                  <label className="block space-y-2 md:col-span-2">
                    <span className="text-sm font-bold text-slate-700">Official project URL <span className="font-normal text-slate-400">(optional — improves images & data)</span></span>
                    <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://developer.com/project" className="h-12 rounded-2xl" />
                  </label>
                </div>
              ) : null}

              {mode === "bulk" ? (
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-700">One society per line — <span className="font-normal text-slate-500">Name, Location</span></span>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={"DLF Magnolias, Sector 42 Gurgaon\nM3M Golfestate, Sector 65 Gurgaon\nSobha City, Sector 108 Gurgaon"}
                    className="min-h-[220px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              ) : null}

              {mode === "file" ? (
                <div className="space-y-3">
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-blue-200 bg-blue-50/40 px-5 py-10 text-center hover:bg-blue-50">
                    <Upload className="h-8 w-8 text-blue-700" />
                    <span className="mt-3 text-base font-black text-slate-950">{spreadsheet?.name || "Choose Excel or CSV file"}</span>
                    <span className="mt-1 text-xs text-slate-500">.xlsx or .csv · required columns: society_name, city · optional: sector, locality, builder, google_maps_url</span>
                    <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={(e) => setSpreadsheet(e.target.files?.[0] || null)} />
                  </label>
                  <Button asChild type="button" variant="outline" className="rounded-full border-emerald-200 text-emerald-700">
                    <a href="/templates/societyflats-gemini-import-template.xlsx" download><Download className="mr-2 h-4 w-4" />Download Excel template</a>
                  </Button>
                </div>
              ) : null}

              <label className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                <input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)} className="mt-1 h-4 w-4" />
                <span>
                  <span className="block font-black">Harvest image candidates (official URL + Google Places)</span>
                  <span className="mt-1 block text-xs leading-5 text-blue-700">Candidates stay private and need admin approval + rights confirmation before they can ever go live.</span>
                </span>
              </label>

              {notice ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div> : null}
              {error ? <div className="flex gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
            </div>
          </div>

          {/* Draft review */}
          {draft ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Draft review</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">{draft.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{draft.data_quality || "Imported draft — verify before publishing."}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {draft.latitude && draft.longitude ? (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${draft.latitude},${draft.longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"><MapPin className="h-3.5 w-3.5" />Map</a>
                  ) : null}
                  {draft.is_published ? (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Published</span>
                      <Button asChild size="sm" variant="outline" className="rounded-full border-slate-200">
                        <a href={`/society/${draft.slug}`} target="_blank" rel="noreferrer">View live <ExternalLink className="ml-1 h-3.5 w-3.5" /></a>
                      </Button>
                    </>
                  ) : (
                    <Button type="button" size="sm" onClick={() => void publishDraft()} disabled={publishing} className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
                      {publishing ? <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> : <Rocket className="mr-1.5 h-4 w-4" />}Publish
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline" className="rounded-full border-slate-200"><RouterLink to={`/admin/societies/${draft.id}/edit`}>Open in editor</RouterLink></Button>
                </div>
              </div>

              {/* Scores */}
              <div className="mt-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400"><Gauge className="h-4 w-4" />Deterministic scores</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {CATEGORY_ORDER.filter((key) => draft.score_breakdown?.[key]).map((key) => {
                    const cat = draft.score_breakdown![key];
                    const signals = Object.values(cat.signals || {});
                    return (
                      <div key={key} className={`rounded-2xl border p-3 ${key === "overall" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-500">{key}</span>
                          <span className="text-lg font-black text-slate-950">{Number(cat.value ?? 0).toFixed(1)}</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${confidencePct(cat.confidence)}%` }} />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">confidence {confidencePct(cat.confidence)}%</p>
                        {signals.length ? (
                          <ul className="mt-2 space-y-0.5">
                            {signals.slice(0, 4).map((s, i) => (
                              <li key={i} className={`flex items-center justify-between gap-2 text-[11px] ${s.present ? "text-slate-600" : "text-slate-300 line-through"}`}>
                                <span className="line-clamp-1">{s.label}</span>
                                <span className="font-bold">{s.present && s.value != null ? Number(s.value).toFixed(1) : "—"}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Provenance */}
              {draft.field_sources && Object.keys(draft.field_sources).length ? (
                <div className="mt-5">
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400"><ShieldCheck className="h-4 w-4" />Field provenance</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(draft.field_sources).map(([field, meta]) => (
                      <span key={field} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${SOURCE_STYLE[meta.source || ""] || "border-slate-200 bg-white text-slate-500"}`}>
                        {field}<span className="opacity-60">· {sourceLabel(meta.source)} {meta.confidence != null ? `${meta.confidence}%` : ""}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Fields to verify */}
              {draft.fields_to_verify?.length ? (
                <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                  <span className="font-black">Verify before publishing: </span>{draft.fields_to_verify.join(", ")}
                </div>
              ) : null}

              {/* Image candidates */}
              <div className="mt-5">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400"><ImageIcon className="h-4 w-4" />Image candidates ({draft.image_candidates?.length || 0})</p>
                {draft.image_candidates?.length ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {draft.image_candidates.map((candidate, index) => {
                      const isGoogle = candidate.source === "google_places" && Boolean(candidate.photo_reference);
                      const directUrl = directImageUrl(candidate.url) ? candidate.url || "" : "";
                      const previewSrc = directUrl || (isGoogle ? placePreviews[index] : "") || "";
                      const canControl = Boolean(directUrl) || isGoogle;
                      return (
                        <article key={index} className={`rounded-2xl border p-3 ${candidate.is_cover ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                          {previewSrc ? (
                            <img src={previewSrc} alt={`${draft.name} candidate ${index + 1}`} className="h-32 w-full rounded-xl object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-32 w-full items-center justify-center rounded-xl bg-slate-100 text-center text-[11px] text-slate-400">
                              {isGoogle ? "Loading Google photo…" : "Reference link (no inline preview)"}
                            </div>
                          )}
                          <p className="mt-2 line-clamp-1 text-xs font-bold text-slate-700">{candidate.credit || candidate.source}</p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">{candidate.license_note}</p>
                          {candidate.approved ? (
                            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />{candidate.is_cover ? "Cover" : "Approved"}</p>
                          ) : canControl ? (
                            <div className="mt-2 space-y-2">
                              <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <input type="checkbox" checked={Boolean(rightsConfirmed[index])} onChange={() => setRightsConfirmed((s) => ({ ...s, [index]: !s[index] }))} />Rights & attribution confirmed
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                <button type="button" onClick={() => void candidateDecision(index, "cover")} className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-black text-white">Set cover</button>
                                {directUrl || isGoogle ? <button type="button" onClick={() => void candidateDecision(index, "approve")} className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white">Add to gallery</button> : null}
                                <button type="button" onClick={() => void candidateDecision(index, "reject")} className="rounded-full bg-rose-500/80 px-2.5 py-1 text-[11px] font-black text-white">Reject</button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => void candidateDecision(index, "reject")} className="mt-2 rounded-full bg-rose-500/80 px-2.5 py-1 text-[11px] font-black text-white">Reject</button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No image candidates harvested. Add a licensed image in the editor.</p>
                )}
              </div>
            </div>
          ) : null}
        </section>

        {/* Aside: AI status + terminal + jobs */}
        <aside className="space-y-5">
          <div className={`rounded-[28px] border px-4 py-3 text-sm ${aiStatus?.available ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-amber-100 bg-amber-50 text-amber-800"}`}>
            <p className="font-black">AI enrichment: {aiStatus?.available ? "Active" : "Fallback mode"}</p>
            <p className="mt-1 text-xs opacity-80">Provider {aiStatus?.provider || "gemini"} · Model {aiStatus?.model || "not configured"} · Grounding {aiStatus?.grounding ? "on" : "off (fast)"}</p>
            {!aiStatus?.available ? <p className="mt-1 text-xs opacity-80">Add GEMINI_API_KEY to enable grounded gap-fill. Imports still create safe drafts.</p> : null}
          </div>

          <div className="rounded-[28px] border border-slate-900 bg-slate-950 p-4 shadow-sm md:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300"><TerminalSquare className="h-4 w-4" />{activeJob ? `${modeLabel(activeJob.type)} #${activeJob.id}` : "Live job log"}</p>
              <Button type="button" size="icon" variant="outline" onClick={() => loadJobs()} className="rounded-full border-white/10 bg-white/10 text-white hover:bg-white/20"><RefreshCw className={`h-4 w-4 ${loadingJobs ? "animate-spin" : ""}`} /></Button>
            </div>
            <div className="mt-4 max-h-[300px] overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-3 font-mono text-xs leading-6 text-emerald-100">
              {terminalLogs.map((log, index) => <p key={`${log.ts || "log"}-${index}`}>[{log.ts || "--:--:--"}] {log.msg}</p>)}
            </div>
            {hasLiveJobs ? (
              <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-200"><Clock3 className="h-4 w-4" />Polling every 3 seconds while jobs run.</p>
            ) : (
              <p className="mt-3 text-xs font-semibold text-slate-400">No active running job.</p>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-950">Import queue</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => loadJobs()} className="rounded-full">Refresh</Button>
            </div>
            <div className="mt-4 space-y-3">
              {jobs.length ? jobs.map((job) => (
                <div key={job.id} className={`rounded-2xl border p-3 transition ${selectedJobId === job.id ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
                  <button type="button" onClick={() => setSelectedJobId(job.id)} className="flex w-full items-start justify-between gap-3 text-left">
                    <div>
                      <p className="text-sm font-black text-slate-950">#{job.id} · {modeLabel(job.type)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">Created {job.imported_count || 0} · Failed {job.failed_count || 0}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${statusClass(job.status)}`}>{job.status}</span>
                  </button>

                  {job.results?.length ? (
                    <div className="mt-3 space-y-1">
                      {job.results.slice(0, 6).map((result, index) => {
                        const aiPending = (result.message || "").toLowerCase().includes("gemini gap-fill pending");
                        return (
                          <div key={`${result.name}-${index}`} className="rounded-xl bg-slate-50 px-2.5 py-2 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="line-clamp-1 font-semibold text-slate-700">{result.name || "Society"}{result.score ? ` · ${Number(result.score).toFixed(1)}` : ""}</span>
                              {result.id ? (
                                <span className="flex items-center gap-2">
                                  <button type="button" onClick={() => void openDraft(result.id!)} className="font-black text-blue-700">{loadingDraft && draft?.id !== result.id ? "…" : "Review"}</button>
                                  <button type="button" disabled={reenrichingId === result.id} onClick={() => void reEnrich(result)} className="font-black text-violet-700">{reenrichingId === result.id ? "…" : "Re-enrich"}</button>
                                </span>
                              ) : (
                                <span className={`rounded-full border px-2 py-0.5 font-bold ${statusClass(result.status)}`}>{result.status}</span>
                              )}
                            </div>
                            {aiPending ? (
                              <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 font-bold text-amber-700">
                                ⚠ Gemini gap-fill pending — likely AI quota/rate limit. Description, amenities and rent/buy ranges need Re-enrich once quota resets.
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={() => void deleteJob(job.id)} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" />Remove</button>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No importer jobs yet.</div>
              )}
            </div>
          </div>
        </aside>
      </div>
      </PanelErrorBoundary>
    </AdminLayout>
  );
}

export default AdminSocietyImportPage;
