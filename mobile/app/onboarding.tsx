import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen, PrimaryButton, SecondaryButton } from '../src/components';
import { analytics } from '../src/lib/analytics';
import { useOnboardingStore } from '../src/state/onboardingStore';
import { colors, radius, spacing, typography } from '../src/theme/tokens';

const slides = [
  ['Find the right society before choosing the home.', 'Start with commute, safety, amenities and resident-fit signals.'],
  ['Compare location, amenities and available flats.', 'See society profiles and verified homes together, not in silos.'],
  ['Get alerts when matching properties become available.', 'Save searches and let SocietyFlats help with rental or resale options.'],
] as const;

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const complete = useOnboardingStore((state) => state.complete);

  async function finish() {
    await complete();
    analytics.track('onboarding_complete');
    router.replace('/(tabs)');
  }

  const [title, body] = slides[index];

  return (
    <AppScreen scroll={false}>
      <View style={styles.wrap}>
        <Pressable onPress={finish} accessibilityRole="button" style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
        <View style={styles.brandMark}><Text style={styles.brandInitial}>SF</Text></View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <View style={styles.dots}>
          {slides.map((_, dotIndex) => <View key={dotIndex} style={[styles.dot, dotIndex === index && styles.dotActive]} />)}
        </View>
        {index < slides.length - 1 ? (
          <PrimaryButton onPress={() => setIndex((value) => value + 1)}>Next</PrimaryButton>
        ) : (
          <PrimaryButton onPress={finish}>Get Started</PrimaryButton>
        )}
        {index > 0 ? <SecondaryButton onPress={() => setIndex((value) => value - 1)}>Back</SecondaryButton> : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  skip: { position: 'absolute', top: spacing.md, right: spacing.md, minHeight: 44, justifyContent: 'center' },
  skipText: { color: colors.clay, fontWeight: '800' },
  brandMark: { width: 82, height: 82, borderRadius: radius.xl, backgroundColor: colors.pine, alignItems: 'center', justifyContent: 'center' },
  brandInitial: { color: colors.paper, fontWeight: '900', fontSize: 24 },
  title: { ...typography.heading, fontSize: 38, lineHeight: 44 },
  body: { ...typography.muted, fontSize: 18, lineHeight: 28 },
  dots: { flexDirection: 'row', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.line },
  dotActive: { width: 28, backgroundColor: colors.pine },
});
