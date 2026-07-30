import { Link, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../src/components/Avatar';
import { useMe } from '../src/hooks/useMe';
import { ONBOARDING_ROUTES } from '../src/onboarding/onboardingGate';
import { authRepository } from '../src/repositories/authRepository';
import { colors, radii, spacing, typography } from '../src/theme';



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
        {state.kind === 'loading' && <ActivityIndicator size="large" color={colors.accent} />}

        {state.kind === 'ok' && (
          <>
            <Avatar
              photoUrl={state.me.avatarUrl}
              displayName={state.me.displayName}
              email={state.me.email}
            />
            <Text style={styles.name}>{state.me.displayName}</Text>
            {state.me.handle !== null && <Text style={styles.handle}>@{state.me.handle}</Text>}
            <Text style={styles.caption}>{state.me.email}</Text>
            {state.me.bio !== null && <Text style={styles.caption}>{state.me.bio}</Text>}
            <Text style={styles.id}>{state.me.id}</Text>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <Text style={styles.errorTitle}>Could not load your profile</Text>
            {}
            <Text style={styles.errorCode}>{state.error.code}</Text>
            <Text style={styles.caption}>{state.error.message}</Text>
            {state.error.traceId !== undefined && (
              <Text style={styles.trace}>traceId: {state.error.traceId}</Text>
            )}
          </>
        )}
      </View>

      <Link href={`${ONBOARDING_ROUTES.profile}?mode=edit`} asChild>
        <Pressable style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>Edit profile</Text>
        </Pressable>
      </Link>

      <Link href="/" asChild>
        <Pressable style={styles.secondaryLinkButton} accessibilityRole="button">
          <Text style={styles.secondaryButtonText}>My Trips</Text>
        </Pressable>
      </Link>

      <Pressable style={[styles.button, styles.secondaryButton]} onPress={refresh} accessibilityRole="button">
        <Text style={styles.secondaryButtonText}>Reload</Text>
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
  name: { ...typography.heading, color: colors.textPrimary },
  handle: { ...typography.bodyStrong, color: colors.accent },
  id: { ...typography.fineMono, color: colors.textSecondary },
  errorTitle: { ...typography.heading, color: colors.danger },
  errorCode: { ...typography.mono, color: colors.textPrimary },
  caption: { ...typography.caption, textAlign: 'center', color: colors.textSecondary },
  trace: { ...typography.fine, color: colors.textSecondary, marginTop: spacing.xs },
  button: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  buttonText: { ...typography.action, color: colors.textOnAccent },
  secondaryButton: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { ...typography.action, color: colors.textPrimary },
  secondaryLinkButton: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
