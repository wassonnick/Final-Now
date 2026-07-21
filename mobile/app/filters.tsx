import React from 'react';
import { AppHeader, AppScreen, BottomSheetFoundation, FilterChip, PrimaryButton } from '../src/components';

export default function FiltersScreen() {
  return (
    <AppScreen>
      <AppHeader title="Filters" subtitle="Filter foundation for commute, budget, verification and amenities." />
      <BottomSheetFoundation title="Refine results">
        {['Rent', 'Buy', 'Verified societies', 'With listings', 'High score', 'Near metro'].map((label) => <FilterChip key={label} label={label} />)}
        <PrimaryButton>Apply filters</PrimaryButton>
      </BottomSheetFoundation>
    </AppScreen>
  );
}
