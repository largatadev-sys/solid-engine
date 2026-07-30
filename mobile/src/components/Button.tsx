import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, controls, radii, spacing, typography } from '../theme';

export type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly busy?: boolean;
  readonly disabled?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  busy = false,
  disabled = false,
  style,
}: ButtonProps) {
  const secondary = variant === 'secondary';
  const inert = disabled || busy;

  return (
    <Pressable
      style={[styles.base, secondary ? styles.secondary : styles.primary, inert && styles.inert, style]}
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy }}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.accent : colors.textOnAccent} />
      ) : (
        <Text style={secondary ? styles.secondaryLabel : styles.primaryLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    height: controls.buttonHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  inert: { opacity: 0.55 },
  primaryLabel: { ...typography.action, color: colors.textOnAccent },
  secondaryLabel: { ...typography.action, color: colors.textPrimary },
});
