import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from '../client';
import AsyncStorage from '../../state/storage';
import { NotificationPreferenceKey } from '../../state/notificationStore';

const DEVICE_ID_KEY = 'sf_mobile_device_install_id_v1';

type NotificationPreferencesPayload = Record<NotificationPreferenceKey, boolean>;

async function getDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

export const notificationService = {
  async registerDevice(expoPushToken: string, preferences: NotificationPreferencesPayload) {
    const deviceId = await getDeviceId();
    const response = await apiClient.post('/accounts/device-tokens', {
      device_id: deviceId,
      expo_push_token: expoPushToken,
      platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown',
      app_version: Constants.expoConfig?.version,
      preferences: {
        saved_search_alerts: preferences.savedSearchAlerts,
        site_visit_reminders: preferences.siteVisitReminders,
        owner_listing_updates: preferences.ownerListingUpdates,
      },
    });

    return response.data as { message?: string; data?: unknown };
  },
  async updatePreferences(preferences: NotificationPreferencesPayload) {
    const response = await apiClient.patch('/accounts/notification-preferences', {
      saved_search_alerts: preferences.savedSearchAlerts,
      site_visit_reminders: preferences.siteVisitReminders,
      owner_listing_updates: preferences.ownerListingUpdates,
    });

    return response.data as { data?: unknown };
  },
};
