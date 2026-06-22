import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Star, Trash2, XCircle } from 'lucide-react';

import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { getAdminToken } from '@/hooks/useAdminAuth';
import { API_BASE_URL } from '@/services/backendApi';

type AdminReview = {
  id: string;
  rating: number | string;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_name?: string | null;
  is_verified_resident?: boolean;
  helpful_count?: number;
  created_at?: string;
  society?: { name?: string; slug?: string };
  account?: { name?: string | null };
};

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [message, setMessage] = useState('');

  const request = async (path: string, options: RequestInit = {}) => {
    const token = getAdminToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.message || 'Review request failed.');
    return json;
  };

  const load = async () => {
    setLoading(true);
    try {
      const json = await request(`/admin/reviews?per_page=100${filter === 'all' ? '' : `&status=${filter}`}`);
      setReviews(json.data || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [filter]);

  const moderate = async (review: AdminReview, status: 'approved' | 'rejected') => {
    setWorkingId(review.id);
    try {
      await request(`/admin/reviews/${review.id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      setMessage(`Review ${status}. Society rating recalculated.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to moderate review.');
    } finally { setWorkingId(''); }
  };

  const remove = async (review: AdminReview) => {
    if (!window.confirm(`Delete review “${review.title}”?`)) return;
    setWorkingId(review.id);
    try {
      await request(`/admin/reviews/${review.id}`, { method: 'DELETE' });
      setMessage('Review deleted.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete review.');
    } finally { setWorkingId(''); }
  };

  return (
    <AdminLayout title="Reviews" subtitle="Approve, reject and moderate verified resident reviews">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2">{['pending', 'approved', 'rejected', 'all'].map((status) => <button key={status} onClick={() => setFilter(status)} className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${filter === status ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{status}</button>)}</div>
        <p className="text-sm font-semibold text-slate-500">{reviews.length} review{reviews.length === 1 ? '' : 's'}</p>
      </div>

      {message ? <p className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</p> : null}
      {loading ? <div className="flex items-center justify-center gap-2 rounded-[28px] border border-slate-200 bg-white p-12 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading reviews</div> : reviews.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm"><p className="text-lg font-semibold text-slate-950">No {filter === 'all' ? '' : filter} reviews</p><p className="mt-2 text-sm text-slate-500">New resident submissions will appear here for moderation.</p></div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">{reviews.map((review) => <article key={review.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">{review.society?.name || 'Society'}</p><h2 className="mt-1 text-lg font-black text-slate-950">{review.title}</h2><p className="mt-1 text-xs font-semibold text-slate-500">{review.reviewer_name || review.account?.name || 'SocietyFlats user'} {review.is_verified_resident ? '· phone verified' : ''}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 font-black text-amber-700"><Star className="h-4 w-4" fill="currentColor" /> {Number(review.rating).toFixed(1)}</span></div>
          <p className="mt-4 text-sm leading-6 text-slate-700">{review.content}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${review.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : review.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{review.status}</span><span className="text-xs text-slate-500">Helpful: {review.helpful_count || 0}</span></div>
          <div className="mt-5 flex flex-wrap gap-2"><Button disabled={workingId === review.id} onClick={() => void moderate(review, 'approved')} className="rounded-full bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="mr-2 h-4 w-4" /> Approve</Button><Button disabled={workingId === review.id} onClick={() => void moderate(review, 'rejected')} variant="outline" className="rounded-full border-rose-200 text-rose-700"><XCircle className="mr-2 h-4 w-4" /> Reject</Button><Button disabled={workingId === review.id} onClick={() => void remove(review)} variant="ghost" className="rounded-full text-slate-500"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button></div>
        </article>)}</div>
      )}
    </AdminLayout>
  );
}
