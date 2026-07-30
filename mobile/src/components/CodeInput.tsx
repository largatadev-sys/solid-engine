import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRef } from 'react';
import { CODE_LENGTH, digitsOnly } from '../onboarding/verificationMessages';
import { colors, controls, radii, spacing, typography } from '../theme';

interface CodeInputProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly editable: boolean;
  readonly invalid: boolean;
}

export function CodeInput({ value, onChange, editable, invalid }: CodeInputProps) {
  const field = useRef<TextInput>(null);
  const boxes = Array.from({ length: CODE_LENGTH }, (_, index) => index);

  return (
    <Pressable style={styles.wrap} onPress={() => field.current?.focus()} accessibilityRole="none">
      <TextInput
        ref={field}
        style={styles.hidden}
        value={value}
        onChangeText={(raw) => onChange(digitsOnly(raw))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        editable={editable}
        autoFocus
        accessibilityLabel="Verification code"
      />

      {boxes.map((index) => (
        <View
          key={index}
          style={[
            styles.box,
            index === value.length && editable && styles.active,
            invalid && styles.invalid,
          ]}
        >
          <Text style={styles.digit}>{value[index] ?? ''}</Text>
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  hidden: { position: 'absolute', opacity: 0, height: controls.codeBoxHeight, width: '100%' },
  box: {
    flex: 1,
    height: controls.codeBoxHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  active: { borderColor: colors.accent },
  invalid: { borderColor: colors.danger },
  digit: { ...typography.codeDigit, color: colors.textPrimary },
});
