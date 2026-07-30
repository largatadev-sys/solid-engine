import { Image, StyleSheet, Text, View } from 'react-native';
import { initialsFor } from '../onboarding/initials';
import { colors, radii, spacing, typography } from '../theme';

interface AvatarProps {
  readonly photoUrl: string | null;
  readonly displayName: string | null;
  readonly email: string | null;
}


export function Avatar({ photoUrl, displayName, email }: AvatarProps) {
  if (photoUrl !== null && photoUrl !== '') {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={styles.circle}
        accessibilityLabel="Your profile photo"
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View style={[styles.circle, styles.initialsGround]} accessibilityLabel="Your initials">
      <Text style={styles.initials}>{initialsFor(displayName, email)}</Text>
    </View>
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
