import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { installFirebaseTokenSource } from '../src/auth/firebaseTokenSource';
import { installGoogleSignIn } from '../src/auth/googleSignInConfig';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { createQueryClient } from '../src/query/queryClient';
import { colors } from '../src/theme';

/**
 * Root layout — Expo Router's file-based routing (spec Q9c). The auth gate landed here at S0.2, as
 * S0.1 anticipated.
 */

// Module scope, not an effect: the API client may be called before any component mounts, and a
// token source installed "on first render" would be a race the app loses occasionally. Google
// sign-in is configured here for the same reason — GoogleSignin.configure() must precede any
// signIn(), and "configure it when the sign-in screen mounts" is a promise, not a guarantee.
installFirebaseTokenSource();
installGoogleSignIn();

export default function RootLayout() {
  // useState, not module scope: one client for the app's lifetime, created inside React so a Fast
  // Refresh does not silently swap it and orphan every cached query mid-session.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Routes on auth state — the single owner of "signed in means you are here, signed out means you
 * are there". Screens never navigate on sign-in/sign-out themselves; if they did, that logic would
 * exist in two places and they would disagree the first time a token expired mid-session.
 */
function AuthGate() {
  const state = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait for the native SDK to report the restored session. Redirecting during `restoring` would
    // bounce every already-signed-in traveler through the sign-in screen at launch.
    if (state.kind === 'restoring') return;

    const onSignIn = segments[0] === 'sign-in';

    if (state.kind === 'signedOut' && !onSignIn) {
      router.replace('/sign-in');
    } else if (state.kind === 'signedIn' && onSignIn) {
      // My Trips is the signed-in home from S0.3 — the natural landing for a planning app. The
      // me-screen stays reachable from it, demoted.
      router.replace('/');
    }
  }, [state, segments, router]);

  if (state.kind === 'restoring') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerTitleStyle: { fontWeight: '600' } }} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
