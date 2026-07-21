import { create } from 'zustand';

export type ExploreMode = 'Societies' | 'Properties';
export type SortOption = 'Recommended' | 'Highest score' | 'Newest';

type FilterState = {
  mode: ExploreMode;
  query: string;
  listingType: 'Any' | 'Rent' | 'Sale';
  verifiedOnly: boolean;
  withListings: boolean;
  highScore: boolean;
  sort: SortOption;
  setMode: (mode: ExploreMode) => void;
  setQuery: (query: string) => void;
  toggle: (key: 'verifiedOnly' | 'withListings' | 'highScore') => void;
  setListingType: (listingType: FilterState['listingType']) => void;
  setSort: (sort: SortOption) => void;
  reset: () => void;
};

const defaults = {
  mode: 'Societies' as ExploreMode,
  query: '',
  listingType: 'Any' as const,
  verifiedOnly: true,
  withListings: false,
  highScore: false,
  sort: 'Recommended' as SortOption,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...defaults,
  setMode: (mode) => set({ mode }),
  setQuery: (query) => set({ query }),
  toggle: (key) => set((state) => ({ [key]: !state[key] })),
  setListingType: (listingType) => set({ listingType }),
  setSort: (sort) => set({ sort }),
  reset: () => set(defaults),
}));
