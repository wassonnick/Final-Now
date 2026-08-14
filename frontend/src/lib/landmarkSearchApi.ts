import { API_BASE_URL } from "@/config/api";

export type LandmarkHit = {
  id: number;
  name: string;
  slug: string;
  locality?: string | null;
  sector?: string | null;
  city?: string | null;
  score?: number | string | null;
  rent_range?: string | null;
  buy_range?: string | null;
  cover_image?: string | null;
  image_status?: string | null;
  image_photo_reference?: string | null;
  distance_km: number;
};

export type LandmarkSearchResult = {
  landmark: { name: string; category: string; city: string | null } | null;
  radius_km?: number;
  remainder?: string;
  societies: LandmarkHit[];
};

/**
 * "a home near Ambience Mall" — societies ranked by how far they actually are.
 *
 * Returns a null landmark for an ordinary search, which is the signal to leave the normal
 * results alone rather than show an empty landmark panel.
 */
export async function searchNearLandmark(query: string): Promise<LandmarkSearchResult | null> {
  const clean = query.trim();
  if (clean.length < 4) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/search/near?q=${encodeURIComponent(clean)}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as LandmarkSearchResult;
    return payload?.landmark ? payload : null;
  } catch {
    return null;
  }
}

/** "450 m" reads better than "0.45 km" for somewhere you could walk. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 100) * 10} m`;
  return `${km.toFixed(1)} km`;
}
