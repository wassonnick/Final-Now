import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, AppScreen, EmptyState, FilterChip, PrimaryButton, SecondaryButton, SectionHeader } from '../src/components';
import { AccountNotification, notificationService } from '../src/api/services/notifications';
import { requestPushNotificationAccess, routeFromNotificationData, setAppNotificationBadgeCount } from '../src/lib/notifications';
import { useAuthStore } from '../src/state/authStore';
import { useNotificationStore } from '../src/state/notificationStore';
import { useSavedStore } from '../src/state/savedStore';
import { colors, radius, shadows, spacing, typography } from '../src/theme/tokens';

export default function NotificationsScreen() {
  const [filter, setFilter] = React.useState<'all' | 'unread' | 'saved_search_match' | 'site_visit_reminder' | 'owner_listing_update'>('all');
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
  const queryClient = useQueryClient();
  const inbox = useQuery({
    queryKey: ['account-notifications'],
    queryFn: notificationService.inbox,
    enabled: signedIn,
  });
  const accountPreferences = useQuery({
    queryKey: ['account-notification-preferences'],
    queryFn: notificationService.preferences,
    enabled: signedIn,
  });
  const markRead = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-notifications'] }),
  });
  const markAllRead = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-notifications'] }),
  });
  const notifications = inbox.data?.data ?? [];
  const unreadCount = inbox.data?.unread_count ?? 0;
  const visibleNotifications = notifications.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return item.status === 'unread';
    return item.event === filter;
  });

  React.useEffect(() => {
    if (signedIn) {
      setAppNotificationBadgeCount(unreadCount).catch(() => undefined);
    }
  }, [signedIn, unreadCount]);

  React.useEffect(() => {
    const preferences = accountPreferences.data?.data;
    if (!signedIn || !preferences) return;

    void setPreference('savedSearchAlerts', Boolean(preferences.saved_search_alerts));
    void setPreference('siteVisitReminders', Boolean(preferences.site_visit_reminders));
    void setPreference('ownerListingUpdates', Boolean(preferences.owner_listing_updates));
    void setQuietHours(
      Boolean(preferences.quiet_hours_enabled),
      preferences.quiet_hours_start || quietHoursStart,
      preferences.quiet_hours_end || quietHoursEnd,
      preferences.timezone || timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    );
  }, [accountPreferences.data, quietHoursEnd, quietHoursStart, setPreference, setQuietHours, signedIn, timezone]);

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
        await queryClient.invalidateQueries({ queryKey: ['account-notification-preferences'] });
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
        await queryClient.invalidateQueries({ queryKey: ['account-notification-preferences'] });
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
        await queryClient.invalidateQueries({ queryKey: ['account-notification-preferences'] });
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
        {signedIn && accountPreferences.data?.data ? (
          <View style={styles.deviceStrip}>
            <Text style={styles.deviceText}>
              {accountPreferences.data.data.push_ready ? 'Push device registered' : 'No push device registered yet'}
              {' · '}
              {accountPreferences.data.data.registered_devices_count || 0} active device{accountPreferences.data.data.registered_devices_count === 1 ? '' : 's'}
            </Text>
          </View>
        ) : null}
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

      <SectionHeader title={signedIn && unreadCount > 0 ? `Notification inbox · ${unreadCount} unread` : 'Notification inbox'} />
      {!signedIn ? (
        <EmptyState title="Sign in to see alerts" body="Your matching homes, visit reminders and account updates will appear here once this phone is linked." />
      ) : inbox.isLoading ? (
        <View style={styles.inboxCard}>
          <Text style={styles.body}>Loading your latest SocietyFlats alerts…</Text>
        </View>
      ) : notifications.length ? (
        <View style={styles.inboxCard}>
          <View style={styles.chipWrap}>
            <FilterChip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
            <FilterChip label="Unread" selected={filter === 'unread'} onPress={() => setFilter('unread')} />
            <FilterChip label="Saved homes" selected={filter === 'saved_search_match'} onPress={() => setFilter('saved_search_match')} />
            <FilterChip label="Visits" selected={filter === 'site_visit_reminder'} onPress={() => setFilter('site_visit_reminder')} />
            <FilterChip label="Listings" selected={filter === 'owner_listing_update'} onPress={() => setFilter('owner_listing_update')} />
          </View>
          {visibleNotifications.length ? visibleNotifications.map((item) => (
            <NotificationInboxCard
              key={item.id}
              item={item}
              onMarkRead={() => markRead.mutate(item.id)}
            />
          )) : (
            <EmptyState title="Nothing in this filter" body="Switch to All to see every SocietyFlats alert saved for this account." />
          )}
          <SecondaryButton
            disabled={unreadCount === 0 || markAllRead.isPending}
            onPress={() => markAllRead.mutate()}
          >
            Mark all as read
          </SecondaryButton>
        </View>
      ) : (
        <EmptyState title="No app alerts yet" body="When SocietyFlats finds a saved-search match or sends a visit reminder, it will stay here even if push is paused." />
      )}

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

