import { adminFetch } from "@/lib/adminApi";

export type BulkGooglePlacesImageFetchItem = {
  id: number;
  name: string;
  slug: string;
  status: "updated" | "failed" | string;
  place_id?: string | null;
  image_status?: string | null;
  image_credit?: string | null;
  place_name?: string | null;
  formatted_address?: string | null;
  place_url?: string | null;
  error?: string | null;
};

export type BulkGooglePlacesImageFetchSummary = {
  limit: number;
  total_checked: number;
  updated: number;
  skipped: number;
  failed: number;
  items: BulkGooglePlacesImageFetchItem[];
  errors: Array<{
    id: number;
    name: string;
    slug: string;
    error: string;
  }>;
};

export type BulkGooglePlacesImageFetchResponse = {
  status: "ok" | "error" | string;
  message: string;
  summary: BulkGooglePlacesImageFetchSummary;
};

export async function bulkFetchGooglePlacesSocietyImageReferences(
  limit = 5
): Promise<BulkGooglePlacesImageFetchResponse> {
  const safeLimit = Math.max(1, Math.min(limit, 10));

  const response = await adminFetch(
    `/admin/societies/google-places-image-references/bulk?limit=${safeLimit}`,
    {
      method: "POST",
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        payload?.detail ||
        `Bulk Google Places image fetch failed with status ${response.status}.`
    );
  }

  return payload as BulkGooglePlacesImageFetchResponse;
}
