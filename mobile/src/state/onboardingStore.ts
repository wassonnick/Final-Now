import { create } from 'zustand';
import { safeJsonParse } from '../lib/safeJson';
import AsyncStorage from './storage';

const KEY = 'societyflats.onboarding_complete';

type OnboardingState = {
  restored: boolean;
  completed: boolean;
  restore: () => Promise<void>;
  complete: () => Promise<void>;
  reset: () => Promise<void>;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  restored: false,
  completed: false,
  async restore() {
    const value = await AsyncStorage.getItem(KEY);
    set({ completed: safeJsonParse(value ?? 'false', false), restored: true });
  },
  async complete() {
    await AsyncStorage.setItem(KEY, JSON.stringify(true));
    set({ completed: true, restored: true });
  },
  async reset() {
    await AsyncStorage.removeItem(KEY);
    set({ completed: false, restored: true });
  },
}));
