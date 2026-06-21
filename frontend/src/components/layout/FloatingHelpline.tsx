import { MessageCircle, Phone } from "lucide-react";

const PHONE_DISPLAY = "+91 99118 86222";
const PHONE_TEL = "+919911886222";
const WHATSAPP_URL =
  "https://wa.me/919911886222?text=Hi%20SocietyFlats%2C%20I%20need%20help%20shortlisting%20a%20Gurgaon%20society%20or%20home.";

export function FloatingHelpline() {
  return (
    <>
      <div className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
        <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
          <div className="border-b border-blue-50 bg-blue-50 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
              Need help?
            </p>
            <p className="mt-0.5 text-xs font-bold text-navy-700">SocietyFlats helpline</p>
          </div>

          <div className="grid gap-1.5 p-2">
            <a
              href={`tel:${PHONE_TEL}`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black text-navy-900 hover:bg-blue-50"
              aria-label={`Call SocietyFlats on ${PHONE_DISPLAY}`}
            >
              <Phone className="h-4 w-4 text-blue-700" />
              Call
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black text-green-700 hover:bg-green-50"
              aria-label="WhatsApp SocietyFlats"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[4.65rem] z-40 flex justify-center px-3 lg:hidden">
        <div className="flex items-center gap-1.5 rounded-full border border-blue-100 bg-white/95 p-1 shadow-[0_12px_28px_rgba(15,23,42,0.16)] backdrop-blur">
          <a
            href={`tel:${PHONE_TEL}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-blue-700 px-3 text-xs font-black text-white"
            aria-label={`Call SocietyFlats on ${PHONE_DISPLAY}`}
          >
            <Phone className="h-3.5 w-3.5" />
            Call
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-green-50 px-3 text-xs font-black text-green-700"
            aria-label="WhatsApp SocietyFlats"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        </div>
      </div>
    </>
  );
}
