import { StyleSheet, Text, View } from 'react-native';
import { messageForAuthFailure } from '../auth/authFailureMessage';
import { authCapabilities, authRepository } from '../repositories/authRepository';
import { colors, spacing, typography } from '../theme';
import { GoogleSignInButton } from './GoogleSignInButton';

interface GoogleDoorwayProps {
  readonly busy: boolean;
  readonly disabled: boolean;
  readonly onBusyChange: (busy: boolean) => void;
  readonly onMessage: (message: string | null) => void;
}

export function GoogleDoorway({ busy, disabled, onBusyChange, onMessage }: GoogleDoorwayProps) {
  if (authCapabilities.google === 'none') return null;

  const press = async () => {
    onBusyChange(true);
    onMessage(null);
    try {
      await authRepository.signInWithGoogle();
    } catch (error) {
      onMessage(messageForAuthFailure(error));
    } finally {
      onBusyChange(false);
    }
  };

  return (
    <View style={styles.slot}>
      <Text style={styles.divider}>or continue with Google</Text>

      <GoogleSignInButton
        onPress={() => void press()}
        onStart={() => {
          onBusyChange(true);
          onMessage(null);
        }}
        onSettle={() => onBusyChange(false)}
        onError={onMessage}
        disabled={disabled}
        busy={busy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.xs },
  divider: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
});
