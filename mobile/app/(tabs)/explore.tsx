import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppHeader, AppScreen, EmptyState, ErrorState, FilterChip, IconButton, LoadingSkeleton, PropertyCard, SearchBar, SegmentedControl, SocietyCard } from '../../src/components';
import { propertyService } from '../../src/api/services/properties';
import { societyService } from '../../src/api/services/societies';
import { analytics } from '../../src/lib/analytics';
import { useFilterStore } from '../../src/state/filterStore';
import { spacing } from '../../src/theme/tokens';

export default function ExploreScreen() {
  const { mode, query, listingType, withListings, highScore, sort, setMode, setQuery, toggle } = useFilterStore();
  const societies = useQuery({ queryKey: ['explore-societies', query], queryFn: () => societyService.list({ q: query, per_page: 30 }) });
  const properties = useQuery({
    queryKey: ['explore-properties', query, listingType],
    queryFn: () => propertyService.list({ q: query, per_page: 30, listing_type: listingType === 'Any' ? undefined : listingType }),
  });
  const loading = mode === 'Societies' ? societies.isLoading : properties.isLoading;
  const error = mode === 'Societies' ? societies.error : properties.error;
  const filteredSocieties = useMemo(() => {
    let rows = societies.data ?? [];
    if (withListings) rows = rows.filter((society) => Number(society.propertiesCount ?? 0) > 0);
    if (highScore) rows = rows.filter((society) => Number(society.score ?? 0) >= 8);
    if (sort === 'Highest score') rows = [...rows].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
    return rows;
  }, [highScore, societies.data, sort, withListings]);

  const filteredProperties = useMemo(() => {
    let rows = properties.data ?? [];
    if (sort === 'Newest') return rows;
    if (sort === 'Highest score') return rows;
    return rows;
  }, [properties.data, sort]);

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
        <IconButton name="map" label="Open map search" onPress={() => router.push('/map')} />
        <IconButton name="swap-vertical" label="Sort results" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <FilterChip label="Verified" selected />
        <FilterChip label="High score" selected={highScore} onPress={() => toggle('highScore')} />
        <FilterChip label="With homes" selected={withListings} onPress={() => toggle('withListings')} />
        <FilterChip label={listingType === 'Any' ? 'Rent/Sale' : listingType} selected={listingType !== 'Any'} onPress={() => router.push('/filters')} />
      </ScrollView>
      {loading ? <LoadingSkeleton /> : error ? <ErrorState body="Could not load live results. Please retry." /> : mode === 'Societies' ? (
        filteredSocieties.length ? filteredSocieties.map((society) => <SocietyCard key={society.id} society={society} />) : <EmptyState title="No matching societies" body="Try searching by society name, sector or builder." />
      ) : (
        filteredProperties.length ? filteredProperties.map((property) => <PropertyCard key={property.id} property={property} />) : <EmptyState title="No matching verified homes" body="Try a broader sector or check back after new listings are reviewed." />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: spacing.sm },
  chips: { gap: spacing.sm, paddingRight: spacing.md },
});
