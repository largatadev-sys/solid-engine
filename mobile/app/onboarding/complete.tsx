import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { useMe } from '../../src/hooks/useMe';
import {
  COMPLETION_BLURB,
  COMPLETION_CTA,
  COMPLETION_HEADLINE,
  SUMMARY_TITLE,
  completionSummary,
} from '../../src/onboarding/completionSummary';
import { messageForVerificationFailure } from '../../src/onboarding/verificationMessages';
import { SIGNED_IN_HOME } from '../../src/navigation/authRoutes';
import { useCompleteOnboarding } from '../../src/query/travelerQueries';
import { colors, controls, radii, spacing, typography } from '../../src/theme';

const CELEBRATION_GLYPH = 64;
const CHECK_GLYPH = 20;

export default function CompleteStepScreen() {
  const router = useRouter();
  const { state } = useMe();
  const finish = useCompleteOnboarding();
  const [message, setMessage] = useState<string | null>(null);

  const rows = state.kind === 'ok' ? completionSummary(state.me) : [];

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
      canGoBack={false}
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
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Icon name="partyPopper" size={CELEBRATION_GLYPH} color={colors.accent} />
        </View>

        <View style={styles.headings}>
          <Text style={styles.headline}>{COMPLETION_HEADLINE}</Text>
          <Text style={styles.blurb}>{COMPLETION_BLURB}</Text>
        </View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>{SUMMARY_TITLE}</Text>

        <View style={styles.rows}>
          {rows.map((row) => (
            <View key={row} style={styles.row}>
              <Icon name="check" size={CHECK_GLYPH} color={colors.accent} />
              <Text style={styles.rowText}>{row}</Text>
            </View>
          ))}
        </View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  iconCircle: {
    width: controls.avatarSize,
    height: controls.avatarSize,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentTint,
  },
  headings: { alignItems: 'center', gap: spacing.sm },
  headline: { ...typography.display, color: colors.textPrimary, textAlign: 'center' },
  blurb: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  summary: {
    alignSelf: 'stretch',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  summaryTitle: { ...typography.overline, color: colors.textSecondary },
  rows: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { ...typography.body, color: colors.textPrimary },
});
