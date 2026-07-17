import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GoogleSignInButton } from '../src/components/GoogleSignInButton';
import {
  AuthCancelled,
  AuthError,
  authCapabilities,
  authRepository,
} from '../src/repositories/authRepository';
import { colors, radii, spacing, typography } from '../src/theme';

/**
 * Sign in, sign up, and password reset (S0.2, spec decision 5). On tokens since S0.3.
 */

type Mode = 'signIn' | 'signUp';
type Busy = 'idle' | 'google' | 'email' | 'reset';

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<Busy>('idle');
  const [message, setMessage] = useState<string | null>(null);

  // Nothing here navigates on success: the auth listener in AuthProvider owns that. A screen that
  // also routed would be a second source of truth for "am I signed in", and they would disagree
  // eventually — on token expiry, or a sign-out from elsewhere.
  const run = async (kind: Busy, action: () => Promise<void>, success?: string) => {
    setBusy(kind);
    setMessage(null);
    try {
      await action();
      if (success !== undefined) setMessage(success);
    } catch (error) {
      if (error instanceof AuthCancelled) return; // Backing out is not a failure.
      // The repository's contract is that it throws exactly one type; anything else is a bug in
      // that layer, and surfacing it raw would hide it. Same shape as useHealth's ApiError guard.
      setMessage(
        error instanceof AuthError ? error.message : 'Sign-in failed. Please try again.',
      );
    } finally {
      setBusy('idle');
    }
  };

  const emailAction = mode === 'signIn' ? authRepository.signInWithEmail : authRepository.signUpWithEmail;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Sign in' }} />

      <View style={styles.brand}>
        <Text style={styles.wordmark}>Largata</Text>
        <Text style={styles.tagline}>SIGN IN</Text>
      </View>

      {/*
        The button and its divider stand or fall together on the capability — rendered unless it is
        `'none'`. Note what this screen deliberately does not ask: whether the doorway *works*, or
        which platform it is on. Both were `'full'` by S0.6, and this condition did not change when
        web went from `'cosmetic'` to a real doorway — the tri-state's whole purpose.

        What *is* new at S0.6: the button itself is a platform-forked component, because the two
        doorways have different shapes. Native pulls (onPress → await → done); web pushes (GIS owns
        the click and hands a credential to a callback). The screen passes the same props to both and
        stays ignorant of which it got — the fork lives at the component seam, like the repository's.
        See `googleSignInButtonContract.ts` for why every prop goes to both sides.
      */}
      {authCapabilities.google !== 'none' && (
        <>
          <View style={styles.googleSlot}>
            <GoogleSignInButton
              onPress={() => void run('google', () => authRepository.signInWithGoogle())}
              onStart={() => {
                setBusy('google');
                setMessage(null);
              }}
              onSettle={() => setBusy('idle')}
              onError={setMessage}
              disabled={busy !== 'idle'}
              busy={busy === 'google'}
            />
          </View>

          <Text style={styles.divider}>or</Text>
        </>
      )}

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        accessibilityLabel="Email"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        autoCapitalize="none"
        accessibilityLabel="Password"
      />

      <Pressable
        style={styles.button}
        onPress={() => void run('email', () => emailAction(email.trim(), password))}
        disabled={busy !== 'idle'}
        accessibilityRole="button"
      >
        {busy === 'email' ? (
          <ActivityIndicator color={colors.textOnAccent} />
        ) : (
          <Text style={styles.buttonText}>{mode === 'signIn' ? 'Sign in' : 'Create account'}</Text>
        )}
      </Pressable>

      <View style={styles.links}>
        <Pressable
          onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
          accessibilityRole="button"
        >
          <Text style={styles.link}>
            {mode === 'signIn' ? 'Create an account' : 'I already have an account'}
          </Text>
        </Pressable>

        {mode === 'signIn' && (
          <Pressable
            onPress={() =>
              void run(
                'reset',
                () => authRepository.sendPasswordReset(email.trim()),
                'Password reset email sent.',
              )
            }
            disabled={busy !== 'idle' || email.trim() === ''}
            accessibilityRole="button"
          >
            <Text style={[styles.link, email.trim() === '' && styles.linkDisabled]}>
              Forgot password?
            </Text>
          </Pressable>
        )}
      </View>

      {message !== null && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

/** A layout constant, not a token — see `health.tsx`. */
const FIELD_MAX_WIDTH = 420;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  brand: { alignItems: 'center', marginBottom: spacing.lg },
  wordmark: { ...typography.wordmark, color: colors.accent },
  tagline: { ...typography.overline, color: colors.textSecondary, marginTop: spacing.xs },
  input: {
    width: '100%',
    maxWidth: FIELD_MAX_WIDTH,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.textPrimary,
  },
  button: {
    width: '100%',
    maxWidth: FIELD_MAX_WIDTH,
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  buttonText: { ...typography.action, color: colors.textOnAccent },
  // Google's button sizes itself (both platforms render Google's own component since S0.6), so this
  // slot only owns the space around it — never its appearance. The old `googleButton`/
  // `googleButtonText` styles are gone with the hand-styled pill they described.
  googleSlot: { width: '100%', maxWidth: FIELD_MAX_WIDTH, alignItems: 'center', marginTop: spacing.xs },
  divider: { ...typography.caption, color: colors.textSecondary, marginVertical: spacing.md },
  links: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  link: { ...typography.caption, color: colors.accent, fontWeight: '600' },
  linkDisabled: { color: colors.textSecondary },
  message: { ...typography.caption, color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md },
});
