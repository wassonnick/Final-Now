export const PROPERTY_PLACEHOLDER_IMAGE = "/placeholders/property-photo-under-verification.svg";
export const PROPERTY_PHOTOS_UNDER_VERIFICATION = "Photos under verification";

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

export function hasRealPropertyPhotos(value: unknown): boolean {
  return parseImageList(value).some((item) => item !== PROPERTY_PLACEHOLDER_IMAGE);
}

export function propertyDisplayImages(...sources: unknown[]): string[] {
  const images = sources.flatMap((source) => parseImageList(source));
  const unique = images.filter((item, index, self) => item && self.indexOf(item) === index);
  return unique.length ? unique : [PROPERTY_PLACEHOLDER_IMAGE];
}

export function propertyDisplayImage(...sources: unknown[]): string {
  return propertyDisplayImages(...sources)[0] || PROPERTY_PLACEHOLDER_IMAGE;
}
