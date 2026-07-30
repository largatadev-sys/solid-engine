import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AuthScreenLayout } from '../src/components/AuthScreenLayout';
import { Button } from '../src/components/Button';
import { FormField } from '../src/components/FormField';
import { GoogleDoorway } from '../src/components/GoogleDoorway';
import { messageForAuthFailure } from '../src/auth/authFailureMessage';
import { authRepository } from '../src/repositories/authRepository';
import { colors, spacing, typography } from '../src/theme';

type Busy = 'idle' | 'google' | 'email';

export default function SignUpScreen() {
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
    <AuthScreenLayout
      title="Join the journey"
      footerPrompt="Already have an account?"
      footerAction="Sign In"
      footerHref="/sign-in"
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

      <GoogleDoorway
        busy={busy === 'google'}
        disabled={busy !== 'idle'}
        onBusyChange={(running) => setBusy(running ? 'google' : 'idle')}
        onMessage={setMessage}
      />

      {message !== null && <Text style={styles.message}>{message}</Text>}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  submit: { marginTop: spacing.sm },
  message: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
