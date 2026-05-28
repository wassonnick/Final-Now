import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Building2, Home, MessageSquareText, Star, Users, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { clearAdminSession } from '@/hooks/useAdminAuth';

const links = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: BarChart3 },
  { label: 'Societies', href: '/admin/societies', icon: Building2 },
  { label: 'Properties', href: '/admin/properties', icon: Home },
  { label: 'Leads', href: '/admin/leads', icon: MessageSquareText },
  { label: 'Reviews', href: '/admin/reviews', icon: Star },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const location = useLocation();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex">
      <Link to="/admin/dashboard" className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-lg font-semibold tracking-tight text-slate-950">SocietyFlats</p>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Admin</p>
        </div>
      </Link>

      <nav className="mt-8 space-y-1">
        {links.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-start rounded-xl text-slate-600 hover:bg-slate-50"
          onClick={() => {
            clearAdminSession();
            window.location.href = '/admin/login';
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </div>
    </aside>
  );
}
