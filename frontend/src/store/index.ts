import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Society, Property, SearchFilters } from '@/types';

interface AppState {
  // Auth
  user: any | null;
  isAuthenticated: boolean;
  setUser: (user: any | null) => void;

  // Search
  searchFilters: SearchFilters;
  setSearchFilters: (filters: SearchFilters) => void;
  resetSearchFilters: () => void;

  // Compare
  compareList: Society[];
  addToCompare: (society: Society) => void;
  removeFromCompare: (societyId: string) => void;
  clearCompare: () => void;

  // Shortlist
  shortlist: Property[];
  addToShortlist: (property: Property) => void;
  removeFromShortlist: (propertyId: string) => void;

  // UI State
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      searchFilters: {},
      setSearchFilters: (filters) => set({ searchFilters: { ...get().searchFilters, ...filters } }),
      resetSearchFilters: () => set({ searchFilters: {} }),

      compareList: [],
      addToCompare: (society) => {
        const current = get().compareList;
        if (current.length >= 3) return;
        if (current.find(s => s.id === society.id)) return;
        set({ compareList: [...current, society] });
      },
      removeFromCompare: (societyId) => {
        set({ compareList: get().compareList.filter(s => s.id !== societyId) });
      },
      clearCompare: () => set({ compareList: [] }),

      shortlist: [],
      addToShortlist: (property) => {
        const current = get().shortlist;
        if (current.find(p => p.id === property.id)) return;
        set({ shortlist: [...current, property] });
      },
      removeFromShortlist: (propertyId) => {
        set({ shortlist: get().shortlist.filter(p => p.id !== propertyId) });
      },

      isSearchOpen: false,
      setIsSearchOpen: (open) => set({ isSearchOpen: open }),
    }),
    {
      name: 'societyflats-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        compareList: state.compareList,
        shortlist: state.shortlist,
      }),
    }
  )
);
