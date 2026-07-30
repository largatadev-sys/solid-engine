import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { CodeInput } from '../src/components/CodeInput';
import { Icon } from '../src/components/Icon';
import { useAuth } from '../src/hooks/authContext';
import {
  isCompleteCode,
  messageForVerificationFailure,
  secondsUntil,
} from '../src/onboarding/verificationMessages';
import { useConfirmVerificationCode, useSendVerificationCode } from '../src/query/travelerQueries';
import { authRepository } from '../src/repositories/authRepository';
import { colors, controls, radii, spacing, typography } from '../src/theme';

const MAIL_GLYPH = 64;


export default function VerifyCodeScreen() {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
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
  const resendable = cooldown === 0 && !busy;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.body}>
        <View style={styles.navrow}>
          <Pressable
            style={styles.backbtn}
            onPress={() => void authRepository.signOut()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name="back" size={24} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.navspacer} />
        </View>

        <View style={styles.stack}>
          <View style={styles.iconCircle}>
            <Icon name="mailCheck" size={MAIL_GLYPH} color={colors.accent} />
          </View>

          <View style={styles.headings}>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.blurb}>We sent a 6-digit code to your email address.</Text>
          </View>

          <CodeInput value={code} onChange={setCode} editable={!busy} invalid={invalid} />

          <Pressable
            onPress={() => void dispatchCode()}
            disabled={!resendable}
            accessibilityRole="button"
            accessibilityLabel="Resend code"
          >
            <Text style={styles.linkline}>
              {"Didn't receive code? "}
              <Text style={resendable ? styles.linkAction : styles.linkWaiting}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </Text>
            </Text>
          </Pressable>

          {message !== null && (
            <Text style={[styles.message, invalid && styles.error]}>{message}</Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Verify"
          onPress={() => void submit()}
          busy={confirm.isPending}
          disabled={busy || !isCompleteCode(code)}
        />
      </View>
    </View>
  );
}

const CONTENT_MAX_WIDTH = 480;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: spacing.lg },
  navrow: {
    height: controls.navControl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backbtn: {
    width: controls.navControl,
    height: controls.navControl,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navspacer: { width: controls.navControl, height: controls.navControl },
  stack: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    paddingTop: spacing.xl,
  },
  iconCircle: {
    width: controls.verifyIconSize,
    height: controls.verifyIconSize,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  headings: { alignItems: 'center', gap: spacing.sm },
  title: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' },
  blurb: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  linkline: { ...typography.link, color: colors.textSecondary, textAlign: 'center' },
  linkAction: { color: colors.accent },
  linkWaiting: { color: colors.textSecondary },
  message: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  error: { color: colors.danger },
  footer: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});
