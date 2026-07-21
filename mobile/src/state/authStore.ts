import { create } from 'zustand';
import { authService } from '../api/services/auth';
import { setUnauthorizedHandler } from '../api/client';
import { secureTokenStorage } from '../lib/secureTokenStorage';

type AuthStatus = 'restoring' | 'signed_out' | 'signed_in';

type AuthState = {
  status: AuthStatus;
  token: string | null;
  user: unknown | null;
  restore: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'restoring',
  token: null,
  user: null,
  async restore() {
    const token = await secureTokenStorage.getToken();
    if (!token) {
      set({ status: 'signed_out', token: null, user: null });
      return;
    }
    set({ token, status: 'signed_in' });
    try {
      const user = await authService.me();
      set({ user });
    } catch {
      await get().signOut();
    }
  },
  async setToken(token) {
    await secureTokenStorage.setToken(token);
    set({ token, status: 'signed_in' });
  },
  async signOut() {
    await secureTokenStorage.clearToken();
    set({ token: null, user: null, status: 'signed_out' });
  },
}));

setUnauthorizedHandler(() => {
  void useAuthStore.getState().signOut();
});
