from pathlib import Path

layout_path = Path("frontend/src/layouts/AdminLayout.tsx")
sidebar_path = Path("frontend/src/components/admin/AdminSidebar.tsx")

sidebar_path.write_text(r'''import { Link, useLocation } from "react-router-dom";
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
''', encoding="utf-8")

layout_path.write_text(r'''import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Menu, Search, UserRound, X } from "lucide-react";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { getAdminSession } from "@/hooks/useAdminAuth";

type AdminLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AdminLayout({ title, subtitle, children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const session = getAdminSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!session) navigate("/admin/login");
  }, [navigate, session]);

  useEffect(() => {
    if (!mobileOpen) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-72 lg:border-r lg:border-slate-200 lg:bg-white">
        <AdminSidebar />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin menu"
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setMobileOpen(false)}
          />

          <div className="absolute inset-y-0 left-0 w-[82vw] max-w-[320px] overflow-hidden rounded-r-[2rem] bg-white shadow-2xl">
            <div className="absolute right-3 top-3 z-10">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="rounded-full bg-white"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <AdminSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="shrink-0 rounded-full lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open admin menu"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div className="min-w-0">
                <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-950">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 md:flex">
                <Search className="h-4 w-4" />
                Search admin
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="rounded-full text-blue-700"
              >
                <Bell className="h-5 w-5" />
              </Button>

              <Button
                asChild
                variant="outline"
                className="hidden rounded-full border-slate-200 md:inline-flex"
              >
                <Link to="/">View site</Link>
              </Button>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="rounded-full bg-blue-50 text-blue-700"
              >
                <UserRound className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
''', encoding="utf-8")

print("C5C Admin mobile navigation fix applied.")
