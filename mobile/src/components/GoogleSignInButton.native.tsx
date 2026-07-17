import { ActivityIndicator, Image, Pressable, StyleSheet, Text } from 'react-native';
import type { GoogleSignInButtonProps } from './googleSignInButtonContract';
import { colors, radii, spacing, typography } from '../theme';

/**
 * The Google doorway's button on native (S0.6) — Google's mark on our own pill.
 *
 * <p><strong>Why not the library's `GoogleSigninButton`.</strong> It was tried first (the founder's
 * parity ruling asked for Google's official button) and it looked wrong beside our screen: square
 * corners, a heavy drop shadow, "Sign in with Google" — Google's *older* button spec, sitting a few
 * pixels above our flat pill. Worse, it made the platforms <em>less</em> alike, not more: web's
 * button is drawn by GIS itself as a flat <em>pill</em> reading "Continue with Google". The library
 * exposes only `Size` and `Color` — no radius, no elevation, no text — so it cannot be made to
 * match. The ruling ("web and mobile identical as much as possible") is better served by drawing the
 * button ourselves to match what GIS renders on web.
 *
 * <p><strong>This is sanctioned, not a workaround.</strong> Google's branding guidelines permit a
 * custom button provided it uses their unmodified mark, approved wording, and adequate size — which
 * is what this is. The mark is Google's own published asset (`assets/google-g-logo.png`), not a
 * redraw; see that file's provenance in the S0.6 ticket.
 *
 * <p><strong>The flow is untouched.</strong> `onPress` still runs the screen's `run('google', …)` →
 * `authRepository.signInWithGoogle()` → account picker, the chain proven on a physical phone at
 * S0.5. This file draws; it decides nothing. (Web is the platform whose control flow inverts — GIS
 * owns the click there — which is why `.web.tsx` looks so different.)
 */
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
            // The mark must never be recoloured or distorted (Google's terms): contain, fixed box.
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.label}>Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
}

/** Matches GIS's web button: 18px mark, flat, pill, hairline border on white. */
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
  // No elevation/shadow, deliberately: the web button is flat and so is our Sign in pill. The
  // library button's shadow is what made the old one look pasted on from another app.
  pressed: { opacity: 0.7 },
  mark: { width: MARK_SIZE, height: MARK_SIZE },
  label: { ...typography.action, color: colors.textPrimary },
});
