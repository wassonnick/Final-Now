import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ownerListingService } from '../src/api/services/ownerListings';
import { AppHeader, AppScreen, EmptyState, LoadingSkeleton, PrimaryButton } from '../src/components';
import { formatPrice } from '../src/lib/format';
import { useAuthStore } from '../src/state/authStore';
import { colors, radius, spacing, typography } from '../src/theme/tokens';

export default function MyListingsScreen() {
  const signedIn = useAuthStore((state) => state.status === 'signed_in');
  const listings = useQuery({ queryKey: ['my-listings'], queryFn: ownerListingService.mine, enabled: signedIn });

  if (!signedIn) {
    return (
      <AppScreen>
        <AppHeader title="My listings" subtitle="Track owner-submitted listing drafts and review status." />
        <EmptyState title="Sign in to track listings" body="Use the same phone number you submitted with." action={<Link href="/login" asChild><PrimaryButton>Sign in</PrimaryButton></Link>} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader title="My listings" subtitle="Submitted homes stay private until SocietyFlats verifies and publishes them." />
      {listings.isLoading ? <LoadingSkeleton /> : null}
      {listings.data?.length ? listings.data.map((listing) => (
        <View key={listing.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.kicker}>{listing.purpose === 'rent' ? 'Rent' : 'Sale'}</Text>
            <Text style={styles.status}>{listing.status || 'submitted'}</Text>
          </View>
          <Text style={styles.title}>{[listing.bhk ? `${listing.bhk} BHK` : null, listing.listing_type === 'builder_floor' ? 'Builder floor' : 'Apartment', listing.society_name || listing.sector || listing.locality].filter(Boolean).join(' · ') || 'Owner listing'}</Text>
          <Text style={styles.body}>{[listing.society_name, listing.sector, listing.locality, listing.city].filter(Boolean).join(', ')}</Text>
          <Text style={styles.price}>{formatPrice(listing.rent_amount || listing.sale_price || listing.expected_price)}</Text>
        </View>
      )) : null}
      {!listings.isLoading && !listings.data?.length ? (
        <EmptyState title="No listing drafts yet" body="Submit a rental or resale home and track its review here." action={<Link href="/list-property" asChild><PrimaryButton>List your property</PrimaryButton></Link>} />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.paperElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  kicker: { color: colors.clay, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  status: { color: colors.pine, fontWeight: '900', textTransform: 'capitalize' },
  title: { ...typography.heading, fontSize: 24, lineHeight: 30 },
  body: { ...typography.muted, fontSize: 15, lineHeight: 22 },
  price: { color: colors.pine, fontSize: 18, fontWeight: '900' },
});
