import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { CodeInput } from '../src/components/CodeInput';
import { useAuth } from '../src/hooks/authContext';
import {
  isCompleteCode,
  messageForVerificationFailure,
  secondsUntil,
} from '../src/onboarding/verificationMessages';
import { useConfirmVerificationCode, useSendVerificationCode } from '../src/query/travelerQueries';
import { authRepository } from '../src/repositories/authRepository';
import { colors, spacing, typography } from '../src/theme';


export default function VerifyCodeScreen() {
  const auth = useAuth();
  const send = useSendVerificationCode();
  const confirm = useConfirmVerificationCode();

  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (requested || auth.kind !== 'signedIn' || auth.emailVerified) return;
    setRequested(true);
    void dispatchCode();
  }, [requested, auth]);

  useEffect(() => {
    if (resendAvailableAt === null) return;
    const tick = setInterval(() => setCooldown(secondsUntil(resendAvailableAt, Date.now())), 1000);
    setCooldown(secondsUntil(resendAvailableAt, Date.now()));
    return () => clearInterval(tick);
  }, [resendAvailableAt]);

  const dispatchCode = async () => {
    setMessage(null);
    setInvalid(false);
    try {
      const issued = await send.mutateAsync();
      setResendAvailableAt(issued.resendAvailableAt);
      setMessage('We sent a 6-digit code to your inbox.');
    } catch (error) {
      setMessage(messageForVerificationFailure(error));
    }
  };

  const submit = async () => {
    setMessage(null);
    setInvalid(false);
    try {
      await confirm.mutateAsync(code);
      await authRepository.refreshVerification();
    } catch (error) {
      setCode('');
      setInvalid(true);
      setMessage(messageForVerificationFailure(error));
    }
  };

  const busy = send.isPending || confirm.isPending;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.content}>
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.body}>
          Enter the 6-digit code we just emailed you. It expires in a few minutes.
        </Text>

        <CodeInput value={code} onChange={setCode} editable={!busy} invalid={invalid} />

        <Button
          label="Verify"
          onPress={() => void submit()}
          busy={confirm.isPending}
          disabled={busy || !isCompleteCode(code)}
        />

        <Button
          label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Send a new code'}
          variant="secondary"
          onPress={() => void dispatchCode()}
          busy={send.isPending}
          disabled={busy || cooldown > 0}
        />

        {message !== null && (
          <Text style={[styles.message, invalid && styles.error]}>{message}</Text>
        )}

        <Button
          label="Use a different account"
          variant="secondary"
          onPress={() => void authRepository.signOut()}
          disabled={busy}
          style={styles.escape}
        />
      </View>
    </View>
  );
}

const CONTENT_MAX_WIDTH = 420;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  content: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, gap: spacing.md },
  title: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  message: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  error: { color: colors.danger },
  escape: { marginTop: spacing.lg },
});
