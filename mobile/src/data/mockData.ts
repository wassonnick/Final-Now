import { Property, Society } from '../types/domain';

export const mockSocieties: Society[] = [
  { id: 'mock-dlf-crest', name: 'DLF The Crest', slug: 'dlf-the-crest', builder: 'DLF', sector: 'Sector 54', city: 'Gurugram', score: 9.1 },
  { id: 'mock-godrej-summit', name: 'Godrej Summit', slug: 'godrej-summit-gurugram', builder: 'Godrej Properties', sector: 'Sector 104', city: 'Gurugram', score: 8.4 },
  { id: 'mock-tulip-crimson', name: 'Tulip Crimson', slug: 'tulip-crimson-gurugram', builder: 'Tulip', sector: 'Sector 70', city: 'Gurugram', score: 8.2 },
];

export const mockProperties: Property[] = [
  { id: 'mock-property-1', title: '3 BHK verified home near Golf Course Road', slug: 'mock-3bhk-golf-course', societyName: 'DLF The Crest', listingType: 'rent', bedrooms: 3, price: 145000, areaSqft: 2200 },
  { id: 'mock-property-2', title: '4 BHK SocietyFlats inventory in Sector 70', slug: 'mock-4bhk-sector-70', societyName: 'Tulip Crimson', listingType: 'sale', bedrooms: 4, price: 52500000, areaSqft: 3090 },
];

export const popularSectors = ['Sector 54', 'Sector 65', 'Sector 70', 'Sector 76', 'Dwarka Expressway'];
