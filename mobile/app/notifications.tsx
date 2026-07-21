import React from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader, AppScreen, EmptyState, FilterChip, PrimaryButton, SectionHeader } from '../src/components';
import { requestPushNotificationAccess } from '../src/lib/notifications';
import { useNotificationStore } from '../src/state/notificationStore';
import { useSavedStore } from '../src/state/savedStore';
import { colors, radius, shadows, spacing, typography } from '../src/theme/tokens';

export default function NotificationsScreen() {
  const savedSearches = useSavedStore((state) => state.searches);
  const {
    lastMessage,
    ownerListingUpdates,
    permissionStatus,
    pushTokenCaptured,
    savedSearchAlerts,
    setPermissionResult,
    setPreference,
    siteVisitReminders,
  } = useNotificationStore();

  const permissionLabel = permissionStatus === 'granted'
    ? pushTokenCaptured ? 'Ready for push alerts' : 'Allowed on this device'
    : permissionStatus === 'denied' ? 'Notifications are off' : 'Not enabled yet';

  const enableNotifications = async () => {
    const result = await requestPushNotificationAccess();
    await setPermissionResult(result.status, result.tokenCaptured, result.expoPushToken, result.message);
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
              Push delivery is being prepared for native builds. Your preferences are already saved in the app.
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
          onPress={() => void setPreference('savedSearchAlerts', !savedSearchAlerts)}
        />
        <FilterChip
          label="Site visit reminders"
          selected={siteVisitReminders}
          onPress={() => void setPreference('siteVisitReminders', !siteVisitReminders)}
        />
        <FilterChip
          label="Owner listing updates"
          selected={ownerListingUpdates}
          onPress={() => void setPreference('ownerListingUpdates', !ownerListingUpdates)}
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
  cardTitle: { ...typography.heading, fontSize: 22, lineHeight: 28 },
  body: { ...typography.muted, fontSize: 15, lineHeight: 22 },
  message: { color: colors.pine, fontWeight: '800', lineHeight: 22 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  searchLink: { paddingVertical: spacing.sm, fontWeight: '800', color: colors.pine },
});
