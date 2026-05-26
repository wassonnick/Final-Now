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
}

const STORAGE_KEY = 'societyflats_admin_societies_v1';

export const societyAmenityOptions = [
  'Clubhouse', 'Swimming Pool', 'Gym', 'Kids Play Area', 'Tennis Court', 'Badminton Court',
  'Basketball Court', 'Jogging Track', 'Power Backup', 'Visitor Parking', 'Pet Friendly',
  '24x7 Security', 'Concierge', 'CCTV', 'Landscaped Greens', 'Senior Citizen Area'
];

const seedSocieties: AdminSociety[] = [
  {
    id: 1,
    name: 'DLF Crest',
    slug: 'dlf-crest',
    builder: 'DLF',
    sector: 'Sector 54',
    locality: 'Golf Course Road',
    address: 'DLF Crest, Sector 54, Golf Course Road, Gurgaon',
    description: 'Premium Golf Course Road society with strong maintenance, luxury amenities and high tenant demand.',
    yearBuilt: '2018',
    totalTowers: '6',
    totalUnits: '765',
    maintenanceCharges: '₹11-14 per sq ft',
    rwaContact: 'RWA Office, Tower A',
    latitude: '28.4421',
    longitude: '77.1057',
    status: 'Premium',
    featured: true,
    showInHero: true,
    searchBoost: true,
    score: '9.1',
    securityScore: '9.3',
    maintenanceScore: '9.2',
    connectivityScore: '9.4',
    lifestyleScore: '9.0',
    investmentScore: '8.9',
    rentRange: '₹75K - ₹1.8L',
    buyRange: '₹5Cr - ₹8.5Cr',
    averageRent: '₹1.15L',
    averageSalePrice: '₹6.8Cr',
    pricePerSqft: '₹27,500',
    rentalYield: '2.4%',
    amenities: ['Clubhouse', 'Swimming Pool', 'Gym', '24x7 Security', 'Landscaped Greens', 'Visitor Parking'],
    nearbySchools: 'Shiv Nadar School, DPS International, Lancers International',
    nearbyMetro: 'Sector 54 Chowk Rapid Metro - 6 min',
    nearbyHospitals: 'Paras Hospital, Fortis Memorial Research Institute',
    nearbyOfficeHubs: 'Horizon Center, CyberHub, Golf Course Road offices',
    metaTitle: 'DLF Crest Gurgaon - Rent, Sale Price, Reviews & Society Score',
    metaDescription: 'Explore DLF Crest Gurgaon society profile with rent range, resale price, amenities, reviews and available properties.',
    faq: 'Is DLF Crest family friendly? Yes, it is preferred by senior professionals and families.\nIs it near metro? Sector 54 Rapid Metro is nearby.',
    coverImage: '',
    galleryImages: [],
    brochureName: '',
    updatedAt: 'Today',
  },
  {
    id: 2,
    name: 'DLF Park Place',
    slug: 'dlf-park-place',
    builder: 'DLF',
    sector: 'Sector 54',
    locality: 'Golf Course Road',
    address: 'DLF Park Place, Golf Course Road, Gurgaon',
    description: 'Established luxury community with high livability, strong rental demand and excellent connectivity.',
    yearBuilt: '2012',
    totalTowers: '13',
    totalUnits: '1500+',
    maintenanceCharges: '₹9-12 per sq ft',
    rwaContact: 'Estate Office',
    latitude: '28.4414',
    longitude: '77.1068',
    status: 'Verified',
    featured: true,
    showInHero: false,
    searchBoost: true,
    score: '8.9',
    securityScore: '9.0',
    maintenanceScore: '8.8',
    connectivityScore: '9.3',
    lifestyleScore: '8.7',
    investmentScore: '8.8',
    rentRange: '₹60K - ₹1.3L',
    buyRange: '₹4.5Cr - ₹7Cr',
    averageRent: '₹95K',
    averageSalePrice: '₹5.8Cr',
    pricePerSqft: '₹23,500',
    rentalYield: '2.6%',
    amenities: ['Clubhouse', 'Swimming Pool', 'Gym', 'Power Backup', 'Visitor Parking', '24x7 Security'],
    nearbySchools: 'Shalom Hills, Shiv Nadar School, Lancers International',
    nearbyMetro: 'Sector 54 Chowk Rapid Metro - 8 min',
    nearbyHospitals: 'Paras Hospital, Artemis Hospital',
    nearbyOfficeHubs: 'Golf Course Road, CyberHub, One Horizon Center',
    metaTitle: 'DLF Park Place Gurgaon - Rent, Sale Price, Reviews & Availability',
    metaDescription: 'View DLF Park Place society details, rental trends, resale prices, reviews and available flats.',
    faq: '',
    coverImage: '',
    galleryImages: [],
    brochureName: '',
    updatedAt: 'Yesterday',
  },
];

export function slugifySociety(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function safeRead(): AdminSociety[] {
  if (typeof window === 'undefined') return seedSocieties;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as AdminSociety[] : seedSocieties;
  } catch {
    return seedSocieties;
  }
}

export function getAdminSocieties() {
  return safeRead();
}

export function getAdminSociety(idOrSlug: string | undefined) {
  if (!idOrSlug) return undefined;
  return safeRead().find((item) => String(item.id) === String(idOrSlug) || item.slug === idOrSlug);
}

export function createEmptyAdminSociety(): AdminSociety {
  return {
    id: Date.now(),
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

export function upsertAdminSociety(society: AdminSociety) {
  const societies = safeRead();
  const nextSociety = { ...society, updatedAt: 'Just now' };
  const exists = societies.some((item) => item.id === society.id);
  const next = exists ? societies.map((item) => item.id === society.id ? nextSociety : item) : [nextSociety, ...societies];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return nextSociety;
}

export function deleteAdminSociety(id: number) {
  const next = safeRead().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
