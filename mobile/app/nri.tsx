import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { nriService } from '../src/api/services/nri';
import { AppHeader, AppScreen, AppTextInput, EmptyState, FilterChip, PrimaryButton } from '../src/components';
import { colors, radius, spacing, typography } from '../src/theme/tokens';

const serviceTypes = [
  { label: 'Buy', value: 'buy' },
  { label: 'Sell', value: 'sell' },
  { label: 'Rent out', value: 'rent_out' },
  { label: 'Manage', value: 'manage' },
] as const;

export default function NriScreen() {
  const [form, setForm] = useState({
    name: '',
    country: '',
    contact_method: 'whatsapp' as 'email' | 'whatsapp',
    phone: '',
    email: '',
    service_type: 'manage' as 'buy' | 'sell' | 'rent_out' | 'manage',
    property_context: '',
    notes: '',
  });
  const mutation = useMutation({ mutationFn: nriService.submit });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    mutation.mutate({ ...form, consent: true });
  }

  return (
    <AppScreen keyboard>
      <AppHeader title="NRI property management" subtitle="Remote Gurgaon buying, selling, renting-out and management support through SocietyFlats." />
      <View style={styles.hero}>
        <Text style={styles.kicker}>Strong point</Text>
        <Text style={styles.title}>A clear operating layer for owners outside India.</Text>
        <Text style={styles.body}>We keep enquiries, verification, society context and admin follow-up in one reviewed workflow. We do not give tax, FEMA, remittance or legal advice.</Text>
      </View>
      <View style={styles.form}>
        <AppTextInput value={form.name} onChangeText={(value) => update('name', value)} placeholder="Your name" />
        <AppTextInput value={form.country} onChangeText={(value) => update('country', value)} placeholder="Country" />
        <View style={styles.wrap}>
          <FilterChip label="WhatsApp" selected={form.contact_method === 'whatsapp'} onPress={() => update('contact_method', 'whatsapp')} />
          <FilterChip label="Email" selected={form.contact_method === 'email'} onPress={() => update('contact_method', 'email')} />
        </View>
        <AppTextInput value={form.phone} onChangeText={(value) => update('phone', value)} placeholder="WhatsApp with country code" keyboardType="phone-pad" />
        <AppTextInput value={form.email} onChangeText={(value) => update('email', value)} placeholder="Email" keyboardType="email-address" />
        <Text style={styles.label}>What do you need?</Text>
        <View style={styles.wrap}>
          {serviceTypes.map((item) => <FilterChip key={item.value} label={item.label} selected={form.service_type === item.value} onPress={() => update('service_type', item.value)} />)}
        </View>
        <AppTextInput value={form.property_context} onChangeText={(value) => update('property_context', value)} placeholder="Society / property context" />
        <AppTextInput value={form.notes} onChangeText={(value) => update('notes', value)} placeholder="Tell us what you want handled" multiline />
        <PrimaryButton onPress={submit} disabled={mutation.isPending}>{mutation.isPending ? 'Submitting…' : 'Request NRI help'}</PrimaryButton>
      </View>
      {mutation.data ? <EmptyState title={mutation.data.case_reference || 'Request received'} body={mutation.data.message || 'SocietyFlats admin will review this before contacting you.'} /> : null}
      {mutation.error ? <EmptyState title="Could not submit" body="Please check required fields and try again." /> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.pine, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },
  kicker: { color: colors.claySoft, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  title: { ...typography.heading, color: colors.paper, fontSize: 28, lineHeight: 34 },
  body: { color: colors.pineSoft, fontSize: 16, lineHeight: 24 },
  form: { backgroundColor: colors.paperElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  label: { ...typography.body, fontWeight: '900' },
});
