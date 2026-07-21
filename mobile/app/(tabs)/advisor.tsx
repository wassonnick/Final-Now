import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { advisorService } from '../../src/api/services/advisor';
import { AppHeader, AppScreen, AppTextInput, EmptyState, FilterChip, PrimaryButton } from '../../src/components';
import { analytics } from '../../src/lib/analytics';
import { colors, radius, spacing, typography } from '../../src/theme/tokens';

const prompts = ['Best societies near Golf Course Road', 'Family-friendly homes under my budget', 'Compare DLF and M3M societies'];

export default function AdvisorScreen() {
  const [message, setMessage] = useState('');
  const mutation = useMutation({ mutationFn: advisorService.ask });

  function ask() {
    if (!message.trim()) return;
    analytics.track('advisor_started');
    mutation.mutate(message);
  }

  return (
    <AppScreen keyboard>
      <AppHeader title="AI Advisor" subtitle="A premium entry point for society-first recommendations." />
      <View style={styles.card}>
        <Text style={styles.title}>What should we help you decide?</Text>
        <View style={styles.promptWrap}>{prompts.map((prompt) => <FilterChip key={prompt} label={prompt} onPress={() => setMessage(prompt)} />)}</View>
        <AppTextInput value={message} onChangeText={setMessage} placeholder="Ask about societies, commute, rentals or shortlists" multiline />
        <PrimaryButton onPress={ask} disabled={mutation.isPending}>Send</PrimaryButton>
      </View>
      {mutation.isPending ? <EmptyState title="Thinking with live platform data..." /> : null}
      {mutation.data ? <EmptyState title="Recommendations" body={JSON.stringify(mutation.data).slice(0, 500)} /> : null}
      <Text style={styles.disclaimer}>Recommendations depend on available SocietyFlats platform data and should be verified before any decision.</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.paperElevated, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  title: { ...typography.heading, fontSize: 26 },
  promptWrap: { gap: spacing.sm },
  disclaimer: { ...typography.muted, fontSize: 13, lineHeight: 20 },
});
