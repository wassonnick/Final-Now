import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '../state/storage';

const AUTH_TOKEN_KEY = 'societyflats.auth_token';
const isWeb = Platform.OS === 'web';

export const secureTokenStorage = {
  async getToken(): Promise<string | null> {
    if (isWeb) return AsyncStorage.getItem(AUTH_TOKEN_KEY);
    return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  },
  async setToken(token: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  },
  async clearToken(): Promise<void> {
    if (isWeb) {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  },
};
