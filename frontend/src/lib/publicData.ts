import { type AdminProperty } from '@/lib/adminPropertyStore';
import { mapApiSociety, type AdminSociety } from '@/lib/adminSocietyStore';
import { societyDisplayImage } from '@/lib/societyImages';
import { API_BASE_URL } from '@/config/api';
import { propertyDisplayPhoto, publicPropertyUrl } from '@/lib/propertyDisplay';

function extractItems(payload: any) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

const PAGE_SIZE = 200;
const MAX_PAGES = 25;

/**
 * Fetch every page, not just the first.
 *
 * `?per_page=300` returned page one and nothing else, so once the catalogue passed
 * 300 the tail simply vanished — the homepage counter read 300 against 316 published,
 * and the missing societies were also absent from search suggestions, the area tabs,
 * compare and maps. Silent, and it gets worse as inventory grows.
 */
async function fetchAllPages(endpoint: string): Promise<any[]> {
  const rows: any[] = [];
  let lastPage = 1;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await fetch(`${API_BASE_URL}${endpoint}?per_page=${PAGE_SIZE}&page=${page}`);
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (page === 1) throw new Error(json?.message || `Unable to fetch ${endpoint}`);
      break; // keep what we have rather than losing the whole list
    }

    const batch = extractItems(json);
    rows.push(...batch);

    const box = json?.data && !Array.isArray(json.data) ? json.data : json;
    const parsed = Number(box?.last_page);
    if (page === 1 && Number.isFinite(parsed) && parsed > 0) lastPage = parsed;
    if (batch.length === 0 || page >= lastPage) break;
  }

  return rows;
}

export function getPublicSocieties() {
  return [];
}

/**
 * Several components on a single page each ask for the full society list, and now that
 * the list is paginated every duplicate costs two round trips instead of one. Share the
 * in-flight request, and hold the result briefly so a navigation doesn't refetch it.
 */
const listCache = new Map<string, { at: number; promise: Promise<any[]> }>();
const LIST_TTL_MS = 60_000;

function cachedPages(endpoint: string): Promise<any[]> {
  const hit = listCache.get(endpoint);
  if (hit && Date.now() - hit.at < LIST_TTL_MS) return hit.promise;

  const promise = fetchAllPages(endpoint).catch((error) => {
    listCache.delete(endpoint); // never cache a failure
    throw error;
  });
  listCache.set(endpoint, { at: Date.now(), promise });

  return promise;
}

export async function fetchPublicSocieties() {
  const societies = (await cachedPages('/societies')).map(mapApiSociety);

  return societies
    .filter((society) => society.status === 'Verified' || society.status === 'Premium')
    .sort((a, b) => Number(b.featured || b.showInHero || b.searchBoost) - Number(a.featured || a.showInHero || a.searchBoost));
}

export function getPublicProperties() {
  return [];
}

function mapApiProperty(data: any): AdminProperty {
  return {
    id: Number(data?.id || 0),
    slug: data?.slug || data?.property_slug || '',
    title: data?.title || '',
    society: typeof data?.society === 'object' ? data.society?.name || data?.society_name || '' : data?.society || '',
    locality: data?.locality || '',
    listingType: data?.listing_type || data?.listingType || 'Rent',
    status: data?.status || 'Draft',
    price: data?.price || '',
    salePrice: data?.sale_price || data?.salePrice || '',
    rentAmount: data?.rent_amount || data?.rentAmount || '',
    securityDeposit: data?.security_deposit || '',
    maintenance: data?.maintenance || '',
    bedrooms: String(data?.bedrooms || ''),
    bathrooms: String(data?.bathrooms || ''),
    areaSqft: String(data?.area_sqft || ''),
    floor: data?.floor || '',
    facing: data?.facing || '',
    furnishedStatus: data?.furnished_status || '',
    description: data?.description || '',
    amenities: Array.isArray(data?.amenities) ? data.amenities : [],
    featured: Boolean(data?.featured),
    verified: Boolean(data?.verified),
    images: Array.isArray(data?.images) ? data.images : [],
    coverImage: data?.cover_image || data?.coverImage || '',
    galleryImages: data?.gallery_images || data?.galleryImages || [],
    updated: data?.updated_at || '',
  };
}

export async function fetchPublicProperties() {
  return (await cachedPages('/properties'))
    .map(mapApiProperty)
    .filter((property) => property.status === 'Live')
    .sort((a, b) => Number(b.featured || b.verified) - Number(a.featured || a.verified));
}

export function findPublicSociety(slugOrId: string | undefined) {
  if (!slugOrId) return undefined;
  return getPublicSocieties().find((society) =>
    society.slug === slugOrId || String(society.id) === String(slugOrId)
  );
}

export function findPublicProperty(slugOrId: string | undefined) {
  if (!slugOrId) return undefined;
  return getPublicProperties().find((property) =>
    String(property.id) === String(slugOrId) || slugify(property.title) === slugOrId
  );
}

export function getSocietyProperties(societyName: string | undefined) {
  if (!societyName) return [];
  return getPublicProperties().filter((property) => property.society === societyName);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function propertyUrl(property: AdminProperty) {
  return publicPropertyUrl(property);
}

export function societyImage(society: AdminSociety) {
  return societyDisplayImage(society);
}

export function propertyImage(property: AdminProperty) {
  return propertyDisplayPhoto(property);
}

export function formatPublicLocation(society: AdminSociety) {
  return [society.sector, society.locality].filter(Boolean).join(', ') || society.address || 'Gurgaon';
}

export function searchableText(...items: Array<string | undefined | null>) {
  return items.filter(Boolean).join(' ').toLowerCase();
}

/**
 * Places that match the query, ahead of the societies inside them.
 *
 * Typing "paschim" should offer Paschim Vihar itself first — one result that means "show
 * me everything there" — rather than making someone pick between the individual blocks
 * that happen to sort highest. Derived from the society list rather than a separate
 * table, so it can never drift from what is actually searchable.
 */
export function suggestPlaces(societies: AdminSociety[], query: string, limit = 3) {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];

  const places = new Map<string, { name: string; city: string; count: number }>();

  for (const society of societies) {
    const locality = (society.locality || '').trim();
    if (!locality || !locality.toLowerCase().includes(q)) continue;

    const city = (society.city || '').trim();
    const key = `${locality.toLowerCase()}|${city.toLowerCase()}`;
    const existing = places.get(key);
    if (existing) existing.count += 1;
    else places.set(key, { name: locality, city, count: 1 });
  }

  return [...places.values()]
    // A place someone actually lives in beats one with a single stray row.
    .sort((a, b) => (a.name.toLowerCase().startsWith(q) === b.name.toLowerCase().startsWith(q)
      ? b.count - a.count
      : a.name.toLowerCase().startsWith(q) ? -1 : 1))
    .slice(0, limit);
}

export function suggestSocieties(societies: AdminSociety[], query: string, limit = 6) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const startsWith: AdminSociety[] = [];
  const contains: AdminSociety[] = [];

  for (const society of societies) {
    const name = (society.name || '').toLowerCase();
    const sector = (society.sector || '').toLowerCase();
    const locality = (society.locality || '').toLowerCase();
    const builder = (society.builder || '').toLowerCase();

    if (name.startsWith(q) || sector.startsWith(q) || locality.startsWith(q) || builder.startsWith(q)) {
      startsWith.push(society);
    } else if (name.includes(q) || sector.includes(q) || locality.includes(q) || builder.includes(q)) {
      contains.push(society);
    }
  }

  return [...startsWith, ...contains].slice(0, limit);
}
