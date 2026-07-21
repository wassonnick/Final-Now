import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { propertyService } from '../../src/api/services/properties';
import { AppHeader, AppScreen, EmptyState, ErrorState, LoadingSkeleton, PriceText, PrimaryButton, SecondaryButton, VerificationBadge } from '../../src/components';
import { analytics } from '../../src/lib/analytics';

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
      <VerificationBadge label="Source reviewed" />
      <PriceText value={property.price} />
      <PrimaryButton onPress={() => analytics.track('callback_requested', { property: String(property.id) })}>Ask about this home</PrimaryButton>
      <SecondaryButton onPress={() => analytics.track('whatsapp_clicked', { property: String(property.id) })}>WhatsApp</SecondaryButton>
      <EmptyState title="Property details foundation" body="Photo gallery, callback flow and society context are ready to deepen in the next phase." />
    </AppScreen>
  );
}
