import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StepIndicator } from './StepIndicator';
import { colors, spacing, typography } from '../theme';

interface OnboardingScreenProps {
  readonly step?: number;
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
  readonly footer: ReactNode;
  readonly message?: string | null;
}

export function OnboardingScreen({
  step,
  title,
  subtitle,
  children,
  footer,
  message,
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          {step !== undefined && <StepIndicator step={step} />}

          <Text style={styles.title}>{title}</Text>
          {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}

          {children}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.inner}>
          {message !== undefined && message !== null && <Text style={styles.message}>{message}</Text>}
          {footer}
        </View>
      </View>
    </View>
  );
}

const CONTENT_MAX_WIDTH = 480;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, alignItems: 'center' },
  inner: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, gap: spacing.md },
  title: { ...typography.title, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  footer: { padding: spacing.lg, alignItems: 'center' },
  message: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
