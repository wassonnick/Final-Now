import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import React, { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, iconSize, radius, shadows, spacing, typography } from '../theme/tokens';
import { Property, Society } from '../types/domain';

type ButtonProps = PropsWithChildren<{ onPress?: () => void; disabled?: boolean; accessibilityLabel?: string }>;

export function AppScreen({ children, scroll = true, keyboard = false }: PropsWithChildren<{ scroll?: boolean; keyboard?: boolean }>) {
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={styles.screenContent}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={styles.flex} enabled={keyboard}>
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.h1}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SearchBar({ value, onChangeText, placeholder = 'Search society, sector or builder', onSubmit }: TextInputProps & { onSubmit?: () => void }) {
  return (
    <View style={styles.searchBar}>
      <Ionicons name="search" size={iconSize.md} color={colors.pine} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        style={styles.searchInput}
        accessibilityLabel={placeholder}
      />
    </View>
  );
}

export function SegmentedControl<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (value: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((item) => (
        <Pressable
          key={item}
          onPress={() => onChange(item)}
          style={[styles.segmentItem, value === item && styles.segmentItemActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: value === item }}
        >
          <Text style={[styles.segmentText, value === item && styles.segmentTextActive]}>{item}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function PrimaryButton({ children, onPress, disabled, accessibilityLabel }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.primaryButton, disabled && styles.disabled]}
    >
      <Text style={styles.primaryButtonText}>{children}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ children, onPress, disabled, accessibilityLabel }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.secondaryButton, disabled && styles.disabled]}
    >
      <Text style={styles.secondaryButtonText}>{children}</Text>
    </Pressable>
  );
}

export function IconButton({ name, onPress, label }: { name: keyof typeof Ionicons.glyphMap; onPress?: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.iconButton}>
      <Ionicons name={name} size={iconSize.md} color={colors.pine} />
    </Pressable>
  );
}

