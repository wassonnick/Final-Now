import { adminHeaders } from '@/lib/adminApi';

export type SocietyStatus = 'Draft' | 'Verified' | 'Premium' | 'Archived';
export type SocietyImageStatus =
  | 'placeholder'
  | 'official_reference_found'
  | 'licensed_uploaded'
  | 'self_shot_uploaded'
  | 'developer_permission_received'
  | 'needs_review';

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
  imageReferenceUrl: string;
  imageUrl: string;
  imageStatus: SocietyImageStatus;
  imageAltText: string;
  imageCredit: string;
  imageLicenseNotes: string;
  brochureName: string;
  reraNumber: string;
  sourceName: string;
  sourceUrl: string;
  officialProjectUrl: string;
  officialDeveloperUrl: string;
  officialBrochureUrl: string;
  officialFloorPlanUrl: string;
  officialGalleryUrl: string;
  officialSourceStatus: string;
  officialSourceNotes: string;
  reraSearchUrl: string;
  googleMapsUrl: string;
  sourceConfidenceScore: string;
  dataQuality: string;
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

function normalizeImageStatus(value: unknown): SocietyImageStatus {
  if (
    value === 'official_reference_found' ||
    value === 'licensed_uploaded' ||
    value === 'self_shot_uploaded' ||
    value === 'developer_permission_received' ||
    value === 'needs_review'
  ) {
    return value;
  }

  return 'placeholder';
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
    score: '',
    securityScore: '',
    maintenanceScore: '',
    connectivityScore: '',
    lifestyleScore: '',
    investmentScore: '',
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
    imageReferenceUrl: '',
    imageUrl: '',
    imageStatus: 'placeholder',
    imageAltText: '',
    imageCredit: '',
    imageLicenseNotes: '',
    brochureName: '',
    reraNumber: '',
    sourceName: '',
    sourceUrl: '',
    officialProjectUrl: '',
    officialDeveloperUrl: '',
    officialBrochureUrl: '',
    officialFloorPlanUrl: '',
    officialGalleryUrl: '',
    officialSourceStatus: 'pending',
    officialSourceNotes: '',
    reraSearchUrl: '',
    googleMapsUrl: '',
    sourceConfidenceScore: '',
    dataQuality: '',
    updatedAt: 'Just now',
  };
}

function scoreValue(value: unknown): string {
  return value === null || value === undefined || value === '' ? '' : String(value);
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
    score: scoreValue(data?.score),
    securityScore: scoreValue(data?.security_score),
    maintenanceScore: scoreValue(data?.maintenance_score),
    connectivityScore: scoreValue(data?.connectivity_score),
    lifestyleScore: scoreValue(data?.lifestyle_score),
    investmentScore: scoreValue(data?.investment_score),
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
    imageReferenceUrl: data?.image_reference_url || '',
    imageUrl: data?.image_url || '',
    imageStatus: normalizeImageStatus(data?.image_status),
    imageAltText: data?.image_alt_text || '',
    imageCredit: data?.image_credit || '',
    imageLicenseNotes: data?.image_license_notes || '',
    brochureName: data?.brochure_name || '',
    reraNumber: data?.rera_number || '',
    sourceName: data?.source_name || '',
    sourceUrl: data?.source_url || '',
    officialProjectUrl: data?.official_project_url || '',
    officialDeveloperUrl: data?.official_developer_url || '',
    officialBrochureUrl: data?.official_brochure_url || '',
    officialFloorPlanUrl: data?.official_floor_plan_url || '',
    officialGalleryUrl: data?.official_gallery_url || '',
    officialSourceStatus: data?.official_source_status || 'pending',
    officialSourceNotes: data?.official_source_notes || '',
    reraSearchUrl: data?.rera_search_url || '',
    googleMapsUrl: data?.google_maps_url || '',
    sourceConfidenceScore: scoreValue(data?.source_confidence_score),
    dataQuality: data?.data_quality || '',
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
    score: society.score || null,
    security_score: society.securityScore || null,
    maintenance_score: society.maintenanceScore || null,
    connectivity_score: society.connectivityScore || null,
    lifestyle_score: society.lifestyleScore || null,
    investment_score: society.investmentScore || null,
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
    image_reference_url: society.imageReferenceUrl,
    image_url: society.imageUrl,
    image_status: society.imageStatus,
    image_alt_text: society.imageAltText,
    image_credit: society.imageCredit,
    image_license_notes: society.imageLicenseNotes,
    brochure_name: society.brochureName,
    rera_number: society.reraNumber,
    source_name: society.sourceName,
    source_url: society.sourceUrl,
    official_project_url: society.officialProjectUrl,
    official_developer_url: society.officialDeveloperUrl,
    official_brochure_url: society.officialBrochureUrl,
    official_floor_plan_url: society.officialFloorPlanUrl,
    official_gallery_url: society.officialGalleryUrl,
    official_source_status: society.officialSourceStatus,
    official_source_notes: society.officialSourceNotes,
    rera_search_url: society.reraSearchUrl,
    google_maps_url: society.googleMapsUrl,
    source_confidence_score: society.sourceConfidenceScore || null,
    data_quality: society.dataQuality,
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
  const items: any[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const json = await request(`/admin/societies?per_page=100&page=${page}`);
    const pageData = Array.isArray(json?.data)
      ? json.data
      : json?.data?.data || [];
    items.push(...pageData);
    lastPage = Number(json?.data?.last_page || json?.last_page || page);
    page += 1;
  } while (page <= lastPage);

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

export async function updateAdminSocietyStatus(id: number | string, status: SocietyStatus): Promise<AdminSociety> {
  const json = await request(`/admin/societies/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });

  return mapApiSociety(json?.data || {});
}

export async function deleteAdminSociety(id: number | string) {
  await request(`/admin/societies/${id}`, { method: 'DELETE' });
}

export async function enrichAdminSociety(id: number | string): Promise<{ society: AdminSociety; updatedFields: string[]; diagnostics: Record<string, string> }> {
  const json = await request(`/admin/societies/${id}/enrich`, { method: 'POST' });
  return {
    society: mapApiSociety(json?.data || {}),
    updatedFields: Array.isArray(json?.enrichment?.updated_fields) ? json.enrichment.updated_fields : [],
    diagnostics: json?.enrichment?.diagnostics || {},
  };
}
