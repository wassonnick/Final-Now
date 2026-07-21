import { Property, Society } from '../types/domain';

export function normalizeSociety(raw: any): Society {
  const cover = firstString(raw.cover_image_url, raw.image_url, raw.hero_image_url, raw.photo_url);

  return {
    id: raw.id,
    name: String(raw.name ?? 'Society'),
    slug: String(raw.slug ?? raw.id),
    builder: raw.builder || raw.builder_name || raw.developer_name || null,
    sector: raw.sector || null,
    locality: raw.locality || null,
    city: raw.city || 'Gurugram',
    score: raw.score ?? raw.overall_score ?? null,
    imageUrl: cover,
    description: raw.description || raw.short_description || null,
    amenities: cleanStringArray(raw.approved_amenities ?? raw.amenities).slice(0, 12),
    propertiesCount: raw.properties_count ?? raw.public_properties_count ?? null,
    publicUrl: raw.public_url || null,
    status: raw.status || null,
  };
}

export function normalizeProperty(raw: any): Property {
  const images = cleanImageArray(raw.images);
  const society = raw.society ?? {};
  const salePrice = raw.sale_price ?? raw.expected_price;
  const rentAmount = raw.rent_amount;
  const price = raw.price || salePrice || rentAmount || null;

  return {
    id: raw.id,
    title: String(raw.title ?? 'Verified home'),
    slug: raw.slug || String(raw.id),
    societyName: society.name || raw.society_name || raw.society || null,
    societySlug: society.slug || raw.society_slug || null,
    listingType: raw.listing_type || raw.listing_purpose || null,
    bedrooms: raw.bedrooms ?? null,
    bathrooms: raw.bathrooms ?? null,
    balconies: raw.balconies ?? null,
    price,
    areaSqft: raw.area_sqft || raw.super_area_sqft || raw.super_area || raw.carpet_area_sqft || null,
    floor: raw.floor || null,
    facing: raw.facing || null,
    furnishedStatus: raw.furnished_status || null,
    sourceLabel: raw.source_label || null,
    description: raw.description || null,
    images,
    imageUrl: raw.cover_image_url || raw.image_url || images[0] || null,
    status: raw.status || null,
  };
}

function cleanStringArray(value: unknown): string[] {
  const parsed = parseMaybeJson(value);
  const source = Array.isArray(parsed) ? parsed : typeof parsed === 'string' ? parsed.split(/,|;|\n/) : [];

  return source
    .map((item: any) => (typeof item === 'string' ? item : item?.name || item?.title || ''))
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanImageArray(value: unknown): string[] {
  const parsed = parseMaybeJson(value);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item: any) => (typeof item === 'string' ? item : item?.url || item?.src || item?.image_url || ''))
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item));
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function firstString(...values: unknown[]) {
  return values.find((value) => typeof value === 'string' && value.trim() !== '') as string | undefined;
}
