import React from 'react';
import { AppHeader, AppScreen, EmptyState, PrimaryButton } from '../src/components';
import { analytics } from '../src/lib/analytics';

export default function ListPropertyScreen() {
  return (
    <AppScreen>
      <AppHeader title="List your property" subtitle="Owner listing route foundation." />
      <EmptyState title="Simple listing flow coming next" body="The web API has /listings and /listings/images. Mobile will use it after image and OTP UX are finalized." action={<PrimaryButton onPress={() => analytics.track('list_property_started')}>Start draft</PrimaryButton>} />
    </AppScreen>
  );
}
