import { useState } from "react";
import { MessageCircle, Phone, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { BRAND_PHONE_DISPLAY, BRAND_PHONE_TEL, BRAND_WHATSAPP_URL } from "@/config/contact";

const PHONE_DISPLAY = BRAND_PHONE_DISPLAY;
const PHONE_TEL = BRAND_PHONE_TEL;
const WHATSAPP_URL = BRAND_WHATSAPP_URL;
const ACCENT = "#0F7B63";

export function FloatingHelpline() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Pages with their own prominent contact CTAs don't need the floating helper.
  const hideForPageCta =
    location.pathname.startsWith("/society/") ||
    location.pathname.startsWith("/property/") ||
    location.pathname === "/ai-advisor" ||
    location.pathname === "/compare";

  if (hideForPageCta) return null;

  return (
    <div className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 lg:bottom-6 lg:right-6">
      {/* Expanding actions */}
      <div
        className={`mb-3 flex flex-col items-end gap-2 transition-all duration-200 ${
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        <a
          href={`tel:${PHONE_TEL}`}
          className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E9] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#1D1D1F] shadow-[0_12px_30px_-12px_rgba(0,0,0,.35)] transition hover:bg-[#F5F5F7]"
        >
          <Phone className="h-4 w-4" style={{ color: ACCENT }} />
          {PHONE_DISPLAY}
        </a>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_12px_30px_-12px_rgba(0,0,0,.4)] transition hover:brightness-105"
          style={{ background: ACCENT }}
        >
          <MessageCircle className="h-4 w-4" />
          Chat on WhatsApp
        </a>
      </div>

      {/* Toggle FAB */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close contact options" : "Contact SocietyFlats"}
        aria-expanded={open}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_16px_36px_-12px_rgba(15,123,99,.7)] transition active:scale-95"
        style={{ background: ACCENT }}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
