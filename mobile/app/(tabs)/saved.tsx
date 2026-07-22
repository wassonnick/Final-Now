import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { propertyService } from '../../src/api/services/properties';
import { SavedSearchRecord, savedSearchService } from '../../src/api/services/savedSearches';
import { societyService } from '../../src/api/services/societies';
import { AppHeader, AppScreen, EmptyState, LoadingSkeleton, PrimaryButton, PropertyCard, SecondaryButton, SectionHeader, SocietyCard } from '../../src/components';
import { useAuthStore } from '../../src/state/authStore';
import { useSavedStore } from '../../src/state/savedStore';
import { colors, radius, shadows, spacing, typography } from '../../src/theme/tokens';
import { Property, Society } from '../../src/types/domain';

type HydratedSociety = { key: string; data: Society | null };
type HydratedProperty = { key: string; data: Property | null };

export default function SavedScreen() {
  const signedIn = useAuthStore((state) => state.status === 'signed_in');
  const savedSocieties = useSavedStore((state) => state.societies);
  const savedProperties = useSavedStore((state) => state.properties);
  const localSavedSearches = useSavedStore((state) => state.searches);
  const removeSavedItem = useSavedStore((state) => state.remove);
  const removeLocalSearch = useSavedStore((state) => state.removeSearch);
  const queryClient = useQueryClient();
  const hydratedSocieties = useQuery({
    queryKey: ['saved-societies-hydrated', savedSocieties],
    queryFn: () => hydrateSocieties(savedSocieties),
    enabled: savedSocieties.length > 0,
  });
  const hydratedProperties = useQuery({
    queryKey: ['saved-properties-hydrated', savedProperties],
    queryFn: () => hydrateProperties(savedProperties),
    enabled: savedProperties.length > 0,
  });
  const serverSavedSearches = useQuery({
    queryKey: ['saved-searches'],
    queryFn: savedSearchService.list,
    enabled: signedIn,
  });
  const updateSearch = useMutation({
    mutationFn: ({ id, alert_enabled }: { id: number; alert_enabled: boolean }) => savedSearchService.update(id, { alert_enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });
  const deleteSearch = useMutation({
    mutationFn: savedSearchService.destroy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });

  if (!signedIn) {
    return (
      <AppScreen>
        <AppHeader title="Saved" subtitle="Sign in to keep societies, homes and searches together." />
        <EmptyState
          title="Save your shortlist"
          body="Saved items stay on this phone. Sign in to sync saved searches and turn account alerts on."
          action={<Link href="/login" asChild><PrimaryButton>Sign in</PrimaryButton></Link>}
        />
        {localSavedSearches.length ? (
          <>
            <SectionHeader title="Searches saved on this phone" />
            <View style={styles.cardList}>
              {localSavedSearches.map((search) => <LocalSearchCard key={search} search={search} onRemove={() => void removeLocalSearch(search)} />)}
            </View>
          </>
        ) : null}
        <SavedSocietySection
          savedSocieties={savedSocieties}
          hydratedSocieties={hydratedSocieties.data}
          loading={hydratedSocieties.isLoading}
          onRemove={(id) => void removeSavedItem('societies', id)}
        />
        <SavedPropertySection
          savedProperties={savedProperties}
          hydratedProperties={hydratedProperties.data}
          loading={hydratedProperties.isLoading}
          onRemove={(id) => void removeSavedItem('properties', id)}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader title="Saved" subtitle="Your private SocietyFlats shortlist and account alerts." />

      <View style={styles.stats}>
        <Stat label="Societies" value={savedSocieties.length} />
        <Stat label="Homes" value={savedProperties.length} />
        <Stat label="Search alerts" value={serverSavedSearches.data?.length ?? localSavedSearches.length} />
      </View>

      <SectionHeader title="Saved search alerts" />
      {serverSavedSearches.isLoading ? (
        <View style={styles.card}><Text style={styles.body}>Loading saved searches…</Text></View>
      ) : serverSavedSearches.data?.length ? (
        <View style={styles.cardList}>
          {serverSavedSearches.data.map((search) => (
            <SavedSearchCard
              key={search.id}
              search={search}
              onToggle={() => updateSearch.mutate({ id: search.id, alert_enabled: !search.alert_enabled })}
              onDelete={() => deleteSearch.mutate(search.id)}
              busy={updateSearch.isPending || deleteSearch.isPending}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          title="No saved search alerts yet"
          body="Search for a sector, society or builder and tap Save this search to start receiving matches."
          action={<Link href="/search" asChild><PrimaryButton>Create saved search</PrimaryButton></Link>}
        />
      )}

      <SectionHeader title="Saved societies" />
      <SavedSocietySection
        savedSocieties={savedSocieties}
        hydratedSocieties={hydratedSocieties.data}
        loading={hydratedSocieties.isLoading}
        onRemove={(id) => void removeSavedItem('societies', id)}
      />

      <SectionHeader title="Saved properties" />
      <SavedPropertySection
        savedProperties={savedProperties}
        hydratedProperties={hydratedProperties.data}
        loading={hydratedProperties.isLoading}
        onRemove={(id) => void removeSavedItem('properties', id)}
      />

      {serverSavedSearches.error ? <EmptyState title="Could not load account searches" body="Local saved searches are still safe on this phone. Try again after signing in." /> : null}
    </AppScreen>
  );
}

async function hydrateSocieties(items: string[]): Promise<HydratedSociety[]> {
  const results = await Promise.allSettled(items.map((item) => societyService.show(item)));
  return items.map((key, index) => ({
    key,
    data: results[index]?.status === 'fulfilled' ? results[index].value : null,
  }));
}

async function hydrateProperties(items: string[]): Promise<HydratedProperty[]> {
  const results = await Promise.allSettled(items.map((item) => propertyService.show(item)));
  return items.map((key, index) => ({
    key,
    data: results[index]?.status === 'fulfilled' ? results[index].value : null,
  }));
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SavedSearchCard({ search, onToggle, onDelete, busy }: { search: SavedSearchRecord; onToggle: () => void; onDelete: () => void; busy?: boolean }) {
  const query = typeof search.filters?.q === 'string' ? search.filters.q : search.name;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.kicker}>{search.alert_enabled ? 'Alerts on' : 'Paused'}</Text>
          <Text style={styles.title}>{search.name}</Text>
          <Text style={styles.body}>{search.alert_frequency || 'daily'} matches · {search.alert_channel || 'whatsapp'} delivery</Text>
        </View>
        <Link href={{ pathname: '/search', params: { q: query } }} asChild>
          <Pressable style={styles.openButton}><Text style={styles.openText}>Open →</Text></Pressable>
        </Link>
      </View>
      <View style={styles.actions}>
        <SecondaryButton disabled={busy} onPress={onToggle}>{search.alert_enabled ? 'Pause alerts' : 'Resume alerts'}</SecondaryButton>
        <SecondaryButton disabled={busy} onPress={onDelete}>Delete</SecondaryButton>
      </View>
    </View>
  );
}

function LocalSearchCard({ search, onRemove }: { search: string; onRemove: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Saved on this phone</Text>
      <Text style={styles.title}>{search}</Text>
      <View style={styles.actions}>
        <Link href={{ pathname: '/search', params: { q: search } }} asChild><PrimaryButton>Open search</PrimaryButton></Link>
        <SecondaryButton onPress={onRemove}>Remove</SecondaryButton>
      </View>
    </View>
  );
}

function SavedSocietySection({ savedSocieties, hydratedSocieties, loading, onRemove }: { savedSocieties: string[]; hydratedSocieties?: HydratedSociety[]; loading?: boolean; onRemove: (id: string) => void }) {
  if (!savedSocieties.length) {
    return <EmptyState title="No saved societies yet" body="Tap Save on a society profile to build your shortlist." />;
  }
  if (loading && !hydratedSocieties) return <LoadingSkeleton />;

  return (
    <View style={styles.cardList}>
      {(hydratedSocieties || savedSocieties.map((key) => ({ key, data: null }))).map((item) => (
        <View key={item.key} style={styles.savedCardWrap}>
          {item.data ? <SocietyCard society={item.data} /> : <SavedFallbackRow item={item.key} prefix="/societies/" label="Society profile unavailable" />}
          <SecondaryButton onPress={() => onRemove(item.key)}>Remove from shortlist</SecondaryButton>
        </View>
      ))}
    </View>
  );
}

function SavedPropertySection({ savedProperties, hydratedProperties, loading, onRemove }: { savedProperties: string[]; hydratedProperties?: HydratedProperty[]; loading?: boolean; onRemove: (id: string) => void }) {
  if (!savedProperties.length) {
    return <EmptyState title="No saved properties yet" body="Verified homes you save will appear here." />;
  }
  if (loading && !hydratedProperties) return <LoadingSkeleton />;

  return (
    <View style={styles.cardList}>
      {(hydratedProperties || savedProperties.map((key) => ({ key, data: null }))).map((item) => (
        <View key={item.key} style={styles.savedCardWrap}>
          {item.data ? <PropertyCard property={item.data} /> : <SavedFallbackRow item={item.key} prefix="/properties/" label="Property profile unavailable" />}
          <SecondaryButton onPress={() => onRemove(item.key)}>Remove from shortlist</SecondaryButton>
        </View>
      ))}
    </View>
  );
}

function SavedFallbackRow({ item, prefix, label }: { item: string; prefix: '/societies/' | '/properties/'; label: string }) {
  return (
    <Link href={`${prefix}${item}` as any} asChild>
      <Pressable style={styles.savedRow}>
        <View style={styles.flex}>
          <Text style={styles.savedText}>{item}</Text>
          <Text style={styles.body}>{label}. Open to retry, or remove it from your shortlist.</Text>
        </View>
        <Text style={styles.openText}>Open →</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.paperElevated, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.md },
  statValue: { color: colors.pine, fontSize: 24, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  cardList: { gap: spacing.sm },
  savedCardWrap: { gap: spacing.sm },
  card: { backgroundColor: colors.paperElevated, borderColor: colors.line, borderRadius: radius.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg, ...shadows.card },
  row: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  flex: { flex: 1 },
  kicker: { color: colors.clay, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  title: { ...typography.heading, fontSize: 22, lineHeight: 28 },
  body: { ...typography.muted, fontSize: 15, lineHeight: 22, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  openButton: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  openText: { color: colors.pine, fontWeight: '900' },
  savedRow: {
    alignItems: 'center',
    backgroundColor: colors.paperElevated,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  savedText: { ...typography.body, flex: 1, fontWeight: '800' },
});
