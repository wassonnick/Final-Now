import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";

import { type AdminSociety } from "@/lib/adminSocietyStore";
import { formatPublicLocation } from "@/lib/publicData";
import { getValidMapSocieties } from "@/components/maps/SocietyMapView";

type GoogleSocietyMapViewProps = {
  societies: AdminSociety[];
  query?: string;
  apiKey: string;
  selectedSocietyId?: number | null;
  onSelectSociety?: (societyId: number) => void;
};

declare global {
  interface Window {
    google?: any;
    societyFlatsGoogleMapsPromise?: Promise<void>;
  }
}

function parseMapCoordinate(value: unknown) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function societyPath(society: AdminSociety) {
  return society.slug
    ? `/society/${society.slug}`
    : `/search?tab=societies&intent=general&q=${encodeURIComponent(society.name)}`;
}

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) return Promise.resolve();

  if (window.societyFlatsGoogleMapsPromise) {
    return window.societyFlatsGoogleMapsPromise;
  }

  window.societyFlatsGoogleMapsPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-societyflats-google-maps="true"]');

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google Maps failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.dataset.societyflatsGoogleMaps = "true";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return window.societyFlatsGoogleMapsPromise;
}

export function GoogleSocietyMapView({
  societies,
  query = "",
  apiKey,
  selectedSocietyId,
  onSelectSociety,
}: GoogleSocietyMapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const markerSocietyRefs = useRef<Array<{ society: AdminSociety; marker: any }>>([]);
  const infoWindowRef = useRef<any>(null);
  const [mapError, setMapError] = useState("");

  const openMarkerInfoWindow = (_society: AdminSociety, _marker: any) => {
    // C111F-FIX4: Google popup disabled. Map uses tiny labels + right selected panel only.
    return;
  };

  const openSelectedMarkerAfterRender = () => {
    if (!selectedSocietyId) return;

    const match = markerSocietyRefs.current.find(
      (item) => Number(item.society.id) === Number(selectedSocietyId),
    );

    if (!match) return;

    openMarkerInfoWindow(match.society, match.marker);
  };

  const validSocieties = getValidMapSocieties(societies);

  useEffect(() => {
    let cancelled = false;

    async function renderMap() {
      if (!apiKey || !mapRef.current || !validSocieties.length) return;

      try {
        await loadGoogleMaps(apiKey);
        if (cancelled || !window.google?.maps || !mapRef.current) return;

        const firstLat = parseMapCoordinate(validSocieties[0].latitude) || 28.4595;
        const firstLng = parseMapCoordinate(validSocieties[0].longitude) || 77.0266;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center: { lat: firstLat, lng: firstLng },
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
        }

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];
        markerSocietyRefs.current = [];

        infoWindowRef.current = infoWindowRef.current || new window.google.maps.InfoWindow();

        const bounds = new window.google.maps.LatLngBounds();

        validSocieties.forEach((society, index) => {
          const lat = parseMapCoordinate(society.latitude);
          const lng = parseMapCoordinate(society.longitude);

          if (lat === null || lng === null) return;

          const position = { lat, lng };
          bounds.extend(position);

          const marker = new window.google.maps.Marker({
            position,
            map: mapInstanceRef.current,
            title: society.name,
            label: String(index + 1),
          });

          marker.addListener("click", () => {
            onSelectSociety?.(Number(society.id));
          });

          markersRef.current.push(marker);
          markerSocietyRefs.current.push({ society, marker });
        });

        if (markersRef.current.length > 1) {
          mapInstanceRef.current.fitBounds(bounds, 80);
        } else if (markersRef.current.length === 1) {
          mapInstanceRef.current.setCenter(markersRef.current[0].getPosition());
          mapInstanceRef.current.setZoom(14);
        }

        // Auto popup disabled.

        setMapError("");
      } catch (error) {
        console.error("Google map render failed", error);
        setMapError("Google Maps could not load. Use the coordinate fallback or society list view.");
      }
    }

    renderMap();

    return () => {
      cancelled = true;
    };
  }, [apiKey, validSocieties, onSelectSociety, selectedSocietyId]);

  useEffect(() => {
    if (!selectedSocietyId) return;

    const timer = window.setTimeout(() => {
      // Auto popup disabled.
    }, 120);

    return () => window.clearTimeout(timer);
  }, [selectedSocietyId]);

  if (!validSocieties.length) {
    return (
      <div className="rounded-[1.75rem] border border-blue-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
          Google map
        </p>
        <h2 className="mt-2 font-serif text-3xl font-black tracking-[-0.05em] text-navy-950">
          No ready map pins match this search.
        </h2>
        <p className="mt-3 text-sm leading-6 text-navy-500">
          Try a wider society, sector or locality search.
        </p>
        <Link
          to={`/search?tab=societies&intent=general&q=${encodeURIComponent(query || "Gurgaon societies")}`}
          className="mt-4 inline-flex items-center rounded-full bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800"
        >
          Browse society list <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-white px-4 py-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
            Live Google map
          </p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-navy-950">
            {validSocieties.length} verified society pins
          </h2>
        </div>
        <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
          <MapPin className="mr-1.5 h-3.5 w-3.5" />
          Coordinates ready
        </span>
      </div>

      {mapError ? (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
          {mapError}
        </div>
      ) : null}

      <div ref={mapRef} className="h-[520px] w-full bg-blue-50" />
    </div>
  );
}

export default GoogleSocietyMapView;
