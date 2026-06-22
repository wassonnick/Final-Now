import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, Star, ThumbsUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/services/backendApi';
import { getCustomerAccountSession } from '@/lib/customerAccount';

type Review = {
  id: string;
  rating: number | string;
  title: string;
  content: string;
  reviewer_name?: string | null;
  is_verified_resident?: boolean;
  helpful_count?: number;
  pros?: string[] | null;
  cons?: string[] | null;
  created_at?: string;
  account?: { name?: string | null };
};

type ReviewResponse = {
  data?: { data?: Review[] };
  summary?: { count?: number; average?: number };
};

const categoryFields = [
  ['security_rating', 'Security'],
  ['maintenance_rating', 'Maintenance'],
  ['amenities_rating', 'Amenities'],
  ['connectivity_rating', 'Connectivity'],
  ['management_rating', 'Management'],
  ['value_for_money_rating', 'Value'],
] as const;

export function ResidentReviews({ societyId, societySlug, societyName }: { societyId: number; societySlug: string; societyName: string }) {
  const session = getCustomerAccountSession();
  const token = session?.accountAccessToken || '';
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState({ count: 0, average: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<Record<string, string>>({
    rating: '5', title: '', content: '', lived_duration_months: '12', pros: '', cons: '',
    security_rating: '5', maintenance_rating: '5', amenities_rating: '5', connectivity_rating: '5', management_rating: '5', value_for_money_rating: '5',
  });

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/societies/${encodeURIComponent(societySlug)}/reviews`);
      const json = (await response.json()) as ReviewResponse;
      if (!response.ok) throw new Error('Unable to load reviews.');
      setReviews(json.data?.data || []);
      setSummary({ count: Number(json.summary?.count || 0), average: Number(json.summary?.average || 0) });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [societySlug]);

  const stars = useMemo(() => Array.from({ length: 5 }), []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setMessage('');
    try {
      const categories = Object.fromEntries(categoryFields.map(([key]) => [key, Number(form[key])]));
      const response = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          society_id: societyId,
          rating: Number(form.rating),
          title: form.title.trim(),
          content: form.content.trim(),
          lived_duration_months: Number(form.lived_duration_months),
          pros: form.pros.split(',').map((item) => item.trim()).filter(Boolean),
          cons: form.cons.split(',').map((item) => item.trim()).filter(Boolean),
          ...categories,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || 'Unable to submit review.');
      setMessage('Review submitted for admin moderation.');
      setForm((current) => ({ ...current, title: '', content: '', pros: '', cons: '' }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to submit review.');
    } finally {
      setSaving(false);
    }
  };

  const vote = async (reviewId: string) => {
    if (!token) { setMessage('Login with OTP to mark reviews helpful.'); return; }
    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/helpful`, {
      method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(json?.message || 'Unable to save vote.'); return; }
    setReviews((items) => items.map((item) => item.id === reviewId ? { ...item, helpful_count: Number(json.helpful_count || 0) } : item));
  };

  return (
    <section className="mt-6 rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Resident reviews</p>
          <h2 className="mt-1 text-2xl font-black text-navy-950">Living at {societyName}</h2>
          <p className="mt-1 text-sm text-navy-500">{summary.count ? `${summary.average.toFixed(1)} / 5 from ${summary.count} approved review${summary.count === 1 ? '' : 's'}` : 'No approved resident reviews yet.'}</p>
        </div>
        <div className="flex gap-1 text-amber-400">{stars.map((_, index) => <Star key={index} className="h-5 w-5" fill={index < Math.round(summary.average) ? 'currentColor' : 'none'} />)}</div>
      </div>

      {loading ? <div className="flex items-center gap-2 py-8 text-sm text-navy-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading reviews</div> : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-navy-100 bg-ivory-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-bold text-navy-950">{review.title}</h3><p className="mt-1 text-xs font-semibold text-navy-500">{review.reviewer_name || review.account?.name || 'SocietyFlats user'}</p></div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-sm font-black text-amber-700">{Number(review.rating).toFixed(1)} ★</span>
              </div>
              {review.is_verified_resident ? <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Phone-verified reviewer</p> : null}
              <p className="mt-3 text-sm leading-6 text-navy-700">{review.content}</p>
              <div className="mt-3 flex flex-wrap gap-2">{(review.pros || []).map((item) => <span key={item} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">+ {item}</span>)}{(review.cons || []).map((item) => <span key={item} className="rounded-full bg-rose-50 px-2.5 py-1 text-xs text-rose-700">− {item}</span>)}</div>
              <button type="button" onClick={() => void vote(review.id)} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700"><ThumbsUp className="h-4 w-4" /> Helpful ({review.helpful_count || 0})</button>
            </article>
          ))}
        </div>
      )}

      <div className="mt-6 border-t border-navy-100 pt-5">
        {!token ? <p className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800"><Link className="font-black underline" to="/login">Login with OTP</Link> to submit a resident review.</p> : (
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3"><label className="text-sm font-bold text-navy-700">Overall rating<select value={form.rating} onChange={(event) => setForm({ ...form, rating: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-navy-100 bg-white px-3">{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select></label><label className="text-sm font-bold text-navy-700">Review title<Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2" /></label><label className="text-sm font-bold text-navy-700">Months lived<Input type="number" min="1" max="600" value={form.lived_duration_months} onChange={(event) => setForm({ ...form, lived_duration_months: event.target.value })} className="mt-2" /></label></div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">{categoryFields.map(([key, label]) => <label key={key} className="text-xs font-bold text-navy-600">{label}<select value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 h-10 w-full rounded-xl border border-navy-100 bg-white px-2">{[5,4,3,2,1].map((value) => <option key={value}>{value}</option>)}</select></label>)}</div>
            <textarea required minLength={20} maxLength={5000} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Share specific, respectful details about daily living, maintenance and connectivity." className="min-h-28 rounded-2xl border border-navy-100 p-3 text-sm outline-none focus:border-blue-400" />
            <div className="grid gap-3 md:grid-cols-2"><Input value={form.pros} onChange={(event) => setForm({ ...form, pros: event.target.value })} placeholder="Pros, comma separated" /><Input value={form.cons} onChange={(event) => setForm({ ...form, cons: event.target.value })} placeholder="Cons, comma separated" /></div>
            <Button disabled={saving} className="w-fit rounded-full bg-blue-600 px-6 hover:bg-blue-700">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Submit for review</Button>
          </form>
        )}
        {message ? <p className="mt-3 text-sm font-semibold text-blue-700">{message}</p> : null}
      </div>
    </section>
  );
}
