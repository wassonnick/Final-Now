import Constants from 'expo-constants';
import { Link } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, AppScreen, EmptyState, PrimaryButton, SecondaryButton } from '../../src/components';
import { useAuthStore } from '../../src/state/authStore';
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

  return (
    <AppScreen>
      <AppHeader title="Account" subtitle="Your SocietyFlats profile, enquiries and preferences." />
      {!signedIn ? (
        <EmptyState title="Sign in with OTP" body="Mobile OTP architecture is ready. It uses the existing Laravel account endpoints." action={<Link href="/login" asChild><PrimaryButton>Sign in</PrimaryButton></Link>} />
      ) : <SecondaryButton onPress={signOut}>Logout</SecondaryButton>}
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

const styles = StyleSheet.create({
  menu: { backgroundColor: colors.paperElevated, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line },
  menuItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuText: { ...typography.body, fontWeight: '700' },
  arrow: { color: colors.clay, fontWeight: '900', fontSize: 18 },
  version: { ...typography.muted, textAlign: 'center' },
});
