import { useQuery } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { societyService } from '../src/api/services/societies';
import {
  AppHeader,
  AppScreen,
  EmptyState,
  LoadingSkeleton,
  PrimaryButton,
  SearchBar,
  SecondaryButton,
  SectionHeader,
  ScoreBadge,
} from '../src/components';
import { analytics } from '../src/lib/analytics';
import { formatLocation } from '../src/lib/format';
import { useSavedStore } from '../src/state/savedStore';
import { colors, radius, shadows, spacing, typography } from '../src/theme/tokens';
import { Society } from '../src/types/domain';

const maxCompareItems = 3;

export default function CompareScreen() {
  const savedSocietySlugs = useSavedStore((state) => state.societies);
  const [query, setQuery] = useState('');
  const [manualSlugs, setManualSlugs] = useState<string[]>([]);
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>([]);

  const savedHydration = useQuery({
    queryKey: ['compare-saved-societies', savedSocietySlugs],
    queryFn: () => hydrateSavedSocieties(savedSocietySlugs),
    enabled: savedSocietySlugs.length > 0,
  });
  const searchResults = useQuery({
    queryKey: ['compare-society-search', query],
    queryFn: () => societyService.list({ q: query, per_page: 12 }),
    enabled: query.trim().length >= 2,
  });
  const manualHydration = useQuery({
    queryKey: ['compare-manual-societies', manualSlugs],
    queryFn: () => hydrateSavedSocieties(manualSlugs),
    enabled: manualSlugs.length > 0,
  });

  const selectedSocieties = useMemo(() => {
    const map = new Map<string, Society>();
    for (const society of [...(savedHydration.data ?? []), ...(manualHydration.data ?? [])]) {
      if (society?.slug && !hiddenSlugs.includes(society.slug) && !map.has(society.slug)) map.set(society.slug, society);
    }
    return Array.from(map.values()).slice(0, maxCompareItems);
  }, [hiddenSlugs, manualHydration.data, savedHydration.data]);
  const selectedSlugs = selectedSocieties.map((society) => society.slug);
  const availableResults = (searchResults.data ?? []).filter((society) => !selectedSlugs.includes(society.slug)).slice(0, 6);

  function addSociety(society: Society) {
    if (!society.slug || selectedSlugs.includes(society.slug) || selectedSlugs.length >= maxCompareItems) return;
    setHiddenSlugs((current) => current.filter((slug) => slug !== society.slug));
    setManualSlugs((current) => [society.slug, ...current.filter((slug) => slug !== society.slug)].slice(0, maxCompareItems));
    analytics.track('compare_society_added', { slug: society.slug, surface: 'mobile_compare' });
  }

  function removeSociety(slug: string) {
    setManualSlugs((current) => current.filter((item) => item !== slug));
    setHiddenSlugs((current) => current.includes(slug) ? current : [slug, ...current]);
  }

  function askAdvisor() {
    const names = selectedSocieties.map((society) => society.name).join(', ');
    analytics.track('compare_advisor_started', { count: selectedSocieties.length });
    router.push({ pathname: '/advisor', params: { q: `Help me choose between ${names} for a Gurgaon home search.` } });
  }

  return (
    <AppScreen keyboard>
      <AppHeader title="Compare societies" subtitle="Put up to three shortlisted societies side by side before you call, visit or negotiate." />

      <View style={styles.heroPanel}>
        <Text style={styles.kicker}>Society-first decision</Text>
        <Text style={styles.heroTitle}>Compare location fit, score, builder context and available homes in one view.</Text>
        <Text style={styles.body}>Saved societies are loaded automatically. Add another society below when you want a sharper comparison.</Text>
      </View>

      <SectionHeader title="Your comparison" />
      {savedHydration.isLoading || manualHydration.isLoading ? <LoadingSkeleton /> : null}
      {selectedSocieties.length ? (
        <>
          <View style={styles.compareGrid}>
            {selectedSocieties.map((society) => (
              <CompareCard key={society.slug} society={society} onRemove={() => removeSociety(society.slug)} />
            ))}
          </View>
          <View style={styles.actions}>
            <PrimaryButton disabled={selectedSocieties.length < 2} onPress={askAdvisor}>Ask AI to compare</PrimaryButton>
            <Link href="/saved" asChild><SecondaryButton>Open saved</SecondaryButton></Link>
          </View>
        </>
      ) : (
        <EmptyState
          title="No societies in comparison yet"
          body="Save societies from Explore, or search below and add up to three."
          action={<Link href="/explore" asChild><PrimaryButton>Explore societies</PrimaryButton></Link>}
        />
      )}

      <SectionHeader title="Add another society" />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search by society, sector or builder" />
      {query.trim().length < 2 ? (
        <View style={styles.helperCard}><Text style={styles.body}>Type at least two characters to search live published society profiles.</Text></View>
      ) : searchResults.isLoading ? (
        <LoadingSkeleton />
      ) : availableResults.length ? (
        <View style={styles.results}>
          {availableResults.map((society) => (
            <Pressable
              key={society.slug}
              onPress={() => addSociety(society)}
              disabled={selectedSlugs.length >= maxCompareItems}
              style={[styles.resultRow, selectedSlugs.length >= maxCompareItems && styles.disabled]}
              accessibilityRole="button"
            >
              <View style={styles.flex}>
                <Text style={styles.resultTitle}>{society.name}</Text>
                <Text style={styles.muted}>{formatLocation([society.builder, society.sector, society.city]) || 'Published society profile'}</Text>
              </View>
              <Text style={styles.addText}>{selectedSlugs.length >= maxCompareItems ? 'Limit reached' : 'Add →'}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState title="No matching societies" body="Try a society name, builder or Gurgaon sector." />
      )}
    </AppScreen>
  );
}

async function hydrateSavedSocieties(slugs: string[]): Promise<Society[]> {
  const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));
  const results = await Promise.allSettled(uniqueSlugs.map((slug) => societyService.show(slug)));
  return results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
}

function CompareCard({ society, onRemove }: { society: Society; onRemove: () => void }) {
  const amenities = (society.amenities ?? []).slice(0, 5);

  return (
    <View style={styles.compareCard}>
      <View style={styles.cardTop}>
        <Text style={styles.kicker}>Published profile</Text>
        <ScoreBadge score={society.score} />
      </View>
      <Text style={styles.cardTitle}>{society.name}</Text>
      <Text style={styles.muted}>{formatLocation([society.sector, society.locality, society.city]) || 'Gurgaon'}</Text>
      <View style={styles.factRows}>
        <Fact label="Builder" value={society.builder || 'Review pending'} />
        <Fact label="Homes linked" value={society.propertiesCount || 'Ask availability'} />
        <Fact label="Slug" value={society.slug} />
      </View>
      {amenities.length ? (
        <View style={styles.amenities}>
          {amenities.map((amenity) => <Text key={amenity} style={styles.amenity}>{amenity}</Text>)}
        </View>
      ) : <Text style={styles.muted}>Amenity review pending</Text>}
      <View style={styles.cardActions}>
        <Link href={`/societies/${society.slug}`} asChild><SecondaryButton>Open profile</SecondaryButton></Link>
        <SecondaryButton onPress={onRemove}>Remove</SecondaryButton>
      </View>
    </View>
  );
}

function Fact({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroPanel: { backgroundColor: colors.pine, borderRadius: radius.xl, gap: spacing.sm, padding: spacing.lg, ...shadows.card },
  kicker: { color: colors.clay, fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  heroTitle: { ...typography.heading, color: colors.paper, fontSize: 27, lineHeight: 34 },
  body: { ...typography.muted, fontSize: 15, lineHeight: 22 },
  compareGrid: { gap: spacing.md },
  compareCard: { backgroundColor: colors.paperElevated, borderColor: colors.line, borderRadius: radius.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg, ...shadows.card },
  cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { ...typography.heading, fontSize: 25, lineHeight: 31 },
  muted: { ...typography.muted, fontSize: 14, lineHeight: 21 },
  factRows: { gap: spacing.xs },
  fact: { backgroundColor: colors.paperMuted, borderRadius: radius.md, padding: spacing.sm },
  factLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  factValue: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: spacing.xxs },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  amenity: { backgroundColor: colors.pineSoft, borderRadius: radius.pill, color: colors.pine, fontSize: 12, fontWeight: '800', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  helperCard: { backgroundColor: colors.paperElevated, borderColor: colors.line, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  results: { gap: spacing.sm },
  resultRow: { alignItems: 'center', backgroundColor: colors.paperElevated, borderColor: colors.line, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', padding: spacing.md },
  resultTitle: { ...typography.body, fontSize: 16, fontWeight: '900' },
  addText: { color: colors.pine, fontWeight: '900' },
  flex: { flex: 1 },
  disabled: { opacity: 0.45 },
});
