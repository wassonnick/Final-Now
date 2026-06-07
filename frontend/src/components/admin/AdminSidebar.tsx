import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  Home,
  LineChart,
  LogOut,
  MapPinned,
  MessageSquareText,
  Search,
  Settings,
  Star,
  Target,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clearAdminSession } from "@/hooks/useAdminAuth";

type AdminSidebarProps = {
  onNavigate?: () => void;
};

const links = [
  { label: "Dashboard", href: "/admin/dashboard", icon: BarChart3 },
  { label: "Societies", href: "/admin/societies", icon: Building2 },
  { label: "Properties", href: "/admin/properties", icon: Home },
  { label: "Leads", href: "/admin/leads", icon: MessageSquareText },
  { label: "AI Features", href: "/admin/ai", icon: Bot },
  { label: "Maps", href: "/admin/maps", icon: MapPinned },
  { label: "Broker CRM", href: "/admin/broker-crm", icon: BriefcaseBusiness },
  { label: "Chat", href: "/admin/chat", icon: MessageSquareText },
  { label: "Analytics", href: "/admin/analytics", icon: LineChart },
  { label: "Advanced Search", href: "/admin/advanced-search", icon: Search },
  { label: "Recommendations", href: "/admin/recommendations", icon: Target },
  { label: "Reviews", href: "/admin/reviews", icon: Star },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const location = useLocation();

  const logout = () => {
    clearAdminSession();
    window.location.href = "/admin/login";
  };

  return (
    <aside className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-100 px-6 py-5">
        <p className="text-xl font-extrabold tracking-tight text-slate-950">
          SocietyFlats
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Admin
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-1">
          {links.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.href ||
              location.pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-100 p-4">
        <Button
          onClick={logout}
          variant="ghost"
          className="w-full justify-start rounded-2xl text-slate-600 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
