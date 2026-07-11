export type PropertyStatus = 'Live' | 'Verification' | 'Draft' | 'Archived';
export type PropertyListingType = 'Rent' | 'Sale' | 'Buy / Resale' | 'Sell Listing' | 'Builder Floor';

export interface AdminProperty {
  id: number;
  slug?: string;
  title: string;
  society: string;
  locality: string;
  listingType: PropertyListingType;
  status: PropertyStatus;
  price: string;
  salePrice?: string;
  rentAmount?: string;
  securityDeposit: string;
  maintenance: string;
  bedrooms: string;
  bathrooms: string;
  areaSqft: string;
  floor: string;
  facing: string;
  furnishedStatus: string;
  description: string;
  amenities: string[];
  featured: boolean;
  verified: boolean;
  images: string[];
  coverImage?: string;
  galleryImages?: string[] | string;
  updated: string;
}

const STORAGE_KEY = 'societyflats_admin_properties_v1';

export const seedProperties: AdminProperty[] = [];

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function getAdminProperties(): AdminProperty[] {
  if (!canUseStorage()) return seedProperties;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedProperties));
    return seedProperties;
  }
  try {
    const parsed = JSON.parse(raw) as AdminProperty[];
    return Array.isArray(parsed) ? parsed : seedProperties;
  } catch {
    return seedProperties;
  }
}

export function saveAdminProperties(properties: AdminProperty[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
}

export function getAdminProperty(id: string | number | undefined) {
  if (!id) return undefined;
  return getAdminProperties().find((item) => String(item.id) === String(id));
}

export function upsertAdminProperty(property: AdminProperty) {
  const properties = getAdminProperties();
  const existingIndex = properties.findIndex((item) => item.id === property.id);
  const next = {
    ...property,
    updated: 'Just now',
  };

  if (existingIndex >= 0) {
    properties[existingIndex] = next;
  } else {
    properties.unshift(next);
  }

  saveAdminProperties(properties);
  return next;
}

export function deleteAdminProperty(id: number) {
  const next = getAdminProperties().filter((item) => item.id !== id);
  saveAdminProperties(next);
  return next;
}

export function duplicateAdminProperty(id: number) {
  const properties = getAdminProperties();
  const source = properties.find((item) => item.id === id);
  if (!source) return properties;

  const duplicate: AdminProperty = {
    ...source,
    id: Date.now(),
    title: `${source.title} Copy`,
    status: 'Draft',
    featured: false,
    updated: 'Just now',
  };

  const next = [duplicate, ...properties];
  saveAdminProperties(next);
  return next;
}

export function createEmptyAdminProperty(): AdminProperty {
  return {
    id: Date.now(),
    title: '',
    society: 'DLF Crest',
    locality: 'Sector 54, Gurgaon',
    listingType: 'Rent',
    status: 'Draft',
    price: '',
    securityDeposit: '',
    maintenance: '',
    bedrooms: '',
    bathrooms: '',
    areaSqft: '',
    floor: '',
    facing: 'North-East',
    furnishedStatus: 'Semi Furnished',
    description: '',
    amenities: [],
    featured: false,
    verified: false,
    images: [],
    updated: 'Just now',
  };
}
