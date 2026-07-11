export const PROPERTY_PLACEHOLDER_IMAGE = "/placeholders/property-photo-under-verification.svg";
export const PROPERTY_PHOTOS_UNDER_VERIFICATION = "Photos under verification";

const LEGACY_PLACEHOLDER_PATTERNS = [
  "property-placeholder",
  "placeholder-property",
  "building-pin",
  "map-pin",
  "property-map",
  "location-pin",
  "marker",
  "/placeholder.svg",
  "/placeholders/property.svg",
];

export function parseImageList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parseImageList(parsed);
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function isPropertyPlaceholderImage(value: string): boolean {
  const clean = value.trim();
  const lower = clean.toLowerCase();

  if (!clean) return true;
  if (clean === PROPERTY_PLACEHOLDER_IMAGE) return true;
  if (lower.endsWith("/property-photo-under-verification.svg")) return true;

  return LEGACY_PLACEHOLDER_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function hasRealPropertyPhotos(...sources: unknown[]): boolean {
  return sources.flatMap((source) => parseImageList(source)).some((item) => !isPropertyPlaceholderImage(item));
}

export function propertyDisplayImages(...sources: unknown[]): string[] {
  const images = sources.flatMap((source) => parseImageList(source)).filter((item) => !isPropertyPlaceholderImage(item));
  const unique = images.filter((item, index, self) => item && self.indexOf(item) === index);
  return unique.length ? unique : [PROPERTY_PLACEHOLDER_IMAGE];
}

export function propertyDisplayImage(...sources: unknown[]): string {
  return propertyDisplayImages(...sources)[0] || PROPERTY_PLACEHOLDER_IMAGE;
}
