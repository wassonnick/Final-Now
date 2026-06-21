import { MessageCircle, Phone } from "lucide-react";
import { useLocation } from "react-router-dom";

const PHONE_DISPLAY = "+91 99118 86222";
const PHONE_TEL = "+919911886222";
const WHATSAPP_URL =
  "https://wa.me/919911886222?text=Hi%20SocietyFlats%2C%20I%20need%20help%20shortlisting%20a%20Gurgaon%20society%20or%20home.";

export function FloatingHelpline() {
  const location = useLocation();
  const hideMobileForPageCta =
    location.pathname.startsWith("/society/") || location.pathname.startsWith("/property/");

  return (
    <>
      <div className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
        <div className="flex items-center overflow-hidden rounded-full border border-blue-100 bg-white/95 shadow-[0_14px_34px_rgba(15,23,42,0.14)] backdrop-blur">
          <a
            href={`tel:${PHONE_TEL}`}
            className="inline-flex h-10 items-center gap-2 border-r border-blue-100 px-3 text-xs font-black text-blue-700 hover:bg-blue-50"
            aria-label={`Call SocietyFlats on ${PHONE_DISPLAY}`}
          >
            <Phone className="h-3.5 w-3.5" />
            {PHONE_DISPLAY}
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 px-3 text-xs font-black text-green-700 hover:bg-green-50"
            aria-label="WhatsApp SocietyFlats"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        </div>
      </div>

      <div className={`${hideMobileForPageCta ? "hidden" : "fixed"} inset-x-0 bottom-[calc(5.45rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 lg:hidden`}>
        <div className="flex items-center overflow-hidden rounded-full border border-blue-100 bg-white/95 shadow-[0_12px_28px_rgba(15,23,42,0.16)] backdrop-blur">
          <a
            href={`tel:${PHONE_TEL}`}
            className="inline-flex h-9 items-center gap-1.5 border-r border-blue-100 px-3 text-[11px] font-black text-blue-700"
            aria-label={`Call SocietyFlats on ${PHONE_DISPLAY}`}
          >
            <Phone className="h-3.5 w-3.5" />
            {PHONE_DISPLAY}
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 px-3 text-[11px] font-black text-green-700"
            aria-label="WhatsApp SocietyFlats"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WA
          </a>
        </div>
      </div>
    </>
  );
}
