import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

interface SelectableChipProps {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}

export function SelectableChip({ label, selected, onPress }: SelectableChipProps) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.selected]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  label: { ...typography.label, color: colors.textPrimary },
  selectedLabel: { color: colors.textOnAccent },
});
