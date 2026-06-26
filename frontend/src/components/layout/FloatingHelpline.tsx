import { MessageCircle, Phone } from "lucide-react";
import { useLocation } from "react-router-dom";

const PHONE_DISPLAY = "+91 99118 86222";
const PHONE_TEL = "+919911886222";
const WHATSAPP_URL =
  "https://wa.me/919911886222?text=Hi%20SocietyFlats%2C%20I%20need%20help%20shortlisting%20a%20Gurgaon%20society%20or%20home.";

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
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-paper-300 bg-paper-50/95 px-4 text-xs font-black text-pine-800 shadow-editorial backdrop-blur transition hover:-translate-y-0.5 hover:bg-sage-50"
            aria-label={`Call SocietyFlats on ${PHONE_DISPLAY}`}
          >
            <Phone className="h-3.5 w-3.5" />
            {PHONE_DISPLAY}
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-sage-300 bg-pine-800 px-4 text-xs font-black text-white shadow-editorial transition hover:-translate-y-0.5 hover:bg-pine-900"
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-paper-300 bg-paper-50/95 text-pine-800 shadow-editorial backdrop-blur transition active:scale-95"
            aria-label={`Call SocietyFlats on ${PHONE_DISPLAY}`}
          >
            <Phone className="h-4 w-4" />
            <span className="sr-only">Call SocietyFlats</span>
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sage-300 bg-pine-800 text-white shadow-editorial transition active:scale-95"
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
