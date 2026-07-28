import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMe } from '../hooks/useMe';
import { useMembers } from '../query/invitationQueries';
import { colors, radii, spacing, typography } from '../theme';
import { memberControls } from './memberControls';

/**
 * The trip screen's ownership-offer banner (S1.6) — how an offeree finds out at all.
 *
 * <p><strong>Why this exists, when the offer is already visible on the Members screen.</strong> The
 * offer/accept design was chosen over a unilateral transfer precisely because acceptance guarantees the
 * new owner *knows* they hold INV-4's load-bearing role. This product has no notifications, so that
 * guarantee is only as good as the surfaces the offer appears on — and an offer buried one screen deep,
 * behind a Members link nobody opens daily, would undercut the argument that won the design. The trip
 * screen is the surface anyone participating actually opens.
 *
 * <p>It rides the roster query the Members screen already uses — bounded (a handful of rows), cached,
 * no new endpoint — so the cost is a cache hit on most visits.
 *
 * <p>Only the offeree sees it. The owner knows (they made the offer, and their Members screen says so)
 * and uninvolved members have nothing to act on, so for them it would be noise on the screen they use
 * to read the plan.
 */
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
