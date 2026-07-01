import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, FileCheck2, RefreshCw, Save, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminSociety } from '@/lib/adminSocietyStore';
import {
  emptySocietySeoContent,
  fetchSocietySeoContent,
  generateSocietySeoAiDraft,
  runSocietySeoAction,
  saveSocietySeoContent,
  type SocietySeoContent,
  type SocietySeoFaq,
} from '@/lib/societySeoContentApi';

type Props = { society: AdminSociety };

const textSections: Array<[string, keyof SocietySeoContent, string]> = [
  ['Intro Summary', 'intro_summary', 'Concise decision-helpful summary using verified society facts.'],
  ['About Society', 'about_content', 'Factual overview without repeating the legacy description.'],
  ['Location & Connectivity', 'location_content', 'Use only verified location and nearby intelligence.'],
  ['Rent Content', 'rent_content', 'Explain rental fit and ranges only when source-backed.'],
  ['Sale / Resale Content', 'sale_content', 'Explain purchase context without promising availability.'],
  ['Amenities & Lifestyle', 'amenities_content', 'Mention only recorded amenities.'],
  ['Investment / End-use Content', 'investment_content', 'Balanced suitability guidance; no return promises.'],
];

const listSections: Array<[string, keyof SocietySeoContent]> = [
  ['Pros', 'pros_json'],
  ['Things to Check / Cons', 'cons_json'],
  ['Best For', 'best_for_json'],
  ['Nearby Highlights', 'nearby_highlights_json'],
];

function listText(value: unknown) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function statusTone(status: string) {
  if (status === 'published') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'approved') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status === 'needs_review') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

