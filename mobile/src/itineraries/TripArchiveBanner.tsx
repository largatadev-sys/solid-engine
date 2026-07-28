import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { archiveTripWording, unarchiveTripWording } from '../components/confirmDestructiveMessage';
import { confirmWith } from '../components/confirmDestructive';
import { useMe } from '../hooks/useMe';
import { useMembers } from '../query/invitationQueries';
import { memberControls } from '../members/memberControls';
import { useArchiveTrip, useUnarchiveTrip } from '../query/itineraryQueries';
import { colors, radii, spacing, typography } from '../theme';
import type { ItineraryResponse } from '../types/api';
import { archiveControl } from './archiveControls';

/**
 * The trip screen's archive surface (S1.9) — the owner's lever, and everyone's notice.
 *
 * <p><strong>Two audiences, one component, and the split is deliberate.</strong> On an archived trip
 * <em>every</em> viewer sees the frozen notice — that is what stops the missing Add/Edit buttons from
 * reading as a broken screen (the S1.5 copy lesson: name the cause). Only the owner sees a button, for
 * `TripLifecycleBanner`'s reason: archive is one of the acts S1.3's ruling reserves to them.
 *
 * <p>The consequence is that a member on an archived trip gets a banner with no action, which is
 * correct and is the whole point — they need the explanation more than the owner does, since they
 * cannot see who archived it or undo it. A live trip shows a member nothing at all.
 *
 * <p>Ownership comes from the roster query the Members screen, the offer banner and the lifecycle
 * banner already share — a cache hit on most visits. <strong>While it loads nobody is treated as the
 * owner</strong>, so the button arrives rather than vanishing, for the reason `TripLifecycleBanner`
 * records at length.
 *
 * <p>Named `Trip…` rather than matching `archiveControls.ts` for the case-insensitive-filesystem
 * collision `TripLifecycleBanner` documents — a distinct name is the fix that cannot regress.
 */
export function TripArchiveBanner({ itinerary }: { itinerary: ItineraryResponse }) {
  const members = useMembers(itinerary.id);
  const { state: meState } = useMe();
  const myId = meState.kind === 'ok' ? meState.me.id : undefined;
  const { isOwner } = memberControls(members.data?.items ?? [], myId);

  const archive = useArchiveTrip(itinerary.id);
  const unarchive = useUnarchiveTrip(itinerary.id);

  const control = archiveControl(itinerary, isOwner);

  // A live trip with no lever to offer (a member's view) has nothing to say — the notice exists to
  // explain a frozen screen, and there is nothing frozen here.
  if (!itinerary.archived && control === null) {
    return null;
  }

  const archiving = control?.act === 'archive';
  const mutation = archiving ? archive : unarchive;
  const wording = archiving ? archiveTripWording() : unarchiveTripWording();

  const onPress = () => {
    // Platform-forked: `Alert.alert` is a no-op on react-native-web, so an unforked confirm would make
    // this button do nothing at all in the browser (the S1.3 gotcha). The mutation runs only inside the
    // confirm callback, which is what makes "cancel" genuinely cancel.
    confirmWith(wording, () => mutation.mutate());
  };

  return (
    <View style={[styles.banner, itinerary.archived && styles.archived]}>
      <View style={styles.text}>
        <Text style={styles.title}>{itinerary.archived ? 'Archived' : 'Done with this trip?'}</Text>
        <Text style={styles.body}>
          {itinerary.archived
            ? 'This trip is read-only. Unarchive it to make changes.'
            : 'Archive it to clear it from your trip list. Nothing is deleted.'}
        </Text>
        {mutation.isError && <Text style={styles.error}>{mutation.error.message}</Text>}
      </View>
      {control !== null &&
        (mutation.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Pressable
            style={styles.action}
            accessibilityRole="button"
            disabled={mutation.isPending}
            onPress={onPress}>
            <Text style={styles.actionText}>{archiving ? 'Archive' : 'Unarchive'}</Text>
          </Pressable>
        ))}
    </View>
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
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  // An archived trip's notice is the strongest thing on the screen, because it explains every control
  // that is missing below it. Not colour alone — the copy carries the same fact for anyone who cannot
  // distinguish it (the S1.7 banner's rule).
  archived: { borderColor: colors.accent },
  text: { flexShrink: 1, gap: spacing.xs },
  title: { ...typography.bodyStrong, color: colors.textPrimary },
  body: { ...typography.caption, color: colors.textSecondary },
  error: { ...typography.caption, color: colors.danger },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  actionText: { ...typography.bodyStrong, color: colors.accent },
});
