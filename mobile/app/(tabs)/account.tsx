import Constants from 'expo-constants';
import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader, AppScreen, EmptyState, PrimaryButton, SecondaryButton } from '../../src/components';
import { useAuthStore } from '../../src/state/authStore';
import { colors, radius, spacing, typography } from '../../src/theme/tokens';

const items = ['My enquiries', 'My listings', 'NRI cases', 'RWA claims', 'Referral partner', 'Notification preferences', 'Support', 'Privacy policy', 'Terms'];

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
        {items.map((item) => <Text key={item} style={styles.menuItem}>{item}</Text>)}
      </View>
      <Text style={styles.version}>App version {Constants.expoConfig?.version || '1.0.0'}</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  menu: { backgroundColor: colors.paperElevated, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line },
  menuItem: { ...typography.body, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line, fontWeight: '700' },
  version: { ...typography.muted, textAlign: 'center' },
});
