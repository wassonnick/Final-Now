import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, FileSearch, RefreshCw, Rocket, XCircle } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, backendApi } from "@/services/backendApi";

type AdminComparePage = {
  id: number;
  slug: string;
  title: string;
  status: string;
  content_quality_score?: string | number;
  society_a?: { name: string; slug: string };
  society_b?: { name: string; slug: string };
  society_c?: { name: string; slug: string };
  stale_reason?: string;
  h1?: string;
  intro?: string;
  comparison_summary?: string;
  recommendation_copy?: string;
  best_for_json?: Array<{ society: string; label: string }>;
  comparison_table_json?: {
    columns?: Array<{ id: number; name: string; slug: string }>;
    rows?: Array<{ label: string; values: string[] }>;
  };
  society_summaries_json?: Array<{
    id: number;
    name: string;
    slug: string;
    sector?: string;
    locality?: string;
    builder?: string;
    score?: number;
    rent_range?: string;
    buy_range?: string;
  }>;
  faq_json?: Array<{ question: string; answer: string }>;
};

type Summary = {
  total_generated: number;
  needs_review: number;
  published: number;
  stale: number;
  missing_data: number;
  duplicate_skipped: number;
};

const emptySummary: Summary = {
  total_generated: 0,
  needs_review: 0,
  published: 0,
  stale: 0,
  missing_data: 0,
  duplicate_skipped: 0,
};

