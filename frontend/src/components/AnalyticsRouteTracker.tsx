import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { trackEvent, trackPageView } from "@/lib/analytics";

function publicEntityContext(pathname: string) {
  const societyMatch = pathname.match(/^\/society\/([^/]+)/);
  if (societyMatch) return { society_slug: decodeURIComponent(societyMatch[1]) };

  const propertyMatch = pathname.match(/^\/property\/([^/]+)/);
  if (propertyMatch) return { property_slug: decodeURIComponent(propertyMatch[1]) };

  return {};
}

export function AnalyticsRouteTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`, document.title);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const trackContactClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;

      const href = link.getAttribute("href") || "";
      const context = link.dataset.analyticsContext || location.pathname;
      const entityContext = publicEntityContext(location.pathname);

      if (/^(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(href)) {
        trackEvent("whatsapp_click", {
          page_path: location.pathname,
          context,
          ...entityContext,
        });
      } else if (/^tel:/i.test(href)) {
        trackEvent("call_click", {
          page_path: location.pathname,
          context,
        });
      }
    };

    document.addEventListener("click", trackContactClick, true);
    return () => document.removeEventListener("click", trackContactClick, true);
  }, [location.pathname]);

  return null;
}
