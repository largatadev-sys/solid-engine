import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AuthScreenLayout } from '../src/components/AuthScreenLayout';
import { Button } from '../src/components/Button';
import { FormField } from '../src/components/FormField';
import { GoogleDoorway } from '../src/components/GoogleDoorway';
import { messageForAuthFailure } from '../src/auth/authFailureMessage';
import { authRepository } from '../src/repositories/authRepository';
import { colors, spacing, typography } from '../src/theme';

type Busy = 'idle' | 'google' | 'email' | 'reset';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState<Busy>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (kind: Busy, action: () => Promise<void>, success?: string) => {
    setBusy(kind);
    setMessage(null);
    setNotice(null);
    try {
      await action();
      if (success !== undefined) setNotice(success);
    } catch (error) {
      setMessage(messageForAuthFailure(error));
    } finally {
      setBusy('idle');
    }
  };

  return (
    <AuthScreenLayout
      title="Welcome back"
      footerPrompt="New to Largata?"
      footerAction="Create an account"
      footerHref="/sign-up"
    >
      <Stack.Screen options={{ headerShown: false }} />

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
        placeholder="Your password"
        secureTextEntry={!reveal}
        autoCapitalize="none"
        autoComplete="current-password"
        trailing={{
          text: reveal ? 'Hide' : 'Show',
          onPress: () => setReveal(!reveal),
          accessibilityLabel: reveal ? 'Hide password' : 'Show password',
        }}
      />

      <Button
        label="Sign In"
        onPress={() => void run('email', () => authRepository.signInWithEmail(email.trim(), password))}
        busy={busy === 'email'}
        disabled={busy !== 'idle'}
        style={styles.submit}
      />

      <Pressable
        onPress={() =>
          void run('reset', () => authRepository.sendPasswordReset(email.trim()), 'Password reset email sent.')
        }
        disabled={busy !== 'idle' || email.trim() === ''}
        accessibilityRole="button"
      >
        <Text style={[styles.forgot, email.trim() === '' && styles.forgotDisabled]}>Forgot password?</Text>
      </Pressable>

      <GoogleDoorway
        busy={busy === 'google'}
        disabled={busy !== 'idle'}
        onBusyChange={(running) => setBusy(running ? 'google' : 'idle')}
        onMessage={setMessage}
      />

      {notice !== null && <Text style={styles.notice}>{notice}</Text>}
      {message !== null && <Text style={styles.message}>{message}</Text>}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  submit: { marginTop: spacing.sm },
  forgot: { ...typography.label, color: colors.accent, textAlign: 'center' },
  forgotDisabled: { color: colors.textSecondary },
  notice: { ...typography.caption, color: colors.success, textAlign: 'center' },
  message: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
