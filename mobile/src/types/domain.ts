export type Society = {
  id: number | string;
  name: string;
  slug: string;
  builder?: string | null;
  sector?: string | null;
  locality?: string | null;
  city?: string | null;
  score?: number | string | null;
  imageUrl?: string | null;
  description?: string | null;
  amenities?: string[];
  propertiesCount?: number | string | null;
  publicUrl?: string | null;
  status?: string | null;
};

export type Property = {
  id: number | string;
  title: string;
  slug?: string | null;
  societyName?: string | null;
  societySlug?: string | null;
  listingType?: string | null;
  bedrooms?: number | string | null;
  price?: number | string | null;
  areaSqft?: number | string | null;
  bathrooms?: number | string | null;
  balconies?: number | string | null;
  floor?: string | null;
  facing?: string | null;
  furnishedStatus?: string | null;
  sourceLabel?: string | null;
  description?: string | null;
  images?: string[];
  imageUrl?: string | null;
  status?: string | null;
};

export type PublicListResponse<T> = {
  status?: string;
  data?: T[] | { data?: T[]; items?: T[] };
  meta?: Record<string, unknown>;
};

export type ApiErrorShape = {
  message: string;
  status?: number;
  validation?: Record<string, string[]>;
};
