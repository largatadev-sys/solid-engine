import { StyleSheet, Text, View } from 'react-native';
import { STEP_COUNT } from '../onboarding/onboardingGate';
import { colors, radii, spacing, typography } from '../theme';

interface StepIndicatorProps {
  readonly step: number;
}

export function StepIndicator({ step }: StepIndicatorProps) {
  const steps = Array.from({ length: STEP_COUNT }, (_, index) => index + 1);

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityValue={{ now: step, min: 1, max: STEP_COUNT }}>
      <Text style={styles.caption}>{`Step ${step} of ${STEP_COUNT}`}</Text>

      <View style={styles.track}>
        {steps.map((index) => (
          <View key={index} style={[styles.tick, index <= step ? styles.reached : styles.pending]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', gap: spacing.sm },
  caption: { ...typography.label, color: colors.textSecondary },
  track: { flexDirection: 'row', gap: spacing.sm },
  tick: { flex: 1, height: spacing.xs, borderRadius: radii.pill },
  reached: { backgroundColor: colors.accent },
  pending: { backgroundColor: colors.border },
});
