export type PropertyStatus = 'Live' | 'Verification' | 'Draft' | 'Archived';
export type PropertyListingType = 'Rent' | 'Buy / Resale' | 'Sell Listing' | 'Builder Floor';

export interface AdminProperty {
  id: number;
  title: string;
  society: string;
  locality: string;
  listingType: PropertyListingType;
  status: PropertyStatus;
  price: string;
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
  updated: string;
}

const STORAGE_KEY = 'societyflats_admin_properties_v1';

export const seedProperties: AdminProperty[] = [
  {
    id: 1,
    title: '3 BHK luxury apartment with balcony',
    society: 'DLF Crest',
    locality: 'Sector 54, Gurgaon',
    listingType: 'Rent',
    price: '₹85,000/mo',
    securityDeposit: '₹1,70,000',
    maintenance: 'Included',
    bedrooms: '3',
    bathrooms: '3',
    areaSqft: '2200',
    floor: '12 of 28',
    facing: 'North-East',
    furnishedStatus: 'Semi Furnished',
    description: 'Premium 3 BHK apartment in DLF Crest with balcony, society amenities and quick access to Golf Course Road.',
    amenities: ['Power Backup', 'Clubhouse', 'Swimming Pool', 'Gym', 'Security', 'Park View'],
    status: 'Live',
    featured: true,
    verified: true,
    images: ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=80'],
    updated: 'Today',
  },
  {
    id: 2,
    title: '4 BHK resale residence near Golf Course Road',
    society: 'DLF Park Place',
    locality: 'Sector 54, Gurgaon',
    listingType: 'Buy / Resale',
    price: '₹4.2 Cr',
    securityDeposit: '',
    maintenance: '₹18,000',
    bedrooms: '4',
    bathrooms: '4',
    areaSqft: '2800',
    floor: '18 of 30',
    facing: 'East',
    furnishedStatus: 'Semi Furnished',
    description: 'Spacious resale flat in DLF Park Place with premium society amenities and strong rental demand.',
    amenities: ['Power Backup', 'Clubhouse', 'Swimming Pool', 'Gym', 'Security'],
    status: 'Verification',
    featured: false,
    verified: false,
    images: ['https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=80'],
    updated: 'Yesterday',
  },
  {
    id: 3,
    title: 'Penthouse with golf-facing views',
    society: 'M3M Golf Estate',
    locality: 'Sector 65, Gurgaon',
    listingType: 'Buy / Resale',
    price: '₹6.8 Cr',
    securityDeposit: '',
    maintenance: '₹22,000',
    bedrooms: '4',
    bathrooms: '5',
    areaSqft: '3600',
    floor: 'Penthouse',
    facing: 'North',
    furnishedStatus: 'Fully Furnished',
    description: 'Golf-facing penthouse with large deck, premium interiors and high appreciation potential.',
    amenities: ['Clubhouse', 'Swimming Pool', 'Gym', 'Security', 'Servant Room', 'Park View'],
    status: 'Live',
    featured: true,
    verified: true,
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80'],
    updated: '2 days ago',
  },
  {
    id: 4,
    title: '2 BHK family apartment with park view',
    society: 'Tata Primanti',
    locality: 'Sector 72, Gurgaon',
    listingType: 'Rent',
    price: '₹52,000/mo',
    securityDeposit: '₹1,04,000',
    maintenance: 'Included',
    bedrooms: '2',
    bathrooms: '2',
    areaSqft: '1450',
    floor: '8 of 20',
    facing: 'East',
    furnishedStatus: 'Semi Furnished',
    description: 'Family apartment with green views, good security and easy access to Sohna Road.',
    amenities: ['Power Backup', 'Security', 'Park View', 'Pet Friendly'],
    status: 'Draft',
    featured: false,
    verified: false,
    images: ['https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=900&q=80'],
    updated: '4 days ago',
  },
];

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
