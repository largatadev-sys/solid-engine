import { StyleSheet, Text, View } from 'react-native';
import type { TimePickerProps } from './timePickerContract';
import { colors, radii, spacing, typography } from '../theme';


export function TimePicker({ label, value, onChange }: TimePickerProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <input
        type="time"
        value={value}
        onChange={(event: { target: { value: string } }) => onChange(event.target.value)}
        style={webInputStyle}
        aria-label={label}
      />
    </View>
  );
}


const webInputStyle = {
  fontSize: typography.body.fontSize,
  color: colors.textPrimary,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderStyle: 'solid' as const,
  borderColor: colors.border,
  borderRadius: radii.sm,
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
  paddingLeft: spacing.md,
  paddingRight: spacing.md,
};

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textSecondary },
});
