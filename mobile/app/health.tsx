import { Stack } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useHealth } from '../src/hooks/useHealth';
import { colors, radii, spacing, typography } from '../src/theme';

/**
 * The walking skeleton's diagnostic screen (S0.1), retrofitted onto the token layer at S0.3 and
 * moved off `/` — My Trips is the signed-in home now.
 *
 * It reads through hook -> repository -> apiClient (ADR-001). There is no `fetch` here and never
 * will be — the first screen ever written establishes the pattern by example.
 *
 * The throwaway hardcoded palette that used to live here is gone: the values were lifted into
 * `src/theme/tokens.ts` and this screen now consumes roles like every other. Kept rather than
 * deleted because "can the app reach the backend, and what does it say when it cannot" stays worth
 * one tap when a device build misbehaves.
 */
export default function HealthScreen() {
  const { state, refresh } = useHealth();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Diagnostics' }} />

      <View style={styles.brand}>
        <Text style={styles.wordmark}>Largata</Text>
        <Text style={styles.tagline}>WALKING SKELETON</Text>
      </View>

      <View style={styles.card}>
        {state.kind === 'loading' && <ActivityIndicator size="large" color={colors.accent} />}

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

/**
 * A layout constant, not a token: it is "how wide before this looks silly on a tablet", which is a
 * property of this screen's composition, not of the design language. Tokens are the vocabulary
 * screens share; this is a sentence one screen says.
 */
const CARD_MAX_WIDTH = 420;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  wordmark: { ...typography.wordmark, color: colors.accent },
  tagline: { ...typography.overline, color: colors.textSecondary, marginTop: spacing.xs },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accentMuted,
  },
  status: { ...typography.heading, color: colors.textPrimary },
  errorTitle: { ...typography.heading, color: colors.danger },
  errorCode: { ...typography.mono, color: colors.textPrimary },
  caption: { ...typography.caption, textAlign: 'center', color: colors.textSecondary },
  trace: { ...typography.fine, color: colors.textSecondary, marginTop: spacing.xs },
  button: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  buttonText: { ...typography.action, color: colors.textOnAccent },
});
