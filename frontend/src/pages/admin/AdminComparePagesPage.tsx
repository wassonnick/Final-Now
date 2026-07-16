import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, FileSearch, RefreshCw, Rocket, XCircle } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { backendApi } from "@/services/backendApi";

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

  return (
    <AdminLayout
      title="Compare SEO Pages"
      subtitle="Generate, review and publish 3-way society comparison pages. Generated pages stay review-only until approved."
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
                      <Link to={`/compare/${page.slug}`} target="_blank">
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </Link>
                    </Button>
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
                    <Button asChild variant="ghost" className="rounded-full text-blue-700">
                      <a href={`/api/admin/seo/compare-pages/${page.id}`} target="_blank" rel="noreferrer">
                        API <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
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
