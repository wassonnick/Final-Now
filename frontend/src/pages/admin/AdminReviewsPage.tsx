import { Check, X } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';

const reviews = [
  { society: 'DLF Crest', rating: '4.8', text: 'Excellent maintenance and very strong security. Visitor parking can improve.', user: 'Verified Resident' },
  { society: 'DLF Park Place', rating: '4.6', text: 'Great location for Cyber Hub commute and families with school-going children.', user: 'Tenant' },
  { society: 'M3M Golf Estate', rating: '4.5', text: 'Good amenities and golf-facing inventory, but traffic can be heavy in evenings.', user: 'Owner' },
];

export function AdminReviewsPage() {
  return (
    <AdminLayout title="Reviews" subtitle="Approve, reject and moderate society reviews">
      <div className="grid gap-4">
        {reviews.map((review) => (
          <div key={review.society} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-semibold text-slate-950">{review.society}</p>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">★ {review.rating}</span>
                </div>
                <p className="mt-3 max-w-3xl text-slate-600">“{review.text}”</p>
                <p className="mt-3 text-sm text-slate-400">{review.user}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-full text-red-600"><X className="mr-2 h-4 w-4" /> Reject</Button>
                <Button size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700"><Check className="mr-2 h-4 w-4" /> Approve</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
