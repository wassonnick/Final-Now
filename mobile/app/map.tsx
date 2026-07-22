import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { propertyService } from '../src/api/services/properties';
import { societyService } from '../src/api/services/societies';
import { AppHeader, AppScreen, EmptyState, LoadingSkeleton, PrimaryButton, SearchBar, SecondaryButton, SectionHeader } from '../src/components';
import { analytics } from '../src/lib/analytics';
import { formatLocation, formatPrice } from '../src/lib/format';
import { colors, iconSize, radius, shadows, spacing, typography } from '../src/theme/tokens';
import { Property, Society } from '../src/types/domain';

type AreaCluster = {
  key: string;
  label: string;
  societies: Society[];
  properties: Property[];
  averageScore: number | null;
};

export default function MapSearchScreen() {
  const [query, setQuery] = useState('');
  const societies = useQuery({ queryKey: ['map-societies', query], queryFn: () => societyService.list({ q: query, per_page: 40 }) });
  const properties = useQuery({ queryKey: ['map-properties', query], queryFn: () => propertyService.list({ q: query, per_page: 40 }) });
  const clusters = useMemo(() => buildClusters(societies.data ?? [], properties.data ?? []), [properties.data, societies.data]);
  const highlighted = clusters[0];

  function openArea(area: string) {
    analytics.track('map_area_opened', { area });
    router.push({ pathname: '/search', params: { q: area } });
  }

  return (
    <AppScreen keyboard>
      <AppHeader title="Map search" subtitle="A mobile-first area view for Gurgaon societies and verified homes." />

      <View style={styles.mapPanel}>
        <View style={styles.mapBackground}>
          {clusters.slice(0, 6).map((cluster, index) => (
            <Pressable
              key={cluster.key}
              onPress={() => openArea(cluster.label)}
              style={[styles.pin, pinPositions[index] ?? pinPositions[0]]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${cluster.label}`}
            >
              <Text style={styles.pinCount}>{cluster.societies.length + cluster.properties.length}</Text>
            </Pressable>
          ))}
          {!clusters.length ? (
            <View style={styles.emptyMapPin}>
              <Ionicons name="map" size={iconSize.xl} color={colors.pine} />
              <Text style={styles.emptyMapText}>Search Gurgaon areas</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.mapSummary}>
          <Text style={styles.kicker}>Live discovery layer</Text>
          <Text style={styles.mapTitle}>{highlighted ? highlighted.label : 'Gurgaon'}</Text>
          <Text style={styles.body}>
            {highlighted
              ? `${highlighted.societies.length} societies · ${highlighted.properties.length} homes · ${highlighted.averageScore ? `${highlighted.averageScore.toFixed(1)} avg score` : 'score review pending'}`
              : 'Search by sector, society or builder to see area clusters.'}
          </Text>
        </View>
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search Sector 65, DLF, Tulip…" />

      <View style={styles.actions}>
        <Link href="/explore" asChild><SecondaryButton>Open list view</SecondaryButton></Link>
        <Link href="/compare" asChild><PrimaryButton>Compare shortlist</PrimaryButton></Link>
      </View>

      <SectionHeader title="Area clusters" />
      {societies.isLoading || properties.isLoading ? <LoadingSkeleton /> : societies.error || properties.error ? (
        <EmptyState title="Could not load map data" body="Live society or property data did not respond. Try again shortly." />
      ) : clusters.length ? (
        <View style={styles.clusterStack}>
          {clusters.map((cluster) => <AreaCard key={cluster.key} cluster={cluster} onOpen={() => openArea(cluster.label)} />)}
        </View>
      ) : (
        <EmptyState title="No area matches yet" body="Try a Gurgaon sector, society name, or builder." />
      )}
    </AppScreen>
  );
}

function AreaCard({ cluster, onOpen }: { cluster: AreaCluster; onOpen: () => void }) {
  const topSocieties = cluster.societies.slice(0, 3).map((society) => society.name).join(', ');
  const topProperty = cluster.properties[0];

  return (
    <Pressable style={styles.areaCard} onPress={onOpen} accessibilityRole="button">
      <View style={styles.areaHeader}>
        <View style={styles.areaIcon}><Ionicons name="location" size={iconSize.md} color={colors.pine} /></View>
        <View style={styles.flex}>
          <Text style={styles.areaTitle}>{cluster.label}</Text>
          <Text style={styles.body}>{cluster.societies.length} societies · {cluster.properties.length} verified homes</Text>
        </View>
        <Text style={styles.openText}>Open →</Text>
      </View>

      <View style={styles.metrics}>
        <Metric label="Avg score" value={cluster.averageScore ? cluster.averageScore.toFixed(1) : 'Pending'} />
        <Metric label="Top society" value={topSocieties || 'Review pending'} />
        <Metric label="Homes from" value={topProperty ? formatPrice(topProperty.price) : 'Ask availability'} />
      </View>
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function buildClusters(societies: Society[], properties: Property[]): AreaCluster[] {
  const map = new Map<string, AreaCluster>();

  for (const society of societies) {
    const label = areaLabel([society.sector, society.locality, society.city]);
    const cluster = ensureCluster(map, label);
    cluster.societies.push(society);
  }

  for (const property of properties) {
    const label = areaLabel([property.societyName, property.societySlug]) || 'Gurgaon';
    const societyMatch = societies.find((society) => property.societySlug && society.slug === property.societySlug);
    const clusterLabel = societyMatch ? areaLabel([societyMatch.sector, societyMatch.locality, societyMatch.city]) : label;
    const cluster = ensureCluster(map, clusterLabel);
    cluster.properties.push(property);
  }

  return Array.from(map.values())
    .map((cluster) => ({
      ...cluster,
      averageScore: averageScore(cluster.societies),
    }))
    .sort((a, b) => (b.societies.length + b.properties.length) - (a.societies.length + a.properties.length));
}

function ensureCluster(map: Map<string, AreaCluster>, label: string): AreaCluster {
  const key = label.toLowerCase();
  if (!map.has(key)) {
    map.set(key, { key, label, societies: [], properties: [], averageScore: null });
  }
  return map.get(key)!;
}

function areaLabel(parts: (string | number | null | undefined)[]) {
  return formatLocation(parts).split(' · ').slice(0, 2).join(' · ') || 'Gurgaon';
}

function averageScore(societies: Society[]) {
  const scores = societies.map((society) => Number(society.score ?? 0)).filter((score) => Number.isFinite(score) && score > 0);
  if (!scores.length) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

const pinPositions = [
  { left: '12%', top: '20%' },
  { left: '58%', top: '16%' },
  { left: '34%', top: '42%' },
  { left: '70%', top: '52%' },
  { left: '18%', top: '64%' },
  { left: '48%', top: '72%' },
] as const;

const styles = StyleSheet.create({
  mapPanel: { backgroundColor: colors.paperElevated, borderColor: colors.line, borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden', ...shadows.card },
  mapBackground: { backgroundColor: colors.pineSoft, height: 260, position: 'relative' },
  pin: { alignItems: 'center', backgroundColor: colors.pine, borderColor: colors.paperElevated, borderRadius: radius.pill, borderWidth: 3, height: 54, justifyContent: 'center', position: 'absolute', width: 54, ...shadows.card },
  pinCount: { color: colors.paper, fontSize: 17, fontWeight: '900' },
  emptyMapPin: { alignItems: 'center', gap: spacing.sm, justifyContent: 'center', minHeight: 260 },
  emptyMapText: { color: colors.pine, fontWeight: '900' },
  mapSummary: { gap: spacing.xs, padding: spacing.lg },
  kicker: { color: colors.clay, fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  mapTitle: { ...typography.heading, fontSize: 28, lineHeight: 34 },
  body: { ...typography.muted, fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  clusterStack: { gap: spacing.sm },
  areaCard: { backgroundColor: colors.paperElevated, borderColor: colors.line, borderRadius: radius.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg, ...shadows.card },
  areaHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  areaIcon: { alignItems: 'center', backgroundColor: colors.claySoft, borderRadius: radius.lg, height: 44, justifyContent: 'center', width: 44 },
  areaTitle: { ...typography.heading, fontSize: 22, lineHeight: 28 },
  openText: { color: colors.pine, fontWeight: '900' },
  metrics: { gap: spacing.xs },
  metric: { backgroundColor: colors.paperMuted, borderRadius: radius.md, padding: spacing.sm },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  metricValue: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: spacing.xxs },
  flex: { flex: 1 },
});
