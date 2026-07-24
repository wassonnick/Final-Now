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
  FileSearch,
  Megaphone,
  Palette,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clearAdminSession } from "@/hooks/useAdminAuth";
import { isNcrMulticityEnabled } from "@/config/features";

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
      { label: "Compare SEO", href: "/admin/seo/compare-pages", icon: FileSearch },
      { label: "AI Social Media", href: "/admin/social", icon: Sparkles },
      { label: "Brand Studio", href: "/admin/brand-studio", icon: Palette },
      { label: "AI Spend", href: "/admin/ai-spend", icon: Bot },
      { label: "User AI Chats", href: "/admin/ai-chats", icon: MessageSquareText },
      { label: "Campaigns", href: "/admin/campaigns", icon: Megaphone },
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
  const links = groups.map((group) => ({
    ...group,
    links: group.heading === "Inventory" && isNcrMulticityEnabled()
      ? [
          ...group.links.slice(0, 2),
          { label: "NCR Locations", href: "/admin/locations", icon: MapPinned },
          ...group.links.slice(2),
        ]
      : group.links,
  }));

  const logout = () => {
    clearAdminSession();
    window.location.href = "/admin/login";
  };

  const isActive = (href: string) =>
    location.pathname === href ||
    (location.pathname.startsWith(`${href}/`) &&
      // "/admin/societies" must not light up while on "/admin/societies/import".
      !links.some((group) => group.links.some((link) => link.href !== href && link.href.startsWith(`${href}/`) && (location.pathname === link.href || location.pathname.startsWith(`${link.href}/`)))));

  return (
    <aside className="flex h-full flex-col bg-[#0E1A33] text-slate-300">
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">SF</span>
        <div>
          <p className="text-base font-black tracking-tight text-white">SocietyFlats</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-300">Admin</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {links.map((group, index) => (
          <div key={group.heading || "top"} className={index > 0 ? "mt-5" : ""}>
            {group.heading ? (
              <p className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
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
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition",
                      active
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-400 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-slate-500 group-hover:text-slate-200")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Button
          onClick={logout}
          variant="ghost"
          className="w-full justify-start rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