function pageRows(payload: any): AdminComparePage[] {
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function AdminComparePagesPage() {
  const [pages, setPages] = useState<AdminComparePage[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const loadPages = () => {
    setLoading(true);
    backendApi
      .request("/admin/seo/compare-pages?per_page=100")
      .then((payload) => {
        setPages(pageRows(payload));
        setSummary({ ...emptySummary, ...(payload?.summary || {}) });
      })
      .catch((error) => setMessage(error?.message || "Unable to load compare pages."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPages();
  }, []);

  const runAction = async (label: string, path: string) => {
    setBusy(label);
    setMessage("");
    try {
      await backendApi.request(path, { method: "POST" });
      setMessage(`${label} completed.`);
      loadPages();
    } catch (error: any) {
      setMessage(error?.message || `${label} failed.`);
    } finally {
      setBusy("");
    }
  };

  const openAuthenticatedApiJson = async (page: AdminComparePage) => {
    setBusy(`API #${page.id}`);
    setMessage("");

    try {
      const payload = await backendApi.request(`/admin/seo/compare-pages/${page.id}`);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage(`Opened authenticated API JSON for #${page.id}.`);
    } catch (error: any) {
      setMessage(error?.message || `Unable to open API JSON for #${page.id}.`);
    } finally {
      setBusy("");
    }
  };

  return (
    <AdminLayout
      title="Compare SEO Pages"
      subtitle="3-way society comparison pages. The nightly autopilot generates coverage, repairs stale pages and auto-publishes quality ≥ 60; pages scoring 45–59 wait here for manual review."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Total generated", summary.total_generated],
            ["Needs review", summary.needs_review],
            ["Published", summary.published],
            ["Stale", summary.stale],
            ["Missing data", summary.missing_data],
            ["Duplicates skipped", summary.duplicate_skipped],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <Button
            onClick={() => runAction("Bulk generate", "/admin/seo/compare-pages/bulk-generate")}
            disabled={Boolean(busy)}
            className="rounded-full bg-blue-700 text-white hover:bg-blue-800"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {busy === "Bulk generate" ? "Generating…" : "Bulk generate"}
          </Button>
          <Button variant="outline" className="rounded-full" onClick={loadPages}>
            Refresh
          </Button>
          {message ? <p className="text-sm font-semibold text-slate-600">{message}</p> : null}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">Loading compare pages…</div>
        ) : pages.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <FileSearch className="h-8 w-8 text-blue-700" />
            <h2 className="mt-4 text-2xl font-black text-slate-950">No generated pages yet</h2>
            <p className="mt-2 text-slate-500">Run bulk generate after enough societies are published with sector, locality, builder, score and amenities.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pages.map((page) => (
              <div key={page.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">{page.status}</span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Quality {page.content_quality_score || 0}</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-950">{page.title}</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {[page.society_a?.name, page.society_b?.name, page.society_c?.name].filter(Boolean).join(" · ")}
                    </p>
                    {page.stale_reason ? <p className="mt-2 text-sm font-semibold text-amber-700">{page.stale_reason}</p> : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="rounded-full">
                      <Link to={`/admin/seo/compare-pages/${page.id}/preview`} target="_blank">
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </Link>
                    </Button>
                    {page.status === "published" ? (
                      <Button asChild variant="outline" className="rounded-full">
                        <Link to={`/compare/${page.slug}`} target="_blank">
                          Public page
                        </Link>
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => runAction(`Regenerate #${page.id}`, `/admin/seo/compare-pages/${page.id}/regenerate`)}
                      disabled={Boolean(busy)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                    <Button
                      className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => runAction(`Approve #${page.id}`, `/admin/seo/compare-pages/${page.id}/approve`)}
                      disabled={Boolean(busy) || page.status === "published"}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      className="rounded-full bg-blue-700 text-white hover:bg-blue-800"
                      onClick={() => runAction(`Publish #${page.id}`, `/admin/seo/compare-pages/${page.id}/publish`)}
                      disabled={Boolean(busy) || page.status === "published"}
                    >
                      <Rocket className="mr-2 h-4 w-4" />
                      Publish
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => runAction(`Unpublish #${page.id}`, `/admin/seo/compare-pages/${page.id}/unpublish`)}
                      disabled={Boolean(busy) || page.status !== "published"}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Unpublish
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-full text-blue-700"
                      onClick={() => openAuthenticatedApiJson(page)}
                      disabled={Boolean(busy)}
                      title={`${API_BASE_URL}/admin/seo/compare-pages/${page.id}`}
                    >
                      API <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminComparePagesPage;

function adminPageFromPayload(payload: any): AdminComparePage | null {
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return null;
}

export function AdminComparePagePreviewPage() {
  const { id } = useParams();
  const [page, setPage] = useState<AdminComparePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) {
      setMessage("Missing compare page ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    backendApi
      .request(`/admin/seo/compare-pages/${id}`)
      .then((payload) => {
        const record = adminPageFromPayload(payload);
        setPage(record);
        setMessage(record ? "" : "Compare page not found.");
      })
      .catch((error) => setMessage(error?.message || "Unable to load compare preview."))
      .finally(() => setLoading(false));
  }, [id]);

  const rows = page?.comparison_table_json?.rows || [];
  const summaries = page?.society_summaries_json || [];
  const columns = page?.comparison_table_json?.columns || summaries.map((summary) => ({ id: summary.id, name: summary.name, slug: summary.slug }));

  if (loading) {
    return (
      <AdminLayout title="Compare page preview" subtitle="Loading authenticated preview…">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">Loading compare page preview…</div>
      </AdminLayout>
    );
  }

  if (!page) {
    return (
      <AdminLayout title="Compare page preview" subtitle="The requested comparison could not be loaded.">
        <div className="rounded-3xl border border-red-100 bg-white p-8 text-red-700">{message || "Compare page not found."}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Compare page preview"
      subtitle="Authenticated admin preview. Public visitors can only see this after publishing."
    >
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-[#dfded6] bg-[#F8F3EA] p-6 text-[#1f271f] shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#153f2b]">{page.status}</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#9a552e]">Quality {page.content_quality_score || 0}</span>
          </div>
          <h1 className="mt-5 font-serif text-4xl leading-tight text-[#19231c] md:text-6xl">{page.h1 || page.title}</h1>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-[#667064]">{page.intro || page.comparison_summary}</p>
        </div>

        <div className="rounded-[1.5rem] bg-[#143f2b] px-6 py-5 text-white">
          <div className="flex flex-wrap gap-4">
            <span className="text-sm font-bold uppercase tracking-[0.18em] text-[#a8d8b3]">AI summary</span>
            {(page.best_for_json || []).map((item) => (
              <span key={`${item.society}-${item.label}`}>
                <strong>{item.label}:</strong> {item.society}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {summaries.map((society) => (
            <div key={society.id} className="rounded-[1.75rem] border border-[#dfded6] bg-white p-5 shadow-sm">
              <h2 className="font-serif text-2xl text-[#19231c]">{society.name}</h2>
              <p className="mt-2 text-[#667064]">{society.sector || society.locality || "Gurgaon"} {society.builder ? `· ${society.builder}` : ""}</p>
              <p className="mt-4 text-sm text-[#667064]">Rent: {society.rent_range || "Not enough verified data"}</p>
              <p className="mt-1 text-sm text-[#667064]">Resale: {society.buy_range || "Not enough verified data"}</p>
              <Button asChild variant="outline" className="mt-5 w-full rounded-full border-[#cfd8cc] bg-white">
                <Link to={`/society/${society.slug}`} target="_blank">Open society</Link>
              </Button>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-[#dfded6] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-[#e6e1d6]">
                  <th className="bg-[#f4f0e7] p-5 text-sm font-bold text-[#4e574e]">Comparison point</th>
                  {columns.map((column) => (
                    <th key={column.id} className="p-5 text-lg font-bold text-[#19231c]">{column.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-[#e6e1d6] last:border-b-0">
                    <td className="bg-[#f4f0e7] p-5 font-semibold text-[#4e574e]">{row.label}</td>
                    {row.values.map((value, index) => (
                      <td key={`${row.label}-${index}`} className="p-5 text-[#273127]">{String(value)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <section className="rounded-[2rem] border border-[#dfded6] bg-white p-6">
          <h2 className="font-serif text-3xl text-[#19231c]">Frequently asked questions</h2>
          <div className="mt-5 divide-y divide-[#ece6dc]">
            {(page.faq_json || []).map((faq) => (
              <details key={faq.question} className="group py-4 first:pt-0" open>
                <summary className="cursor-pointer list-none font-semibold text-[#19231c]">{faq.question}</summary>
                <p className="mt-3 leading-7 text-[#667064]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/admin/seo/compare-pages">Back to compare SEO admin</Link>
          </Button>
          {page.status === "published" ? (
            <Button asChild className="rounded-full bg-[#153f2b] text-white hover:bg-[#0e2f20]">
              <Link to={`/compare/${page.slug}`} target="_blank">Open public page</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </AdminLayout>
  );
}
