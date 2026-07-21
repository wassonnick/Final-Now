import { useQuery } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, AppScreen, EmptyState, LoadingSkeleton, PrimaryButton, PropertyCard, SearchBar, SectionHeader, SegmentedControl, SocietyCard } from '../../src/components';
import { propertyService } from '../../src/api/services/properties';
import { societyService } from '../../src/api/services/societies';
import { popularSectors } from '../../src/data/mockData';
import { analytics } from '../../src/lib/analytics';
import { colors, radius, spacing, typography } from '../../src/theme/tokens';

type Mode = 'Rent' | 'Buy' | 'Societies';

export default function HomeScreen() {
  const [mode, setMode] = useState<Mode>('Societies');
  const [query, setQuery] = useState('');
  const societies = useQuery({ queryKey: ['home-societies'], queryFn: () => societyService.list({ per_page: 6 }) });
  const properties = useQuery({ queryKey: ['home-properties'], queryFn: () => propertyService.list({ per_page: 4 }) });
  const recommended = societies.data ?? [];
  const listings = properties.data ?? [];

  function submitSearch() {
    analytics.track('search_started', { surface: 'home', mode });
    router.push({ pathname: '/search', params: { q: query, mode } });
  }

  return (
    <AppScreen>
      <AppHeader title="Find your Gurgaon home by society first." subtitle="Verified societies, source-reviewed homes and practical AI help in one clean journey." />
      <View style={styles.locationPill}><Text style={styles.locationText}>Gurgaon</Text><Text style={styles.locationSub}>Change later</Text></View>
      <SegmentedControl options={['Rent', 'Buy', 'Societies']} value={mode} onChange={setMode} />
      <SearchBar value={query} onChangeText={setQuery} onSubmit={submitSearch} />
      <Link href="/advisor" asChild><Pressable style={styles.aiCard}><Text style={styles.aiTitle}>Ask SocietyFlats AI</Text><Text style={styles.aiBody}>Try “family-friendly societies near Sector 65 with good commute”.</Text></Pressable></Link>

      <SectionHeader title="Useful at this stage" />
      <View style={styles.journeyStack}>
        <JourneyLink href="/nri" title="NRI management" body="Remote buy, sell, rent-out and property management support." />
        <JourneyLink href="/rwa" title="RWA portal" body="Claims, announcements, resident questions and grievance context." />
        <JourneyLink href="/referrals" title="Referral partner" body="Refer genuine Gurgaon home needs for admin-reviewed rewards." />
        <JourneyLink href="/explore" title="Builder floors" body="Search sale/rent inventory and society-first location context." />
      </View>

      <SectionHeader title="Recommended societies" href="/explore" actionLabel="Explore" />
      {societies.isLoading ? <LoadingSkeleton /> : recommended.length ? recommended.map((society) => <SocietyCard key={society.id} society={society} />) : <EmptyState title="No published societies loaded" body="Check your connection and try again." />}

      <SectionHeader title="Verified homes" href="/explore" actionLabel="View all" />
      {properties.isLoading ? <LoadingSkeleton /> : listings.length ? listings.map((property) => <PropertyCard key={property.id} property={property} />) : <EmptyState title="No verified homes yet" body="We do not show fake listings. Request current availability and SocietyFlats will help." />}

      <SectionHeader title="Popular sectors" />
      <View style={styles.sectorGrid}>{popularSectors.map((sector) => <Text key={sector} style={styles.sector}>{sector}</Text>)}</View>

      <View style={styles.listBanner}>
        <Text style={styles.bannerTitle}>Have a flat to list?</Text>
        <Text style={styles.bannerBody}>Start with a simple owner listing. SocietyFlats reviews before publishing.</Text>
        <PrimaryButton onPress={() => { analytics.track('list_property_started'); router.push('/list-property'); }}>List your property</PrimaryButton>
      </View>
    </AppScreen>
  );
}

function JourneyLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable style={styles.journeyLink}>
        <View>
          <Text style={styles.journeyTitle}>{title}</Text>
          <Text style={styles.journeyBody}>{body}</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  locationPill: { backgroundColor: colors.paperElevated, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between' },
  locationText: { color: colors.pine, fontWeight: '900' },
  locationSub: { color: colors.muted },
  aiCard: { backgroundColor: colors.pine, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },
  aiTitle: { ...typography.heading, color: colors.paper, fontSize: 26 },
  aiBody: { color: colors.pineSoft, fontSize: 16, lineHeight: 24 },
  sectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sector: { backgroundColor: colors.paperElevated, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.pine, fontWeight: '800' },
  journeyStack: { gap: spacing.sm },
  journeyLink: { backgroundColor: colors.paperElevated, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  journeyTitle: { ...typography.heading, fontSize: 20, lineHeight: 26 },
  journeyBody: { ...typography.muted, fontSize: 14, lineHeight: 20 },
  arrow: { color: colors.clay, fontSize: 24, fontWeight: '900' },
  listBanner: { backgroundColor: colors.claySoft, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },
  bannerTitle: { ...typography.heading, fontSize: 26 },
  bannerBody: { ...typography.muted, fontSize: 16, lineHeight: 24 },
});
