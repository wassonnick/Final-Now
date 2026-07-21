import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { accountDashboardService, AccountLead, SiteVisit } from '../src/api/services/accountDashboard';
import { AppHeader, AppScreen, EmptyState, FilterChip, LoadingSkeleton, PrimaryButton } from '../src/components';
import { formatPrice } from '../src/lib/format';
import { useAuthStore } from '../src/state/authStore';
import { colors, radius, spacing, typography } from '../src/theme/tokens';

export default function MyEnquiriesScreen() {
  const signedIn = useAuthStore((state) => state.status === 'signed_in');
  const dashboard = useQuery({ queryKey: ['account-dashboard'], queryFn: accountDashboardService.get, enabled: signedIn });
  const leads = [...(dashboard.data?.owner_listing_leads || []), ...(dashboard.data?.broker_submissions || [])];
  const visits = dashboard.data?.site_visits || [];

  if (!signedIn) {
    return (
      <AppScreen>
        <AppHeader title="My enquiries" subtitle="Track callbacks, listing leads and visit follow-ups." />
        <EmptyState title="Sign in to view enquiries" body="SocietyFlats links activity by your verified mobile number." action={<Link href="/login" asChild><PrimaryButton>Sign in</PrimaryButton></Link>} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader title="My enquiries" subtitle="Your SocietyFlats requests, owner-listing leads and upcoming site visits." />
      {dashboard.isLoading ? <LoadingSkeleton /> : null}
      {dashboard.data ? (
        <View style={styles.stats}>
          <Stat label="Owner listing leads" value={dashboard.data.summary?.owner_listing_leads || 0} />
          <Stat label="Linked homes" value={dashboard.data.summary?.linked_properties || 0} />
          <Stat label="Visits" value={visits.length} />
        </View>
      ) : null}
      {visits.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Site visits</Text>
          {visits.map((visit) => <VisitCard key={visit.id} visit={visit} />)}
        </View>
      ) : null}
      {leads.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent enquiries</Text>
          {leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
        </View>
      ) : null}
      {!dashboard.isLoading && !leads.length && !visits.length ? (
        <EmptyState title="No enquiries yet" body="Ask about a home, request a callback, or submit a listing to see activity here." action={<Link href="/explore" asChild><PrimaryButton>Explore societies</PrimaryButton></Link>} />
      ) : null}
      {dashboard.error ? <EmptyState title="Could not load dashboard" body="Please sign in again if this keeps happening." /> : null}
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

function LeadCard({ lead }: { lead: AccountLead }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.kicker}>{lead.source || lead.lead_intent || 'Enquiry'}</Text>
        <Text style={styles.status}>{lead.status || 'new'}</Text>
      </View>
      <Text style={styles.title}>{lead.property_title || lead.society_name || lead.requirement || 'SocietyFlats request'}</Text>
      <Text style={styles.body}>{[lead.society_name, lead.requirement].filter(Boolean).join(' · ')}</Text>
      {lead.budget ? <Text style={styles.price}>{formatPrice(lead.budget)}</Text> : null}
      {lead.linked_properties_count ? <Text style={styles.body}>{lead.linked_properties_count} linked homes under review</Text> : null}
    </View>
  );
}

function VisitCard({ visit }: { visit: SiteVisit }) {
  const queryClient = useQueryClient();
  const proposedSlots = Array.isArray(visit.proposed_slots) ? visit.proposed_slots : [];
  const [selectedSlot, setSelectedSlot] = useState(visit.selected_slot || proposedSlots[0] || '');
  const confirmMutation = useMutation({
    mutationFn: () => accountDashboardService.confirmSiteVisit(visit.confirmation_token || '', selectedSlot),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-dashboard'] }),
  });
  const canConfirm = Boolean(visit.confirmation_token && selectedSlot && visit.status !== 'confirmed');

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.kicker}>Site visit</Text>
        <Text style={styles.status}>{visit.status || 'proposed'}</Text>
      </View>
      <Text style={styles.title}>{visit.society_name || 'Society visit'}</Text>
      <Text style={styles.body}>{visit.selected_slot ? new Date(visit.selected_slot).toLocaleString() : 'Slot pending confirmation'}</Text>
      {proposedSlots.length && visit.status !== 'confirmed' ? (
        <View style={styles.slotWrap}>
          {proposedSlots.map((slot) => (
            <FilterChip
              key={slot}
              label={new Date(slot).toLocaleString()}
              selected={selectedSlot === slot}
              onPress={() => setSelectedSlot(slot)}
            />
          ))}
        </View>
      ) : null}
      {canConfirm ? (
        <PrimaryButton onPress={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
          {confirmMutation.isPending ? 'Confirming…' : 'Confirm selected slot'}
        </PrimaryButton>
      ) : null}
      {confirmMutation.data?.message ? <Text style={styles.successText}>{confirmMutation.data.message}</Text> : null}
      {confirmMutation.error ? <Text style={styles.errorText}>Could not confirm this slot. Please try another proposed slot.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.paperElevated, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.md },
  statValue: { color: colors.pine, fontSize: 24, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  section: { gap: spacing.md },
  sectionTitle: { ...typography.heading, fontSize: 24 },
  card: { backgroundColor: colors.paperElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  kicker: { color: colors.clay, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  status: { color: colors.pine, fontWeight: '900', textTransform: 'capitalize' },
  title: { ...typography.heading, fontSize: 24, lineHeight: 30 },
  body: { ...typography.muted, fontSize: 15, lineHeight: 22 },
  price: { color: colors.pine, fontSize: 18, fontWeight: '900' },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  successText: { color: colors.success, fontWeight: '900' },
  errorText: { color: colors.danger, fontWeight: '900' },
});
