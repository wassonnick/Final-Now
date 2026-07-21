import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

type SavedKind = 'societies' | 'properties';
type SavedState = {
  societies: string[];
  properties: string[];
  restored: boolean;
  restore: () => Promise<void>;
  isSaved: (kind: SavedKind, id: string | number | null | undefined) => boolean;
  toggle: (kind: SavedKind, id: string | number | null | undefined) => Promise<void>;
};

const key = 'sf_mobile_saved_items_v1';

export const useSavedStore = create<SavedState>((set, get) => ({
  societies: [],
  properties: [],
  restored: false,
  async restore() {
    const stored = await SecureStore.getItemAsync(key);
    if (!stored) {
      set({ restored: true });
      return;
    }
    try {
      const parsed = JSON.parse(stored) as Pick<SavedState, 'societies' | 'properties'>;
      set({
        societies: Array.isArray(parsed.societies) ? parsed.societies : [],
        properties: Array.isArray(parsed.properties) ? parsed.properties : [],
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
}));
