import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Loader2, Megaphone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCustomerAccountSession } from '@/lib/customerAccount';
import { API_BASE_URL } from '@/services/backendApi';
import { setPublicSeo } from '@/lib/seo';
type Review = { id: string; title: string; content: string; rating: number | string; responses?: { id: number; status: string }[] }; type Society = { id: number; name: string; reviews?: Review[] }; type Claim = { id: number; organisation_name: string; status: string; society?: Society; announcements?: { id: number; title: string; status: string }[] };
export function BuilderPortalPage() {
  const session = getCustomerAccountSession(); const token = session?.accountAccessToken || '';
  const [societies, setSocieties] = useState<Society[]>([]); const [claims, setClaims] = useState<Claim[]>([]); const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false);
  const [claimType, setClaimType] = useState<'builder' | 'rwa'>('builder');
  const [form, setForm] = useState({ society_id: '', organisation_name: '', representative_name: session?.name || '', representative_role: '', phone: session?.phone || '', email: '', registration_number: '', official_website: '', official_email: '', authorization_proof_url: '', gst_number: '', proof_notes: '' });
  const request = async (path: string, options: RequestInit = {}) => { const r = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.message || 'Request failed.'); return j; };
  const load = async () => { const societiesJson = await fetch(`${API_BASE_URL}/societies?per_page=100`).then((r) => r.json()); setSocieties(societiesJson?.data?.data || societiesJson?.data || []); if (token) setClaims((await request('/accounts/builder-claims')).data || []); };
  useEffect(() => { setPublicSeo('Builder & RWA Portal — Claim Your Society | SocietyFlats', 'Claim your published society and share official updates with residents and buyers — reviewed by our team before anything goes live.', { canonical: '/builder-portal' }); void load().catch(() => undefined); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      // Same portal serves both verified account types; endpoint follows the toggle.
      const endpoint = claimType === 'rwa' ? '/accounts/rwa/claims' : '/accounts/builder-claims';
      const payload: Record<string, unknown> = { ...form, society_id: Number(form.society_id) };
      ['official_website', 'official_email', 'authorization_proof_url', 'gst_number', 'email'].forEach((k) => { if (!String(payload[k] || '').trim()) delete payload[k]; });
      const j = await request(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      setMessage(j.message); await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to submit.'); } finally { setSaving(false); }
  };
  const announce = async (claim: Claim) => { const title = window.prompt('Announcement title'); if (!title) return; const content = window.prompt('Announcement details'); if (!content) return; try { const j = await request(`/accounts/builder-claims/${claim.id}/announcements`, { method: 'POST', body: JSON.stringify({ title, content, category: 'update' }) }); setMessage(j.message); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to submit.'); } };
  const respond = async (claim: Claim, review: Review) => { const content = window.prompt(`Response to “${review.title}”`); if (!content) return; try { const j = await request(`/accounts/builder-claims/${claim.id}/reviews/${review.id}/response`, { method: 'POST', body: JSON.stringify({ content }) }); setMessage(j.message); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to submit.'); } };
  if (!token) return <main className="mx-auto max-w-3xl px-4 py-20 text-center"><ShieldCheck className="mx-auto h-12 w-12 text-blue-700" /><h1 className="mt-5 text-4xl font-black text-navy-950">Claim your society's profile on SocietyFlats</h1><p className="mt-3 text-navy-500">A quick OTP check keeps every claim genuine — verify to get started.</p><Button asChild className="mt-6 rounded-full bg-blue-700"><Link to="/login?next=%2Fbuilder-portal&role=customer">Login with OTP</Link></Button></main>;
  return <main className="mx-auto max-w-6xl px-4 py-12"><div className="flex items-center gap-3"><Building2 className="h-9 w-9 text-blue-700" /><div><h1 className="text-4xl font-black text-navy-950">Claim your society's profile on SocietyFlats</h1><p className="text-navy-500">Share corrections, post official updates, or take over managing your society's public profile — we review everything before it changes live.</p></div></div>
    <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">Changes go through the same admin-review workflow as new listings — nothing publishes instantly.</p>
    {message && <p className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</p>}
    <div className="mt-8 grid gap-6 lg:grid-cols-2"><form onSubmit={submit} className="space-y-3 rounded-[28px] border bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Claim a published society</h2>
      <div className="flex gap-2">{([['builder', 'Builder / developer'], ['rwa', 'RWA / committee']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setClaimType(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${claimType === value ? 'bg-blue-700 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{label}</button>)}</div>
      <select required className="h-11 w-full rounded-xl border px-3" value={form.society_id} onChange={(e) => setForm({ ...form, society_id: e.target.value })}><option value="">Select society</option>{societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      {(['organisation_name','representative_name','representative_role','phone','email'] as const).map((key) => <Input key={key} required={key !== 'email'} placeholder={key.replace(/_/g,' ')} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />)}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-amber-800">Verification — checked by our team before approval</p>
        <div className="mt-2 space-y-2">
          <Input required minLength={5} placeholder={claimType === 'rwa' ? 'RWA / society registration number' : 'RERA or CIN number'} value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} />
          <Input type="url" placeholder="Official website (https://…)" value={form.official_website} onChange={(e) => setForm({ ...form, official_website: e.target.value })} />
          <Input type="email" placeholder={claimType === 'rwa' ? 'Official RWA email' : 'Official company-domain email'} value={form.official_email} onChange={(e) => setForm({ ...form, official_email: e.target.value })} />
          <Input type="url" placeholder={claimType === 'rwa' ? 'Authorization proof link (board resolution / letter)' : 'Authorization letter link (Drive/Docs URL)'} value={form.authorization_proof_url} onChange={(e) => setForm({ ...form, authorization_proof_url: e.target.value })} />
          {claimType === 'builder' ? <Input placeholder="GST number (optional)" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} /> : null}
        </div>
      </div>
      <textarea required minLength={20} className="min-h-28 w-full rounded-xl border p-3 text-sm" placeholder="Describe your authority and available verification proof" value={form.proof_notes} onChange={(e) => setForm({ ...form, proof_notes: e.target.value })} />
      <Button disabled={saving} className="rounded-full bg-blue-700">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : claimType === 'rwa' ? 'Request RWA verification' : 'Request builder verification'}</Button>
      <p className="text-xs text-slate-500">Submissions stay pending until an admin verifies the registration number and authorization. You'll see the status here{claimType === 'rwa' ? ' and in your RWA dashboard' : ''}.</p></form>
    <section className="rounded-[28px] border bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Your claims</h2><div className="mt-4 space-y-3">{claims.length ? claims.map((c) => <article key={c.id} className="rounded-2xl border p-4"><div className="flex justify-between gap-3"><div><h3 className="font-black">{c.society?.name}</h3><p className="text-sm text-navy-500">{c.organisation_name}</p></div><span className="h-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-bold capitalize text-amber-700">{c.status}</span></div>{c.status === 'approved' && <Button variant="outline" className="mt-4 rounded-full" onClick={() => void announce(c)}><Megaphone className="mr-2 h-4 w-4" />Submit update</Button>}{c.announcements?.map((a) => <p key={a.id} className="mt-2 text-xs text-navy-500">{a.title} · <span className="capitalize">{a.status}</span></p>)}{c.status === 'approved' && c.society?.reviews?.map((review) => <div key={review.id} className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-sm font-black">{review.title} · {Number(review.rating).toFixed(1)} ★</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{review.content}</p><Button size="sm" variant="ghost" className="mt-2 rounded-full text-blue-700" onClick={() => void respond(c, review)}>{review.responses?.length ? 'Replace pending response' : 'Respond for moderation'}</Button></div>)}</article>) : <p className="text-sm text-navy-500">No claims submitted yet.</p>}</div></section></div></main>;
}
