import { Stack } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useHealth } from '../src/hooks/useHealth';

/**
 * The walking skeleton's last mile: this screen proves the mobile half of the vertical slice.
 *
 * It reads through hook -> repository -> apiClient (ADR-001). There is no `fetch` here and never
 * will be — the first screen ever written establishes the pattern by example, which is why the
 * skeleton bothers to render anything at all.
 */
export default function HealthScreen() {
  const { state, refresh } = useHealth();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Largata' }} />

      {state.kind === 'loading' && <ActivityIndicator size="large" />}

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

      <Pressable style={styles.button} onPress={refresh} accessibilityRole="button">
        <Text style={styles.buttonText}>Check again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  status: { fontSize: 22, fontWeight: '600' },
  errorTitle: { fontSize: 20, fontWeight: '600' },
  errorCode: { fontSize: 14, fontFamily: 'monospace' },
  caption: { fontSize: 14, textAlign: 'center', opacity: 0.7 },
  trace: { fontSize: 11, opacity: 0.5 },
  button: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1f6feb' },
  buttonText: { color: 'white', fontWeight: '600' },
});
