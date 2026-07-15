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
import { AuthCancelled, authRepository } from '../src/repositories/authRepository';

/**
 * Sign in, sign up, and password reset (S0.2, spec decision 5).
 *
 * THROWAWAY STYLING — see `index.tsx`. Same scaffold palette, same rule: this is diagnostic
 * chrome, not a design system, and the real visual direction is its own story before S0.3.
 */

const SCAFFOLD_RED = '#F23643';
const SCAFFOLD_MUTED = '#8A94A6';
const SCAFFOLD_INK = '#2B2F38';

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
      setMessage(readableError(error));
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

      <Pressable
        style={[styles.button, styles.googleButton]}
        onPress={() => void run('google', () => authRepository.signInWithGoogle())}
        disabled={busy !== 'idle'}
        accessibilityRole="button"
      >
        {busy === 'google' ? (
          <ActivityIndicator color={SCAFFOLD_INK} />
        ) : (
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        )}
      </Pressable>

      <Text style={styles.divider}>or</Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={SCAFFOLD_MUTED}
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
        placeholderTextColor={SCAFFOLD_MUTED}
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
          <ActivityIndicator color="#FFFFFF" />
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

/**
 * Firebase's `auth/...` codes, translated at the boundary. Deliberately vague about which half of
 * a credential was wrong: "no account with that email" tells anyone with a list of emails which
 * ones are registered.
 */
function readableError(error: unknown): string {
  const code = (error as { code?: string }).code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'An account with that email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Could not reach the server. Check your connection.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again shortly.';
    default:
      return 'Sign-in failed. Please try again.';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  brand: { alignItems: 'center', marginBottom: 28 },
  wordmark: { fontSize: 34, fontWeight: '700', color: SCAFFOLD_RED, letterSpacing: -0.5 },
  tagline: { fontSize: 11, fontWeight: '600', color: SCAFFOLD_MUTED, letterSpacing: 2, marginTop: 2 },
  input: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E8EC',
    fontSize: 15,
    color: SCAFFOLD_INK,
  },
  button: {
    width: '100%',
    maxWidth: 420,
    marginTop: 6,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: SCAFFOLD_RED,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  googleButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EC' },
  googleButtonText: { color: SCAFFOLD_INK, fontWeight: '600', fontSize: 15 },
  divider: { fontSize: 12, color: SCAFFOLD_MUTED, marginVertical: 16 },
  links: { alignItems: 'center', gap: 10, marginTop: 18 },
  link: { fontSize: 13, color: SCAFFOLD_RED, fontWeight: '600' },
  linkDisabled: { color: SCAFFOLD_MUTED },
  message: { fontSize: 13, color: SCAFFOLD_INK, textAlign: 'center', marginTop: 18 },
});
