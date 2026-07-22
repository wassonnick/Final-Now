import React from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader, AppScreen, EmptyState, FilterChip, PrimaryButton, SectionHeader } from '../src/components';
import { notificationService } from '../src/api/services/notifications';
import { requestPushNotificationAccess } from '../src/lib/notifications';
import { useAuthStore } from '../src/state/authStore';
import { useNotificationStore } from '../src/state/notificationStore';
import { useSavedStore } from '../src/state/savedStore';
import { colors, radius, shadows, spacing, typography } from '../src/theme/tokens';

export default function NotificationsScreen() {
  const savedSearches = useSavedStore((state) => state.searches);
  const {
    lastMessage,
    ownerListingUpdates,
    permissionStatus,
    expoPushToken,
    pushTokenCaptured,
    quietHoursEnabled,
    quietHoursEnd,
    quietHoursStart,
    savedSearchAlerts,
    setPermissionResult,
    setPreference,
    setQuietHours,
    siteVisitReminders,
    timezone,
  } = useNotificationStore();
  const authStatus = useAuthStore((state) => state.status);
  const signedIn = authStatus === 'signed_in';

  const currentPreferences = {
    savedSearchAlerts,
    siteVisitReminders,
    ownerListingUpdates,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
    timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
  };

  const permissionLabel = permissionStatus === 'granted'
    ? pushTokenCaptured ? 'Ready for push alerts' : 'Allowed on this device'
    : permissionStatus === 'denied' ? 'Notifications are off' : 'Not enabled yet';

  const enableNotifications = async () => {
    const result = await requestPushNotificationAccess();
    await setPermissionResult(result.status, result.tokenCaptured, result.expoPushToken, result.message);

    if (signedIn && result.expoPushToken) {
      try {
        await notificationService.registerDevice(result.expoPushToken, currentPreferences);
        await setPermissionResult(result.status, true, result.expoPushToken, 'Notifications are connected to your SocietyFlats account.');
      } catch {
        await setPermissionResult(result.status, result.tokenCaptured, result.expoPushToken, 'Notifications are allowed, but account registration did not complete. Try again after signing in.');
      }
    }
  };

  const toggleQuietHours = async () => {
    const next = {
      ...currentPreferences,
      quietHoursEnabled: !quietHoursEnabled,
      timezone: currentPreferences.timezone,
    };
    await setQuietHours(next.quietHoursEnabled, next.quietHoursStart, next.quietHoursEnd, next.timezone);
    if (signedIn) {
      try {
        await notificationService.updatePreferences(next);
      } catch {
        await setPermissionResult(permissionStatus, pushTokenCaptured, expoPushToken, 'Quiet hours saved on this phone. Backend sync will retry when your account is reachable.');
      }
    }
  };

  const togglePreference = async (key: 'savedSearchAlerts' | 'siteVisitReminders' | 'ownerListingUpdates', value: boolean) => {
    const next = { ...currentPreferences, [key]: value };
    await setPreference(key, value);
    if (signedIn) {
      try {
        await notificationService.updatePreferences(next);
      } catch {
        await setPermissionResult(permissionStatus, pushTokenCaptured, expoPushToken, 'Preference saved on this phone. Backend sync will retry when your account is reachable.');
      }
    }
  };

  return (
    <AppScreen>
      <AppHeader title="Notifications" subtitle="Alerts for matching homes, site visits and owner-listing updates." />

      <View style={styles.permissionCard}>
        <View style={styles.row}>
          <View style={styles.dot} />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{permissionLabel}</Text>
            <Text style={styles.body}>
              Push delivery is being prepared for native builds. Sign in once to link this phone with your SocietyFlats account.
            </Text>
          </View>
        </View>
        {lastMessage ? <Text style={styles.message}>{lastMessage}</Text> : null}
        <PrimaryButton onPress={enableNotifications}>
          {permissionStatus === 'granted' ? 'Refresh notification access' : 'Enable app alerts'}
        </PrimaryButton>
      </View>

      <SectionHeader title="Alert preferences" />
      <View style={styles.chipWrap}>
        <FilterChip
          label="Saved searches"
          selected={savedSearchAlerts}
          onPress={() => void togglePreference('savedSearchAlerts', !savedSearchAlerts)}
        />
        <FilterChip
          label="Site visit reminders"
          selected={siteVisitReminders}
          onPress={() => void togglePreference('siteVisitReminders', !siteVisitReminders)}
        />
        <FilterChip
          label="Owner listing updates"
          selected={ownerListingUpdates}
          onPress={() => void togglePreference('ownerListingUpdates', !ownerListingUpdates)}
        />
      </View>

      <SectionHeader title="Quiet hours" />
      <View style={styles.quietCard}>
        <View style={styles.row}>
          <View style={[styles.dot, quietHoursEnabled ? styles.dotActive : styles.dotMuted]} />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{quietHoursEnabled ? 'Quiet hours on' : 'Quiet hours off'}</Text>
            <Text style={styles.body}>
              Pause push alerts from {quietHoursStart} to {quietHoursEnd}. Site-visit and saved-search alerts will wait outside this window.
            </Text>
          </View>
        </View>
        <FilterChip
          label={quietHoursEnabled ? 'Turn quiet hours off' : 'Pause 10 PM – 8 AM'}
          selected={quietHoursEnabled}
          onPress={() => void toggleQuietHours()}
        />
      </View>

      <SectionHeader title="Saved-search alerts" />
      {savedSearches.length ? (
        <View>
          {savedSearches.map((search) => (
            <Link key={search} href={{ pathname: '/search', params: { q: search } }}>
              <Text style={styles.searchLink}>{search}</Text>
            </Link>
          ))}
        </View>
      ) : <EmptyState title="No saved-search alerts yet" body="Save a search to keep it ready here. Push alerts will use these saved searches once backend delivery is enabled." />}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  permissionCard: {
    backgroundColor: colors.paperElevated,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  flex: { flex: 1 },
  dot: { width: 14, height: 14, borderRadius: radius.pill, backgroundColor: colors.clay, marginTop: 6 },
  dotActive: { backgroundColor: colors.pine },
  dotMuted: { backgroundColor: colors.clay },
  cardTitle: { ...typography.heading, fontSize: 22, lineHeight: 28 },
  body: { ...typography.muted, fontSize: 15, lineHeight: 22 },
  message: { color: colors.pine, fontWeight: '800', lineHeight: 22 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quietCard: {
    backgroundColor: colors.paperElevated,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  searchLink: { paddingVertical: spacing.sm, fontWeight: '800', color: colors.pine },
});
