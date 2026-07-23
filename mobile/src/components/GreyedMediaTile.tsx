import { Pressable, StyleSheet, Text, View } from 'react-native';
import { comingSoon } from './comingSoon';
import { colors, radii, spacing, typography } from '../theme';

/**
 * A media upload tile the mock shows but S3.3 (the media pipeline) hasn't built yet (S1.3, ticket 05).
 *
 * Renders disabled with a dashed drop-zone look, and a tap answers "photos arrive with a later
 * update" (the S0.5 graceful-affordance pattern via `comingSoon`) — never a dead tap, never a route
 * into a picker that does not exist. Its position is the mock's promise; the behaviour is S3.3's.
 *
 * @param label the affordance's name ("Cover photo", "Add photo") — also what the coming-soon message
 *     names, so the two stay in step
 */
export function GreyedMediaTile({ label }: { label: string }) {
  return (
    <Pressable
      style={styles.tile}
      onPress={() => comingSoon(label)}
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      accessibilityLabel={`${label}, coming soon`}
    >
      <View style={styles.inner}>
        <Text style={styles.plus}>+</Text>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>Coming soon</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    opacity: 0.7,
  },
  inner: { alignItems: 'center', gap: spacing.xs },
  plus: { ...typography.title, color: colors.textSecondary },
  label: { ...typography.bodyStrong, color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.textSecondary },
});
