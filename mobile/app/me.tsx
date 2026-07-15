import { Stack } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMe } from '../src/hooks/useMe';
import { authRepository } from '../src/repositories/authRepository';

/**
 * The story's visible proof: what `GET /v1/me` returned for the signed-in traveler.
 *
 * THROWAWAY STYLING — see `index.tsx`. Diagnostic chrome, not a design system.
 */

const SCAFFOLD_RED = '#F23643';
const SCAFFOLD_MUTED = '#8A94A6';
const SCAFFOLD_INK = '#2B2F38';

export default function MeScreen() {
  const { state, refresh } = useMe();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Largata' }} />

      <View style={styles.brand}>
        <Text style={styles.wordmark}>Largata</Text>
        <Text style={styles.tagline}>SIGNED IN</Text>
      </View>

      <View style={styles.card}>
        {state.kind === 'loading' && <ActivityIndicator size="large" color={SCAFFOLD_RED} />}

        {state.kind === 'ok' && (
          <>
            <Text style={styles.name}>{state.me.displayName}</Text>
            <Text style={styles.caption}>{state.me.email}</Text>
            <Text style={styles.id}>{state.me.id}</Text>
            <Text style={styles.caption}>Traveler provisioned by the backend on first contact.</Text>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <Text style={styles.errorTitle}>Could not load your profile</Text>
            {/* Branching on `code`, never on `message` (Artifact 05). */}
            <Text style={styles.errorCode}>{state.error.code}</Text>
            <Text style={styles.caption}>{state.error.message}</Text>
            {state.error.traceId !== undefined && (
              <Text style={styles.trace}>traceId: {state.error.traceId}</Text>
            )}
          </>
        )}
      </View>

      <Pressable style={styles.button} onPress={refresh} accessibilityRole="button">
        <Text style={styles.buttonText}>Reload</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.secondaryButton]}
        onPress={() => void authRepository.signOut()}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryButtonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  brand: { alignItems: 'center', marginBottom: 32 },
  wordmark: { fontSize: 34, fontWeight: '700', color: SCAFFOLD_RED, letterSpacing: -0.5 },
  tagline: { fontSize: 11, fontWeight: '600', color: SCAFFOLD_MUTED, letterSpacing: 2, marginTop: 2 },
  card: {
    width: '100%',
    maxWidth: 420,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F3D2D5',
  },
  name: { fontSize: 22, fontWeight: '600', color: SCAFFOLD_INK },
  id: { fontSize: 10, fontFamily: 'monospace', color: SCAFFOLD_MUTED },
  errorTitle: { fontSize: 20, fontWeight: '600', color: SCAFFOLD_RED },
  errorCode: { fontSize: 13, fontFamily: 'monospace', color: SCAFFOLD_INK },
  caption: { fontSize: 13, textAlign: 'center', color: SCAFFOLD_MUTED },
  trace: { fontSize: 10, color: SCAFFOLD_MUTED, marginTop: 4 },
  button: {
    width: '100%',
    maxWidth: 420,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: SCAFFOLD_RED,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  secondaryButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EC' },
  secondaryButtonText: { color: SCAFFOLD_INK, fontWeight: '600', fontSize: 15 },
});
