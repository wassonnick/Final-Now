import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ownerListingService, OwnerListingPayload } from '../src/api/services/ownerListings';
import { AppHeader, AppScreen, AppTextInput, EmptyState, FilterChip, PrimaryButton, SecondaryButton } from '../src/components';
import { colors, radius, spacing, typography } from '../src/theme/tokens';

const initialForm: OwnerListingPayload = {
  name: '',
  phone: '',
  purpose: 'rent',
  listing_type: 'apartment',
  city: 'Gurugram',
  society_name: '',
  sector: '',
  locality: '',
  bhk: '',
  floor: '',
  furnishing: '',
  availability: '',
  expected_price: '',
  details: '',
};

export default function ListPropertyScreen() {
  const [form, setForm] = useState<OwnerListingPayload>(initialForm);
  const [images, setImages] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: ownerListingService.submit });
  const uploadMutation = useMutation({ mutationFn: ownerListingService.uploadImage });

  function update<K extends keyof OwnerListingPayload>(key: K, value: OwnerListingPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    const amount = Number(String(form.expected_price || '').replace(/[^0-9]/g, ''));
    mutation.mutate({
      ...form,
      rent_amount: form.purpose === 'rent' && amount > 0 ? amount : undefined,
      sale_price: form.purpose === 'sale' && amount > 0 ? amount : undefined,
      images,
    });
  }

  async function pickImages() {
    setImageError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setImageError('Photo library permission is needed to attach listing photos.');
      return;
    }

    const remainingSlots = Math.max(0, 8 - images.length);
    if (remainingSlots === 0) {
      setImageError('You can attach up to 8 photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.82,
    });

    if (result.canceled) return;

    const uploaded: string[] = [];
    for (const asset of result.assets.slice(0, remainingSlots)) {
      try {
        const response = await uploadMutation.mutateAsync(asset);
        if (response.data?.url) uploaded.push(response.data.url);
      } catch {
        setImageError('Some photos could not be uploaded. Please try again.');
      }
    }

    if (uploaded.length) {
      setImages((current) => [...current, ...uploaded].slice(0, 8));
    }
  }

  return (
    <AppScreen keyboard>
      <AppHeader title="List your property" subtitle="Submit a text-first owner listing. Photos can be added later; nothing goes live without SocietyFlats review." />
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Review-first inventory</Text>
        <Text style={styles.noticeBody}>Your listing is saved as owner-submitted, routed to admin, and kept private until verified and published.</Text>
      </View>
      <View style={styles.form}>
        <Text style={styles.label}>Purpose</Text>
        <View style={styles.wrap}>
          <FilterChip label="Rent out" selected={form.purpose === 'rent'} onPress={() => update('purpose', 'rent')} />
          <FilterChip label="Sell" selected={form.purpose === 'sale'} onPress={() => update('purpose', 'sale')} />
        </View>
        <Text style={styles.label}>Home type</Text>
        <View style={styles.wrap}>
          <FilterChip label="Apartment" selected={form.listing_type === 'apartment'} onPress={() => update('listing_type', 'apartment')} />
          <FilterChip label="Builder floor" selected={form.listing_type === 'builder_floor'} onPress={() => update('listing_type', 'builder_floor')} />
        </View>
        <AppTextInput value={form.name} onChangeText={(value) => update('name', value)} placeholder="Your name" />
        <AppTextInput value={form.phone} onChangeText={(value) => update('phone', value)} placeholder="Mobile number" keyboardType="phone-pad" />
        <AppTextInput value={form.society_name} onChangeText={(value) => update('society_name', value)} placeholder="Society name, if applicable" />
        <View style={styles.twoCol}>
          <AppTextInput value={form.sector} onChangeText={(value) => update('sector', value)} placeholder="Sector" style={styles.colInput} />
          <AppTextInput value={form.locality} onChangeText={(value) => update('locality', value)} placeholder="Locality" style={styles.colInput} />
        </View>
        <View style={styles.twoCol}>
          <AppTextInput value={form.bhk} onChangeText={(value) => update('bhk', value)} placeholder="BHK" style={styles.colInput} keyboardType="number-pad" />
          <AppTextInput value={form.floor} onChangeText={(value) => update('floor', value)} placeholder="Floor" style={styles.colInput} />
        </View>
        <AppTextInput value={form.expected_price} onChangeText={(value) => update('expected_price', value)} placeholder={form.purpose === 'rent' ? 'Expected monthly rent' : 'Expected sale price'} keyboardType="number-pad" />
        <AppTextInput value={form.furnishing} onChangeText={(value) => update('furnishing', value)} placeholder="Furnishing" />
        <AppTextInput value={form.availability} onChangeText={(value) => update('availability', value)} placeholder="Availability" />
        <AppTextInput value={form.details} onChangeText={(value) => update('details', value)} placeholder="Any notes for SocietyFlats review" multiline />
        <View style={styles.mediaBox}>
          <Text style={styles.label}>Photos optional</Text>
          <Text style={styles.helper}>Attach real owner photos if available. If skipped, SocietyFlats can still review the text draft.</Text>
          {images.length ? (
            <View style={styles.thumbnails}>
              {images.map((uri) => <Image key={uri} source={{ uri }} style={styles.thumbnail} contentFit="cover" />)}
            </View>
          ) : null}
          <SecondaryButton onPress={pickImages} disabled={uploadMutation.isPending || images.length >= 8}>
            {uploadMutation.isPending ? 'Uploading…' : images.length ? `Add more photos (${images.length}/8)` : 'Add photos'}
          </SecondaryButton>
          {imageError ? <Text style={styles.errorText}>{imageError}</Text> : null}
        </View>
        <PrimaryButton onPress={submit} disabled={mutation.isPending}>{mutation.isPending ? 'Submitting…' : 'Submit for review'}</PrimaryButton>
      </View>
      {mutation.data ? (
        <EmptyState
          title="Listing submitted"
          body={mutation.data.message || 'SocietyFlats will review before this appears publicly.'}
          action={<Link href="/my-listings" asChild><SecondaryButton>Track my listings</SecondaryButton></Link>}
        />
      ) : null}
      {mutation.error ? <EmptyState title="Could not submit" body="Please add your name, phone, price and at least a society, sector or locality." /> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: colors.pine, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.xs },
  noticeTitle: { ...typography.heading, color: colors.paper, fontSize: 24 },
  noticeBody: { color: colors.pineSoft, fontSize: 15, lineHeight: 22 },
  form: { backgroundColor: colors.paperElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.md },
  label: { ...typography.body, fontWeight: '900' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  colInput: { flex: 1 },
  mediaBox: { backgroundColor: colors.paperMuted, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  helper: { ...typography.muted, fontSize: 14, lineHeight: 20 },
  thumbnails: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbnail: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.line },
  errorText: { color: colors.danger, fontWeight: '800' },
});
