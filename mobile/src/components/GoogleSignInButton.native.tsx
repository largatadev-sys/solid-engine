import { ActivityIndicator, Image, Pressable, StyleSheet, Text } from 'react-native';
import type { GoogleSignInButtonProps } from './googleSignInButtonContract';
import { colors, radii, spacing, typography } from '../theme';


export function GoogleSignInButton({ onPress, disabled, busy }: GoogleSignInButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
    >
      {busy ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <>
          <Image
            source={require('../../assets/google-g-logo.png')}
            style={styles.mark}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.label}>Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
}


const MARK_SIZE = 18;

const styles = StyleSheet.create({
  button: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pressed: { opacity: 0.7 },
  mark: { width: MARK_SIZE, height: MARK_SIZE },
  label: { ...typography.action, color: colors.textPrimary },
});
