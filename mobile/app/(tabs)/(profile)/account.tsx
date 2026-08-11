import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../../src/components/Icon';
import { useMe } from '../../../src/hooks/useMe';
import { ONBOARDING_ROUTES } from '../../../src/onboarding/onboardingGate';
import { ACCOUNT_BACK_LABEL } from '../../../src/profile/profileCopy';
import { ProfileCardView } from '../../../src/profile/ProfileCardView';
import { profileCardOf } from '../../../src/profile/profileCard';
import { authRepository } from '../../../src/repositories/authRepository';
import { colors, radii, spacing, typography } from '../../../src/theme';



export default function AccountScreen() {
  const { state, refresh } = useMe();
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable
        style={styles.back}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={ACCOUNT_BACK_LABEL}
      >
        <Icon name="back" size={24} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.brand}>
        <Text style={styles.wordmark}>Largata</Text>
        <Text style={styles.tagline}>SIGNED IN</Text>
      </View>

      {state.kind === 'ok' ? (
        <ProfileCardView card={profileCardOf(state.me)} photoLabel="Your profile photo" />
      ) : (
        <View style={styles.card}>
          {state.kind === 'loading' && <ActivityIndicator size="large" color={colors.accent} />}

          {state.kind === 'error' && (
            <>
              <Text style={styles.errorTitle}>Could not load your profile</Text>
              <Text style={styles.errorCode}>{state.error.code}</Text>
              <Text style={styles.caption}>{state.error.message}</Text>
              {state.error.traceId !== undefined && (
                <Text style={styles.trace}>traceId: {state.error.traceId}</Text>
              )}
            </>
          )}
        </View>
      )}

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
    </ScrollView>
  );
}


const CARD_MAX_WIDTH = 420;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  back: { alignSelf: 'flex-start', padding: spacing.xs, marginBottom: spacing.md },
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
