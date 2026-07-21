import { Link } from 'expo-router';
import React from 'react';
import { AppHeader, AppScreen, EmptyState, PrimaryButton, SectionHeader } from '../../src/components';
import { useAuthStore } from '../../src/state/authStore';

export default function SavedScreen() {
  const signedIn = useAuthStore((state) => state.status === 'signed_in');
  if (!signedIn) {
    return (
      <AppScreen>
        <AppHeader title="Saved" subtitle="Sign in to keep societies, homes and searches together." />
        <EmptyState
          title="Save your shortlist"
          body="Use saved societies, saved properties and saved searches when mobile account endpoints are fully wired."
          action={<Link href="/login" asChild><PrimaryButton>Sign in</PrimaryButton></Link>}
        />
      </AppScreen>
    );
  }
  return (
    <AppScreen>
      <AppHeader title="Saved" subtitle="Your private shortlist foundation." />
      <SectionHeader title="Saved societies" />
      <EmptyState title="No saved societies yet" />
      <SectionHeader title="Saved properties" />
      <EmptyState title="No saved properties yet" />
      <SectionHeader title="Saved searches" />
      <EmptyState title="No saved searches yet" />
    </AppScreen>
  );
}
