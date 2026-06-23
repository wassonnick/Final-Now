import { adminFetch, adminHeaders } from '@/lib/adminApi';


const normalizeAdminText = (value: unknown): string => {
  if (value === null || value === undefined) return '';

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item === null || item === undefined) return '';

        if (typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const question = typeof record.question === 'string' ? record.question.trim() : '';
          const answer = typeof record.answer === 'string' ? record.answer.trim() : '';

          if (question && answer) return `${question}\n${answer}`;
          if (question) return question;
          if (answer) return answer;

          return JSON.stringify(item);
        }

        return String(item).trim();
      })
      .filter(Boolean)
      .join('\n');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
};

const normalizeAdminStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item === null || item === undefined) return '';
        if (typeof item === 'object') return JSON.stringify(item);
        return String(item).trim();
      })
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export type SocietyStatus = 'Draft' | 'Verified' | 'Premium' | 'Archived';
export type SocietyImageStatus =
  | 'placeholder'
  | 'official_reference_found' | 'google_places_reference_found'
  | 'licensed_uploaded'
  | 'self_shot_uploaded'
  | 'developer_permission_received'
  | 'approved_for_live'
  | 'needs_review';

export interface AdminSociety {
  id: number;
  name: string;
  slug: string;
  builder: string;
  sector: string;
  locality: string;
  city: string;
  state: string;
  societyType: string;
  address: string;
  description: string;
  projectStatus: string;
  possessionDate: string;
  configuration: string;
  projectArea: string;
  unitSizeRange: string;
  yearBuilt: string;
  totalTowers: string;
  totalUnits: string;
  maintenanceCharges: string;
  rwaContact: string;
  latitude: string;
  longitude: string;
  placeId: string;
  status: SocietyStatus;
  verificationStatus: string;
  isPublished: boolean;
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
  approvedGalleryImageUrls: string[];
  imageReferenceUrl: string;
  imageUrl: string;
  imageStatus: SocietyImageStatus;
  imageApprovedByAdmin: boolean;
  imageAltText: string;
  imageCredit: string;
  imageLicenseNotes: string;
  brochureName: string;
  reraNumber: string;
  reraStatus: string;
  sourceName: string;
  sourceUrl: string;
  officialSourceUrl: string;
  officialProjectUrl: string;
  officialDeveloperUrl: string;
  officialBrochureUrl: string;
  officialFloorPlanUrl: string;
  officialGalleryUrl: string;
  officialSourceStatus: string;
  officialSourceNotes: string;
  fieldsToVerify: string;
  reraSearchUrl: string;
  officialReraSourceUrl: string;
  googleMapsUrl: string;
  sourceConfidenceScore: string;
  dataQuality: string;
  updatedAt: string;
  propertiesCount?: number;
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'https://final-now.onrender.com/api';

export const MAX_BROCHURE_UPLOAD_BYTES = 20 * 1024 * 1024;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit, retries = 2): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }

    await wait(1200);
    return fetchWithRetry(input, init, retries - 1);
  }
}

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
    value === 'google_places_reference_found' ||
    value === 'licensed_uploaded' ||
    value === 'self_shot_uploaded' ||
    value === 'developer_permission_received' ||
    value === 'approved_for_live' ||
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
    city: 'Gurugram',
    state: 'Haryana',
    societyType: '',
    address: '',
    description: '',
    projectStatus: '',
    possessionDate: '',
    configuration: '',
    projectArea: '',
    unitSizeRange: '',
    yearBuilt: '',
    totalTowers: '',
    totalUnits: '',
    maintenanceCharges: '',
    rwaContact: '',
    latitude: '',
    longitude: '',
    placeId: '',
    status: 'Draft',
    verificationStatus: 'needs_verification',
    isPublished: false,
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
    approvedGalleryImageUrls: [],
    imageReferenceUrl: '',
    imageUrl: '',
    imageStatus: 'placeholder',
    imageApprovedByAdmin: false,
    imageAltText: '',
    imageCredit: '',
    imageLicenseNotes: '',
    brochureName: '',
    reraNumber: '',
    reraStatus: '',
    sourceName: '',
    sourceUrl: '',
    officialSourceUrl: '',
    officialProjectUrl: '',
    officialDeveloperUrl: '',
    officialBrochureUrl: '',
    officialFloorPlanUrl: '',
    officialGalleryUrl: '',
    officialSourceStatus: 'pending',
    officialSourceNotes: '',
    fieldsToVerify: '',
    reraSearchUrl: '',
    officialReraSourceUrl: '',
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
    city: data?.city || 'Gurugram',
    state: data?.state || 'Haryana',
    societyType: data?.society_type || '',
    address: data?.address || '',
    description: data?.description || '',
    projectStatus: data?.project_status || '',
    possessionDate: data?.possession_date || '',
    configuration: data?.configuration || '',
    projectArea: data?.project_area || '',
    unitSizeRange: data?.unit_size_range || '',
    yearBuilt: data?.year_built || '',
    totalTowers: data?.total_towers || '',
    totalUnits: data?.total_units || '',
    maintenanceCharges: data?.maintenance_charges || '',
    rwaContact: data?.rwa_contact || '',
    latitude: data?.latitude || '',
    longitude: data?.longitude || '',
    placeId: data?.place_id || '',
    status: normalizeStatus(data?.status),
    verificationStatus: data?.verification_status || 'needs_verification',
    isPublished: Boolean(data?.is_published),
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
    nearbySchools: normalizeAdminText(data?.nearby_schools),
    nearbyMetro: normalizeAdminText(data?.nearby_metro),
    nearbyHospitals: normalizeAdminText(data?.nearby_hospitals),
    nearbyOfficeHubs: normalizeAdminText(data?.nearby_office_hubs),
    metaTitle: data?.meta_title || '',
    metaDescription: data?.meta_description || '',
    faq: normalizeAdminText(data?.faq),
    coverImage: data?.cover_image || '',
    galleryImages: parseArray(data?.gallery_images),
    approvedGalleryImageUrls: parseArray(data?.approved_gallery_image_urls),
    imageReferenceUrl: data?.image_reference_url || '',
    imageUrl: data?.image_url || '',
    imageStatus: normalizeImageStatus(data?.image_status),
    imageApprovedByAdmin: Boolean(data?.image_approved_by_admin),
    imageAltText: data?.image_alt_text || '',
    imageCredit: data?.image_credit || '',
    imageLicenseNotes: data?.image_license_notes || '',
    brochureName: data?.brochure_name || '',
    reraNumber: data?.rera_number || '',
    reraStatus: data?.rera_status || '',
    sourceName: data?.source_name || '',
    sourceUrl: data?.source_url || '',
    officialSourceUrl: data?.official_source_url || '',
    officialProjectUrl: data?.official_project_url || '',
    officialDeveloperUrl: data?.official_developer_url || '',
    officialBrochureUrl: data?.official_brochure_url || '',
    officialFloorPlanUrl: data?.official_floor_plan_url || '',
    officialGalleryUrl: data?.official_gallery_url || '',
    officialSourceStatus: data?.official_source_status || 'pending',
    officialSourceNotes: data?.official_source_notes || '',
    fieldsToVerify: normalizeAdminText(data?.fields_to_verify),
    reraSearchUrl: data?.rera_search_url || '',
    officialReraSourceUrl: data?.official_rera_source_url || '',
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
    city: society.city,
    state: society.state,
    society_type: society.societyType,
    address: society.address,
    description: society.description,
    project_status: society.projectStatus,
    possession_date: society.possessionDate,
    configuration: society.configuration,
    project_area: society.projectArea,
    unit_size_range: society.unitSizeRange,
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
    verification_status: society.verificationStatus,
    is_published: society.isPublished,
    featured: society.featured,
    show_in_hero: society.showInHero,
    search_boost: society.searchBoost,
    latitude: society.latitude,
    longitude: society.longitude,
    place_id: society.placeId,
    rwa_contact: society.rwaContact,
    cover_image: society.coverImage,
    gallery_images: society.galleryImages,
    approved_gallery_image_urls: society.approvedGalleryImageUrls,
    image_reference_url: society.imageReferenceUrl,
    image_url: society.imageUrl,
    image_status: society.imageStatus,
    image_approved_by_admin: society.imageApprovedByAdmin,
    image_alt_text: society.imageAltText,
    image_credit: society.imageCredit,
    image_license_notes: society.imageLicenseNotes,
    brochure_name: society.brochureName,
    rera_number: society.reraNumber,
    rera_status: society.reraStatus,
    source_name: society.sourceName,
    source_url: society.sourceUrl,
    official_source_url: society.officialSourceUrl,
    official_project_url: society.officialProjectUrl,
    official_developer_url: society.officialDeveloperUrl,
    official_brochure_url: society.officialBrochureUrl,
    official_floor_plan_url: society.officialFloorPlanUrl,
    official_gallery_url: society.officialGalleryUrl,
    official_source_status: society.officialSourceStatus,
    official_source_notes: society.officialSourceNotes,
    fields_to_verify: society.fieldsToVerify,
    rera_search_url: society.reraSearchUrl,
    official_rera_source_url: society.officialReraSourceUrl,
    google_maps_url: society.googleMapsUrl,
    source_confidence_score: society.sourceConfidenceScore || null,
    data_quality: society.dataQuality,
  };
}

