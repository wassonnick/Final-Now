import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { referralService } from '../src/api/services/referrals';
import { AppHeader, AppScreen, AppTextInput, EmptyState, FilterChip, LoadingSkeleton, PrimaryButton } from '../src/components';
import { useAuthStore } from '../src/state/authStore';
import { colors, radius, spacing, typography } from '../src/theme/tokens';

export default function ReferralsScreen() {
  const signedIn = useAuthStore((state) => state.status === 'signed_in');
  const summary = useQuery({ queryKey: ['referrals'], queryFn: referralService.summary, enabled: signedIn });
  const [form, setForm] = useState({ name: '', phone: '', intent: 'buy' as 'rent' | 'buy' | 'sell', notes: '' });
  const mutation = useMutation({ mutationFn: referralService.submit, onSuccess: () => summary.refetch() });

  if (!signedIn) {
    return (
      <AppScreen>
        <AppHeader title="Referral partner" subtitle="Refer genuine Gurgaon home needs. Rewards are manually reviewed after real conversion." />
        <EmptyState title="Sign in to refer" body="Referral submissions are tied to your SocietyFlats account." action={<Link href="/login" asChild><PrimaryButton>Sign in</PrimaryButton></Link>} />
      </AppScreen>
    );
  }

  return (
    <AppScreen keyboard>
      <AppHeader title="Referral partner" subtitle="Send verified buyer, tenant or seller leads into the SocietyFlats review flow." />
      {summary.isLoading ? <LoadingSkeleton /> : (
        <View style={styles.panel}>
          <Text style={styles.kicker}>Your code</Text>
          <Text style={styles.code}>{summary.data?.referral_code || 'Generating…'}</Text>
          <Text style={styles.body}>{summary.data?.policy}</Text>
          <View style={styles.stats}>
            <Stat label="Submitted" value={summary.data?.summary?.submitted ?? 0} />
            <Stat label="Qualified" value={summary.data?.summary?.qualified ?? 0} />
            <Stat label="Converted" value={summary.data?.summary?.converted ?? 0} />
          </View>
        </View>
      )}
      <View style={styles.form}>
        <AppTextInput value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder="Referral name" />
        <AppTextInput value={form.phone} onChangeText={(phone) => setForm((current) => ({ ...current, phone }))} placeholder="Referral mobile" keyboardType="phone-pad" />
        <View style={styles.wrap}>
          {(['buy', 'rent', 'sell'] as const).map((intent) => <FilterChip key={intent} label={intent} selected={form.intent === intent} onPress={() => setForm((current) => ({ ...current, intent }))} />)}
        </View>
        <AppTextInput value={form.notes} onChangeText={(notes) => setForm((current) => ({ ...current, notes }))} placeholder="Notes for admin review" multiline />
        <PrimaryButton onPress={() => mutation.mutate(form)} disabled={mutation.isPending}>{mutation.isPending ? 'Submitting…' : 'Submit referral'}</PrimaryButton>
      </View>
      {mutation.data ? <EmptyState title="Referral submitted" body="Admin will review quality before any reward is marked." /> : null}
      {mutation.error ? <EmptyState title="Could not submit referral" body="Check phone number and try again." /> : null}
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
  panel: { backgroundColor: colors.paperElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.sm },
  form: { backgroundColor: colors.paperElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.md },
  kicker: { color: colors.clay, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  code: { ...typography.heading, fontSize: 30 },
  body: { ...typography.muted, fontSize: 15, lineHeight: 22 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.pineSoft, borderRadius: radius.md, padding: spacing.md },
  statValue: { color: colors.pine, fontSize: 24, fontWeight: '900' },
  statLabel: { color: colors.muted, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
