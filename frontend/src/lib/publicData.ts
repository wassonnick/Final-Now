import { getAdminProperties, type AdminProperty } from '@/lib/adminPropertyStore';
import { getAdminSocieties, type AdminSociety } from '@/lib/adminSocietyStore';

const fallbackImage = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=85';

export function getPublicSocieties() {
  return getAdminSocieties()
    .filter((society) => society.status !== 'Archived')
    .sort((a, b) => Number(b.featured || b.showInHero || b.searchBoost) - Number(a.featured || a.showInHero || a.searchBoost));
}

export function getPublicProperties() {
  return getAdminProperties()
    .filter((property) => property.status === 'Live' || property.status === 'Verification')
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
  return society.coverImage || society.galleryImages?.[0] || fallbackImage;
}

export function propertyImage(property: AdminProperty) {
  return property.images?.[0] || fallbackImage;
}

export function formatPublicLocation(society: AdminSociety) {
  return [society.sector, society.locality].filter(Boolean).join(', ') || society.address || 'Gurgaon';
}

export function searchableText(...items: Array<string | undefined | null>) {
  return items.filter(Boolean).join(' ').toLowerCase();
}
