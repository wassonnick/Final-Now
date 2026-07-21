import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;

export const env = {
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    extra?.apiBaseUrl ||
    'https://final-now.onrender.com/api',
  enableDevAnalytics: process.env.EXPO_PUBLIC_ENABLE_DEV_ANALYTICS !== 'false',
};
