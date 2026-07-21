import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { authService } from '../src/api/services/auth';
import { AppHeader, AppScreen, AppTextInput, PrimaryButton } from '../src/components';

const schema = z.object({ phone: z.string().min(10, 'Enter a valid phone number') });
type Form = z.infer<typeof schema>;

export default function LoginScreen() {
  const { control, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { phone: '' } });
  async function submit(data: Form) {
    await authService.requestOtp(data.phone);
    router.push({ pathname: '/otp', params: { phone: data.phone } });
  }
  return (
    <AppScreen keyboard>
      <AppHeader title="Sign in" subtitle="Use OTP to access enquiries, listings and saved searches." />
      <Controller control={control} name="phone" render={({ field }) => <AppTextInput value={field.value} onChangeText={field.onChange} placeholder="Mobile number" keyboardType="phone-pad" />} />
      <PrimaryButton onPress={handleSubmit(submit)} disabled={formState.isSubmitting}>Request OTP</PrimaryButton>
    </AppScreen>
  );
}
