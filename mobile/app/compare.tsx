import React from 'react';
import { AppHeader, AppScreen, EmptyState, PrimaryButton } from '../src/components';

export default function CompareScreen() {
  return (
    <AppScreen>
      <AppHeader title="Compare societies" subtitle="Compare location, amenities, scores and available homes." />
      <EmptyState title="Compare foundation ready" body="SF-APP-2 can connect this to /compare/intelligence and public compare pages." action={<PrimaryButton>Add society</PrimaryButton>} />
    </AppScreen>
  );
}