async function request(path: string, options?: RequestInit) {
  const response = await fetchWithRetry(`${API_BASE}${path}`, {
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


export type SocietyPublishFieldBackfillResponse = {
  status: string;
  message: string;
  summary: {
    total: number;
    published: number;
    unpublished: number;
    updated: number;
    skipped: number;
  };
};

export async function backfillAdminSocietyPublishFields(): Promise<SocietyPublishFieldBackfillResponse> {
  return request('/admin/societies/publish-fields/backfill', {
    method: 'POST',
    body: JSON.stringify({ source: 'admin_societies_page_c112e_b' }),
  });
}

export async function updateAdminSocietyStatus(id: number | string, status: SocietyStatus): Promise<AdminSociety> {
  const isPublished = status === 'Verified' || status === 'Premium';

  const json = await request(`/admin/societies/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      status,
      verification_status: isPublished ? 'verified' : 'needs_verification',
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null,
    }),
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

export async function fetchSocietyDraftFromUrl(officialProjectUrl: string): Promise<{ society: AdminSociety; warnings: string[]; fieldsToVerify: string[]; diagnostics: Record<string, unknown> }> {
  const json = await request('/admin/societies/fetch-from-url', {
    method: 'POST',
    body: JSON.stringify({ official_project_url: officialProjectUrl }),
  });

  return {
    society: mapApiSociety(json?.data || {}),
    warnings: Array.isArray(json?.warnings) ? json.warnings : [],
    fieldsToVerify: normalizeAdminStringArray(json?.fields_to_verify),
    diagnostics: json?.diagnostics || {},
  };
}

export async function fetchSocietyDraftFromBrochure(file: File, context?: AdminSociety): Promise<{ society: AdminSociety; warnings: string[]; fieldsToVerify: string[]; diagnostics: Record<string, unknown> }> {
  const formData = new FormData();
  formData.append('brochure', file);

  if (context) {
    formData.append('context', JSON.stringify(toApiSocietyPayload(context)));
  }

  const response = await fetchWithRetry(`${API_BASE}/admin/societies/fetch-from-brochure`, {
    method: 'POST',
    headers: adminHeaders(),
    body: formData,
  });

  const contentType = response.headers.get('content-type') || '';
  const json = contentType.includes('application/json') ? await response.json().catch(() => null) : null;

  if (!json) {
    throw new Error('Brochure upload was rejected before the API could read it. Use a text-based PDF under 20 MB, or compress the brochure and try again.');
  }

  if (!response.ok) {
    throw new Error(json?.message || `Brochure extraction failed: ${response.status}`);
  }

  if (!json?.success) {
    throw new Error(json?.message || 'Unable to extract details from this brochure.');
  }

  return {
    society: mapApiSociety(json?.data || {}),
    warnings: Array.isArray(json?.warnings) ? json.warnings : [],
    fieldsToVerify: normalizeAdminStringArray(json?.fields_to_verify),
    diagnostics: json?.diagnostics || {},
  };
}

export function mergeFetchedSocietyDraft(current: AdminSociety, patch: AdminSociety): AdminSociety {
  const preferCurrent = <K extends keyof AdminSociety>(field: K): AdminSociety[K] => (
    current[field] === '' || current[field] === null || current[field] === undefined ? patch[field] : current[field]
  );
  const mergedAmenities = Array.from(new Set([...current.amenities, ...patch.amenities]));
  const currentConfidence = Number(current.sourceConfidenceScore || 0);
  const patchConfidence = Number(patch.sourceConfidenceScore || 0);
  const sourceNotes = [current.officialSourceNotes, patch.officialSourceNotes]
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(' | ');

  return {
    ...current,
    name: preferCurrent('name'),
    slug: current.slug || patch.slug || slugifySociety(patch.name || current.name),
    builder: preferCurrent('builder'),
    sector: preferCurrent('sector'),
    locality: preferCurrent('locality'),
    city: preferCurrent('city'),
    state: preferCurrent('state'),
    societyType: preferCurrent('societyType'),
    address: preferCurrent('address'),
    description: preferCurrent('description'),
    projectStatus: preferCurrent('projectStatus'),
    possessionDate: preferCurrent('possessionDate'),
    configuration: preferCurrent('configuration'),
    projectArea: preferCurrent('projectArea'),
    unitSizeRange: preferCurrent('unitSizeRange'),
    totalTowers: preferCurrent('totalTowers'),
    totalUnits: preferCurrent('totalUnits'),
    score: preferCurrent('score'),
    securityScore: preferCurrent('securityScore'),
    maintenanceScore: preferCurrent('maintenanceScore'),
    connectivityScore: preferCurrent('connectivityScore'),
    lifestyleScore: preferCurrent('lifestyleScore'),
    investmentScore: preferCurrent('investmentScore'),
    amenities: mergedAmenities,
    metaTitle: preferCurrent('metaTitle'),
    metaDescription: preferCurrent('metaDescription'),
    brochureName: patch.brochureName || current.brochureName,
    reraNumber: preferCurrent('reraNumber'),
    reraStatus: current.reraStatus || patch.reraStatus,
    sourceName: patch.sourceName || current.sourceName,
    officialSourceStatus: patch.officialSourceStatus || current.officialSourceStatus,
    officialSourceNotes: sourceNotes,
    fieldsToVerify: patch.fieldsToVerify || current.fieldsToVerify,
    sourceConfidenceScore: String(Math.max(currentConfidence, patchConfidence) || ''),
    dataQuality: patch.dataQuality || current.dataQuality,
  };
}

export function describeBrochureUpdate(
  before: AdminSociety,
  patch: AdminSociety,
  after: AdminSociety,
  diagnostics: Record<string, unknown> = {},
) {
  const labels: Partial<Record<keyof AdminSociety, string>> = {
    name: 'society name',
    builder: 'developer',
    sector: 'sector',
    locality: 'micro-market',
    city: 'city',
    state: 'state',
    address: 'address',
    description: 'description',
    projectStatus: 'project status',
    configuration: 'configuration',
    projectArea: 'project area',
    unitSizeRange: 'unit size range',
    totalTowers: 'total towers',
    totalUnits: 'total units',
    reraNumber: 'RERA number',
    reraStatus: 'RERA status',
    metaTitle: 'meta title',
    metaDescription: 'meta description',
  };

  const updated = Object.entries(labels)
    .filter(([field]) => {
      const key = field as keyof AdminSociety;
      return before[key] !== after[key] && Boolean(after[key]);
    })
    .map(([, label]) => label as string);

  const addedAmenities = patch.amenities.filter((amenity) => !before.amenities.includes(amenity));
  if (addedAmenities.length) {
    updated.push(`amenities (${addedAmenities.join(', ')})`);
  }

  const parts = [`Brochure uploaded successfully (${patch.brochureName || 'PDF'}).`];

  if (updated.length) {
    parts.push(`Updated: ${updated.slice(0, 8).join(', ')}${updated.length > 8 ? ` and ${updated.length - 8} more` : ''}.`);
  } else {
    parts.push('No visible form fields changed because the brochure did not contain new readable data, or the existing form values were kept.');
  }

  const extractedCharacters = Number(diagnostics.characters_extracted || 0);
  if (extractedCharacters > 0) {
    parts.push(`Extracted about ${extractedCharacters.toLocaleString()} characters of brochure text.`);
  } else if (diagnostics.brochure_text_found === false) {
    parts.push('This looks like a scanned/image PDF, so only limited text could be read.');
  }

  return parts.join(' ');
}

export async function createSocietyFromFetchedData(society: AdminSociety, publish = false): Promise<AdminSociety> {
  const json = await request('/admin/societies/create-from-fetched-data', {
    method: 'POST',
    body: JSON.stringify({ ...toApiSocietyPayload(society), publish }),
  });

  return mapApiSociety(json?.data || {});
}

export type NearbyIntelligenceSuggestions = {
  nearby_schools: string;
  nearby_metro: string;
  nearby_hospitals: string;
  nearby_office_hubs: string;
};

export async function autoFillNearbyIntelligence(id: number | string): Promise<{ suggestions: NearbyIntelligenceSuggestions; message: string; meta: Record<string, unknown> }> {
  const json = await request(`/admin/societies/${id}/nearby-intelligence/auto-fill`, {
    method: 'POST',
  });

  return {
    suggestions: {
      nearby_schools: json?.suggestions?.nearby_schools || '',
      nearby_metro: json?.suggestions?.nearby_metro || '',
      nearby_hospitals: json?.suggestions?.nearby_hospitals || '',
      nearby_office_hubs: json?.suggestions?.nearby_office_hubs || '',
    },
    message: json?.message || 'Nearby intelligence suggestions fetched.',
    meta: json?.meta || {},
  };
}

export type BulkNearbyAutoFillSummary = {
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
};

export async function bulkAutoFillNearbyIntelligence(societyIds: Array<number | string>): Promise<{ message: string; summary: BulkNearbyAutoFillSummary; results: Array<Record<string, unknown>> }> {
  const json = await request('/admin/societies/nearby-intelligence/bulk-auto-fill', {
    method: 'POST',
    body: JSON.stringify({ society_ids: societyIds }),
  });

  return {
    message: json?.message || 'Bulk nearby autofill complete.',
    summary: {
      processed: Number(json?.summary?.processed || 0),
      updated: Number(json?.summary?.updated || 0),
      skipped: Number(json?.summary?.skipped || 0),
      failed: Number(json?.summary?.failed || 0),
    },
    results: Array.isArray(json?.results) ? json.results : [],
  };
}

export async function fetchGooglePlacesSocietyImageReference(id: number): Promise<{ society: AdminSociety; message: string; meta: Record<string, unknown> }> {
  const response = await adminFetch(`/admin/societies/${id}/google-places-image-reference`, {
    method: 'POST',
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || 'Unable to fetch Google Places image reference.');
  }

  return {
    society: mapApiSociety(json?.data || {}),
    message: json?.message || 'Google Places image reference saved for admin review.',
    meta: json?.meta || {},
  };
}
