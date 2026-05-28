import { adminHeaders } from '@/lib/adminApi';

export type SocietyStatus = 'Draft' | 'Verified' | 'Premium' | 'Archived';

export interface AdminSociety {
  id: number;
  name: string;
  slug: string;
  builder: string;
  sector: string;
  locality: string;
  address: string;
  description: string;
  yearBuilt: string;
  totalTowers: string;
  totalUnits: string;
  maintenanceCharges: string;
  rwaContact: string;
  latitude: string;
  longitude: string;
  status: SocietyStatus;
  featured: boolean;
  showInHero: boolean;
  searchBoost: boolean;
  score: string;
  securityScore: string;
  maintenanceScore: string;
  connectivityScore: string;
  lifestyleScore: string;
  investmentScore: string;
  rentRange: string;
  buyRange: string;
  averageRent: string;
  averageSalePrice: string;
  pricePerSqft: string;
  rentalYield: string;
  amenities: string[];
  nearbySchools: string;
  nearbyMetro: string;
  nearbyHospitals: string;
  nearbyOfficeHubs: string;
  metaTitle: string;
  metaDescription: string;
  faq: string;
  coverImage: string;
  galleryImages: string[];
  brochureName: string;
  updatedAt: string;
  propertiesCount?: number;
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'https://final-now.onrender.com/api';

export const societyAmenityOptions = [
  'Clubhouse', 'Swimming Pool', 'Gym', 'Kids Play Area', 'Tennis Court', 'Badminton Court',
  'Basketball Court', 'Jogging Track', 'Power Backup', 'Visitor Parking', 'Pet Friendly',
  '24x7 Security', 'Concierge', 'CCTV', 'Landscaped Greens', 'Senior Citizen Area'
];

export function slugifySociety(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function parseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean) as string[];

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function normalizeStatus(value: unknown): SocietyStatus {
  if (value === 'Verified' || value === 'Premium' || value === 'Archived') return value;
  return 'Draft';
}

export function createEmptyAdminSociety(): AdminSociety {
  return {
    id: 0,
    name: '',
    slug: '',
    builder: '',
    sector: '',
    locality: '',
    address: '',
    description: '',
    yearBuilt: '',
    totalTowers: '',
    totalUnits: '',
    maintenanceCharges: '',
    rwaContact: '',
    latitude: '',
    longitude: '',
    status: 'Draft',
    featured: false,
    showInHero: false,
    searchBoost: false,
    score: '8.5',
    securityScore: '8.5',
    maintenanceScore: '8.5',
    connectivityScore: '8.5',
    lifestyleScore: '8.5',
    investmentScore: '8.5',
    rentRange: '',
    buyRange: '',
    averageRent: '',
    averageSalePrice: '',
    pricePerSqft: '',
    rentalYield: '',
    amenities: [],
    nearbySchools: '',
    nearbyMetro: '',
    nearbyHospitals: '',
    nearbyOfficeHubs: '',
    metaTitle: '',
    metaDescription: '',
    faq: '',
    coverImage: '',
    galleryImages: [],
    brochureName: '',
    updatedAt: 'Just now',
  };
}

export function mapApiSociety(data: any): AdminSociety {
  return {
    ...createEmptyAdminSociety(),
    id: Number(data?.id || 0),
    name: data?.name || '',
    slug: data?.slug || '',
    builder: data?.builder || '',
    sector: data?.sector || '',
    locality: data?.locality || '',
    address: data?.address || '',
    description: data?.description || '',
    yearBuilt: data?.year_built || '',
    totalTowers: data?.total_towers || '',
    totalUnits: data?.total_units || '',
    maintenanceCharges: data?.maintenance_charges || '',
    rwaContact: data?.rwa_contact || '',
    latitude: data?.latitude || '',
    longitude: data?.longitude || '',
    status: normalizeStatus(data?.status),
    featured: Boolean(data?.featured),
    showInHero: Boolean(data?.show_in_hero),
    searchBoost: Boolean(data?.search_boost),
    score: String(data?.score ?? '8.5'),
    securityScore: String(data?.security_score ?? '8.5'),
    maintenanceScore: String(data?.maintenance_score ?? '8.5'),
    connectivityScore: String(data?.connectivity_score ?? '8.5'),
    lifestyleScore: String(data?.lifestyle_score ?? '8.5'),
    investmentScore: String(data?.investment_score ?? '8.5'),
    rentRange: data?.rent_range || '',
    buyRange: data?.buy_range || '',
    averageRent: data?.average_rent || '',
    averageSalePrice: data?.average_sale_price || '',
    pricePerSqft: data?.price_per_sqft || '',
    rentalYield: data?.rental_yield || '',
    amenities: parseArray(data?.amenities),
    nearbySchools: data?.nearby_schools || '',
    nearbyMetro: data?.nearby_metro || '',
    nearbyHospitals: data?.nearby_hospitals || '',
    nearbyOfficeHubs: data?.nearby_office_hubs || '',
    metaTitle: data?.meta_title || '',
    metaDescription: data?.meta_description || '',
    faq: data?.faq || '',
    coverImage: data?.cover_image || '',
    galleryImages: parseArray(data?.gallery_images),
    brochureName: data?.brochure_name || '',
    updatedAt: data?.updated_at ? new Date(data.updated_at).toLocaleDateString() : 'Just now',
    propertiesCount: Number(data?.properties_count || data?.properties?.length || 0),
  };
}

export function toApiSocietyPayload(society: AdminSociety) {
  return {
    name: society.name,
    slug: society.slug || slugifySociety(society.name),
    builder: society.builder,
    sector: society.sector,
    locality: society.locality,
    address: society.address,
    description: society.description,
    year_built: society.yearBuilt,
    total_towers: society.totalTowers,
    total_units: society.totalUnits,
    maintenance_charges: society.maintenanceCharges,
    rent_range: society.rentRange,
    buy_range: society.buyRange,
    rental_yield: society.rentalYield,
    average_rent: society.averageRent,
    average_sale_price: society.averageSalePrice,
    price_per_sqft: society.pricePerSqft,
    score: society.score,
    security_score: society.securityScore,
    maintenance_score: society.maintenanceScore,
    connectivity_score: society.connectivityScore,
    lifestyle_score: society.lifestyleScore,
    investment_score: society.investmentScore,
    amenities: society.amenities,
    nearby_schools: society.nearbySchools,
    nearby_metro: society.nearbyMetro,
    nearby_hospitals: society.nearbyHospitals,
    nearby_office_hubs: society.nearbyOfficeHubs,
    meta_title: society.metaTitle,
    meta_description: society.metaDescription,
    faq: society.faq,
    status: society.status,
    featured: society.featured,
    show_in_hero: society.showInHero,
    search_boost: society.searchBoost,
    latitude: society.latitude,
    longitude: society.longitude,
    rwa_contact: society.rwaContact,
    cover_image: society.coverImage,
    gallery_images: society.galleryImages,
    brochure_name: society.brochureName,
  };
}

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...adminHeaders(),
      ...(options?.headers || {}),
    },
    ...options,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || `API request failed: ${response.status}`);
  }

  return json;
}

export async function fetchAdminSocieties(): Promise<AdminSociety[]> {
  const json = await request('/admin/societies?per_page=100');
  const items = Array.isArray(json?.data)
    ? json.data
    : json?.data?.data || [];

  return items.map(mapApiSociety);
}

export function getAdminSocieties(): AdminSociety[] {
  return [];
}

export async function fetchAdminSociety(id: string | number): Promise<AdminSociety> {
  const json = await request(`/admin/societies/${id}`);
  return mapApiSociety(json?.data || {});
}

export async function saveAdminSociety(society: AdminSociety, isEdit: boolean): Promise<AdminSociety> {
  const json = await request(isEdit ? `/admin/societies/${society.id}` : '/admin/societies', {
    method: isEdit ? 'PUT' : 'POST',
    body: JSON.stringify(toApiSocietyPayload(society)),
  });

  return mapApiSociety(json?.data || {});
}

export async function deleteAdminSociety(id: number | string) {
  await request(`/admin/societies/${id}`, { method: 'DELETE' });
}
