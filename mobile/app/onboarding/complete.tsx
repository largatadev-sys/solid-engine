import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { useMe } from '../../src/hooks/useMe';
import {
  COMPLETION_BLURB,
  COMPLETION_CTA,
  COMPLETION_HEADLINE,
  completionSummary,
} from '../../src/onboarding/completionSummary';
import { messageForVerificationFailure } from '../../src/onboarding/verificationMessages';
import { SIGNED_IN_HOME } from '../../src/navigation/authRoutes';
import { useCompleteOnboarding } from '../../src/query/travelerQueries';
import { colors, radii, spacing, typography } from '../../src/theme';


export default function CompleteStepScreen() {
  const router = useRouter();
  const { state } = useMe();
  const finish = useCompleteOnboarding();
  const [message, setMessage] = useState<string | null>(null);

  const lines = state.kind === 'ok' ? completionSummary(state.me) : [];

  const done = async () => {
    setMessage(null);
    try {
      await finish.mutateAsync();
      router.replace(SIGNED_IN_HOME);
    } catch (error) {
      setMessage(messageForVerificationFailure(error));
    }
  };

  return (
    <OnboardingScreen
      title={COMPLETION_HEADLINE}
      subtitle={COMPLETION_BLURB}
      message={message}
      footer={
        <Button
          label={COMPLETION_CTA}
          onPress={() => void done()}
          busy={finish.isPending}
          disabled={finish.isPending}
        />
      }
    >
      <View style={styles.card}>
        {lines.map((line) => (
          <View key={line.label} style={styles.line}>
            <Text style={styles.label}>{line.label}</Text>
            <Text style={styles.value}>{line.value}</Text>
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  line: { gap: spacing.xs },
  label: { ...typography.overline, color: colors.textSecondary },
  value: { ...typography.body, color: colors.textPrimary },
});
