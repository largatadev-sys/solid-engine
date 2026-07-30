import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { STEP_COUNT } from '../onboarding/onboardingGate';
import { colors, controls, radii, spacing, typography } from '../theme';

interface StepIndicatorProps {
  readonly step?: number;
  readonly canGoBack?: boolean;
}

const BACK_GLYPH_SIZE = 24;

export function StepIndicator({ step, canGoBack = true }: StepIndicatorProps) {
  const router = useRouter();
  const bars = Array.from({ length: STEP_COUNT }, (_, index) => index + 1);

  return (
    <View style={styles.header}>
      <View style={styles.navrow}>
        {canGoBack ? (
          <Pressable
            style={styles.backbtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name="back" size={BACK_GLYPH_SIZE} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.navspacer} />
        )}

        {step !== undefined && (
          <Text style={styles.stepnum}>{`Step ${step} of ${STEP_COUNT}`}</Text>
        )}

        <View style={styles.navspacer} />
      </View>

      {step !== undefined && (
        <View
          style={styles.progress}
          accessibilityRole="progressbar"
          accessibilityValue={{ now: step, min: 1, max: STEP_COUNT }}
        >
          {bars.map((index) => (
            <View key={index} style={[styles.bar, index <= step ? styles.reached : styles.pending]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignSelf: 'stretch', paddingBottom: spacing.sm },
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
  stepnum: { ...typography.label, color: colors.textSecondary },
  progress: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  bar: { flex: 1, height: controls.progressHeight, borderRadius: radii.xs },
  reached: { backgroundColor: colors.accent },
  pending: { backgroundColor: colors.border },
});
