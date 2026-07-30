import { Link, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface AuthScreenLayoutProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly footerPrompt: string;
  readonly footerAction: string;
  readonly footerHref: '/sign-in' | '/sign-up';
}

export function AuthScreenLayout({
  title,
  children,
  footerPrompt,
  footerAction,
  footerHref,
}: AuthScreenLayoutProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          style={styles.back}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>

        <Text style={styles.title}>{title}</Text>

        {children}
      </ScrollView>

      <View style={styles.footer}>
        <Link href={footerHref} replace asChild>
          <Pressable accessibilityRole="button">
            <Text style={styles.footerText}>
              {footerPrompt} <Text style={styles.footerAction}>{footerAction}</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  back: { width: spacing.xl, height: spacing.xl, justifyContent: 'center' },
  backGlyph: { ...typography.display, color: colors.textPrimary },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.xs },
  footer: { padding: spacing.lg, alignItems: 'center' },
  footerText: { ...typography.link, color: colors.textSecondary },
  footerAction: { color: colors.accent },
});
