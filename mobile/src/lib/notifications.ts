import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

type PushAccessResult = {
  status: 'undetermined' | 'granted' | 'denied';
  tokenCaptured: boolean;
  expoPushToken: string | null;
  message: string;
};

function getProjectId() {
  const expoConfigExtra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return Constants.easConfig?.projectId || expoConfigExtra?.eas?.projectId || null;
}

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestPushNotificationAccess(): Promise<PushAccessResult> {
  if (!Device.isDevice) {
    return {
      status: 'undetermined',
      tokenCaptured: false,
      expoPushToken: null,
      message: 'Push alerts need a physical phone. Preferences are saved locally for now.',
    };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('societyflats-alerts', {
      name: 'SocietyFlats alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9773D',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const finalStatus = current.status === 'granted'
    ? current.status
    : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== 'granted') {
    return {
      status: finalStatus === 'denied' ? 'denied' : 'undetermined',
      tokenCaptured: false,
      expoPushToken: null,
      message: 'Notifications are off. You can still use saved alerts inside the app.',
    };
  }

  const projectId = getProjectId();
  if (!projectId) {
    return {
      status: 'granted',
      tokenCaptured: false,
      expoPushToken: null,
      message: 'Notifications are allowed. Add an EAS project ID before server push token registration.',
    };
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return {
    status: 'granted',
    tokenCaptured: true,
    expoPushToken: token.data,
    message: 'Notifications are allowed and the push token was captured locally.',
  };
}

export function routeFromNotificationData(data: Record<string, unknown>) {
  const event = String(data.event || '');
  const propertySlug = typeof data.property_slug === 'string' ? data.property_slug : null;
  const societySlug = typeof data.society_slug === 'string' ? data.society_slug : null;
  const savedSearchId = data.saved_search_id ? String(data.saved_search_id) : null;

  if (propertySlug) return `/properties/${propertySlug}` as const;
  if (societySlug) return `/societies/${societySlug}` as const;
  if (event === 'saved_search_match' && savedSearchId) return `/search?saved_search_id=${encodeURIComponent(savedSearchId)}` as const;
  if (event === 'site_visit_reminder') return '/my-enquiries' as const;
  if (event === 'owner_listing_update') return '/my-listings' as const;
  return '/notifications' as const;
}

function openNotificationResponse(response: Notifications.NotificationResponse | null | undefined) {
  const data = response?.notification.request.content.data;
  if (!data) return;
  router.push(routeFromNotificationData(data));
}

export function useNotificationResponseRouting() {
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync()
      .then(openNotificationResponse)
      .catch(() => undefined);

    const subscription = Notifications.addNotificationResponseReceivedListener(openNotificationResponse);
    return () => subscription.remove();
  }, []);
}
