import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader, AppScreen, EmptyState, PrimaryButton, SecondaryButton } from '../src/components';
import { colors, radius, spacing, typography } from '../src/theme/tokens';

export default function RwaScreen() {
  return (
    <AppScreen>
      <AppHeader title="RWA portal" subtitle="Claim society context, announcements, resident Q&A and grievance workflows." />
      <View style={styles.hero}>
        <Text style={styles.kicker}>Society operating layer</Text>
        <Text style={styles.title}>Give every verified society a cleaner resident-facing page.</Text>
        <Text style={styles.body}>RWA modules stay review-first: claims, public announcements, moderated questions, issue discussions and admin visibility.</Text>
      </View>
      <View style={styles.grid}>
        {['Claim society page', 'Announcements', 'Resident Q&A', 'Problems & grievances', 'Moderated discussions', 'SEO-safe society updates'].map((item) => <Text key={item} style={styles.tile}>{item}</Text>)}
      </View>
      <EmptyState title="Start from a society" body="Open a society profile and request availability or RWA context. Claim/account workflows are connected to the backend for the next mobile phase." action={<Link href="/explore" asChild><PrimaryButton>Find society</PrimaryButton></Link>} />
      <Link href="/nri" asChild><SecondaryButton>NRI owner support</SecondaryButton></Link>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.paperElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.sm },
  kicker: { color: colors.clay, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  title: { ...typography.heading, fontSize: 28, lineHeight: 34 },
  body: { ...typography.muted, fontSize: 16, lineHeight: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: '48%', backgroundColor: colors.pineSoft, borderRadius: radius.md, padding: spacing.md, color: colors.pine, fontWeight: '900' },
});
