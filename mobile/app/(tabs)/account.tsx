import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { accountDashboardService } from '../../src/api/services/accountDashboard';
import { notificationService } from '../../src/api/services/notifications';
import { savedSearchService } from '../../src/api/services/savedSearches';
import { AppHeader, AppScreen, EmptyState, PrimaryButton, SecondaryButton } from '../../src/components';
import { useAuthStore } from '../../src/state/authStore';
import { useSavedStore } from '../../src/state/savedStore';
import { colors, radius, spacing, typography } from '../../src/theme/tokens';

const items = [
  { label: 'My enquiries', href: '/my-enquiries' },
  { label: 'My listings', href: '/my-listings' },
  { label: 'List your property', href: '/list-property' },
  { label: 'NRI cases', href: '/nri' },
  { label: 'RWA claims', href: '/rwa' },
  { label: 'Referral partner', href: '/referrals' },
  { label: 'Notification preferences', href: '/notifications' },
] as const;

export default function AccountScreen() {
  const { status, signOut } = useAuthStore();
  const signedIn = status === 'signed_in';
  const localSavedSocieties = useSavedStore((state) => state.societies.length);
  const localSavedProperties = useSavedStore((state) => state.properties.length);
  const dashboard = useQuery({ queryKey: ['account-dashboard'], queryFn: accountDashboardService.get, enabled: signedIn });
  const savedSearches = useQuery({ queryKey: ['saved-searches'], queryFn: savedSearchService.list, enabled: signedIn });
  const notifications = useQuery({ queryKey: ['account-notifications'], queryFn: notificationService.inbox, enabled: signedIn });
  const account = dashboard.data?.account;

  return (
    <AppScreen>
      <AppHeader title="Account" subtitle="Your SocietyFlats profile, enquiries and preferences." />
      {!signedIn ? (
        <EmptyState title="Sign in with OTP" body="Mobile OTP architecture is ready. It uses the existing Laravel account endpoints." action={<Link href="/login" asChild><PrimaryButton>Sign in</PrimaryButton></Link>} />
      ) : (
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{String(account?.name || account?.phone || 'SF').slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.flex}>
            <Text style={styles.profileName}>{account?.name || 'SocietyFlats member'}</Text>
            <Text style={styles.profileMeta}>{account?.phone || 'Verified account'} · {account?.role || 'customer'}</Text>
          </View>
          <SecondaryButton onPress={signOut}>Logout</SecondaryButton>
        </View>
      )}
      {signedIn ? (
        <View style={styles.stats}>
          <Stat label="Unread alerts" value={notifications.data?.unread_count ?? 0} />
          <Stat label="Search alerts" value={savedSearches.data?.length ?? 0} />
          <Stat label="Saved items" value={localSavedSocieties + localSavedProperties} />
        </View>
      ) : null}
      <View style={styles.menu}>
        {items.map((item) => (
          <Link key={item.href} href={item.href} asChild>
            <Pressable style={styles.menuItem}>
              <Text style={styles.menuText}>{item.label}</Text>
              <Text style={styles.arrow}>→</Text>
            </Pressable>
          </Link>
        ))}
      </View>
      <Text style={styles.version}>App version {Constants.expoConfig?.version || '1.0.0'}</Text>
    </AppScreen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: { backgroundColor: colors.paperElevated, borderColor: colors.line, borderRadius: radius.xl, borderWidth: 1, flexDirection: 'row', gap: spacing.md, alignItems: 'center', padding: spacing.lg },
  avatar: { alignItems: 'center', backgroundColor: colors.pine, borderRadius: radius.pill, height: 54, justifyContent: 'center', width: 54 },
  avatarText: { color: colors.white, fontSize: 22, fontWeight: '900' },
  flex: { flex: 1 },
  profileName: { ...typography.heading, fontSize: 22, lineHeight: 28 },
  profileMeta: { ...typography.muted, fontSize: 14, lineHeight: 20 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.paperElevated, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.md },
  statValue: { color: colors.pine, fontSize: 24, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  menu: { backgroundColor: colors.paperElevated, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line },
  menuItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuText: { ...typography.body, fontWeight: '700' },
  arrow: { color: colors.clay, fontWeight: '900', fontSize: 18 },
  version: { ...typography.muted, textAlign: 'center' },
});
