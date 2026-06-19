import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, MapPin, Navigation, School, Train } from "lucide-react";

import { LocationIntelligencePreview } from "@/components/maps/LocationIntelligencePreview";
import { hasValidMapCoordinates, parseMapCoordinate } from "@/lib/mapCoordinates";

type NearbyCategory = {
  title: string;
  primary: string;
  extraCount?: number;
};

type SocietyNearbyGoogleMapProps = {
  title: string;
  location?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  googleMapsUrl?: string | null;
  activeCategory: string;
  nearbyCategories: NearbyCategory[];
  nearbySchools?: string | null;
  nearbyMetro?: string | null;
  nearbyHospitals?: string | null;
  nearbyOfficeHubs?: string | null;
};

declare global {
  interface Window {
    google?: any;
    societyFlatsGoogleMapsPlacesPromise?: Promise<void>;
  }
}

const GOOGLE_MAPS_API_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();

const CATEGORY_CONFIG: Record<
  string,
  {
    label: string;
    query: string;
    radius: number;
    icon: typeof School;
  }
> = {
  Schools: {
    label: "Schools",
    query: "schools",
    radius: 5500,
    icon: School,
  },
  Metro: {
    label: "Metro",
    query: "metro station rapid metro subway station",
    radius: 7000,
    icon: Train,
  },
  Hospitals: {
    label: "Hospitals",
    query: "hospitals",
    radius: 6000,
    icon: Navigation,
  },
  "Office hubs": {
    label: "Office hubs",
    query: "business parks office hubs corporate offices",
    radius: 9000,
    icon: Building2,
  },
};

function cleanText(value?: string | number | null) {
  return String(value || "").trim();
}

