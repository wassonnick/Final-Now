import { create } from 'zustand';
import AsyncStorage from './storage';

const NOTIFICATION_PREFS_KEY = 'sf_mobile_notification_preferences_v1';

export type NotificationPreferenceKey = 'savedSearchAlerts' | 'siteVisitReminders' | 'ownerListingUpdates';
export type NotificationPermissionStatus = 'unknown' | 'undetermined' | 'granted' | 'denied';

type StoredNotificationPreferences = {
  savedSearchAlerts: boolean;
  siteVisitReminders: boolean;
  ownerListingUpdates: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string | null;
  permissionStatus: NotificationPermissionStatus;
  pushTokenCaptured: boolean;
  expoPushToken: string | null;
  lastMessage: string | null;
};

type NotificationStore = StoredNotificationPreferences & {
  restore: () => Promise<void>;
  setPreference: (key: NotificationPreferenceKey, value: boolean) => Promise<void>;
  setQuietHours: (enabled: boolean, start?: string, end?: string, timezone?: string | null) => Promise<void>;
  setPermissionResult: (status: NotificationPermissionStatus, pushTokenCaptured: boolean, expoPushToken?: string | null, lastMessage?: string | null) => Promise<void>;
};

const defaults: StoredNotificationPreferences = {
  savedSearchAlerts: true,
  siteVisitReminders: true,
  ownerListingUpdates: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  timezone: null,
  permissionStatus: 'unknown',
  pushTokenCaptured: false,
  expoPushToken: null,
  lastMessage: null,
};

async function persist(state: StoredNotificationPreferences) {
  await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(state));
}

function snapshot(state: NotificationStore): StoredNotificationPreferences {
  return {
    savedSearchAlerts: state.savedSearchAlerts,
    siteVisitReminders: state.siteVisitReminders,
    ownerListingUpdates: state.ownerListingUpdates,
    quietHoursEnabled: state.quietHoursEnabled,
    quietHoursStart: state.quietHoursStart,
    quietHoursEnd: state.quietHoursEnd,
    timezone: state.timezone,
    permissionStatus: state.permissionStatus,
    pushTokenCaptured: state.pushTokenCaptured,
    expoPushToken: state.expoPushToken,
    lastMessage: state.lastMessage,
  };
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  ...defaults,
  async restore() {
    const stored = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!stored) return;
    try {
      set({ ...defaults, ...JSON.parse(stored) });
    } catch {
      await AsyncStorage.removeItem(NOTIFICATION_PREFS_KEY);
    }
  },
  async setPreference(key, value) {
    set({ [key]: value } as Pick<StoredNotificationPreferences, NotificationPreferenceKey>);
    await persist(snapshot(get()));
  },
  async setQuietHours(quietHoursEnabled, quietHoursStart = get().quietHoursStart, quietHoursEnd = get().quietHoursEnd, timezone = get().timezone) {
    set({ quietHoursEnabled, quietHoursStart, quietHoursEnd, timezone });
    await persist(snapshot(get()));
  },
  async setPermissionResult(permissionStatus, pushTokenCaptured, expoPushToken = null, lastMessage = null) {
    set({ permissionStatus, pushTokenCaptured, expoPushToken, lastMessage });
    await persist(snapshot(get()));
  },
}));
