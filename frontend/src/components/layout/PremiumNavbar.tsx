import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, MapPin, Menu, Phone, Search, User, X } from "lucide-react";
import { MODULES, MODULE_INTENTS, type ModuleIntent } from "@/lib/modules";
import { NCR_CITIES, LIVE_NCR_CITY, ncrCityStatusLabel, type NcrCity } from "@/lib/ncrCities";
import { BrandMark } from "@/components/BrandMark";

const ACCENT = "#0F7B63";
const PRIMARY = [
  { label: "Buy", href: "/search?tab=buy" },
  { label: "Rent", href: "/search?tab=rent" },
  { label: "Societies", href: "/societies" },
];
const PARTNER = [
  { label: "List your flat", href: "/sell", desc: "Owners — rent out or resell" },
  { label: "Builder portal", href: "/builder-portal", desc: "Claim & manage your project" },
  { label: "RWA portal", href: "/rwa", desc: "Resident welfare associations" },
  { label: "Broker partner", href: "/broker-crm", desc: "Verified inventory partners" },
];
const intents: ModuleIntent[] = ["decide", "discover", "services"];

export function PremiumNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [city, setCity] = useState<NcrCity>(LIVE_NCR_CITY);
  const [open, setOpen] = useState<"" | "city" | "explore" | "partner">("");
  const [mobile, setMobile] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(""); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (href: string) => { setOpen(""); setMobile(false); navigate(href); };

  // Picking a city must always take you somewhere. A "launching"/"planned" city goes to
  // its landing page; a live one returns you to the live experience — otherwise choosing
  // Gurgaon while sitting on /ncr/delhi silently did nothing.
  const selectCity = (c: NcrCity) => {
    setCity(c);
    setOpen("");
    setMobile(false);
    if (c.status !== "live") { navigate(`/ncr/${c.slug}`); return; }
    if (location.pathname.startsWith("/ncr/")) navigate("/");
  };
  const submitSearch = (e: React.FormEvent) => { e.preventDefault(); if (q.trim()) go(`/search?tab=societies&q=${encodeURIComponent(q.trim())}`); };

  return (
    <header ref={rootRef} className="sticky top-0 z-50 border-b border-[#ECECEF] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-4 lg:gap-3 lg:px-6">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2" onClick={() => setOpen("")}>
          <BrandMark size={32} className="rounded-[9px] shrink-0" />
          <span className="hidden text-[17px] font-semibold tracking-tight text-[#1D1D1F] sm:inline">SocietyFlats</span>
        </Link>

        {/* City selector — compact, never wraps */}
        <div className="relative shrink-0">
          <button type="button" onClick={() => setOpen(open === "city" ? "" : "city")} className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#F5F5F7] px-3 py-2 text-[13px] font-semibold text-[#1D1D1F] hover:bg-[#ECECEF]">
            <MapPin className="h-3.5 w-3.5" style={{ color: ACCENT }} />
            {city.name}
            <ChevronDown className="h-3.5 w-3.5 text-[#86868B]" />
          </button>
          {open === "city" ? (
            <div className="absolute left-0 top-[calc(100%+8px)] w-64 rounded-2xl border border-[#E4E4E9] bg-white p-1.5 shadow-[0_24px_50px_-28px_rgba(0,0,0,.3)]">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">Delhi NCR</p>
              {NCR_CITIES.map((c) => (
                <button key={c.slug} type="button" onClick={() => { selectCity(c); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-[#F5F5F7]">
                  <span className="text-sm font-semibold text-[#1D1D1F]">{c.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.status === "live" ? "text-[#0F7B63]" : c.status === "launching" ? "text-amber-600" : "text-[#98A2B3]"}`} style={c.status === "live" ? { background: "#ECF6F2" } : {}}>{ncrCityStatusLabel(c.status)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Desktop primary + menus */}
        <nav className="hidden shrink-0 items-center gap-0.5 lg:flex">
          {PRIMARY.map((p) => (
            <Link key={p.href} to={p.href} className="whitespace-nowrap rounded-full px-2.5 py-2 text-[14px] font-semibold text-[#43434A] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]">{p.label}</Link>
          ))}
          <button type="button" onClick={() => setOpen(open === "explore" ? "" : "explore")} className={`flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-2 text-[14px] font-semibold hover:bg-[#F5F5F7] ${open === "explore" ? "text-[#1D1D1F]" : "text-[#43434A]"}`}>Explore <ChevronDown className={`h-3.5 w-3.5 transition ${open === "explore" ? "rotate-180" : ""}`} /></button>
          <button type="button" onClick={() => setOpen(open === "partner" ? "" : "partner")} className={`flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-2 text-[14px] font-semibold hover:bg-[#F5F5F7] ${open === "partner" ? "text-[#1D1D1F]" : "text-[#43434A]"}`}>Partner <ChevronDown className={`h-3.5 w-3.5 transition ${open === "partner" ? "rotate-180" : ""}`} /></button>
        </nav>

        {/* Search — the one flexible element; shrinks before anything wraps */}
        <form onSubmit={submitSearch} className="ml-auto hidden min-w-0 max-w-[320px] flex-1 items-center gap-2 rounded-full border border-[#E4E4E9] bg-[#F5F5F7] px-3 py-2 md:flex">
          <Search className="h-4 w-4 shrink-0 text-[#86868B]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or type a tool…" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#98A2B3]" />
        </form>

        {/* Right actions — never wrap */}
        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-2">
          <a href="tel:+919911886222" className="hidden items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F7] xl:flex"><Phone className="h-4 w-4" style={{ color: ACCENT }} />+91 99118 86222</a>
          <Link to="/sell" className="hidden whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold text-white sm:inline-flex" style={{ background: ACCENT }}>List your flat</Link>
          <a
            href="tel:+919911886222"
            aria-label="Call SocietyFlats on +91 99118 86222"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white xl:hidden"
            style={{ background: ACCENT }}
          >
            <Phone className="h-4 w-4" />
          </a>
          <Link to="/login" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5F5F7] text-[#43434A] hover:bg-[#ECECEF]"><User className="h-4 w-4" /></Link>
          <button type="button" onClick={() => setMobile(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#43434A] lg:hidden"><Menu className="h-5 w-5" /></button>
        </div>
      </div>

      {/* Explore mega-menu — modules by intent */}
      {open === "explore" ? (
        <div className="hidden border-t border-[#ECECEF] bg-white lg:block">
          <div className="mx-auto grid max-w-[1320px] gap-8 px-8 py-8 md:grid-cols-3">
            {intents.map((intent) => (
              <div key={intent}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">{MODULE_INTENTS[intent]}</p>
                <div className="space-y-1">
                  {MODULES.filter((m) => m.intent === intent).map((m) => {
                    const Icon = m.icon;
                    return (
                      <button key={m.key} type="button" onClick={() => go(m.href)} className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left hover:bg-[#F5F5F7]">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "#ECF6F2", color: ACCENT }}><Icon className="h-4 w-4" /></span>
                        <span>
                          <span className="block text-[14px] font-semibold text-[#1D1D1F]">{m.name}</span>
                          <span className="block text-[12.5px] leading-5 text-[#86868B]">{m.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Partner dropdown */}
      {open === "partner" ? (
        <div className="hidden border-t border-[#ECECEF] bg-white lg:block">
          <div className="mx-auto grid max-w-[1320px] gap-2 px-8 py-6 md:grid-cols-4">
            {PARTNER.map((p) => (
              <button key={p.href} type="button" onClick={() => go(p.href)} className="rounded-xl p-3 text-left hover:bg-[#F5F5F7]">
                <span className="block text-[14px] font-semibold text-[#1D1D1F]">{p.label}</span>
                <span className="block text-[12.5px] text-[#86868B]">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Mobile sheet */}
      {mobile ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobile(false)} />
          <div className="absolute inset-y-0 right-0 w-[86vw] max-w-[360px] overflow-y-auto bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[16px] font-semibold">Menu</span>
              <button onClick={() => setMobile(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F7]"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-1">
              {PRIMARY.map((p) => <button key={p.href} onClick={() => go(p.href)} className="block w-full rounded-xl px-3 py-3 text-left text-[15px] font-semibold hover:bg-[#F5F5F7]">{p.label}</button>)}
            </div>
            <p className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">Tools</p>
            <div className="space-y-1">
              {MODULES.map((m) => { const Icon = m.icon; return (
                <button key={m.key} onClick={() => go(m.href)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[#F5F5F7]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#ECF6F2", color: ACCENT }}><Icon className="h-4 w-4" /></span>
                  <span className="text-[14px] font-semibold">{m.name}</span>
                </button>
              ); })}
            </div>
            <Link to="/sell" onClick={() => setMobile(false)} className="mt-5 block rounded-full py-3 text-center text-[14px] font-semibold text-white" style={{ background: ACCENT }}>List your flat</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
