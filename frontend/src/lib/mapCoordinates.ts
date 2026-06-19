export function parseMapCoordinate(value: unknown): number | null {
  const raw = String(value ?? '').trim();

  if (!raw) return null;

  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : null;
}

export function hasValidMapCoordinates(latitude: unknown, longitude: unknown): boolean {
  const lat = parseMapCoordinate(latitude);
  const lng = parseMapCoordinate(longitude);

  if (lat === null || lng === null) return false;

  // 0,0 is a placeholder / invalid admin-pending coordinate for SocietyFlats.
  if (lat === 0 && lng === 0) return false;

  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function mapCoordinateHref(latitude: unknown, longitude: unknown): string {
  const lat = parseMapCoordinate(latitude);
  const lng = parseMapCoordinate(longitude);

  if (!hasValidMapCoordinates(lat, lng)) return '';

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function googleMapsSearchHref(query: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}
