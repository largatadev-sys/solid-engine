import { Link, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { FormField } from '../src/components/FormField';
import { GoogleSignInButton } from '../src/components/GoogleSignInButton';
import { messageForAuthFailure } from '../src/auth/authFailureMessage';
import { authCapabilities, authRepository } from '../src/repositories/authRepository';
import { colors, spacing, typography } from '../src/theme';

type Busy = 'idle' | 'google' | 'email';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState<Busy>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const createAccount = async () => {
    setBusy('email');
    setMessage(null);
    try {
      await authRepository.signUpWithEmail(email.trim(), password);
    } catch (error) {
      setMessage(messageForAuthFailure(error));
    } finally {
      setBusy('idle');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          style={styles.back}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>

        <Text style={styles.title}>Join the journey</Text>

        {authCapabilities.google !== 'none' && (
          <>
            <GoogleSignInButton
              onPress={() => void authRepository.signInWithGoogle()}
              onStart={() => {
                setBusy('google');
                setMessage(null);
              }}
              onSettle={() => setBusy('idle')}
              onError={setMessage}
              disabled={busy !== 'idle'}
              busy={busy === 'google'}
            />
            <Text style={styles.divider}>or continue with email</Text>
          </>
        )}

        <FormField
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />

        <FormField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Min. 8 characters"
          secureTextEntry={!reveal}
          autoCapitalize="none"
          autoComplete="new-password"
          trailing={{
            text: reveal ? 'Hide' : 'Show',
            onPress: () => setReveal(!reveal),
            accessibilityLabel: reveal ? 'Hide password' : 'Show password',
          }}
        />

        <Button
          label="Create Account"
          onPress={() => void createAccount()}
          busy={busy === 'email'}
          disabled={busy !== 'idle'}
          style={styles.submit}
        />

        {message !== null && <Text style={styles.message}>{message}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Link href="/sign-in" replace asChild>
          <Pressable accessibilityRole="button">
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.footerAction}>Sign In</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  back: { width: spacing.xl, height: spacing.xl, justifyContent: 'center' },
  backGlyph: { ...typography.display, color: colors.textPrimary },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.xs },
  divider: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  submit: { marginTop: spacing.sm },
  message: { ...typography.caption, color: colors.danger, textAlign: 'center' },
  footer: { padding: spacing.lg, alignItems: 'center' },
  footerText: { ...typography.link, color: colors.textSecondary },
  footerAction: { color: colors.accent },
});
