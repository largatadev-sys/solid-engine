import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { track } from '../analytics/track';
import { COMING_SOON_SEEN, COMING_SOON_SURFACES, type ComingSoonSurface } from './comingSoonMessage';
import { colors, spacing, typography } from '../theme';


export function ComingSoonScreen({ surface }: { surface: ComingSoonSurface }) {
  useEffect(() => {
    track(COMING_SOON_SEEN, { surface });
  }, [surface]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{COMING_SOON_SURFACES[surface]}</Text>
      <Text style={styles.caption}>
        This part of the app is still being built. It will arrive in a later update.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: { ...typography.heading, color: colors.textPrimary },
  caption: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
});
