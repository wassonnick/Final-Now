import { AdminLayout } from '@/layouts/AdminLayout';

export function AdminReviewsPage() {
  return (
    <AdminLayout title="Reviews" subtitle="Approve, reject and moderate society reviews">
      <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-950">No live review system connected yet</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          Reviews will appear here after the public review form and moderation API are connected.
        </p>
      </div>
    </AdminLayout>
  );
}
