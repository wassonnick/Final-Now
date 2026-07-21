import React from 'react';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { AppHeader, AppScreen, EmptyState, SectionHeader } from '../src/components';
import { useSavedStore } from '../src/state/savedStore';

export default function NotificationsScreen() {
  const savedSearches = useSavedStore((state) => state.searches);
  return (
    <AppScreen>
      <AppHeader title="Notifications" subtitle="Alerts for matching homes and saved searches." />
      <SectionHeader title="Saved-search alerts" />
      {savedSearches.length ? (
        <View>
          {savedSearches.map((search) => (
            <Link key={search} href={{ pathname: '/search', params: { q: search } }}>
              <Text style={{ paddingVertical: 12, fontWeight: '800' }}>{search}</Text>
            </Link>
          ))}
        </View>
      ) : <EmptyState title="No saved-search alerts yet" body="Save a search to keep it ready here. Push alerts can be enabled in a later native release." />}
    </AppScreen>
  );
}