export function VerificationBadge({ label = 'Verified' }: { label?: string }) {
  return (
    <View style={styles.badge}>
      <Ionicons name="shield-checkmark" size={iconSize.sm} color={colors.success} />
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function ScoreBadge({ score }: { score?: string | number | null }) {
  if (!score) return null;
  return (
    <View style={styles.scoreBadge}>
      <Text style={styles.scoreText}>{Number(score).toFixed(1)}</Text>
    </View>
  );
}

export function PriceText({ value }: { value?: string | number | null }) {
  if (!value) return <Text style={styles.mutedText}>Price on request</Text>;
  const amount = Number(value);
  const formatted = amount >= 10000000 ? `₹${(amount / 10000000).toFixed(2)} Cr` : amount >= 100000 ? `₹${(amount / 100000).toFixed(1)} L` : `₹${amount.toLocaleString('en-IN')}`;
  return <Text style={styles.price}>{formatted}</Text>;
}

export function SocietyCard({ society }: { society: Society }) {
  return (
    <Link href={`/societies/${society.slug}`} asChild>
      <Pressable style={styles.card}>
        <View style={styles.photoBlock}>
          {society.imageUrl ? <Image source={{ uri: society.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="business" size={iconSize.xl} color={colors.pine} />}
        </View>
        <View style={styles.cardBody}>
          <View style={styles.rowBetween}>
            <VerificationBadge label="Society checked" />
            <ScoreBadge score={society.score} />
          </View>
          <Text style={styles.cardTitle}>{society.name}</Text>
          <Text style={styles.mutedText}>{[society.sector, society.locality, society.city].filter(Boolean).join(' · ')}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

export function PropertyCard({ property }: { property: Property }) {
  return (
    <Link href={`/properties/${property.slug || property.id}`} asChild>
      <Pressable style={styles.card}>
        <View style={styles.photoBlockSmall}>
          {property.imageUrl ? <Image source={{ uri: property.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="home" size={iconSize.xl} color={colors.pine} />}
        </View>
        <View style={styles.cardBody}>
          <VerificationBadge label="Source reviewed" />
          <Text style={styles.cardTitle}>{property.title}</Text>
          <Text style={styles.mutedText}>{property.societyName || 'SocietyFlats inventory'}</Text>
          <PriceText value={property.price} />
        </View>
      </Pressable>
    </Link>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.stateBox}>
      <Ionicons name="sparkles-outline" size={iconSize.xl} color={colors.clay} />
      <Text style={styles.stateTitle}>{title}</Text>
      {body ? <Text style={styles.subtitle}>{body}</Text> : null}
      {action}
    </View>
  );
}

export function ErrorState({ title = 'Something went wrong', body = 'Please try again.' }: { title?: string; body?: string }) {
  return <EmptyState title={title} body={body} />;
}

export function LoadingSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {[0, 1, 2].map((item) => <View key={item} style={styles.skeleton} />)}
    </View>
  );
}

export function SectionHeader({ title, actionLabel, href }: { title: string; actionLabel?: string; href?: string }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {href && actionLabel ? <Link href={href as any} style={styles.linkText}>{actionLabel}</Link> : null}
    </View>
  );
}

export function BottomSheetFoundation({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.bottomSheet}>
      <View style={styles.sheetHandle} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function FilterChip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]} accessibilityRole="button" accessibilityState={{ selected }}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function AppTextInput(props: TextInputProps) {
  return <TextInput {...props} placeholderTextColor={colors.muted} style={[styles.input, props.style as ViewStyle]} />;
}

export function NetworkStatusBanner({ online = true }: { online?: boolean }) {
  if (online) return null;
  return (
    <View style={styles.networkBanner}>
      <Text style={styles.networkText}>You are offline. Showing saved app state where possible.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.paper },
  screenContent: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { gap: spacing.xs, marginBottom: spacing.xs },
  h1: { ...typography.heading, fontSize: 34, lineHeight: 40 },
  subtitle: { ...typography.muted, fontSize: 16, lineHeight: 24 },
  mutedText: { ...typography.muted, fontSize: 14, lineHeight: 20 },
  searchBar: { minHeight: 54, borderRadius: radius.lg, backgroundColor: colors.paperElevated, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchInput: { flex: 1, fontSize: 16, color: colors.ink },
  segment: { flexDirection: 'row', backgroundColor: colors.pineSoft, padding: spacing.xxs, borderRadius: radius.pill },
  segmentItem: { flex: 1, minHeight: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segmentItemActive: { backgroundColor: colors.pine },
  segmentText: { color: colors.pine, fontWeight: '700' },
  segmentTextActive: { color: colors.white },
  primaryButton: { minHeight: 52, borderRadius: radius.pill, backgroundColor: colors.pine, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  primaryButtonText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  secondaryButton: { minHeight: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paperElevated, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  secondaryButtonText: { color: colors.pine, fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.5 },
  iconButton: { minWidth: 44, minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.paperElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, backgroundColor: colors.pineSoft, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill },
  badgeText: { color: colors.pine, fontWeight: '800', fontSize: 12 },
  scoreBadge: { backgroundColor: colors.claySoft, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  scoreText: { color: colors.warning, fontWeight: '900' },
  price: { color: colors.pine, fontWeight: '900', fontSize: 18 },
  card: { backgroundColor: colors.paperElevated, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, ...shadows.card },
  photoBlock: { height: 160, backgroundColor: colors.pineSoft, alignItems: 'center', justifyContent: 'center' },
  photoBlockSmall: { height: 126, backgroundColor: colors.pineSoft, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: spacing.md, gap: spacing.sm },
  cardTitle: { ...typography.heading, fontSize: 22, lineHeight: 28 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitle: { ...typography.heading, fontSize: 24, lineHeight: 30 },
  linkText: { color: colors.clay, fontWeight: '800' },
  stateBox: { backgroundColor: colors.paperElevated, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, gap: spacing.sm, alignItems: 'flex-start' },
  stateTitle: { ...typography.heading, fontSize: 24, lineHeight: 30 },
  skeletonWrap: { gap: spacing.md },
  skeleton: { height: 120, borderRadius: radius.lg, backgroundColor: colors.paperMuted },
  bottomSheet: { backgroundColor: colors.paperElevated, padding: spacing.lg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, gap: spacing.md },
  sheetHandle: { width: 52, height: 5, borderRadius: radius.pill, backgroundColor: colors.line, alignSelf: 'center' },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paperElevated },
  chipSelected: { backgroundColor: colors.pine, borderColor: colors.pine },
  chipText: { color: colors.pine, fontWeight: '700' },
  chipTextSelected: { color: colors.white },
  input: { minHeight: 52, borderRadius: radius.md, backgroundColor: colors.paperElevated, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.md, color: colors.ink, fontSize: 16 },
  networkBanner: { backgroundColor: colors.warning, padding: spacing.sm },
  networkText: { color: colors.white, fontWeight: '700', textAlign: 'center' },
});
