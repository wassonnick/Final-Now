import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

import {
  getConsentPreferences,
  updateConsentPreferences,
  type ConsentPreferences,
} from "@/lib/analytics";

export function AnalyticsConsentBanner() {
  const location = useLocation();
  const [preferences, setPreferences] = useState<ConsentPreferences | null>(() => getConsentPreferences());

  useEffect(() => {
    const handleConsentUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ConsentPreferences>;
      setPreferences(customEvent.detail);
    };

    window.addEventListener("societyflats:consent-updated", handleConsentUpdate);
    return () => window.removeEventListener("societyflats:consent-updated", handleConsentUpdate);
  }, []);

  if (preferences || location.pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <section
      aria-label="Analytics privacy choices"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-4xl rounded-[1.5rem] border border-blue-100 bg-white/95 p-4 shadow-[0_24px_70px_rgba(15,35,75,0.22)] backdrop-blur md:bottom-5 md:flex md:items-center md:gap-5 md:p-5"
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-serif text-lg font-semibold text-navy-950">Your privacy, your choice</h2>
          <p className="mt-1 text-sm leading-6 text-navy-500">
            SocietyFlats uses optional analytics to understand which public pages are useful. We do not
            send names, phone numbers, emails, or enquiry messages to Google Analytics.{" "}
            <Link className="font-semibold text-blue-700 underline-offset-4 hover:underline" to="/privacy">
              Privacy details
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-4 flex shrink-0 flex-col-reverse gap-2 sm:flex-row md:mt-0">
        <button
          type="button"
          className="rounded-full border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-navy-700 transition hover:border-blue-400"
          onClick={() => updateConsentPreferences("denied", "denied")}
        >
          Essential only
        </button>
        <button
          type="button"
          className="rounded-full bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900"
          onClick={() => updateConsentPreferences("granted", "denied")}
        >
          Allow analytics
        </button>
      </div>
    </section>
  );
}
