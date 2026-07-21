import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { analytics } from '../src/lib/analytics';
import { useAuthStore } from '../src/state/authStore';
import { useOnboardingStore } from '../src/state/onboardingStore';
import { useSavedStore } from '../src/state/savedStore';
import { colors } from '../src/theme/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 3,
        retry: 1,
      },
    },
  }), []);
  const restoreAuth = useAuthStore((state) => state.restore);
  const restoreOnboarding = useOnboardingStore((state) => state.restore);
  const restoreSaved = useSavedStore((state) => state.restore);

  useEffect(() => {
    Promise.all([restoreAuth(), restoreOnboarding(), restoreSaved()])
      .finally(() => SplashScreen.hideAsync());
    analytics.track('app_open');
  }, [restoreAuth, restoreOnboarding, restoreSaved]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="societies/[slug]" />
            <Stack.Screen name="properties/[slug]" />
            <Stack.Screen name="search" />
            <Stack.Screen name="filters" />
            <Stack.Screen name="compare" />
            <Stack.Screen name="nri" />
            <Stack.Screen name="rwa" />
            <Stack.Screen name="referrals" />
            <Stack.Screen name="login" />
            <Stack.Screen name="otp" />
            <Stack.Screen name="list-property" />
            <Stack.Screen name="notifications" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
