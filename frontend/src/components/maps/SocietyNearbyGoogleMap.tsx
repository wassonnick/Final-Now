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
    societyFlatsGoogleMapsPromise?: Promise<void>;
    societyFlatsGoogleMapsPlacesPromise?: Promise<void>;
  }
}

const GOOGLE_MAPS_API_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();

const CATEGORY_CONFIG: Record<
  string,
  {
    label: string;
    keyword: string;
    type?: string;
    icon: typeof School;
  }
> = {
  Schools: {
    label: "Schools",
    keyword: "school",
    type: "school",
    icon: School,
  },
  Metro: {
    label: "Metro",
    keyword: "metro station rapid metro subway station",
    type: "subway_station",
    icon: Train,
  },
  Hospitals: {
    label: "Hospitals",
    keyword: "hospital",
    type: "hospital",
    icon: Navigation,
  },
  "Office hubs": {
    label: "Office hubs",
    keyword: "business park office hub corporate office",
    type: "establishment",
    icon: Building2,
  },
};

function cleanText(value?: string | number | null) {
  return String(value || "").trim();
}

function loadGoogleMapsWithPlaces(apiKey: string) {
  if (window.google?.maps?.places) return Promise.resolve();

  if (window.societyFlatsGoogleMapsPlacesPromise) {
    return window.societyFlatsGoogleMapsPlacesPromise;
  }

  window.societyFlatsGoogleMapsPlacesPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.maps?.importLibrary) {
      window.google.maps
        .importLibrary("places")
        .then(() => resolve())
        .catch(() => resolve());
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-societyflats-google-maps="true"]',
    );

    if (existing) {
      existing.addEventListener("load", () => {
        if (window.google?.maps?.importLibrary) {
          window.google.maps.importLibrary("places").finally(resolve);
        } else {
          resolve();
        }
      });
      existing.addEventListener("error", () => reject(new Error("Google Maps failed to load")));
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
  const [mapError, setMapError] = useState("");
  const [loadedPlaces, setLoadedPlaces] = useState<Array<{ name: string; category: string }>>([]);

  const lat = parseMapCoordinate(latitude);
  const lng = parseMapCoordinate(longitude);
  const hasCoordinates = hasValidMapCoordinates(latitude, longitude);

  const categoriesToFetch = useMemo(() => {
    const available = nearbyCategories
      .map((item) => item.title)
      .filter((title) => CATEGORY_CONFIG[title]);

    if (activeCategory && activeCategory !== "All" && CATEGORY_CONFIG[activeCategory]) {
      return [activeCategory];
    }

    return available.length ? available : Object.keys(CATEGORY_CONFIG);
  }, [activeCategory, nearbyCategories]);

  useEffect(() => {
    let cancelled = false;

    async function renderMap() {
      if (!GOOGLE_MAPS_API_KEY || !hasCoordinates || lat === null || lng === null || !mapRef.current) {
        return;
      }

      try {
        await loadGoogleMapsWithPlaces(GOOGLE_MAPS_API_KEY);

        if (cancelled || !window.google?.maps || !mapRef.current) return;

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
        });

        societyMarkerRef.current.addListener("click", () => {
          infoWindowRef.current.setContent(`
            <div style="max-width:220px;font-family:Inter,Arial,sans-serif;">
              <div style="font-weight:800;color:#0f172a;margin-bottom:4px;">${title}</div>
              <div style="font-size:12px;color:#64748b;">${cleanText(location) || "Society location"}</div>
            </div>
          `);
          infoWindowRef.current.open(mapInstanceRef.current, societyMarkerRef.current);
        });

        placeMarkersRef.current.forEach((marker) => marker.setMap(null));
        placeMarkersRef.current = [];
        setLoadedPlaces([]);

        if (!window.google?.maps?.places?.PlacesService) {
          setMapError("Google Places layer is not available yet. Society pin is shown.");
          return;
        }

        const service = new window.google.maps.places.PlacesService(mapInstanceRef.current);
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(center);

        const allLoaded: Array<{ name: string; category: string }> = [];

        categoriesToFetch.forEach((category) => {
          const config = CATEGORY_CONFIG[category];
          if (!config) return;

          service.nearbySearch(
            {
              location: center,
              radius: category === "Office hubs" ? 8500 : 5500,
              keyword: config.keyword,
              type: config.type,
            },
            (results: any[] | null, status: string) => {
              if (cancelled || status !== window.google.maps.places.PlacesServiceStatus.OK || !results) {
                return;
              }

              results.slice(0, activeCategory === "All" ? 3 : 7).forEach((place, index) => {
                const placeLocation = place?.geometry?.location;
                const name = cleanText(place?.name);

                if (!placeLocation || !name) return;

                const marker = new window.google.maps.Marker({
                  position: placeLocation,
                  map: mapInstanceRef.current,
                  title: name,
                  label: category.charAt(0),
                });

                marker.addListener("click", () => {
                  infoWindowRef.current.setContent(`
                    <div style="max-width:240px;font-family:Inter,Arial,sans-serif;">
                      <div style="font-weight:800;color:#0f172a;margin-bottom:4px;">${name}</div>
                      <div style="font-size:12px;color:#64748b;margin-bottom:6px;">${category}</div>
                      <div style="font-size:12px;color:#64748b;">${cleanText(place?.vicinity)}</div>
                    </div>
                  `);
                  infoWindowRef.current.open(mapInstanceRef.current, marker);
                });

                placeMarkersRef.current.push(marker);
                bounds.extend(placeLocation);

                if (index < 4) {
                  allLoaded.push({ name, category });
                }
              });

              if (placeMarkersRef.current.length) {
                mapInstanceRef.current.fitBounds(bounds, 80);
              }

              setLoadedPlaces([...allLoaded]);
            },
          );
        });

        setMapError("");
      } catch (error) {
        console.error("Society nearby Google map failed", error);
        setMapError("Google map could not load. Showing SocietyFlats location preview.");
      }
    }

    renderMap();

    return () => {
      cancelled = true;
    };
  }, [activeCategory, categoriesToFetch, googleMapsUrl, hasCoordinates, lat, lng, location, title]);

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
            Society pin + nearby {activeCategory === "All" ? "places" : activeCategory}
          </h3>
        </div>
        <span className="w-fit rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
          In-page Google map
        </span>
      </div>

      <div className="grid md:grid-cols-[minmax(0,1fr)_260px]">
        <div ref={mapRef} className="h-[360px] w-full bg-blue-50" />

        <div className="border-t border-blue-100 bg-blue-50/40 p-3 md:border-l md:border-t-0">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-700" />
            <p className="text-sm font-black text-navy-950">{title}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs font-semibold text-navy-500">
            {cleanText(location) || "Gurgaon society location"}
          </p>

          <div className="mt-3 space-y-2">
            {loadedPlaces.length ? (
              loadedPlaces.slice(0, 6).map((place) => (
                <div key={`${place.category}-${place.name}`} className="rounded-xl bg-white px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-500">
                    {place.category}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs font-bold text-navy-800">
                    {place.name}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-navy-500">
                Loading nearby markers. Click the society pin or switch category if markers do not appear.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SocietyNearbyGoogleMap;
