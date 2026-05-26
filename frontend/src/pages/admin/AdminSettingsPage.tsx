import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';

export function AdminSettingsPage() {
  return (
    <AdminLayout title="Settings" subtitle="Configure admin preferences and future API connections">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">Admin settings</h2>
        <p className="mt-2 max-w-2xl text-slate-500">This area is ready for production auth, API keys, moderation rules and notification preferences in the next backend phase.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {['Sanctum API connection', 'Role permissions', 'Lead assignment rules', 'Review moderation rules'].map((item) => (
            <div key={item} className="rounded-3xl border border-slate-200 p-5">
              <p className="font-medium text-slate-950">{item}</p>
              <p className="mt-1 text-sm text-slate-500">Planned for backend integration.</p>
            </div>
          ))}
        </div>
        <Button className="mt-6 rounded-full bg-blue-600 hover:bg-blue-700">Save Settings</Button>
      </div>
    </AdminLayout>
  );
}
