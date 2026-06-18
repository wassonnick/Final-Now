import "leaflet/dist/leaflet.css";

import { Link } from "react-router-dom";
import { DivIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { ExternalLink, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPublicLocation } from "@/lib/publicData";
import { slugifySociety, type AdminSociety } from "@/lib/adminSocietyStore";

type SocietyMapViewProps = {
  societies: AdminSociety[];
  query?: string;
  className?: string;
};

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function toCoord(value: unknown) {
  const raw = cleanText(value);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasRealCoordinates(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) return false;
  if (lat === 0 && lng === 0) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function scoreOf(society: AdminSociety, fallback = 8.4) {
  const parsed = Number(society.score || fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed.toFixed(1) : fallback.toFixed(1);
}

function societyHref(society: AdminSociety) {
  const slug = society.slug || slugifySociety(society.name);
  return slug ? `/society/${slug}` : `/search?tab=societies&q=${encodeURIComponent(society.name)}&intent=general`;
}

function makePinIcon(score: string) {
  return new DivIcon({
    className: "society-map-pin",
    html: `<div class="society-map-pin__inner">${score}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -18],
  });
}

export function getValidMapSocieties(societies: AdminSociety[]) {
  return societies
    .map((society) => {
      const lat = toCoord(society.latitude);
      const lng = toCoord(society.longitude);

      return {
        society,
        lat,
        lng,
        valid: hasRealCoordinates(lat, lng),
      };
    })
    .filter((item): item is { society: AdminSociety; lat: number; lng: number; valid: true } => item.valid);
}

export function SocietyMapView({ societies, query = "", className = "" }: SocietyMapViewProps) {
  const validSocieties = getValidMapSocieties(societies);
  const pendingSocieties = societies.filter((society) => {
    const lat = toCoord(society.latitude);
    const lng = toCoord(society.longitude);
    return !hasRealCoordinates(lat, lng);
  });

  const center =
    validSocieties.length > 0
      ? ([validSocieties[0].lat, validSocieties[0].lng] as [number, number])
      : ([28.4595, 77.0266] as [number, number]);

  if (!validSocieties.length) {
    return (
      <div className={className}>
        <div className="rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-slate-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Map coordinates pending
              </p>
              <h2 className="mt-2 font-serif text-3xl font-black tracking-[-0.04em] text-navy-950">
                Map pins appear after admin coordinate verification.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-500">
                Add latitude and longitude in Admin Society profiles to unlock society pins, nearby-home CTAs and location-led shortlisting.
              </p>
            </div>
            <Button asChild className="rounded-full bg-blue-700 px-5 hover:bg-blue-800">
              <Link to="/societies">Browse all societies</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {(pendingSocieties.length ? pendingSocieties : societies).slice(0, 6).map((society) => (
              <Link
                key={society.slug || society.name}
                to={societyHref(society)}
                className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-navy-950">{society.name}</p>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-navy-500">
                      {formatPublicLocation(society)}
                    </p>
                    <p className="mt-2 text-[11px] font-bold text-blue-700">
                      Coordinate verification pending
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <style>{`
        .society-map-pin {
          background: transparent;
          border: 0;
        }
        .society-map-pin__inner {
          width: 44px;
          height: 44px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1d4ed8;
          color: white;
          border: 4px solid white;
          box-shadow: 0 14px 30px rgba(29, 78, 216, 0.30);
          font-size: 11px;
          font-weight: 900;
        }
        .leaflet-container {
          font-family: inherit;
        }
      `}</style>

      <div className="overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Live OpenStreetMap layer
            </p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-navy-950">
              {validSocieties.length} verified map pin{validSocieties.length === 1 ? "" : "s"}
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-navy-500">
            Click a society pin to open its profile, compare location fit, or request homes near that society.
          </p>
        </div>

        <div className="h-[520px] w-full">
          <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {validSocieties.map(({ society, lat, lng }, index) => {
              const score = scoreOf(society, 8.8 - index * 0.2);
              return (
                <Marker
                  key={`${society.slug || society.name}-${lat}-${lng}`}
                  position={[lat, lng]}
                  icon={makePinIcon(score)}
                >
                  <Popup>
                    <div className="min-w-[220px]">
                      <p className="text-sm font-black text-navy-950">{society.name}</p>
                      <p className="mt-1 text-xs font-semibold text-navy-500">
                        {formatPublicLocation(society)}
                      </p>
                      <div className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                        Society score: {score}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Link
                          to={societyHref(society)}
                          className="inline-flex items-center rounded-full bg-blue-700 px-3 py-2 text-xs font-bold text-white"
                        >
                          Open profile <ExternalLink className="ml-1.5 h-3 w-3" />
                        </Link>
                        <Link
                          to={`/search?tab=societies&intent=map&fromMap=1&society=${encodeURIComponent(society.name)}&q=${encodeURIComponent(query || society.name)}`}
                          className="inline-flex items-center rounded-full border border-blue-100 px-3 py-2 text-xs font-bold text-blue-700"
                        >
                          Homes nearby
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {pendingSocieties.length ? (
        <div className="mt-4 rounded-[1.35rem] border border-amber-100 bg-amber-50/80 p-4">
          <p className="text-sm font-black text-amber-900">
            {pendingSocieties.length} societ{pendingSocieties.length === 1 ? "y" : "ies"} pending coordinate verification
          </p>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            These will appear on the map after latitude and longitude are added in admin.
          </p>
        </div>
      ) : null}
    </div>
  );
}
