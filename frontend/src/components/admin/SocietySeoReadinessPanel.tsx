import { useEffect, useState } from 'react';
import { Download, RefreshCw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { fetchSocietySeoReport, runSocietySeoBulkAction, type SocietySeoReport } from '@/lib/societySeoContentApi';

const metrics: Array<[string, string]> = [
  ['total_societies', 'Total'], ['published', 'Published SEO'], ['draft', 'Draft'], ['needs_review', 'Needs Review'],
  ['weak', 'Weak'], ['basic', 'Basic'], ['good', 'Good'], ['seo_ready', 'SEO Ready'],
];

export function SocietySeoReadinessPanel() {
  const [report, setReport] = useState<SocietySeoReport>({ summary: {}, data: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try { setLoading(true); setError(''); setReport(await fetchSocietySeoReport()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load SEO readiness.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const run = async (action: 'bulk-score' | 'bulk-generate-drafts' | 'bulk-regenerate-missing') => {
    if (action !== 'bulk-score' && !window.confirm('This creates or replaces review-only SEO drafts in a batch. Published SEO will be skipped and nothing will be auto-published. Continue?')) return;
    try {
      setBusy(action); setError('');
      const result = await runSocietySeoBulkAction(action, { limit: action === 'bulk-score' ? 50 : 10, include_drafts: action === 'bulk-regenerate-missing' });
      setMessage(result?.message || 'Bulk SEO action complete.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Bulk SEO action failed.'); }
    finally { setBusy(''); }
  };

  const exportCsv = () => {
    const rows = [['Society', 'Location', 'Builder', 'SEO Status', 'Score', 'Missing Sections', 'Last Updated'], ...report.data.map((item) => [item.society, item.location, item.builder, item.seo_status, String(item.content_score), item.missing_sections.join('; '), item.updated_at || ''])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'society-seo-readiness.csv'; link.click(); URL.revokeObjectURL(url);
  };

  return <section className="rounded-[20px] border border-violet-100 bg-violet-50/50 p-4 shadow-sm md:rounded-[24px] md:p-5">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">C113 Society SEO</p><h2 className="mt-1 text-lg font-bold text-slate-950">Society SEO Readiness</h2><p className="mt-1 text-sm text-slate-500">Score and generate review-only drafts. There is deliberately no Publish All action.</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void load()} disabled={loading || Boolean(busy)}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button><Button type="button" variant="outline" onClick={exportCsv} disabled={!report.data.length}><Download className="mr-2 h-4 w-4" />Export CSV</Button></div></div>
    {message ? <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}{error ? <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">{metrics.map(([key, label]) => <div key={key} className="rounded-xl border border-violet-100 bg-white p-3"><p className="text-[10px] font-black uppercase text-violet-500">{label}</p><p className="mt-1 text-xl font-black text-slate-950">{loading ? '-' : report.summary[key] || 0}</p></div>)}</div>
    <div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void run('bulk-score')} disabled={Boolean(busy)}>Score All</Button><Button type="button" onClick={() => void run('bulk-generate-drafts')} disabled={Boolean(busy)}><Sparkles className="mr-2 h-4 w-4" />Generate Drafts for Missing SEO</Button><Button type="button" variant="outline" onClick={() => void run('bulk-regenerate-missing')} disabled={Boolean(busy)}>Regenerate Weak Drafts</Button></div>
    <div className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-violet-100 bg-white"><table className="w-full min-w-[900px] text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-500"><tr>{['Society','Sector / Locality','Builder','SEO Status','Score','Missing Sections','Last Updated','Actions'].map((h) => <th key={h} className="px-3 py-2 font-black">{h}</th>)}</tr></thead><tbody>{report.data.map((item) => <tr key={item.society_id} className="border-t border-slate-100"><td className="px-3 py-2 font-bold text-slate-900">{item.society}</td><td className="px-3 py-2">{item.location}</td><td className="px-3 py-2">{item.builder}</td><td className="px-3 py-2 capitalize">{item.seo_status.replace('_',' ')}</td><td className="px-3 py-2 font-bold">{item.content_score} · {item.score_label}</td><td className="max-w-[260px] px-3 py-2">{item.missing_sections.join(', ') || 'Complete'}</td><td className="px-3 py-2">{item.updated_at ? new Date(item.updated_at).toLocaleDateString('en-IN') : '—'}</td><td className="px-3 py-2"><Link className="font-bold text-blue-700" to={`/admin/societies/${item.society_id}/edit`}>Open SEO Studio</Link></td></tr>)}</tbody></table>{!loading && !report.data.length ? <p className="p-6 text-center text-sm text-slate-500">No societies yet. The readiness report is ready for the first profile.</p> : null}</div>
  </section>;
}
