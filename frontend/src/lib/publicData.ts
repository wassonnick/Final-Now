import { type AdminProperty } from '@/lib/adminPropertyStore';
import { mapApiSociety, type AdminSociety } from '@/lib/adminSocietyStore';
import { societyDisplayImage } from '@/lib/societyImages';
import { API_BASE_URL } from '@/config/api';

function extractItems(payload: any) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

export function getPublicSocieties() {
  return [];
}

export async function fetchPublicSocieties() {
  const response = await fetch(`${API_BASE_URL}/societies?per_page=100`);
  const json = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(json?.message || 'Unable to fetch societies');

  const societies = extractItems(json).map(mapApiSociety);

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
    title: data?.title || '',
    society: typeof data?.society === 'object' ? data.society?.name || data?.society_name || '' : data?.society || '',
    locality: data?.locality || '',
    listingType: data?.listing_type || data?.listingType || 'Rent',
    status: data?.status || 'Draft',
    price: data?.price || '',
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
    updated: data?.updated_at || '',
  };
}

export async function fetchPublicProperties() {
  const response = await fetch(`${API_BASE_URL}/properties?per_page=100`);
  const json = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(json?.message || 'Unable to fetch properties');

  return extractItems(json)
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
  return `/property/${property.id}`;
}

export function societyImage(society: AdminSociety) {
  return societyDisplayImage(society);
}

export function propertyImage(property: AdminProperty) {
  return property.images?.[0] || '';
}

export function formatPublicLocation(society: AdminSociety) {
  return [society.sector, society.locality].filter(Boolean).join(', ') || society.address || 'Gurgaon';
}

export function searchableText(...items: Array<string | undefined | null>) {
  return items.filter(Boolean).join(' ').toLowerCase();
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
