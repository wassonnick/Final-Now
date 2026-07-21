import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppHeader, AppScreen, EmptyState, ErrorState, FilterChip, IconButton, LoadingSkeleton, PropertyCard, SearchBar, SegmentedControl, SocietyCard } from '../../src/components';
import { propertyService } from '../../src/api/services/properties';
import { societyService } from '../../src/api/services/societies';
import { mockProperties, mockSocieties } from '../../src/data/mockData';
import { analytics } from '../../src/lib/analytics';
import { spacing } from '../../src/theme/tokens';

type Mode = 'Societies' | 'Properties';

export default function ExploreScreen() {
  const [mode, setMode] = useState<Mode>('Societies');
  const [query, setQuery] = useState('');
  const societies = useQuery({ queryKey: ['explore-societies', query], queryFn: () => societyService.list({ q: query, per_page: 20 }) });
  const properties = useQuery({ queryKey: ['explore-properties', query], queryFn: () => propertyService.list({ q: query, per_page: 20 }) });
  const loading = mode === 'Societies' ? societies.isLoading : properties.isLoading;
  const error = mode === 'Societies' ? societies.error : properties.error;

  function submitSearch() {
    analytics.track('search_started', { surface: 'explore', mode });
  }

  return (
    <AppScreen>
      <AppHeader title="Explore" subtitle="Search societies and verified homes with filters ready for the next phase." />
      <SearchBar value={query} onChangeText={setQuery} onSubmit={submitSearch} />
      <SegmentedControl options={['Societies', 'Properties']} value={mode} onChange={setMode} />
      <View style={styles.toolbar}>
        <IconButton name="filter" label="Open filters" onPress={() => router.push('/filters')} />
        <IconButton name="swap-vertical" label="Sort results" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {['Verified', 'High score', 'Near metro', 'Family fit', 'New listing'].map((label) => <FilterChip key={label} label={label} />)}
      </ScrollView>
      {loading ? <LoadingSkeleton /> : error ? <ErrorState body="Could not load live results. Please retry." /> : mode === 'Societies' ? (
        (societies.data?.length ? societies.data : mockSocieties).map((society) => <SocietyCard key={society.id} society={society} />)
      ) : (
        (properties.data?.length ? properties.data : mockProperties).map((property) => <PropertyCard key={property.id} property={property} />)
      )}
      {!loading && !error && mode === 'Properties' && properties.data?.length === 0 ? <EmptyState title="No matching verified homes" body="Try a broader sector or save this search for alerts." /> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: spacing.sm },
  chips: { gap: spacing.sm, paddingRight: spacing.md },
});
