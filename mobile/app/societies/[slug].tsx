import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { societyService } from '../../src/api/services/societies';
import { AppHeader, AppScreen, EmptyState, ErrorState, LoadingSkeleton, PrimaryButton, ScoreBadge, VerificationBadge } from '../../src/components';
import { analytics } from '../../src/lib/analytics';

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
      <VerificationBadge label="Published society profile" />
      <ScoreBadge score={society.score} />
      <EmptyState title="Society details foundation" body="Full verified profile, photos, nearby intelligence, RWA module and available homes will be expanded in SF-APP-2." action={<PrimaryButton>Request availability</PrimaryButton>} />
      <Text>{society.slug}</Text>
    </AppScreen>
  );
}
