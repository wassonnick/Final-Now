import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';

const users = [
  { name: 'Nitin Wasson', email: 'admin@societyflats.com', role: 'Admin', status: 'Active' },
  { name: 'Broker Partner', email: 'broker@societyflats.com', role: 'Broker', status: 'Active' },
  { name: 'Owner User', email: 'owner@example.com', role: 'Owner', status: 'Pending' },
  { name: 'Tenant Lead', email: 'tenant@example.com', role: 'Tenant', status: 'Active' },
];

export function AdminUsersPage() {
  return (
    <AdminLayout title="Users" subtitle="Manage admins, brokers, owners, tenants and buyers">
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-4 font-medium">User</th>
              <th className="px-5 py-4 font-medium">Email</th>
              <th className="px-5 py-4 font-medium">Role</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.email} className="hover:bg-slate-50/70">
                <td className="px-5 py-4 font-medium text-slate-950">{user.name}</td>
                <td className="px-5 py-4 text-slate-600">{user.email}</td>
                <td className="px-5 py-4 text-slate-600">{user.role}</td>
                <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{user.status}</span></td>
                <td className="px-5 py-4"><Button variant="outline" size="sm" className="rounded-full">Edit</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
