import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string; eas?: { projectId?: string } } | undefined;

export const env = {
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    extra?.apiBaseUrl ||
    'https://final-now.onrender.com/api',
  easProjectId: Constants.easConfig?.projectId || extra?.eas?.projectId || null,
  enableDevAnalytics: process.env.EXPO_PUBLIC_ENABLE_DEV_ANALYTICS !== 'false',
};
