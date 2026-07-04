import { useEffect, useMemo, useState } from 'react';
import { LineChart, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '@/services/backendApi';

type Row = { id: number; recorded_on: string; bhk?: number | null; min_rent?: number | null; median_rent: number; max_rent?: number | null; source_name: string; source_url?: string | null; confidence_score?: number | null };
const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export function RentHistoryChart({ societySlug }: { societySlug: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => { fetch(`${API_BASE_URL}/societies/${encodeURIComponent(societySlug)}/rent-history`).then((r) => r.ok ? r.json() : null).then((j) => setRows(j?.data || [])).catch(() => setRows([])); }, [societySlug]);
  const points = useMemo(() => { const values = rows.map((r) => r.median_rent); if (!values.length) return []; const min = Math.min(...values); const max = Math.max(...values); return rows.map((r, i) => ({ ...r, x: rows.length === 1 ? 50 : (i / (rows.length - 1)) * 100, y: max === min ? 50 : 88 - ((r.median_rent - min) / (max - min)) * 72 })); }, [rows]);
  if (!rows.length) return null;
  return <section className="mt-8 rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm md:p-7">
    <div className="flex items-start gap-3"><span className="rounded-2xl bg-blue-50 p-3 text-blue-700"><LineChart className="h-5 w-5" /></span><div><h2 className="text-2xl font-black text-navy-950">Verified rent history</h2><p className="mt-1 text-sm text-navy-500">Admin-reviewed evidence only. BHK-specific rows are shown separately.</p></div></div>
    <svg viewBox="0 0 100 100" className="mt-5 h-52 w-full overflow-visible" role="img" aria-label="Median rent trend"><path d={`M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')}`} fill="none" stroke="#3156A3" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />{points.map((p) => <g key={p.id}><circle cx={p.x} cy={p.y} r="2.2" fill="#B4975A" /><text x={p.x} y={Math.max(8, p.y - 6)} textAnchor="middle" fontSize="4" fill="#111827">{money(p.median_rent)}</text><text x={p.x} y="98" textAnchor="middle" fontSize="3.3" fill="#667085">{new Date(p.recorded_on).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}{p.bhk ? ` · ${p.bhk}BHK` : ''}</text></g>)}</svg>
    <div className="mt-4 flex flex-wrap gap-2">{rows.map((row) => <span key={row.id} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />{row.source_url ? <a href={row.source_url} target="_blank" rel="noreferrer" className="underline">{row.source_name}</a> : row.source_name}{row.confidence_score != null ? ` · ${row.confidence_score}%` : ''}</span>)}</div>
  </section>;
}
