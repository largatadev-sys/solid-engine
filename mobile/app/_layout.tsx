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
import { AuthProvider } from '../src/hooks/useAuth';
import { createQueryClient } from '../src/query/queryClient';
import { isPublicRoute, landingRouteFor } from '../src/navigation/authRoutes';
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
        <AuthGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}


function AuthGate() {
  const state = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (state.kind === 'restoring') return;

    const destination = landingRouteFor(state.kind, segments[0]);
    if (destination !== null) router.replace(destination);
  }, [state, segments, router]);

  if (state.kind === 'restoring') return <Splash />;

  if (state.kind === 'signedOut' && !isPublicRoute(segments[0])) return <Splash />;

  return (
    <Stack
      screenOptions={{
        headerTitleStyle: typography.bodyStrong,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
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
