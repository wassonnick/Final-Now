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
  CalendarCheck,
  ShieldCheck,
  Gift,
  Globe2,
  Gauge,
  Sparkles,
  Import,
  ClipboardList,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clearAdminSession } from "@/hooks/useAdminAuth";

type AdminSidebarProps = {
  onNavigate?: () => void;
};

// Grouped by daily job-to-be-done. Keep each group short — if a group grows past ~6
// entries, split it rather than letting the sidebar become a flat 25-link wall again.
const groups: Array<{ heading: string | null; links: Array<{ label: string; href: string; icon: any }> }> = [
  {
    heading: null,
    links: [{ label: "Dashboard", href: "/admin/dashboard", icon: BarChart3 }],
  },
  {
    heading: "Inventory",
    links: [
      { label: "Societies", href: "/admin/societies", icon: Building2 },
      { label: "Society Importer", href: "/admin/verified-society-importer", icon: Import },
      { label: "Properties", href: "/admin/properties", icon: Home },
      { label: "Owner Listings", href: "/admin/owner-listings", icon: ClipboardList },
    ],
  },
  {
    heading: "Demand",
    links: [
      { label: "Leads", href: "/admin/leads", icon: MessageSquareText },
      { label: "Site Visits", href: "/admin/site-visits", icon: CalendarCheck },
      { label: "NRI Cases", href: "/admin/nri-cases", icon: Globe2 },
      { label: "Referrals", href: "/admin/referrals", icon: Gift },
    ],
  },
  {
    heading: "Automation",
    links: [
      { label: "SEO Autopilot", href: "/admin/seo-autopilot", icon: Gauge },
      { label: "AI Social Media", href: "/admin/social", icon: Sparkles },
      { label: "Rent Intelligence", href: "/admin/rent-history", icon: LineChart },
      { label: "AI Features", href: "/admin/ai", icon: Bot },
    ],
  },
  {
    heading: "Partners",
    links: [
      { label: "Builder Portal", href: "/admin/builder-portal", icon: ShieldCheck },
      { label: "RWA Portal", href: "/admin/rwa", icon: Users },
      { label: "Broker CRM", href: "/admin/broker-crm", icon: BriefcaseBusiness },
      { label: "Owner CRM", href: "/admin/owner-crm", icon: BriefcaseBusiness },
    ],
  },
  {
    heading: "Platform",
    links: [
      { label: "Reviews", href: "/admin/reviews", icon: Star },
      { label: "Analytics", href: "/admin/analytics", icon: LineChart },
      { label: "Maps", href: "/admin/maps", icon: MapPinned },
      { label: "Advanced Search", href: "/admin/advanced-search", icon: Search },
      { label: "Recommendations", href: "/admin/recommendations", icon: Target },
      { label: "Chat", href: "/admin/chat", icon: MessageSquareText },
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const location = useLocation();

  const logout = () => {
    clearAdminSession();
    window.location.href = "/admin/login";
  };

  const isActive = (href: string) =>
    location.pathname === href ||
    (location.pathname.startsWith(`${href}/`) &&
      // "/admin/societies" must not light up while on "/admin/societies/import".
      !groups.some((group) => group.links.some((link) => link.href !== href && link.href.startsWith(`${href}/`) && (location.pathname === link.href || location.pathname.startsWith(`${link.href}/`)))));

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

      <nav className="flex-1 overflow-y-auto px-4 py-3">
        {groups.map((group, index) => (
          <div key={group.heading || "top"} className={index > 0 ? "mt-4" : ""}>
            {group.heading ? (
              <p className="px-4 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {group.heading}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {group.links.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-semibold transition",
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
          </div>
        ))}
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
