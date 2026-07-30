import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors, controls, radii, spacing, typography } from '../theme';

interface SelectableOptionProps {
  readonly label: string;
  readonly icon: IconName;
  readonly selected: boolean;
  readonly onPress: () => void;
}

const ICON_BOX = 32;
const ICON_GLYPH = 24;

export function SelectableOption({ label, icon, selected, onPress }: SelectableOptionProps) {
  return (
    <Pressable
      style={[styles.option, selected && styles.selected]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      <View style={styles.iconBox}>
        <Icon
          name={icon}
          size={ICON_GLYPH}
          color={selected ? colors.accent : colors.textSecondary}
        />
      </View>

      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    alignSelf: 'stretch',
    height: controls.optionHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.accentTint, borderColor: colors.accent },
  iconBox: { width: ICON_BOX, height: ICON_BOX, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.body, color: colors.textPrimary },
  selectedLabel: { ...typography.bodyStrong, color: colors.accent },
});
