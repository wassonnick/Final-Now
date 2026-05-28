import { AdminLayout } from '@/layouts/AdminLayout';

export function AdminUsersPage() {
  return (
    <AdminLayout title="Users" subtitle="Manage admins, brokers, owners, tenants and buyers">
      <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-950">No live user management connected yet</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          Real admin, broker, owner and buyer accounts will appear here after account management is connected to the backend.
        </p>
      </div>
    </AdminLayout>
  );
}
