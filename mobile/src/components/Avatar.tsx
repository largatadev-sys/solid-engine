import { StyleSheet, Text } from 'react-native';
import { initialsFor } from '../onboarding/initials';
import { MediaThumb } from '../media/MediaThumb';
import { colors, radii, spacing, typography } from '../theme';

interface AvatarProps {
  readonly photoUrl: string | null;
  readonly displayName: string | null;
  readonly email: string | null;
}


export function Avatar({ photoUrl, displayName, email }: AvatarProps) {
  return (
    <MediaThumb
      url={photoUrl}
      style={styles.circle}
      fallbackStyle={styles.initialsGround}
      accessibilityLabel="Your profile photo"
      fallback={<Text style={styles.initials}>{initialsFor(displayName, email)}</Text>}
    />
  );
}

const SIZE = 96;

const styles = StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: radii.pill,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  initialsGround: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  initials: { ...typography.display, color: colors.accent },
});
