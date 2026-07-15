import { Stack } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useHealth } from '../src/hooks/useHealth';

/**
 * The walking skeleton's last mile: this screen proves the mobile half of the vertical slice.
 *
 * It reads through hook -> repository -> apiClient (ADR-001). There is no `fetch` here and never
 * will be — the first screen ever written establishes the pattern by example, which is why the
 * skeleton bothers to render anything at all.
 *
 * THROWAWAY STYLING — NOT A DESIGN SYSTEM. The colours below are borrowed from an existing
 * Largata app purely so this diagnostic screen is pleasant to look at; they are hardcoded here,
 * deliberately, rather than promoted into a theme. The real visual direction (tokens, typography,
 * spacing, and whether that portfolio palette even suits a travel product) is a decision deferred
 * to its own story before S0.3's first real screens. Do not copy these values into new screens,
 * and do not treat this file as precedent — this screen is scaffolding and gets deleted or buried
 * once itineraries exist.
 */

const SCAFFOLD_RED = '#F23643';
const SCAFFOLD_MUTED = '#8A94A6';
const SCAFFOLD_INK = '#2B2F38';

export default function HealthScreen() {
  const { state, refresh } = useHealth();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Largata' }} />

      <View style={styles.brand}>
        <Text style={styles.wordmark}>Largata</Text>
        <Text style={styles.tagline}>WALKING SKELETON</Text>
      </View>

      <View style={styles.card}>
        {state.kind === 'loading' && <ActivityIndicator size="large" color={SCAFFOLD_RED} />}

        {state.kind === 'ok' && (
          <>
            <Text style={styles.status}>Backend: {state.health.status}</Text>
            <Text style={styles.caption}>The stack answered through the repository layer.</Text>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <Text style={styles.errorTitle}>Backend unreachable</Text>
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
        <Text style={styles.buttonText}>Check again</Text>
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
  status: { fontSize: 22, fontWeight: '600', color: SCAFFOLD_INK },
  errorTitle: { fontSize: 20, fontWeight: '600', color: SCAFFOLD_RED },
  errorCode: { fontSize: 13, fontFamily: 'monospace', color: SCAFFOLD_INK },
  caption: { fontSize: 13, textAlign: 'center', color: SCAFFOLD_MUTED },
  trace: { fontSize: 10, color: SCAFFOLD_MUTED, marginTop: 4 },
  button: {
    width: '100%',
    maxWidth: 420,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: SCAFFOLD_RED,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
