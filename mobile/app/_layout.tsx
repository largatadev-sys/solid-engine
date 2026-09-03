import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { installFirebaseTokenSource } from '../src/auth/firebaseTokenSource';
import { installGoogleSignIn } from '../src/auth/googleSignInConfig';
import { authCapabilities } from '../src/repositories/authRepository';
import { useAuth } from '../src/hooks/authContext';
import { useMe } from '../src/hooks/useMe';
import { AuthProvider } from '../src/hooks/useAuth';
import { ConfirmStation } from '../src/components/ConfirmStation';
import { MobileFrame } from '../src/components/MobileFrame';
import { FeedbackDock } from '../src/feedback/FeedbackDock';
import { usePendingJoin } from '../src/join/usePendingJoin';
import { CropStation } from '../src/media/CropStation';
import { createQueryClient } from '../src/query/queryClient';
import { useAppStateFocus } from '../src/query/useAppStateFocus';
import { destinationFor, isSettling, type GateInput } from '../src/onboarding/onboardingGate';
import { colors, typography } from '../src/theme';
import { interFontMap } from '../src/theme/interFonts';
import { useSocketLifecycle } from '../src/ws/useSocketLifecycle';
import { useTripDelivery } from '../src/query/useTripDelivery';
import { lockViewportToTheAppFrame } from '../src/components/viewportLock';



lockViewportToTheAppFrame();

installFirebaseTokenSource();

if (authCapabilities.google === 'full') {
  installGoogleSignIn();
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded, fontError] = useFonts(interFontMap);

  if (!fontsLoaded && fontError === null) return <Splash />;

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <AuthProvider>
          <MobileFrame>
            <AuthGate />
            <FeedbackDock />
          </MobileFrame>
          <CropStation />
          <ConfirmStation />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}


function AuthGate() {
  const auth = useAuth();
  const { state } = useMe();
  const segments = useSegments();
  const router = useRouter();

  useAppStateFocus();
  useSocketLifecycle(auth.kind === 'signedIn');
  useTripDelivery(state.kind === 'ok' ? state.me.id : null);

  const pendingJoin = usePendingJoin();

  const gate: GateInput = {
    auth: auth.kind,
    emailVerified: auth.kind === 'signedIn' && auth.emailVerified,
    profile: state.kind === 'ok' ? state.me : null,
    profileUnreadable: state.kind === 'error',
    segment: segments[0],
    pendingJoinToken: pendingJoin.token,
    pendingJoinSettled: pendingJoin.settled,
  };

  const destination = destinationFor(gate);

  useEffect(() => {
    if (destination !== null) router.replace(destination);
  }, [destination, router]);

  const settling = destination !== null || isSettling(gate);

  return (
    <View style={styles.root}>
      <Stack
        screenOptions={{
          headerTitleStyle: typography.bodyStrong,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="join/[token]" options={{ headerShown: false }} />
        <Stack.Screen name="travelers" options={{ headerShown: false }} />
        <Stack.Screen name="map" options={{ headerShown: false }} />
      </Stack>

      {settling && <Splash overlay />}
    </View>
  );
}


function Splash({ overlay = false }: { overlay?: boolean }) {
  return (
    <View style={overlay ? styles.splashOverlay : styles.splash}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    zIndex: 1,
    elevation: 1,
  },
});
