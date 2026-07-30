import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, controls, radii, spacing, typography } from '../theme';

interface FormFieldProps extends TextInputProps {
  readonly label: string;
  readonly prefix?: string;
  readonly area?: boolean;
  readonly trailing?: { readonly text: string; readonly onPress: () => void; readonly accessibilityLabel: string };
}

export function FormField({ label, prefix, area = false, trailing, style, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.shell, area && styles.areaShell]}>
        {prefix !== undefined && <Text style={styles.prefix}>{prefix}</Text>}

        <TextInput
          style={[styles.input, area && styles.areaInput, style]}
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={label}
          {...inputProps}
        />

        {trailing !== undefined && (
          <Pressable
            onPress={trailing.onPress}
            accessibilityRole="button"
            accessibilityLabel={trailing.accessibilityLabel}
            hitSlop={spacing.sm}
          >
            <Text style={styles.trailing}>{trailing.text}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { alignSelf: 'stretch', gap: spacing.sm },
  label: { ...typography.label, color: colors.textPrimary },
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: controls.inputHeight,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  areaShell: { height: controls.bioHeight, alignItems: 'flex-start', paddingVertical: spacing.md },
  prefix: { ...typography.body, color: colors.textSecondary },
  input: { flex: 1, ...typography.body, color: colors.textPrimary },
  areaInput: { height: '100%', textAlignVertical: 'top' },
  trailing: { ...typography.label, color: colors.accent },
});
