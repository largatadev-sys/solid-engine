import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMe } from '../hooks/useMe';
import { useMembers } from '../query/invitationQueries';
import { colors, radii, spacing, typography } from '../theme';
import { memberControls } from './memberControls';


export function OwnershipOfferBanner({ itineraryId }: { itineraryId: string }) {
  const members = useMembers(itineraryId);
  const { state: meState } = useMe();
  const myId = meState.kind === 'ok' ? meState.me.id : undefined;
  const { isOfferedToMe } = memberControls(members.data?.items ?? [], myId);

  if (!isOfferedToMe) {
    return null;
  }

  return (
    <Link href={`/members/${itineraryId}`} asChild>
      <Pressable style={styles.banner} accessibilityRole="button">
        <View style={styles.text}>
          <Text style={styles.title}>You&apos;ve been offered ownership</Text>
          <Text style={styles.body}>Review it on the Members screen to accept or decline.</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  text: { flexShrink: 1, gap: spacing.xs },
  title: { ...typography.bodyStrong, color: colors.textPrimary },
  body: { ...typography.caption, color: colors.textSecondary },
  chevron: { ...typography.body, color: colors.accent },
});
