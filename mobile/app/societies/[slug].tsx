import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { societyService } from '../../src/api/services/societies';
import { AppHeader, AppScreen, DetailRow, EmptyState, ErrorState, LoadingSkeleton, SaveButton, ScoreBadge, SectionHeader, VerificationBadge } from '../../src/components';
import { InquiryPanel } from '../../src/components/InquiryPanel';
import { analytics } from '../../src/lib/analytics';
import { formatLocation } from '../../src/lib/format';
import { colors, radius, spacing, typography } from '../../src/theme/tokens';

export default function SocietyDetailsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useQuery({ queryKey: ['society', slug], queryFn: () => societyService.show(slug), enabled: Boolean(slug) });

  useEffect(() => {
    if (slug) analytics.track('society_viewed', { slug });
  }, [slug]);

  if (query.isLoading) return <AppScreen><LoadingSkeleton /></AppScreen>;
  if (query.error || !query.data) return <AppScreen><ErrorState body="Could not load this society." /></AppScreen>;
  const society = query.data;

  return (
    <AppScreen>
      <AppHeader title={society.name} subtitle={[society.builder, society.sector, society.city].filter(Boolean).join(' · ')} />
      <View style={styles.row}>
        <VerificationBadge label="Published society profile" />
        <SaveButton kind="societies" id={society.slug} />
      </View>
      <View style={styles.scorePanel}>
        <Text style={styles.kicker}>Society score</Text>
        <ScoreBadge score={society.score} />
        <Text style={styles.body}>Use this as a starting point, then compare commute, resident fit, RWA context and available homes.</Text>
      </View>
      <View style={styles.detailGrid}>
        <DetailRow label="Builder" value={society.builder} />
        <DetailRow label="Location" value={formatLocation([society.sector, society.locality, society.city])} />
        <DetailRow label="Homes linked" value={society.propertiesCount} />
      </View>
      {society.description ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>About this society</Text>
          <Text style={styles.body}>{society.description}</Text>
        </View>
      ) : null}
      {society.amenities?.length ? (
        <>
          <SectionHeader title="Approved amenities" />
          <View style={styles.amenityWrap}>
            {society.amenities.map((amenity) => <Text key={amenity} style={styles.amenity}>{amenity}</Text>)}
          </View>
        </>
      ) : <EmptyState title="Amenity review pending" body="Approved amenities will appear after SocietyFlats review." />}
      <InquiryPanel
        title="Request current availability"
        source="Mobile Society Detail"
        societyId={society.id}
        societyName={society.name}
        entityType="society"
        entitySlug={society.slug}
        message={`Mobile enquiry for current availability in ${society.name}.`}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  scorePanel: { backgroundColor: colors.claySoft, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },
  kicker: { color: colors.warning, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  body: { ...typography.body, fontSize: 16, lineHeight: 24 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  panel: { backgroundColor: colors.paperElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.sm },
  sectionTitle: { ...typography.heading, fontSize: 24, lineHeight: 30 },
  amenityWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amenity: { backgroundColor: colors.paperElevated, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.pine, fontWeight: '800' },
});