function notificationMeta(item: AccountNotification) {
  if (item.event === 'saved_search_match') {
    return { label: 'Saved-search match', detail: 'Review matching home', tone: colors.success };
  }
  if (item.event === 'site_visit_reminder') {
    return { label: 'Site visit', detail: 'Open enquiries', tone: colors.clay };
  }
  if (item.event === 'owner_listing_update') {
    return { label: 'Listing update', detail: 'Open my listings', tone: colors.warning };
  }

  return { label: 'SocietyFlats', detail: 'Open alert', tone: colors.pine };
}

function NotificationInboxCard({ item, onMarkRead }: { item: AccountNotification; onMarkRead: () => void }) {
  const meta = notificationMeta(item);
  const data = item.data && typeof item.data === 'object' ? item.data : {};

  const openAlert = () => {
    if (item.status === 'unread') onMarkRead();
    router.push(routeFromNotificationData({ event: item.event, ...data }));
  };

  return (
    <Pressable
      style={[styles.notificationItem, item.status === 'unread' && styles.notificationUnread]}
      onPress={openAlert}
      accessibilityRole="button"
      accessibilityLabel={`Open notification: ${item.title}`}
    >
      <View style={[styles.notificationDot, { backgroundColor: item.status === 'read' ? colors.line : meta.tone }]} />
      <View style={styles.flex}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationLabel, { color: meta.tone }]}>{meta.label}</Text>
          {item.status === 'unread' ? <Text style={styles.unreadPill}>Unread</Text> : null}
        </View>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        {item.body ? <Text style={styles.notificationBody}>{item.body}</Text> : null}
        <View style={styles.notificationFooter}>
          {item.created_at ? <Text style={styles.notificationTime}>{new Date(item.created_at).toLocaleString()}</Text> : null}
          <Text style={styles.openText}>{meta.detail} →</Text>
        </View>
      </View>
    </Pressable>
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
  deviceStrip: {
    backgroundColor: colors.pineSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  deviceText: { color: colors.pine, fontSize: 13, fontWeight: '900' },
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
  inboxCard: {
    backgroundColor: colors.paperElevated,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  notificationItem: {
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  notificationUnread: { backgroundColor: colors.paper },
  notificationDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.clay, marginTop: 6 },
  notificationHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'center' },
  notificationLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  notificationTitle: { fontSize: 16, fontWeight: '900', color: colors.ink },
  notificationBody: { ...typography.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  notificationFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'center', marginTop: 6 },
  notificationTime: { ...typography.muted, fontSize: 12, marginTop: 6 },
  unreadPill: {
    backgroundColor: colors.pineSoft,
    borderRadius: radius.pill,
    color: colors.pine,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  openText: { color: colors.pine, fontSize: 12, fontWeight: '900' },
});
