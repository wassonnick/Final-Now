import { Link } from "react-router-dom";
import { ArrowRight, Building2, MapPin, Navigation } from "lucide-react";

import { type AdminSociety } from "@/lib/adminSocietyStore";
import { formatPublicLocation } from "@/lib/publicData";
import { googleMapsSearchHref, hasValidMapCoordinates, mapCoordinateHref, parseMapCoordinate as parseSharedMapCoordinate } from "@/lib/mapCoordinates";

type SocietyMapViewProps = {
  societies: AdminSociety[];
  query?: string;
};

function parseMapCoordinate(value: unknown) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function hasReadyMapCoordinates(society: AdminSociety) {
  return hasValidMapCoordinates(society.latitude, society.longitude);
}

export function getValidMapSocieties(societies: AdminSociety[]) {
  return societies.filter(hasReadyMapCoordinates);
}

function societyPath(society: AdminSociety) {
  return society.slug
    ? `/society/${society.slug}`
    : `/search?tab=societies&intent=general&q=${encodeURIComponent(society.name)}`;
}

function googlePinHref(society: AdminSociety) {
  if (society.googleMapsUrl) return society.googleMapsUrl;

  const coordinateHref = mapCoordinateHref(society.latitude, society.longitude);

  if (coordinateHref) {
    return coordinateHref;
  }

  return googleMapsSearchHref(`${society.name} ${formatPublicLocation(society)} Gurugram`);
}

function positionForSociety(index: number) {
  const safePositions = [
    { left: "22%", top: "30%" },
    { left: "50%", top: "48%" },
    { left: "76%", top: "34%" },
    { left: "34%", top: "70%" },
    { left: "66%", top: "72%" },
    { left: "18%", top: "58%" },
    { left: "84%", top: "58%" },
    { left: "50%", top: "24%" },
  ];

  return safePositions[index % safePositions.length];
}

export function SocietyMapView({ societies, query = "" }: SocietyMapViewProps) {
  const validSocieties = getValidMapSocieties(societies);
  const visibleSocieties = validSocieties.slice(0, 8);

  if (!validSocieties.length) {
    return (
      <div className="rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
          Map coordinates pending
        </p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-3xl font-black tracking-[-0.05em] text-navy-950 md:text-4xl">
              Map pins appear after admin coordinate verification.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-navy-500 md:text-base">
              Add latitude and longitude in Admin Society profiles to unlock society pins, nearby-home CTAs and location-led shortlisting.
            </p>
          </div>
          <Link
            to={`/search?tab=societies&intent=general&q=${encodeURIComponent(query || "Gurgaon societies")}`}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
          >
            Browse all societies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white shadow-sm">
      <div className="relative min-h-[520px] overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <div className="absolute inset-0 opacity-60">
          <div className="absolute left-[12%] top-[18%] h-48 w-48 rounded-full bg-blue-200/45 blur-3xl" />
          <div className="absolute bottom-[8%] right-[8%] h-64 w-64 rounded-full bg-sky-200/55 blur-3xl" />
          <div className="absolute inset-x-10 top-1/2 h-px bg-blue-200" />
          <div className="absolute inset-y-10 left-1/2 w-px bg-blue-200" />
          <div className="absolute left-[18%] top-[20%] h-[70%] w-px rotate-45 bg-blue-100" />
          <div className="absolute right-[18%] top-[20%] h-[70%] w-px -rotate-45 bg-blue-100" />
        </div>

        <div className="relative z-10 flex items-center justify-between gap-3 border-b border-blue-100 bg-white/80 px-4 py-4 backdrop-blur">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
              Coordinate map
            </p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-navy-950">
              {validSocieties.length} verified society pins
            </h2>
          </div>
          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
            Coordinates ready
          </span>
        </div>

        <div className="relative h-[440px]">
          {visibleSocieties.map((society, index) => {
            const position = positionForSociety(index);

            return (
              <Link
                key={society.id || society.slug || society.name}
                to={societyPath(society)}
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={position}
              >
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-blue-700 text-white shadow-xl transition group-hover:scale-110">
                  <MapPin className="h-5 w-5" />
                  <span className="absolute -right-1 -top-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-black text-blue-700 shadow">
                    {index + 1}
                  </span>
                </span>
                <span className="absolute left-1/2 top-14 hidden w-52 -translate-x-1/2 rounded-2xl border border-blue-100 bg-white p-3 text-left shadow-xl group-hover:block">
                  <span className="block text-sm font-black text-navy-950">{society.name}</span>
                  <span className="mt-1 block text-xs font-semibold text-navy-500">{formatPublicLocation(society)}</span>
                  <span className="mt-2 inline-flex items-center text-xs font-black text-blue-700">
                    Open profile <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 border-t border-blue-100 bg-white p-4 md:grid-cols-3">
        {validSocieties.slice(0, 3).map((society) => (
          <div key={society.id || society.slug || society.name} className="rounded-2xl border border-blue-100 bg-blue-50/45 p-4">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-white p-2 text-blue-700">
                <Building2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-navy-950">{society.name}</p>
                <p className="mt-1 line-clamp-1 text-xs font-semibold text-navy-500">{formatPublicLocation(society)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                to={societyPath(society)}
                className="inline-flex items-center justify-center rounded-full bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800"
              >
                Profile
              </Link>
              <a
                href={googlePinHref(society)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"
              >
                <Navigation className="mr-1 h-3.5 w-3.5" />
                Pin
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
