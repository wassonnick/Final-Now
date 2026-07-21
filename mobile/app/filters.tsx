import React from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AppHeader, AppScreen, BottomSheetFoundation, FilterChip, PrimaryButton, SecondaryButton } from '../src/components';
import { SortOption, useFilterStore } from '../src/state/filterStore';

export default function FiltersScreen() {
  const { listingType, highScore, withListings, sort, setListingType, setSort, toggle, reset } = useFilterStore();
  const sorts: SortOption[] = ['Recommended', 'Highest score', 'Newest'];

  return (
    <AppScreen>
      <AppHeader title="Filters" subtitle="Refine live SocietyFlats results without showing fake inventory." />
      <BottomSheetFoundation title="Refine results">
        <Text style={{ fontWeight: '900' }}>Listing type</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['Any', 'Rent', 'Sale'] as const).map((label) => <FilterChip key={label} label={label} selected={listingType === label} onPress={() => setListingType(label)} />)}
        </View>
        <Text style={{ fontWeight: '900' }}>Society filters</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <FilterChip label="With homes" selected={withListings} onPress={() => toggle('withListings')} />
          <FilterChip label="High score" selected={highScore} onPress={() => toggle('highScore')} />
        </View>
        <Text style={{ fontWeight: '900' }}>Sort</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {sorts.map((label) => <FilterChip key={label} label={label} selected={sort === label} onPress={() => setSort(label)} />)}
        </View>
        <PrimaryButton onPress={() => router.back()}>Apply filters</PrimaryButton>
        <SecondaryButton onPress={reset}>Reset</SecondaryButton>
      </BottomSheetFoundation>
    </AppScreen>
  );
}
