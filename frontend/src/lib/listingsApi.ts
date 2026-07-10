import { API_BASE_URL } from "@/config/api";

export type OwnerListingRecord = {
  id: number;
  purpose: "rent" | "sale";
  listing_type: "apartment" | "builder_floor";
  society_name?: string | null;
  bhk?: string | null;
  expected_price?: string | null;
  images?: string[] | null;
  status: "submitted" | "under_review" | "approved" | "rejected" | "converted";
  created_at?: string;
};

export async function uploadListingImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("image", file);
  const response = await fetch(`${API_BASE_URL}/listings/images`, { method: "POST", body });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.message || "Image upload failed. Use JPG/PNG/WebP under 5MB.");
  return json.data.url as string;
}

export async function submitListing(payload: Record<string, unknown>, accountToken?: string): Promise<{ message: string; data: OwnerListingRecord }> {
  const response = await fetch(`${API_BASE_URL}/listings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(accountToken ? { Authorization: `Bearer ${accountToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.message || "Could not submit the listing. Please try again.");
  return json;
}

export async function fetchMyListings(accountToken: string): Promise<OwnerListingRecord[]> {
  const response = await fetch(`${API_BASE_URL}/accounts/listings`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${accountToken}` },
  });
  if (!response.ok) return [];
  const json = await response.json().catch(() => ({}));
  return (json?.data as OwnerListingRecord[]) || [];
}
