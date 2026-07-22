import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthError, authRepository } from '../src/repositories/authRepository';
import { colors, radii, spacing, typography } from '../src/theme';

/**
 * Verify-email waiting state (S1.2, ticket 08).
 *
 * Reached when accepting an invitation returns 403 EMAIL_NOT_VERIFIED — a password sign-up trying to
 * join before verifying. It offers to resend the link and to re-check ("I've verified"), which forces
 * a fresh token carrying the updated claim so the retried accept passes the gate.
 *
 * This is deliberately NOT a 6-digit code screen (the 07/16 Figma mock's shape) — the shipped
 * mechanism is Firebase's verification LINK (`sendEmailVerification` / `sendOobCode VERIFY_EMAIL`),
 * and a code screen would mean hand-building an OTP system Firebase does not provide. The mock's
 * reconciliation is the backlogged story after S1.2.
 */
export default function VerifyEmailScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState<'idle' | 'resend' | 'check'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const resend = async () => {
    setBusy('resend');
    setMessage(null);
    try {
      await authRepository.resendVerification();
      setMessage('Verification link sent. Check your inbox.');
    } catch (error) {
      setMessage(error instanceof AuthError ? error.message : 'Could not send the link. Try again.');
    } finally {
      setBusy('idle');
    }
  };

  const check = async () => {
    setBusy('check');
    setMessage(null);
    try {
      const verified = await authRepository.refreshVerification();
      if (verified) {
        // Back to the inbox — the accept can now be retried and will pass the gate.
        router.back();
      } else {
        setMessage("Not verified yet. Tap the link in your email, then try again.");
      }
    } catch (error) {
      setMessage(error instanceof AuthError ? error.message : 'Could not check. Try again.');
    } finally {
      setBusy('idle');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Verify your email' }} />

      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.body}>
        We sent a verification link to your email address. Tap it, then come back and choose “I’ve
        verified”.
      </Text>

      <Pressable
        style={styles.primary}
        onPress={() => void check()}
        disabled={busy !== 'idle'}
        accessibilityRole="button"
      >
        {busy === 'check' ? (
          <ActivityIndicator color={colors.textOnAccent} />
        ) : (
          <Text style={styles.primaryText}>I’ve verified</Text>
        )}
      </Pressable>

      <Pressable onPress={() => void resend()} disabled={busy !== 'idle'} accessibilityRole="button">
        <Text style={styles.link}>{busy === 'resend' ? 'Sending…' : 'Resend the link'}</Text>
      </Pressable>

      {message !== null && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const FIELD_MAX_WIDTH = 420;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center', maxWidth: FIELD_MAX_WIDTH },
  primary: {
    width: '100%',
    maxWidth: FIELD_MAX_WIDTH,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  primaryText: { ...typography.action, color: colors.textOnAccent },
  link: { ...typography.caption, color: colors.accent, fontWeight: '600' },
  message: { ...typography.caption, color: colors.textPrimary, textAlign: 'center', marginTop: spacing.sm },
});
