import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { installFirebaseTokenSource } from '../src/auth/firebaseTokenSource';
import { installGoogleSignIn } from '../src/auth/googleSignInConfig';
import { authCapabilities } from '../src/repositories/authRepository';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { createQueryClient } from '../src/query/queryClient';
import { colors } from '../src/theme';



installFirebaseTokenSource();

if (authCapabilities.google === 'full') {
  installGoogleSignIn();
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
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

    const onSignIn = segments[0] === 'sign-in';

    if (state.kind === 'signedOut' && !onSignIn) {
      router.replace('/sign-in');
    } else if (state.kind === 'signedIn' && onSignIn) {
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
