import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

interface SelectableChipProps {
  readonly label: string;
  readonly blurb?: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly block?: boolean;
}

export function SelectableChip({ label, blurb, selected, onPress, block = false }: SelectableChipProps) {
  return (
    <Pressable
      style={[styles.chip, block && styles.block, selected && styles.selected]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      <View style={styles.text}>
        <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
        {blurb !== undefined && <Text style={styles.blurb}>{blurb}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  block: { alignSelf: 'stretch', borderRadius: radii.md, paddingVertical: spacing.md },
  selected: { borderColor: colors.accent, backgroundColor: colors.surfaceMuted },
  text: { gap: spacing.xs },
  label: { ...typography.action, color: colors.textPrimary },
  selectedLabel: { color: colors.accent },
  blurb: { ...typography.caption, color: colors.textSecondary },
});
