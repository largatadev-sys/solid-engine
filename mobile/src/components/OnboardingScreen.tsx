import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StepIndicator } from './StepIndicator';
import { RESUME_LINE, SKIP_LABEL, landingOnTheWayOut } from '../onboarding/leaveOnboarding';
import { trackOnboardingSkipped } from '../onboarding/onboardingEvents';
import { messageForVerificationFailure } from '../onboarding/verificationMessages';
import { useCompleteOnboarding } from '../query/travelerQueries';
import { colors, spacing, typography } from '../theme';

interface OnboardingScreenProps {
  readonly step?: number;
  readonly canGoBack?: boolean;
  readonly resuming?: boolean;
  readonly title?: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
  readonly footer: ReactNode;
  readonly message?: string | null;
}

export function OnboardingScreen({
  step,
  canGoBack,
  resuming = false,
  title,
  subtitle,
  children,
  footer,
  message,
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const skip = useCompleteOnboarding();
  const [skipFailure, setSkipFailure] = useState<string | null>(null);

  const leave = async (from: number) => {
    setSkipFailure(null);
    try {
      await skip.mutateAsync();
      trackOnboardingSkipped(from);
      router.replace(landingOnTheWayOut());
    } catch (error) {
      setSkipFailure(messageForVerificationFailure(error));
    }
  };

  const notice = skipFailure ?? message ?? null;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <StepIndicator step={step} canGoBack={canGoBack} />

          {resuming && <Text style={styles.resume}>{RESUME_LINE}</Text>}

          <View style={styles.body}>
            {title !== undefined && <Text style={styles.title}>{title}</Text>}
            {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}

            {children}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.inner}>
          {notice !== null && <Text style={styles.message}>{notice}</Text>}
          {footer}

          {step !== undefined && resuming && (
            <Pressable
              style={styles.skip}
              onPress={() => void leave(step)}
              disabled={skip.isPending}
              accessibilityRole="button"
              accessibilityLabel={SKIP_LABEL}
            >
              <Text style={styles.skipLabel}>{SKIP_LABEL}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const CONTENT_MAX_WIDTH = 480;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, alignItems: 'center' },
  inner: { width: '100%', maxWidth: CONTENT_MAX_WIDTH },
  body: { paddingTop: spacing.lg, gap: spacing.md },
  title: { ...typography.title, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, alignItems: 'center' },
  message: { ...typography.caption, color: colors.danger, textAlign: 'center' },
  resume: { ...typography.caption, color: colors.textSecondary, paddingTop: spacing.xs },
  skip: { paddingTop: spacing.md, paddingBottom: spacing.xs, alignItems: 'center' },
  skipLabel: { ...typography.bodyStrong, color: colors.textSecondary },
});