export function SocietySeoStudio({ society }: Props) {
  const [content, setContent] = useState<SocietySeoContent>(() => emptySocietySeoContent(society.id));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<SocietySeoContent | null>(null);
  const [schemaText, setSchemaText] = useState('{}');
  const [linksText, setLinksText] = useState('[]');

  const load = async () => {
    try {
      setLoading(true); setError('');
      const loaded = await fetchSocietySeoContent(society.id);
      setContent(loaded);
      setSchemaText(JSON.stringify(loaded.schema_json || {}, null, 2));
      setLinksText(JSON.stringify(loaded.internal_link_suggestions_json || [], null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load SEO content.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [society.id]);

  const missing = useMemo(() => [
    !society.builder && 'Builder missing',
    !(society.sector || society.locality) && 'Location missing',
    !society.rentRange && 'Rent range missing',
    !society.amenities.length && 'Amenities missing',
    content.faq_json.length < 5 && 'FAQs missing',
    !content.about_content && 'About section missing',
    !content.location_content && 'Location section missing',
  ].filter(Boolean) as string[], [content, society]);

  const update = <K extends keyof SocietySeoContent>(key: K, value: SocietySeoContent[K]) => {
    setContent((current) => ({ ...current, [key]: value }));
    setMessage(''); setError('');
  };

  const parseEditors = () => {
    let schema: Record<string, unknown> = {};
    let links: SocietySeoContent['internal_link_suggestions_json'] = [];
    try { schema = schemaText.trim() ? JSON.parse(schemaText) : {}; } catch { throw new Error('Schema JSON is not valid JSON.'); }
    try { links = linksText.trim() ? JSON.parse(linksText) : []; } catch { throw new Error('Internal link suggestions are not valid JSON.'); }
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) throw new Error('Schema JSON must be an object.');
    if (!Array.isArray(links)) throw new Error('Internal link suggestions must be an array.');
    return { schema, links };
  };

  const save = async () => {
    try {
      setBusy('save'); setError('');
      const parsed = parseEditors();
      const saved = await saveSocietySeoContent(society.id, { ...content, schema_json: parsed.schema, internal_link_suggestions_json: parsed.links });
      setContent(saved); setMessage('SEO draft saved. It is not public until published.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save SEO draft.'); }
    finally { setBusy(''); }
  };

  const action = async (name: 'score' | 'approve' | 'publish' | 'unpublish' | 'preview') => {
    try {
      setBusy(name); setError('');
      const result = await runSocietySeoAction(society.id, name);
      setContent(result.content);
      if (name === 'preview') setPreview(result.content);
      setMessage(result.message || result.warning || `${name} complete.`);
    } catch (err) { setError(err instanceof Error ? err.message : `Could not ${name} SEO content.`); }
    finally { setBusy(''); }
  };

  const changeFaq = (index: number, patch: Partial<SocietySeoFaq>) => update('faq_json', content.faq_json.map((item, i) => i === index ? { ...item, ...patch } : item));

  const generateAi = async (mode: 'generate' | 'improve') => {
    const replacing = Boolean(content.id);
    if (replacing && !window.confirm('Generating a new AI draft may replace saved SEO draft sections. Published content will not be overwritten. Continue?')) return;
    try {
      setBusy(`ai-${mode}`); setError('');
      const result = await generateSocietySeoAiDraft(society.id, mode, replacing);
      setContent(result.content);
      setSchemaText(JSON.stringify(result.content.schema_json || {}, null, 2));
      setLinksText(JSON.stringify(result.content.internal_link_suggestions_json || [], null, 2));
      setMessage(`${result.message}${result.warnings.length ? ` Missing data: ${result.warnings.join(', ')}.` : ''}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not generate the AI SEO draft.'); }
    finally { setBusy(''); }
  };

  if (loading) return <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">Loading SEO Content Studio…</p></section>;

  return (
    <section className="rounded-[20px] border border-blue-100 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">C113 SEO Content Engine</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950">SEO Content Studio</h2>
          <p className="mt-1 text-sm text-slate-500">Unique society content with a separate review and publication workflow.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-black capitalize ${statusTone(content.status)}`}>{content.id ? content.status.replace('_', ' ') : 'No SEO Content'}</span>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{content.content_score}/100 · {content.score_label}</span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">AI or draft SEO content is not public until published.</div>
      {error ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      {message ? <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div> : null}

      <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
        <summary className="cursor-pointer font-black text-slate-900">Metadata & core copy</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">SEO Title<Input className="mt-2" value={content.seo_title} onChange={(e) => update('seo_title', e.target.value)} /></label>
          <label className="text-sm font-semibold text-slate-700">H1<Input className="mt-2" value={content.seo_h1} onChange={(e) => update('seo_h1', e.target.value)} /></label>
          <label className="text-sm font-semibold text-slate-700 md:col-span-2">Meta Description<textarea className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm" value={content.seo_description} onChange={(e) => update('seo_description', e.target.value)} /></label>
          {textSections.map(([label, key, hint]) => <label key={key} className="text-sm font-semibold text-slate-700 md:col-span-2">{label}<span className="ml-2 text-xs font-normal text-slate-400">{hint}</span><textarea className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 p-3 text-sm" value={String(content[key] || '')} onChange={(e) => update(key, e.target.value as never)} /></label>)}
        </div>
      </details>

      <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer font-black text-slate-900">Decision helpers, FAQs & structured data</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {listSections.map(([label, key]) => <label key={key} className="text-sm font-semibold text-slate-700">{label}<textarea className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm" value={listText(content[key])} onChange={(e) => update(key, e.target.value.split('\n').map((v) => v.trim()).filter(Boolean) as never)} placeholder="One item per line" /></label>)}
        </div>
        <div className="mt-5 flex items-center justify-between"><h3 className="font-black text-slate-900">FAQs ({content.faq_json.length})</h3><Button type="button" variant="outline" className="h-9 rounded-full" onClick={() => update('faq_json', [...content.faq_json, { question: '', answer: '' }])}>Add FAQ</Button></div>
        <div className="mt-3 space-y-3">{content.faq_json.map((faq, index) => <div key={index} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex gap-2"><Input aria-label={`FAQ ${index + 1} question`} value={faq.question} onChange={(e) => changeFaq(index, { question: e.target.value })} placeholder="Question" /><Button type="button" variant="ghost" size="icon" onClick={() => update('faq_json', content.faq_json.filter((_, i) => i !== index))}><X className="h-4 w-4" /></Button></div><textarea aria-label={`FAQ ${index + 1} answer`} className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm" value={faq.answer} onChange={(e) => changeFaq(index, { answer: e.target.value })} placeholder="Answer" /></div>)}</div>
        <label className="mt-5 block text-sm font-semibold text-slate-700">Internal Link Suggestions JSON<textarea className="mt-2 min-h-32 w-full rounded-xl border border-slate-200 p-3 font-mono text-xs" value={linksText} onChange={(e) => setLinksText(e.target.value)} /></label>
        <label className="mt-4 block text-sm font-semibold text-slate-700">Schema JSON<textarea className="mt-2 min-h-40 w-full rounded-xl border border-slate-200 p-3 font-mono text-xs" value={schemaText} onChange={(e) => setSchemaText(e.target.value)} /></label>
      </details>

      <div className="mt-4 rounded-2xl border border-slate-200 p-4"><p className="text-sm font-black text-slate-900">Missing sections checklist</p><div className="mt-2 flex flex-wrap gap-2">{missing.length ? missing.map((item) => <span key={item} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{item}</span>) : <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Core sections complete</span>}</div></div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void load()} disabled={Boolean(busy)}><RefreshCw className="mr-2 h-4 w-4" />Load SEO Content</Button>
        <Button type="button" onClick={() => void save()} disabled={Boolean(busy)}><Save className="mr-2 h-4 w-4" />Save Draft</Button>
        <Button type="button" variant="outline" onClick={() => void action('score')} disabled={!content.id || Boolean(busy)}>Recalculate Score</Button>
        <Button type="button" variant="outline" onClick={() => void action('approve')} disabled={!content.id || Boolean(busy)}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</Button>
        <Button type="button" className="bg-emerald-700 hover:bg-emerald-800" onClick={() => void action('publish')} disabled={!content.id || !['approved', 'unpublished', 'published'].includes(content.status) || Boolean(busy)}><FileCheck2 className="mr-2 h-4 w-4" />Publish</Button>
        <Button type="button" variant="outline" onClick={() => void action('unpublish')} disabled={content.status !== 'published' || Boolean(busy)}>Unpublish</Button>
        <Button type="button" variant="outline" onClick={() => void action('preview')} disabled={!content.id || Boolean(busy)}><Eye className="mr-2 h-4 w-4" />Preview Public SEO</Button>
        <Button type="button" variant="outline" onClick={() => void generateAi('generate')} disabled={content.status === 'published' || Boolean(busy)}><Sparkles className="mr-2 h-4 w-4" />Generate AI Draft</Button>
        <Button type="button" variant="outline" onClick={() => void generateAi('improve')} disabled={!content.id || content.status === 'published' || Boolean(busy)}>Improve Existing Draft</Button>
        <Button type="button" variant="outline" onClick={() => void generateAi('improve')} disabled={!content.id || content.status === 'published' || Boolean(busy)}>Regenerate Missing Sections</Button>
      </div>

      {preview ? <details className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4" open><summary className="cursor-pointer font-black text-blue-900">Public SEO preview</summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-blue-950">{JSON.stringify(preview, null, 2)}</pre></details> : null}
    </section>
  );
}
