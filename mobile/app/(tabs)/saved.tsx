import { Link } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { AppHeader, AppScreen, EmptyState, PrimaryButton, SectionHeader } from '../../src/components';
import { useAuthStore } from '../../src/state/authStore';
import { useSavedStore } from '../../src/state/savedStore';

export default function SavedScreen() {
  const signedIn = useAuthStore((state) => state.status === 'signed_in');
  const savedSocieties = useSavedStore((state) => state.societies);
  const savedProperties = useSavedStore((state) => state.properties);
  const savedSearches = useSavedStore((state) => state.searches);
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
      {savedSocieties.length ? <SavedList items={savedSocieties} prefix="/societies/" /> : <EmptyState title="No saved societies yet" />}
      <SectionHeader title="Saved properties" />
      {savedProperties.length ? <SavedList items={savedProperties} prefix="/properties/" /> : <EmptyState title="No saved properties yet" />}
      <SectionHeader title="Saved searches" />
      {savedSearches.length ? <SavedList items={savedSearches} prefix="/search?q=" /> : <EmptyState title="No saved searches yet" />}
    </AppScreen>
  );
}

function SavedList({ items, prefix }: { items: string[]; prefix: '/societies/' | '/properties/' | '/search?q=' }) {
  return (
    <View>
      {items.map((item) => (
        <Link key={item} href={`${prefix}${item}` as any}>
          <Text style={{ paddingVertical: 12, fontWeight: '800' }}>{item}</Text>
        </Link>
      ))}
    </View>
  );
}
