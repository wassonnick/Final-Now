import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { leadService } from '../api/services/leads';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { AppTextInput, PrimaryButton } from './index';

type InquiryPanelProps = {
  title?: string;
  source: string;
  societyId?: string | number;
  propertyId?: string | number;
  societyName?: string | null;
  propertyTitle?: string | null;
  propertySlug?: string | null;
  entityType?: string;
  entitySlug?: string | null;
  message: string;
};

export function InquiryPanel({
  title = 'Request a SocietyFlats callback',
  source,
  societyId,
  propertyId,
  societyName,
  propertyTitle,
  propertySlug,
  entityType,
  entitySlug,
  message,
}: InquiryPanelProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function submit() {
    if (!name.trim() || phone.replace(/\D/g, '').length < 10) {
      setStatus('error');
      return;
    }
    setStatus('sending');
    try {
      await leadService.requestCallback({
        name: name.trim(),
        phone,
        source,
        society_id: societyId,
        property_id: propertyId,
        society_name: societyName || undefined,
        property_title: propertyTitle || undefined,
        property_slug: propertySlug,
        source_page: source,
        cta_label: title,
        entity_type: entityType,
        entity_slug: entitySlug,
        message,
      });
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>Share your mobile number. SocietyFlats will route the enquiry through our lead system—no private owner details are exposed.</Text>
      <AppTextInput value={name} onChangeText={setName} placeholder="Your name" />
      <AppTextInput value={phone} onChangeText={setPhone} placeholder="Mobile number" keyboardType="phone-pad" />
      {status === 'sent' ? <Text style={styles.success}>Request received. We’ll help with current availability.</Text> : null}
      {status === 'error' ? <Text style={styles.error}>Please enter a name and valid 10-digit Indian mobile number.</Text> : null}
      <PrimaryButton onPress={submit} disabled={status === 'sending' || status === 'sent'}>
        {status === 'sent' ? 'Requested' : status === 'sending' ? 'Sending…' : 'Request callback'}
      </PrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.paperElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.md },
  title: { ...typography.heading, fontSize: 24, lineHeight: 30 },
  body: { ...typography.muted, fontSize: 15, lineHeight: 22 },
  success: { color: colors.success, fontWeight: '800' },
  error: { color: colors.danger, fontWeight: '800' },
});
