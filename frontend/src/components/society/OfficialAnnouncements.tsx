import { useEffect, useState } from 'react';
import { Megaphone, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '@/services/backendApi';
type Announcement = { id: number; title: string; category: string; content: string; published_at: string };
export function OfficialAnnouncements({ societySlug }: { societySlug: string }) {
  const [items, setItems] = useState<Announcement[]>([]);
  useEffect(() => { fetch(`${API_BASE_URL}/societies/${encodeURIComponent(societySlug)}/announcements`).then((r) => r.ok ? r.json() : null).then((j) => setItems(j?.data || [])).catch(() => setItems([])); }, [societySlug]);
  if (!items.length) return null;
  return <section className="mt-8 rounded-[28px] border border-emerald-100 bg-emerald-50/40 p-5 md:p-7"><div className="flex items-center gap-3"><Megaphone className="h-6 w-6 text-emerald-700" /><div><h2 className="text-2xl font-black text-navy-950">Official society updates</h2><p className="text-sm text-navy-500">Published after SocietyFlats verifies the Builder/RWA claim.</p></div></div><div className="mt-5 grid gap-3">{items.map((item) => <article key={item.id} className="rounded-2xl border border-emerald-100 bg-white p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold capitalize text-emerald-800">{item.category}</span><span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Verified publisher</span></div><h3 className="mt-3 font-black text-navy-950">{item.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm text-navy-600">{item.content}</p><p className="mt-3 text-xs text-navy-400">Published {new Date(item.published_at).toLocaleDateString('en-IN')}</p></article>)}</div></section>;
}
