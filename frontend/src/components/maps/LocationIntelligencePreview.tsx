import { ExternalLink, MapPin, Navigation, Route, School, Train } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasValidMapCoordinates, mapCoordinateHref, parseMapCoordinate } from "@/lib/mapCoordinates";

type LocationIntelligencePreviewProps = {
  title: string;
  location?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  googleMapsUrl?: string | null;
  nearbySchools?: string | null;
  nearbyMetro?: string | null;
  nearbyHospitals?: string | null;
  nearbyOfficeHubs?: string | null;
};

function cleanText(value?: string | number | null) {
  return String(value || "").trim();
}

function splitNearby(value?: string | null) {
  return cleanText(value)
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2);
}

export function LocationIntelligencePreview({
  title,
  location,
  latitude,
  longitude,
  googleMapsUrl,
  nearbySchools,
  nearbyMetro,
  nearbyHospitals,
  nearbyOfficeHubs,
}: LocationIntelligencePreviewProps) {
  const lat = parseMapCoordinate(latitude);
  const lng = parseMapCoordinate(longitude);
  const hasCoordinates = hasValidMapCoordinates(latitude, longitude);
  const mapsHref = cleanText(googleMapsUrl) || mapCoordinateHref(latitude, longitude);

  const nearbySignals = [
    { label: "Metro", value: cleanText(nearbyMetro), icon: Train },
    { label: "Schools", value: cleanText(nearbySchools), icon: School },
    { label: "Hospitals", value: cleanText(nearbyHospitals), icon: Navigation },
    { label: "Office hubs", value: cleanText(nearbyOfficeHubs), icon: Route },
  ].filter((item) => item.value);

  const hasNearbySignals = nearbySignals.length > 0;

  const chips = [
    ...splitNearby(nearbyMetro),
    ...splitNearby(nearbySchools),
    ...splitNearby(nearbyHospitals),
    ...splitNearby(nearbyOfficeHubs),
  ].slice(0, 5);

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-blue-100 bg-gradient-to-br from-white via-blue-50/60 to-slate-50 shadow-sm">
      <div className="grid gap-0 md:grid-cols-[minmax(0,1.15fr)_minmax(270px,0.85fr)]">
        <div className="relative min-h-[220px] overflow-hidden border-b border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#dbeafe_42%,#f8fafc_100%)] p-4 md:border-b-0 md:border-r">
          <div className="absolute inset-0 opacity-70">
            <span className="absolute left-[12%] top-[32%] h-1 w-[72%] -rotate-12 rounded-full bg-white/80 shadow-sm" />
            <span className="absolute left-[18%] top-[58%] h-1 w-[66%] rotate-6 rounded-full bg-white/80 shadow-sm" />
            <span className="absolute left-[42%] top-[6%] h-[88%] w-1 rotate-12 rounded-full bg-white/70 shadow-sm" />
            <span className="absolute left-[68%] top-[16%] h-[70%] w-1 -rotate-12 rounded-full bg-white/70 shadow-sm" />
            {[18, 38, 61, 81].map((left) => (
              <span
                key={left}
                className="absolute top-0 h-full w-px bg-blue-200/50"
                style={{ left: `${left}%` }}
              />
            ))}
            {[22, 44, 66, 84].map((top) => (
              <span
                key={top}
                className="absolute left-0 h-px w-full bg-blue-200/50"
                style={{ top: `${top}%` }}
              />
            ))}
          </div>

          <div className="relative z-10 flex h-full min-h-[188px] flex-col justify-between">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700 shadow-sm">
              <MapPin className="h-3.5 w-3.5" />
              Location layer
            </div>

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-[5px] border-white bg-blue-700 text-white shadow-2xl">
              <MapPin className="h-8 w-8" />
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm">
              <p className="text-sm font-black text-navy-950">{title}</p>
              <p className="mt-1 line-clamp-1 text-xs font-semibold text-navy-500">
                {cleanText(location) || "Gurgaon society location"}
              </p>
              <p className="mt-2 text-[11px] font-bold text-blue-700">
                {hasCoordinates ? `Pinned at ${lat?.toFixed(4)}, ${lng?.toFixed(4)}` : "Map pin pending admin verification"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
            Nearby intelligence
          </p>
          <h3 className="mt-2 text-xl font-black tracking-[-0.03em] text-navy-950">
            Map-ready society context
          </h3>
          <p className="mt-2 text-sm leading-6 text-navy-500">
            Use this society layer to compare commute confidence, schools, hospitals and office access before shortlisting homes.
          </p>

          {hasNearbySignals ? (
            <div className="mt-4 grid gap-2">
              {nearbySignals.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-white px-3 py-2.5"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-navy-400">
                        {item.label}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-navy-800">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-white px-3 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-navy-400">
                Verification pending
              </p>
              <p className="mt-1 text-sm leading-5 text-navy-600">
                Nearby metro, schools, hospitals and office hubs will appear here once verified.
              </p>
            </div>
          )}

          {chips.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}

          {mapsHref ? (
            <Button
              asChild
              variant="outline"
              className="mt-4 w-full rounded-full border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <a href={mapsHref} target="_blank" rel="noreferrer">
                Open on Google Maps <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
