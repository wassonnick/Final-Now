import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { AppHeader, AppScreen, EmptyState, LoadingSkeleton, PrimaryButton, PropertyCard, SearchBar, SectionHeader, SocietyCard } from '../src/components';
import { savedSearchService } from '../src/api/services/savedSearches';
import { searchService } from '../src/api/services/search';
import { useAuthStore } from '../src/state/authStore';
import { useSavedStore } from '../src/state/savedStore';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const saveSearch = useSavedStore((state) => state.saveSearch);
  const signedIn = useAuthStore((state) => state.status === 'signed_in');
  const queryClient = useQueryClient();
  const results = useQuery({ queryKey: ['search', query], queryFn: () => searchService.searchAll(query), enabled: query.trim().length > 1 });
  const saveBackendSearch = useMutation({
    mutationFn: (value: string) => savedSearchService.create(value, { q: value, tab: 'all' }),
    onSuccess: () => {
      setSaveMessage('Saved search alerts are on for this account.');
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
    onError: () => setSaveMessage('Saved locally. Sign in again if account sync does not complete.'),
  });

  const handleSaveSearch = async () => {
    const clean = query.trim();
    if (!clean) return;
    await saveSearch(clean);
    if (signedIn) {
      saveBackendSearch.mutate(clean);
    } else {
      setSaveMessage('Saved on this phone. Sign in to turn alerts on.');
    }
  };

  return (
    <AppScreen>
      <AppHeader title="Search" subtitle="Search foundation for societies and homes." />
      <SearchBar value={query} onChangeText={setQuery} />
      {query.trim().length > 1 ? (
        <PrimaryButton onPress={() => void handleSaveSearch()} disabled={saveBackendSearch.isPending}>
          {saveBackendSearch.isPending ? 'Saving…' : 'Save this search'}
        </PrimaryButton>
      ) : null}
      {saveMessage ? <EmptyState title={saveMessage} /> : null}
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
