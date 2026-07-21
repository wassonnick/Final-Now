import { useLocalSearchParams, router } from 'expo-router';
import React, { useState } from 'react';
import { authService } from '../src/api/services/auth';
import { AppHeader, AppScreen, AppTextInput, PrimaryButton } from '../src/components';
import { useAuthStore } from '../src/state/authStore';

export default function OtpScreen() {
  const { phone = '' } = useLocalSearchParams<{ phone?: string }>();
  const [otp, setOtp] = useState('');
  const setToken = useAuthStore((state) => state.setToken);

  async function verify() {
    const response = await authService.verifyOtp(phone, otp);
    const token = response.token || response.data?.token;
    if (token) {
      await setToken(token);
      router.replace('/(tabs)/account');
    }
  }

  return (
    <AppScreen keyboard>
      <AppHeader title="Verify OTP" subtitle={`Code sent to ${phone || 'your phone'}.`} />
      <AppTextInput value={otp} onChangeText={setOtp} placeholder="One-time password" keyboardType="number-pad" />
      <PrimaryButton onPress={verify}>Verify</PrimaryButton>
    </AppScreen>
  );
}
