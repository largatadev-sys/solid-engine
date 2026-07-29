import { Pressable, StyleSheet, Text, View } from 'react-native';
import { comingSoon } from './comingSoon';
import { colors, radii, spacing, typography } from '../theme';


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
