import { MessageCircle, Phone } from "lucide-react";
import { useLocation } from "react-router-dom";
import { BRAND_PHONE_DISPLAY, BRAND_PHONE_TEL, BRAND_WHATSAPP_URL } from "@/config/contact";

const PHONE_DISPLAY = BRAND_PHONE_DISPLAY;
const PHONE_TEL = BRAND_PHONE_TEL;
const WHATSAPP_URL = BRAND_WHATSAPP_URL;

export function FloatingHelpline() {
  const location = useLocation();
  const hideMobileForPageCta =
    location.pathname.startsWith("/society/") ||
    location.pathname.startsWith("/property/") ||
    location.pathname === "/ai-advisor" ||
    location.pathname === "/compare";
  const hideDesktopForPageCta = hideMobileForPageCta;

  return (
    <>
      {!hideDesktopForPageCta ? <div className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
        <div className="flex flex-col gap-2">
          <a
            href={`tel:${PHONE_TEL}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#D8DFEC] bg-white/95 px-4 text-xs font-black text-[#233B6E] shadow-editorial backdrop-blur transition hover:-translate-y-0.5 hover:bg-[#F7F9FD]"
            aria-label={`Call SocietyFlats on ${PHONE_DISPLAY}`}
          >
            <Phone className="h-3.5 w-3.5" />
            {PHONE_DISPLAY}
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#233B6E] bg-[#233B6E] px-4 text-xs font-black text-white shadow-editorial transition hover:-translate-y-0.5 hover:bg-[#1B2E57]"
            aria-label="WhatsApp SocietyFlats"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        </div>
      </div> : null}

      <div className={`${hideMobileForPageCta ? "hidden" : "fixed"} right-3 bottom-[calc(5.35rem+env(safe-area-inset-bottom))] z-40 lg:hidden`}>
        <div className="flex flex-col items-center gap-2">
          <a
            href={`tel:${PHONE_TEL}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#D8DFEC] bg-white/95 text-[#233B6E] shadow-editorial backdrop-blur transition active:scale-95"
            aria-label={`Call SocietyFlats on ${PHONE_DISPLAY}`}
          >
            <Phone className="h-4 w-4" />
            <span className="sr-only">Call SocietyFlats</span>
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#233B6E] bg-[#233B6E] text-white shadow-editorial transition active:scale-95"
            aria-label="WhatsApp SocietyFlats"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="sr-only">WhatsApp SocietyFlats</span>
          </a>
        </div>
      </div>
    </>
  );
}
