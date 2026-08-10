import { StyleSheet, Text, View } from 'react-native';
import { MediaThumb } from '../media/MediaThumb';
import { initialsFor } from '../onboarding/initials';
import { colors, radii, spacing, typography } from '../theme';
import type { ProfileCard } from './profileCard';

interface ProfileCardViewProps {
  readonly card: ProfileCard;
  readonly photoLabel: string;
}


export function ProfileCardView({ card, photoLabel }: ProfileCardViewProps) {
  return (
    <View style={styles.card}>
      <MediaThumb
        url={card.avatarUrl}
        style={styles.circle}
        fallbackStyle={styles.initialsGround}
        accessibilityLabel={photoLabel}
        fallback={<Text style={styles.initials}>{initialsFor(card.displayName, null)}</Text>}
      />
      <Text style={styles.name}>{card.displayName}</Text>
      {card.handle !== null && <Text style={styles.handle}>@{card.handle}</Text>}
      {card.bio !== null && <Text style={styles.bio}>{card.bio}</Text>}
      {card.vanityNumber !== null && <Text style={styles.vanityNumber}>{card.vanityNumber}</Text>}
    </View>
  );
}


const SIZE = 96;
const CARD_MAX_WIDTH = 420;

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accentMuted,
  },
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
  name: { ...typography.heading, color: colors.textPrimary },
  handle: { ...typography.bodyStrong, color: colors.accent },
  bio: { ...typography.caption, textAlign: 'center', color: colors.textSecondary },
  vanityNumber: { ...typography.mono, color: colors.accent, letterSpacing: 1 },
});
