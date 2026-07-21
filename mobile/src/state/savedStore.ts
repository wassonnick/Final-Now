import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

type SavedKind = 'societies' | 'properties';
type SavedState = {
  societies: string[];
  properties: string[];
  searches: string[];
  restored: boolean;
  restore: () => Promise<void>;
  isSaved: (kind: SavedKind, id: string | number | null | undefined) => boolean;
  toggle: (kind: SavedKind, id: string | number | null | undefined) => Promise<void>;
  saveSearch: (query: string) => Promise<void>;
};

const key = 'sf_mobile_saved_items_v1';

export const useSavedStore = create<SavedState>((set, get) => ({
  societies: [],
  properties: [],
  searches: [],
  restored: false,
  async restore() {
    const stored = await SecureStore.getItemAsync(key);
    if (!stored) {
      set({ restored: true });
      return;
    }
    try {
      const parsed = JSON.parse(stored) as { societies?: unknown; properties?: unknown; searches?: unknown };
      set({
        societies: Array.isArray(parsed.societies) ? parsed.societies : [],
        properties: Array.isArray(parsed.properties) ? parsed.properties : [],
        searches: Array.isArray(parsed.searches) ? parsed.searches : [],
        restored: true,
      });
    } catch {
      set({ restored: true });
    }
  },
  isSaved(kind, id) {
    if (!id) return false;
    return get()[kind].includes(String(id));
  },
  async toggle(kind, id) {
    if (!id) return;
    const value = String(id);
    const current = get()[kind];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [value, ...current];
    const payload = { societies: get().societies, properties: get().properties, [kind]: next };
    set(payload);
    await SecureStore.setItemAsync(key, JSON.stringify(payload));
  },
  async saveSearch(query) {
    const clean = query.trim();
    if (!clean) return;
    const searches = [clean, ...get().searches.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 20);
    const payload = { societies: get().societies, properties: get().properties, searches };
    set(payload);
    await SecureStore.setItemAsync(key, JSON.stringify(payload));
  },
}));