function safeHtml(value?: string | number | null) {
  return cleanText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function loadGoogleMapsWithPlaces(apiKey: string) {
  if (window.google?.maps?.places?.PlacesService) return Promise.resolve();

  if (window.societyFlatsGoogleMapsPlacesPromise) {
    return window.societyFlatsGoogleMapsPlacesPromise;
  }

  window.societyFlatsGoogleMapsPlacesPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-societyflats-google-maps="true"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google Maps failed to load")));

      if (window.google?.maps?.importLibrary) {
        window.google.maps.importLibrary("places").finally(resolve);
      } else if (window.google?.maps) {
        resolve();
      }

      return;
    }

    const script = document.createElement("script");
    script.dataset.societyflatsGoogleMaps = "true";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=places&v=weekly`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return window.societyFlatsGoogleMapsPlacesPromise;
}

export function SocietyNearbyGoogleMap({
  title,
  location,
  latitude,
  longitude,
  googleMapsUrl,
  activeCategory,
  nearbyCategories,
  nearbySchools,
  nearbyMetro,
  nearbyHospitals,
  nearbyOfficeHubs,
}: SocietyNearbyGoogleMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const societyMarkerRef = useRef<any>(null);
  const placeMarkersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const requestIdRef = useRef(0);

  const [mapError, setMapError] = useState("");
  const [loadedPlaces, setLoadedPlaces] = useState<Array<{ name: string; category: string }>>([]);
  const [mapStatus, setMapStatus] = useState("Loading nearby markers...");

  const lat = parseMapCoordinate(latitude);
  const lng = parseMapCoordinate(longitude);
  const hasCoordinates = hasValidMapCoordinates(latitude, longitude);
  const cleanLocation = cleanText(location) || "Gurgaon";

  const categoriesToFetch = useMemo(() => {
    if (activeCategory && activeCategory !== "All" && CATEGORY_CONFIG[activeCategory]) {
      return [activeCategory];
    }

    const available = nearbyCategories
      .map((item) => item.title)
      .filter((itemTitle) => CATEGORY_CONFIG[itemTitle]);

    return available.length ? available : Object.keys(CATEGORY_CONFIG);
  }, [activeCategory, nearbyCategories]);

  useEffect(() => {
    let cancelled = false;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    async function renderMap() {
      if (!GOOGLE_MAPS_API_KEY || !hasCoordinates || lat === null || lng === null || !mapRef.current) {
        return;
      }

      setMapError("");
      setLoadedPlaces([]);
      setMapStatus(
        activeCategory === "All"
          ? "Loading nearby markers..."
          : `Loading ${activeCategory} markers...`,
      );

      try {
        await loadGoogleMapsWithPlaces(GOOGLE_MAPS_API_KEY);

        if (cancelled || requestId !== requestIdRef.current || !window.google?.maps || !mapRef.current) {
          return;
        }

        const center = { lat, lng };

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center,
            zoom: 14,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
        }

        mapInstanceRef.current.setCenter(center);
        mapInstanceRef.current.setZoom(14);

        infoWindowRef.current = infoWindowRef.current || new window.google.maps.InfoWindow();

        if (societyMarkerRef.current) {
          societyMarkerRef.current.setMap(null);
        }

        societyMarkerRef.current = new window.google.maps.Marker({
          position: center,
          map: mapInstanceRef.current,
          title,
          label: "S",
          zIndex: 999,
        });

        const openSocietyCard = () => {
          if (!infoWindowRef.current || !societyMarkerRef.current || !mapInstanceRef.current) return;

          infoWindowRef.current.setContent(`
            <div style="max-width:260px;font-family:Inter,Arial,sans-serif;">
              <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;margin-bottom:4px;">SocietyFlats society pin</div>
              <div style="font-size:15px;font-weight:900;color:#0f172a;margin-bottom:4px;">${safeHtml(title)}</div>
              <div style="font-size:12px;line-height:1.45;color:#64748b;margin-bottom:8px;">${safeHtml(cleanLocation)}</div>
              <div style="font-size:11px;font-weight:800;color:#16a34a;">Verified coordinate layer</div>
            </div>
          `);

          infoWindowRef.current.open(mapInstanceRef.current, societyMarkerRef.current);
        };

        societyMarkerRef.current.addListener("click", openSocietyCard);

        placeMarkersRef.current.forEach((marker) => marker.setMap(null));
        placeMarkersRef.current = [];

        if (!window.google?.maps?.places?.PlacesService) {
          openSocietyCard();
          setMapStatus("Society pin loaded. Google Places markers are unavailable for this key.");
          return;
        }

        const service = new window.google.maps.places.PlacesService(mapInstanceRef.current);
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(center);

        const collectedPlaces: Array<{ name: string; category: string }> = [];
        let pending = categoriesToFetch.length;
        let totalMarkers = 0;

        const finishCategory = () => {
          pending -= 1;

          if (pending <= 0 && requestId === requestIdRef.current && !cancelled) {
            if (totalMarkers > 0) {
              mapInstanceRef.current.fitBounds(bounds, 80);
              setMapStatus(
                activeCategory === "All"
                  ? `${totalMarkers} nearby markers loaded.`
                  : `${totalMarkers} ${activeCategory} marker${totalMarkers === 1 ? "" : "s"} loaded.`,
              );
            } else {
              mapInstanceRef.current.setCenter(center);
              mapInstanceRef.current.setZoom(14);
              setMapStatus(
                activeCategory === "All"
                  ? "Society pin loaded. Nearby markers were not returned by Google Places."
                  : `Society pin loaded. No ${activeCategory} markers returned nearby.`,
              );
            }

            openSocietyCard();
          }
        };

        categoriesToFetch.forEach((category) => {
          const config = CATEGORY_CONFIG[category];
          if (!config) {
            finishCategory();
            return;
          }

          service.textSearch(
            {
              query: `${config.query} near ${title}, ${cleanLocation}`,
              location: center,
              radius: config.radius,
            },
            (results: any[] | null, status: string) => {
              if (cancelled || requestId !== requestIdRef.current) return;

              if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results?.length) {
                finishCategory();
                return;
              }

              results.slice(0, activeCategory === "All" ? 3 : 8).forEach((place) => {
                const placeLocation = place?.geometry?.location;
                const name = cleanText(place?.name);

                if (!placeLocation || !name) return;

                const marker = new window.google.maps.Marker({
                  position: placeLocation,
                  map: mapInstanceRef.current,
                  title: name,
                  label: category.charAt(0).toUpperCase(),
                });

                marker.addListener("click", () => {
                  infoWindowRef.current.setContent(`
                    <div style="max-width:250px;font-family:Inter,Arial,sans-serif;">
                      <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;margin-bottom:4px;">${safeHtml(category)}</div>
                      <div style="font-size:14px;font-weight:900;color:#0f172a;margin-bottom:4px;">${safeHtml(name)}</div>
                      <div style="font-size:12px;line-height:1.45;color:#64748b;">${safeHtml(place?.formatted_address || place?.vicinity)}</div>
                    </div>
                  `);
                  infoWindowRef.current.open(mapInstanceRef.current, marker);
                });

                placeMarkersRef.current.push(marker);
                bounds.extend(placeLocation);
                totalMarkers += 1;

                if (collectedPlaces.length < 8) {
                  collectedPlaces.push({ name, category });
                }
              });

              setLoadedPlaces([...collectedPlaces]);
              finishCategory();
            },
          );
        });
      } catch (error) {
        console.error("Society nearby Google map failed", error);
        setMapError("Google map could not load. Showing SocietyFlats location preview.");
      }
    }

    renderMap();

    return () => {
      cancelled = true;
    };
  }, [activeCategory, categoriesToFetch, cleanLocation, hasCoordinates, lat, lng, title]);

  if (!GOOGLE_MAPS_API_KEY || !hasCoordinates || mapError) {
    return (
      <LocationIntelligencePreview
        title={title}
        location={location}
        latitude={latitude}
        longitude={longitude}
        googleMapsUrl={googleMapsUrl}
        nearbySchools={nearbySchools}
        nearbyMetro={nearbyMetro}
        nearbyHospitals={nearbyHospitals}
        nearbyOfficeHubs={nearbyOfficeHubs}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-blue-100 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-blue-100 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
            Live location layer
          </p>
          <h3 className="mt-1 text-lg font-black tracking-[-0.03em] text-navy-950">
            {activeCategory === "All"
              ? "Society pin + nearby places"
              : `Society pin + nearby ${activeCategory}`}
          </h3>
        </div>
        <span className="w-fit rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
          {activeCategory === "All" ? "All nearby" : activeCategory}
        </span>
      </div>

      <div className="grid md:grid-cols-[minmax(0,1fr)_260px]">
        <div ref={mapRef} className="h-[360px] w-full bg-blue-50" />

        <div className="border-t border-blue-100 bg-blue-50/40 p-3 md:border-l md:border-t-0">
          <div className="rounded-xl bg-white px-3 py-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-700" />
              <p className="text-sm font-black text-navy-950">{title}</p>
            </div>
            <p className="mt-1 line-clamp-2 text-xs font-semibold text-navy-500">
              {cleanLocation}
            </p>
            <p className="mt-2 text-[11px] font-black text-emerald-700">
              Default society card
            </p>
          </div>

          <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-navy-600">
            {mapStatus}
          </div>

          <div className="mt-3 space-y-2">
            {loadedPlaces.length ? (
              loadedPlaces.slice(0, 7).map((place) => (
                <div key={`${place.category}-${place.name}`} className="rounded-xl bg-white px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-500">
                    {place.category}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs font-bold text-navy-800">
                    {place.name}
                  </p>
                </div>
              ))
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SocietyNearbyGoogleMap;
