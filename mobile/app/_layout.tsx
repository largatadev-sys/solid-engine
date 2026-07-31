import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { installFirebaseTokenSource } from '../src/auth/firebaseTokenSource';
import { installGoogleSignIn } from '../src/auth/googleSignInConfig';
import { authCapabilities } from '../src/repositories/authRepository';
import { useAuth } from '../src/hooks/authContext';
import { useMe } from '../src/hooks/useMe';
import { AuthProvider } from '../src/hooks/useAuth';
import { MobileFrame } from '../src/components/MobileFrame';
import { createQueryClient } from '../src/query/queryClient';
import { destinationFor, isSettling, type GateInput } from '../src/onboarding/onboardingGate';
import { colors, typography } from '../src/theme';
import { interFontMap } from '../src/theme/interFonts';



installFirebaseTokenSource();

if (authCapabilities.google === 'full') {
  installGoogleSignIn();
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded, fontError] = useFonts(interFontMap);

  if (!fontsLoaded && fontError === null) return <Splash />;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <AuthProvider>
        <MobileFrame>
          <AuthGate />
        </MobileFrame>
      </AuthProvider>
    </QueryClientProvider>
  );
}


function AuthGate() {
  const auth = useAuth();
  const { state } = useMe();
  const segments = useSegments();
  const router = useRouter();

  const gate: GateInput = {
    auth: auth.kind,
    emailVerified: auth.kind === 'signedIn' && auth.emailVerified,
    profile: state.kind === 'ok' ? state.me : null,
    profileUnreadable: state.kind === 'error',
    segment: segments[0],
  };

  const destination = destinationFor(gate);

  useEffect(() => {
    if (destination !== null) router.replace(destination);
  }, [destination, router]);

  if (destination !== null || isSettling(gate)) return <Splash />;

  return (
    <Stack
      screenOptions={{
        headerTitleStyle: typography.bodyStrong,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}


function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
