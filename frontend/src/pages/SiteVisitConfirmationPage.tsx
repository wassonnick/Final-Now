import { useEffect, useState } from 'react';
import { CalendarCheck, CheckCircle2, Loader2, MapPin } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/services/backendApi';
import { setPublicSeo } from '@/lib/seo';

type Visit = { status: string; visitor_name: string; proposed_slots: string[]; selected_slot?: string | null; society?: { name?: string; slug?: string } | null; property?: { title?: string; slug?: string } | null };

export function SiteVisitConfirmationPage() {
  const { token } = useParams();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const response = await fetch(`${API_BASE_URL}/site-visits/${encodeURIComponent(token || '')}`);
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.message || 'Visit invitation not found.');
    setVisit(json.data);
  };

  useEffect(() => { setPublicSeo('Confirm Site Visit | SocietyFlats', 'Choose a proposed SocietyFlats property visit time.', { noindex: true, canonical: `/visit/${token || ''}` }); void load().catch((err) => setError(err.message)).finally(() => setLoading(false)); }, [token]);

  const confirm = async (slot: string) => {
    setWorking(slot); setError('');
    const response = await fetch(`${API_BASE_URL}/site-visits/${encodeURIComponent(token || '')}/confirm`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ selected_slot: slot }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) { setError(json?.message || 'Unable to confirm visit.'); setWorking(''); return; }
    setVisit(json.data); setWorking('');
  };

  if (loading) return <div className="flex min-h-[70vh] items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Loading visit</div>;
  if (!visit) return <div className="container mx-auto max-w-xl px-4 py-20 text-center"><h1 className="text-3xl font-black text-navy-950">Visit invitation unavailable</h1><p className="mt-3 text-navy-500">{error}</p><Button asChild className="mt-6 rounded-full"><Link to="/">Return home</Link></Button></div>;

  return <main className="container mx-auto max-w-2xl px-4 py-14"><section className="rounded-[32px] border border-blue-100 bg-white p-6 shadow-soft md:p-8"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><CalendarCheck className="h-7 w-7" /></div><p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-blue-600">Site visit invitation</p><h1 className="mt-2 text-3xl font-black text-navy-950">Choose your preferred time</h1><p className="mt-2 text-navy-500">Hello {visit.visitor_name}. Select one proposed slot for {visit.property?.title || visit.society?.name || 'your SocietyFlats visit'}.</p>{visit.status === 'confirmed' ? <div className="mt-6 rounded-3xl bg-emerald-50 p-5 text-emerald-800"><p className="flex items-center gap-2 font-black"><CheckCircle2 className="h-5 w-5" /> Visit confirmed</p><p className="mt-2 text-sm">{visit.selected_slot ? new Date(visit.selected_slot).toLocaleString('en-IN') : ''}</p></div> : <div className="mt-6 grid gap-3">{visit.proposed_slots.map((slot) => <button key={slot} disabled={Boolean(working)} onClick={() => void confirm(slot)} className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left font-bold text-navy-900 hover:border-blue-400"><span>{new Date(slot).toLocaleString('en-IN')}</span>{working === slot ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4 text-blue-600" />}</button>)}</div>}{error ? <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p> : null}<div className="mt-6 flex flex-wrap gap-3">{visit.society?.slug ? <Button asChild variant="outline" className="rounded-full"><Link to={`/society/${visit.society.slug}`}><MapPin className="mr-2 h-4 w-4" /> Society profile</Link></Button> : null}<Button asChild variant="ghost" className="rounded-full"><Link to="/">SocietyFlats home</Link></Button></div></section></main>;
}
