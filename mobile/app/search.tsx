import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { AppHeader, AppScreen, EmptyState, LoadingSkeleton, PrimaryButton, PropertyCard, SearchBar, SectionHeader, SocietyCard } from '../src/components';
import { searchService } from '../src/api/services/search';
import { useSavedStore } from '../src/state/savedStore';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const saveSearch = useSavedStore((state) => state.saveSearch);
  const results = useQuery({ queryKey: ['search', query], queryFn: () => searchService.searchAll(query), enabled: query.trim().length > 1 });

  return (
    <AppScreen>
      <AppHeader title="Search" subtitle="Search foundation for societies and homes." />
      <SearchBar value={query} onChangeText={setQuery} />
      {query.trim().length > 1 ? <PrimaryButton onPress={() => void saveSearch(query)}>Save this search</PrimaryButton> : null}
      {results.isLoading ? <LoadingSkeleton /> : !query ? <EmptyState title="Start typing to search" /> : (
        <>
          <SectionHeader title="Societies" />
          {results.data?.societies.length ? results.data.societies.map((society) => <SocietyCard key={society.id} society={society} />) : <EmptyState title="No societies found" body="Try a society, sector, locality or builder name." />}
          <SectionHeader title="Properties" />
          {results.data?.properties.length ? results.data.properties.map((property) => <PropertyCard key={property.id} property={property} />) : <EmptyState title="No verified homes found" body="We do not show fake cards when inventory is unavailable." />}
        </>
      )}
    </AppScreen>
  );
}
