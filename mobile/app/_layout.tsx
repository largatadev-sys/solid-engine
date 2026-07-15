import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { installFirebaseTokenSource } from '../src/auth/firebaseTokenSource';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';

/**
 * Root layout — Expo Router's file-based routing (spec Q9c). The auth gate landed here at S0.2, as
 * S0.1 anticipated.
 */

// Module scope, not an effect: the API client may be called before any component mounts, and a
// token source installed "on first render" would be a race the app loses occasionally.
installFirebaseTokenSource();

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
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
      router.replace('/me');
    }
  }, [state, segments, router]);

  if (state.kind === 'restoring') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#F23643" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerTitleStyle: { fontWeight: '600' } }} />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
});
