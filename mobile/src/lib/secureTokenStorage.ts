import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'societyflats.auth_token';

export const secureTokenStorage = {
  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  },
  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  },
  async clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  },
};
