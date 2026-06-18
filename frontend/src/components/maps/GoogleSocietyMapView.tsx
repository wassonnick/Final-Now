import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Loader2, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPublicLocation } from "@/lib/publicData";
import { slugifySociety, type AdminSociety } from "@/lib/adminSocietyStore";
import { getValidMapSocieties } from "@/components/maps/SocietyMapView";

type GoogleSocietyMapViewProps = {
  societies: AdminSociety[];
  query?: string;
  apiKey: string;
  className?: string;
};

type GoogleMapsWindow = Window &
  typeof globalThis & {
    google?: any;
    __societyFlatsGoogleMapsPromise?: Promise<void>;
  };

function scoreOf(society: AdminSociety, fallback = 8.4) {
  const parsed = Number(society.score || fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed.toFixed(1) : fallback.toFixed(1);
}

function societyHref(society: AdminSociety) {
  const slug = society.slug || slugifySociety(society.name);
  return slug ? `/society/${slug}` : `/search?tab=societies&q=${encodeURIComponent(society.name)}&intent=general`;
}

function loadGoogleMaps(apiKey: string) {
  const win = window as GoogleMapsWindow;

  if (win.google?.maps) return Promise.resolve();

  if (win.__societyFlatsGoogleMapsPromise) {
    return win.__societyFlatsGoogleMapsPromise;
  }

  win.__societyFlatsGoogleMapsPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-societyflats-google-maps="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google Maps script failed")));
      return;
    }

    const script = document.createElement("script");
    script.dataset.societyflatsGoogleMaps = "true";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps script failed"));
    document.head.appendChild(script);
  });

  return win.__societyFlatsGoogleMapsPromise;
}

export function GoogleSocietyMapView({ societies, query = "", apiKey, className = "" }: GoogleSocietyMapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const validSocieties = useMemo(() => getValidMapSocieties(societies), [societies]);
  const pendingSocieties = societies.length - validSocieties.length;

  useEffect(() => {
    if (!apiKey || !mapRef.current || !validSocieties.length) {
      setStatus(apiKey ? "ready" : "error");
      return;
    }

    let cancelled = false;

    setStatus("loading");

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !mapRef.current) return;

        const win = window as GoogleMapsWindow;
        if (!win.google?.maps) throw new Error("Google Maps unavailable");

        const center = {
          lat: validSocieties[0].lat,
          lng: validSocieties[0].lng,
        };

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new win.google.maps.Map(mapRef.current, {
            center,
            zoom: 12,
            clickableIcons: false,
            mapTypeControl: false,
            fullscreenControl: true,
            streetViewControl: false,
            gestureHandling: "greedy",
            styles: [
              {
                featureType: "poi.business",
                stylers: [{ visibility: "off" }],
              },
            ],
          });
        } else {
          mapInstanceRef.current.setCenter(center);
        }

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        infoWindowRef.current = infoWindowRef.current || new win.google.maps.InfoWindow();

        const bounds = new win.google.maps.LatLngBounds();

        validSocieties.forEach(({ society, lat, lng }, index) => {
          const score = scoreOf(society, 8.8 - index * 0.2);
          const position = { lat, lng };

          const marker = new win.google.maps.Marker({
            position,
            map: mapInstanceRef.current,
            title: society.name,
            label: {
              text: score,
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: "900",
            },
          });

          const href = societyHref(society);
          const homesHref = `/search?tab=societies&intent=general&q=${encodeURIComponent(query || society.name)}`;

          marker.addListener("click", () => {
            infoWindowRef.current.setContent(`
              <div style="min-width:220px;font-family:Inter,system-ui,sans-serif;">
                <div style="font-weight:900;font-size:14px;color:#0f172a;">${society.name}</div>
                <div style="margin-top:4px;font-size:12px;font-weight:600;color:#64748b;">${formatPublicLocation(society)}</div>
                <div style="margin-top:8px;border-radius:12px;background:#eff6ff;padding:8px 10px;font-size:12px;font-weight:800;color:#1d4ed8;">Society score: ${score}</div>
                <div style="margin-top:10px;display:flex;gap:8px;">
                  <a href="${href}" style="border-radius:999px;background:#1d4ed8;color:#fff;padding:8px 10px;font-size:12px;font-weight:800;text-decoration:none;">Open society</a>
                  <a href="${homesHref}" style="border-radius:999px;border:1px solid #dbeafe;color:#1d4ed8;padding:8px 10px;font-size:12px;font-weight:800;text-decoration:none;">Homes</a>
                </div>
              </div>
            `);
            infoWindowRef.current.open({
              anchor: marker,
              map: mapInstanceRef.current,
            });
          });

          markersRef.current.push(marker);
          bounds.extend(position);
        });

        if (validSocieties.length > 1) {
          mapInstanceRef.current.fitBounds(bounds, 72);
        }

        setStatus("ready");
      })
      .catch((error) => {
        console.error("Google Maps failed:", error);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, query, validSocieties]);

  if (!validSocieties.length) {
    return (
      <div className={className}>
        <div className="rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-slate-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Google map coordinates pending
              </p>
              <h2 className="mt-2 font-serif text-3xl font-black tracking-[-0.04em] text-navy-950">
                Google map will appear as society pins are verified.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-500">
                Add valid latitude and longitude in Admin Society profiles to show Google map pins here.
              </p>
            </div>
            <Button asChild className="rounded-full bg-blue-700 px-5 hover:bg-blue-800">
              <Link to="/societies">Browse societies</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={className}>
        <div className="rounded-[1.75rem] border border-amber-100 bg-amber-50 p-5">
          <p className="font-black text-amber-900">Google Maps could not load.</p>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            Check the API key, billing, domain restrictions and enabled Maps JavaScript API.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Google Maps layer
            </p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-navy-950">
              {validSocieties.length} verified map pin{validSocieties.length === 1 ? "" : "s"}
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-navy-500">
            Click a pin to open the society profile or matching homes. Google Maps loads only when the API key is configured.
          </p>
        </div>

        <div className="relative h-[520px] w-full">
          <div ref={mapRef} className="h-full w-full" />
          {status === "loading" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-700" />
                <p className="mt-3 text-sm font-bold text-navy-500">Loading Google map...</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {pendingSocieties > 0 ? (
        <div className="mt-4 rounded-[1.35rem] border border-amber-100 bg-amber-50/80 p-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-black text-amber-900">
                {pendingSocieties} societ{pendingSocieties === 1 ? "y" : "ies"} pending coordinate verification
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                These will appear after valid latitude and longitude are added in admin.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default GoogleSocietyMapView;
