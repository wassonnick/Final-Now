import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Menu, Search, X } from "lucide-react";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { getAdminSession } from "@/hooks/useAdminAuth";
import { fetchAdminSocieties } from "@/lib/adminSocietyStore";

type AdminLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/**
 * The header search.
 *
 * This was a <div> with a border and the word "Search…" inside it — an inert rectangle
 * shaped like a search field. It could not show suggestions because it was never an
 * input, and it read as broken because it looked exactly like something that should
 * work. Either delete it or make it real; a control that only pretends is the worst of
 * the three options.
 */
function AdminSocietySearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Array<{ id: number | string; name: string; sector?: string; city?: string }>>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const cache = useRef<Array<{ id: number | string; name: string; sector?: string; city?: string }> | null>(null);

  // The list is a few hundred rows and rarely changes within a session, so it is fetched
  // once and filtered in memory — instant suggestions without a request per keystroke.
  const ensureLoaded = async () => {
    if (cache.current) return cache.current;
    setLoading(true);
    try {
      const societies = await fetchAdminSocieties();
      cache.current = societies.map((society) => ({
        id: society.id,
        name: society.name,
        sector: society.sector,
        city: society.city,
      }));
      return cache.current;
    } catch {
      cache.current = [];
      return cache.current;
    } finally {
      setLoading(false);
    }
  };

  const onChange = async (value: string) => {
    setQuery(value);
    setOpen(true);

    const term = value.trim().toLowerCase();
    if (term.length < 2) {
      setMatches([]);
      return;
    }

    const all = await ensureLoaded();
    setMatches(
      all
        .filter((society) => `${society.name} ${society.sector ?? ""} ${society.city ?? ""}`.toLowerCase().includes(term))
        .slice(0, 8),
    );
  };

  const go = (id: number | string) => {
    setOpen(false);
    setQuery("");
    navigate(`/admin/societies/${id}/edit`);
  };

  return (
    <div className="relative hidden md:block">
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(event) => void onChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder="Search societies…"
          className="w-40 bg-transparent text-sm outline-none placeholder:text-slate-400 lg:w-56"
        />
      </div>

      {open && query.trim().length >= 2 ? (
        <div className="absolute right-0 z-50 mt-1 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <p className="px-3 py-3 text-sm text-slate-500">Loading societies…</p>
          ) : matches.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-500">No society matches “{query.trim()}”.</p>
          ) : (
            matches.map((society) => (
              <button
                key={society.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => go(society.id)}
                className="block w-full px-3 py-2 text-left hover:bg-slate-50"
              >
                <span className="block truncate text-sm font-bold text-slate-800">{society.name}</span>
                <span className="block truncate text-xs text-slate-500">
                  {[society.sector, society.city].filter(Boolean).join(" · ") || "—"}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

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
              <AdminSocietySearch />

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
