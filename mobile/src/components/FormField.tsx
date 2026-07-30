import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

interface FormFieldProps extends TextInputProps {
  readonly label: string;
  readonly prefix?: string;
  readonly trailing?: { readonly text: string; readonly onPress: () => void; readonly accessibilityLabel: string };
  readonly hint?: string;
  readonly hintTone?: 'muted' | 'danger' | 'success';
}

export const FormField = forwardRef<TextInput, FormFieldProps>(function FormField(
  { label, prefix, trailing, hint, hintTone = 'muted', style, ...inputProps },
  ref,
) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.shell}>
        {prefix !== undefined && <Text style={styles.prefix}>{prefix}</Text>}

        <TextInput
          ref={ref}
          style={[styles.input, style]}
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

      {hint !== undefined && <Text style={[styles.hint, styles[hintTone]]}>{hint}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  field: { alignSelf: 'stretch', gap: spacing.sm },
  label: { ...typography.label, color: colors.textPrimary },
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  prefix: { ...typography.body, color: colors.textSecondary },
  input: { flex: 1, paddingVertical: spacing.md, ...typography.body, color: colors.textPrimary },
  trailing: { ...typography.label, color: colors.accent },
  hint: { ...typography.caption },
  muted: { color: colors.textSecondary },
  danger: { color: colors.danger },
  success: { color: colors.success },
});
