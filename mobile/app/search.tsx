import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { AppHeader, AppScreen, EmptyState, LoadingSkeleton, PropertyCard, SearchBar, SectionHeader, SocietyCard } from '../src/components';
import { searchService } from '../src/api/services/search';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const results = useQuery({ queryKey: ['search', query], queryFn: () => searchService.searchAll(query), enabled: query.trim().length > 1 });

  return (
    <AppScreen>
      <AppHeader title="Search" subtitle="Search foundation for societies and homes." />
      <SearchBar value={query} onChangeText={setQuery} />
      {results.isLoading ? <LoadingSkeleton /> : !query ? <EmptyState title="Start typing to search" /> : (
        <>
          <SectionHeader title="Societies" />
          {results.data?.societies.map((society) => <SocietyCard key={society.id} society={society} />)}
          <SectionHeader title="Properties" />
          {results.data?.properties.map((property) => <PropertyCard key={property.id} property={property} />)}
        </>
      )}
    </AppScreen>
  );
}
