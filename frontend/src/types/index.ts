export interface Society {
  id: string;
  name: string;
  slug: string;
  builder_id: string;
  locality_id: string;
  address: string;
  total_towers: number;
  total_units: number;
  possession_year: number;
  construction_status: string;
  security_score: number;
  maintenance_score: number;
  amenities_score: number;
  connectivity_score: number;
  family_friendly_score: number;
  pet_friendly_score: number;
  construction_quality_score: number;
  rental_demand_score: number;
  overall_score: number;
  security_features: Record<string, boolean>;
  amenities: Record<string, boolean>;
  nearby_facilities: Record<string, number>;
  cover_image: string;
  gallery_images: string[];
  image_url?: string;
  image_status?: string;
  is_verified: boolean;
  featured: boolean;
  view_count: number;
  review_count: number;
  avg_rating: number;
  status: string;
  builder?: Builder;
  locality?: Locality;
  score_breakdown?: Record<string, number>;
  intelligence_summary?: IntelligenceSummary;
}

export interface IntelligenceSummary {
  overall_score: number;
  grade: string;
  verdict: string;
  strengths: StrengthWeakness[];
  weaknesses: StrengthWeakness[];
}

export interface StrengthWeakness {
  category: string;
  score: number;
  label: string;
}

export interface Property {
  id: string;
  society_id: string;
  title: string;
  slug: string;
  property_type: string;
  bhk: number;
  area_sqft: number;
  rent_amount: number;
  maintenance_amount: number;
  deposit_months: number;
  negotiable: boolean;
  floor_number: number;
  total_floors: number;
  facing: string;
  furnished_status: string;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  parking_count: number;
  features: Record<string, boolean>;
  photos: string[];
  is_verified: boolean;
  is_available: boolean;
  status: string;
  view_count: number;
  society?: Society;
  formatted_rent?: string;
  deposit_amount?: number;
  total_monthly_cost?: number;
  price_per_sqft?: number;
  furnished_label?: string;
  verification_status?: VerificationStatus;
}

export interface VerificationStatus {
  is_verified: boolean;
  badges: string[];
  trust_score: number;
}

export interface Builder {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  reputation_score: number;
  total_projects: number;
  rera_registered: boolean;
}

export interface Locality {
  id: string;
  name: string;
  slug: string;
  city: string;
  avg_rent_1bhk: number;
  avg_rent_2bhk: number;
  avg_rent_3bhk: number;
  avg_rent_4bhk: number;
  price_per_sqft: number;
  metro_distance_km: number;
  connectivity_score: number;
  safety_score: number;
  lifestyle_score: number;
}

export interface Review {
  id: string;
  society_id: string;
  user_id: string;
  rating: number;
  title: string;
  content: string;
  security_rating: number;
  maintenance_rating: number;
  amenities_rating: number;
  connectivity_rating: number;
  management_rating: number;
  value_for_money_rating: number;
  lived_duration_months: number;
  is_verified_resident: boolean;
  helpful_count: number;
  created_at: string;
}

export interface SearchFilters {
  locality?: string;
  bhk?: number[];
  budgetMin?: number;
  budgetMax?: number;
  propertyType?: string;
  furnished?: string;
  minScore?: number;
  petFriendly?: boolean;
  familyFriendly?: boolean;
  sortBy?: string;
}

export interface AIRecommendation {
  society: Society;
  match_score: number;
  match_reasons: string[];
  rent_estimate: number;
}
