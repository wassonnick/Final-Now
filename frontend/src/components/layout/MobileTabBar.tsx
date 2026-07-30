// Thumb-reachable bottom navigation — the thing that makes the site feel like an app
// on a phone. Five destinations, no more: anything else belongs in the Tools sheet or
// the header menu. Hidden from lg upward, where the header nav takes over.
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Building2, Home, LayoutGrid, MessageCircle, Phone, Search, User, X } from "lucide-react";

import { MODULES, MODULE_INTENTS, type ModuleIntent } from "@/lib/modules";
import { BRAND_PHONE_DISPLAY, BRAND_PHONE_HREF, BRAND_WHATSAPP_URL } from "@/config/contact";

const ACCENT = "#0F7B63";

const TABS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Search", href: "/search?tab=societies", icon: Search },
  { label: "Societies", href: "/societies", icon: Building2 },
] as const;

const intents: ModuleIntent[] = ["decide", "discover", "services"];

export function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [toolsOpen, setToolsOpen] = useState(false);

  const path = location.pathname;
  // Society and property pages swap the global tabs for their own enquiry bar —
  // two stacked bars would eat a sixth of the screen.
  const hidden = path.startsWith("/society/") || path.startsWith("/property/");
  const isActive = (href: string) => {
    const base = href.split("?")[0];
    if (base === "/") return path === "/";
    return path === base || path.startsWith(`${base}/`);
  };

  const go = (href: string) => {
    setToolsOpen(false);
    navigate(href);
  };

  if (hidden) return null;

  return (
    <>
      {/* Tools sheet — every module, one tap from anywhere */}
      {toolsOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-label="Tools">
          <button
            type="button"
            aria-label="Close tools"
            className="absolute inset-0 bg-black/40"
            onClick={() => setToolsOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-[28px] bg-white pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
            <div className="mx-auto mt-1 h-1.5 w-10 rounded-full bg-[#E4E4E9]" />
            <div className="flex items-center justify-between px-5 pt-4">
              <p className="text-[17px] font-semibold text-[#1D1D1F]">Tools</p>
              <button
                type="button"
                onClick={() => setToolsOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F7] text-[#43434A]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 pb-2 pt-4">
              {intents.map((intent) => (
                <div key={intent} className="mb-5 last:mb-0">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
                    {MODULE_INTENTS[intent]}
                  </p>
                  <div className="space-y-1.5">
                    {MODULES.filter((m) => m.intent === intent).map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => go(m.href)}
                          className="flex w-full items-start gap-3 rounded-2xl bg-[#F5F5F7] p-3.5 text-left active:bg-[#ECECEF]"
                        >
                          <span
                            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: "#ECF6F2", color: ACCENT }}
                          >
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[15px] font-semibold text-[#1D1D1F]">{m.name}</span>
                            <span className="block text-[12.5px] leading-5 text-[#86868B]">{m.desc}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <p className="mb-2 mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">Talk to us</p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={BRAND_PHONE_HREF}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#E4E4E9] bg-white py-3.5 text-[14px] font-semibold text-[#1D1D1F]"
                >
                  <Phone className="h-4 w-4" style={{ color: ACCENT }} />
                  Call
                </a>
                <a
                  href={BRAND_WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-semibold text-white"
                  style={{ background: ACCENT }}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
              <p className="mt-2 text-center text-[12px] text-[#86868B]">{BRAND_PHONE_DISPLAY}</p>

              <Link
                to="/sell"
                onClick={() => setToolsOpen(false)}
                className="mt-5 block rounded-full py-3.5 text-center text-[15px] font-semibold text-white"
                style={{ background: ACCENT }}
              >
                List your flat
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[#ECECEF] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                to={tab.href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold transition active:scale-95"
                style={{ color: active ? ACCENT : "#86868B" }}
              >
                <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.4 : 1.9} />
                {tab.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setToolsOpen((v) => !v)}
            aria-expanded={toolsOpen}
            className="flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold transition active:scale-95"
            style={{ color: toolsOpen ? ACCENT : "#86868B" }}
          >
            <LayoutGrid className="h-[21px] w-[21px]" strokeWidth={toolsOpen ? 2.4 : 1.9} />
            Tools
          </button>

          <Link
            to="/login"
            aria-current={isActive("/login") ? "page" : undefined}
            className="flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold transition active:scale-95"
            style={{ color: isActive("/login") ? ACCENT : "#86868B" }}
          >
            <User className="h-[21px] w-[21px]" strokeWidth={isActive("/login") ? 2.4 : 1.9} />
            Account
          </Link>
        </div>
      </nav>
    </>
  );
}
