import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { propertyService } from '../../src/api/services/properties';
import { AppHeader, AppScreen, DetailRow, EmptyState, ErrorState, LoadingSkeleton, PlaceholderVisual, PriceText, SaveButton, SecondaryButton, VerificationBadge } from '../../src/components';
import { InquiryPanel } from '../../src/components/InquiryPanel';
import { analytics } from '../../src/lib/analytics';
import { formatArea, formatLocation } from '../../src/lib/format';
import { colors, radius, spacing, typography } from '../../src/theme/tokens';

export default function PropertyDetailsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useQuery({ queryKey: ['property', slug], queryFn: () => propertyService.show(slug), enabled: Boolean(slug) });

  useEffect(() => {
    if (slug) analytics.track('property_viewed', { slug });
  }, [slug]);

  if (query.isLoading) return <AppScreen><LoadingSkeleton /></AppScreen>;
  if (query.error || !query.data) return <AppScreen><ErrorState body="Could not load this property." /></AppScreen>;
  const property = query.data;

  return (
    <AppScreen>
      <AppHeader title={property.title} subtitle={property.societyName || 'SocietyFlats verified inventory'} />
      <View style={styles.hero}>
        {property.imageUrl ? <Image source={{ uri: property.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <PlaceholderVisual icon="home" label="Photos under verification" />}
      </View>
      <View style={styles.row}>
        <VerificationBadge label={property.sourceLabel || 'Source reviewed'} />
        <SaveButton kind="properties" id={property.slug || property.id} />
      </View>
      <View style={styles.pricePanel}>
        <Text style={styles.kicker}>{property.listingType || 'Verified home'}</Text>
        <PriceText value={property.price} />
        <Text style={styles.body}>{formatLocation([property.bedrooms ? `${property.bedrooms} BHK` : null, formatArea(property.areaSqft), property.furnishedStatus])}</Text>
      </View>
      <View style={styles.detailGrid}>
        <DetailRow label="Area" value={formatArea(property.areaSqft)} />
        <DetailRow label="Bedrooms" value={property.bedrooms} />
        <DetailRow label="Bathrooms" value={property.bathrooms} />
        <DetailRow label="Floor" value={property.floor} />
        <DetailRow label="Facing" value={property.facing} />
      </View>
      {property.description ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Listing notes</Text>
          <Text style={styles.body}>{property.description}</Text>
        </View>
      ) : null}
      <InquiryPanel
        title="Ask about this home"
        source="Mobile Property Detail"
        propertyId={property.id}
        propertyTitle={property.title}
        propertySlug={property.slug}
        societyName={property.societyName}
        entityType="property"
        entitySlug={property.slug}
        message={`Mobile enquiry for ${property.title}.`}
      />
      <SecondaryButton onPress={() => analytics.track('whatsapp_clicked', { property: String(property.id) })}>WhatsApp via SocietyFlats</SecondaryButton>
      {property.societySlug ? <SecondaryButton onPress={() => {
        analytics.track('society_context_opened', { society: property.societySlug || undefined });
        router.push(`/societies/${property.societySlug}`);
      }}>View society context</SecondaryButton> : null}
      <EmptyState title="Safety reminder" body="Never pay before visiting. SocietyFlats reviews listings, but always inspect in person." />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 220, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.pineSoft, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  pricePanel: { backgroundColor: colors.paperElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.sm },
  kicker: { color: colors.clay, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  body: { ...typography.body, fontSize: 16, lineHeight: 24 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  panel: { backgroundColor: colors.paperElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.sm },
  sectionTitle: { ...typography.heading, fontSize: 24, lineHeight: 30 },
});
