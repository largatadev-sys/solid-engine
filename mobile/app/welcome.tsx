import { Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { useRevealGesture } from '../src/feedback/useRevealGesture';
import { colors, spacing, typography } from '../src/theme';


export default function WelcomeScreen() {
  const router = useRouter();
  const reveal = useRevealGesture();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.hero}>
        <View style={styles.brand}>
          <Text style={styles.wordmark} onPress={reveal.onPress}>
            Largata
          </Text>
          <Text style={styles.tagline}>Plan less. Experience more.</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button label="Create Account" onPress={() => router.push('/sign-up')} />
        <Button label="Sign In" variant="secondary" onPress={() => router.push('/sign-in')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  brand: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  wordmark: { ...typography.wordmark, color: colors.textPrimary },
  tagline: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  actions: { padding: spacing.lg, gap: spacing.sm },
});
