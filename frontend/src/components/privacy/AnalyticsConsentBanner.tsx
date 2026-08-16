import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

import {
  getConsentPreferences,
  updateConsentPreferences,
  type ConsentPreferences,
} from "@/lib/analytics";

const ACCENT = "#0F7B63";

/**
 * Consent for optional analytics.
 *
 * Deliberately a small corner card rather than a bottom sheet: the full-width
 * version landed on top of the homepage search — the one thing every visitor is
 * there to use. Nothing is stored before a choice is made (GA runs in consent
 * mode, denied by default), so there is no reason for this to block the page.
 */
export function AnalyticsConsentBanner() {
  const location = useLocation();
  const [preferences, setPreferences] = useState<ConsentPreferences | null>(() => getConsentPreferences());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleConsentUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ConsentPreferences>;
      setPreferences(customEvent.detail);
    };

    window.addEventListener("societyflats:consent-updated", handleConsentUpdate);
    return () => window.removeEventListener("societyflats:consent-updated", handleConsentUpdate);
  }, []);

  // Let people see the page first. Whichever comes first — a short pause or the
  // first scroll — is when they've had a moment to arrive.
  useEffect(() => {
    if (preferences) return;
    const show = () => setVisible(true);
    const timer = window.setTimeout(show, 2500);
    window.addEventListener("scroll", show, { once: true, passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", show);
    };
  }, [preferences]);

  if (preferences || !visible || location.pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <section
      aria-label="Analytics privacy choices"
      className="consent-banner ncr-skin fixed left-3 right-3 z-[100] w-auto animate-in fade-in slide-in-from-bottom-2 rounded-[20px] border border-[#E4E4E9] bg-white/97 p-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,.35)] backdrop-blur duration-300 sm:left-5 sm:right-auto sm:w-[360px]"
    >
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ background: "#ECF6F2", color: ACCENT }}
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <h2 className="!font-sans text-[15px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">Your privacy, your choice</h2>
      </div>

      <p className="mt-2 text-[13px] leading-5 text-[#6E6E73]">
        We use optional analytics to see which pages help. Never your name, phone, email or enquiry.{" "}
        <Link className="font-semibold text-[#1D1D1F] underline underline-offset-2" to="/privacy">
          Details
        </Link>
      </p>

      <div className="mt-3.5 flex items-center gap-2">
        <button
          type="button"
          className="flex-1 rounded-full px-4 py-2.5 text-[13px] font-bold text-white transition hover:opacity-90"
          style={{ background: ACCENT }}
          onClick={() => updateConsentPreferences("granted", "denied")}
        >
          Allow analytics
        </button>
        <button
          type="button"
          className="rounded-full border border-[#E4E4E9] bg-white px-4 py-2.5 text-[13px] font-bold text-[#6E6E73] transition hover:text-[#1D1D1F]"
          onClick={() => updateConsentPreferences("denied", "denied")}
        >
          Essential only
        </button>
      </div>
    </section>
  );
}
