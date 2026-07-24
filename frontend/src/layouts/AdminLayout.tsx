import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Menu, Search, X } from "lucide-react";

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
    <div className="admin-scope min-h-screen bg-slate-100">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-64 lg:bg-[#0E1A33]">
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

          <div className="absolute inset-y-0 left-0 w-[82vw] max-w-[300px] overflow-hidden bg-[#0E1A33] shadow-2xl">
            <div className="absolute right-3 top-3 z-10">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <AdminSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="shrink-0 rounded-lg lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open admin menu"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-black tracking-tight text-slate-950">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="truncate text-xs text-slate-500">{subtitle}</p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 md:flex">
                <Search className="h-4 w-4" />
                <span>Search…</span>
              </div>

              <Button type="button" size="icon" variant="ghost" className="rounded-lg text-slate-500 hover:text-slate-900">
                <Bell className="h-5 w-5" />
              </Button>

              <Button asChild variant="outline" className="hidden rounded-lg border-slate-200 md:inline-flex">
                <Link to="/">View site</Link>
              </Button>

              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {(session?.name || "A").slice(0, 1).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
