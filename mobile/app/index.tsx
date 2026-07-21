import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useOnboardingStore } from '../src/state/onboardingStore';
import { colors } from '../src/theme/tokens';

export default function IndexRoute() {
  const { completed, restored } = useOnboardingStore();
  if (!restored) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.pine} />
      </View>
    );
  }
  return <Redirect href={completed ? '/(tabs)' : '/onboarding'} />;
}
