import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { completeTripWording, startTripWording } from '../components/confirmDestructiveMessage';
import { confirmWith } from '../components/confirmDestructive';
import { useMe } from '../hooks/useMe';
import { useMembers } from '../query/invitationQueries';
import { memberControls } from '../members/memberControls';
import { useCompleteTrip, useStartTrip } from '../query/itineraryQueries';
import { colors, radii, spacing, typography } from '../theme';
import type { ItineraryResponse } from '../types/api';
import { deviceToday, lifecycleBanner } from './lifecycleBanner';

/**
 * The trip screen's lifecycle banner (S1.7) — the owner's one lever for `draft → active → completed`.
 *
 * <p><strong>Nudge and control in one surface.</strong> Register #10 resolved that dates never drive a
 * transition; they only suggest one. So the banner is always present for the owner and merely changes
 * its copy when the trip's own dates say the transition is overdue — no modal, no dismissal state to
 * store, nothing that nags. A passive banner is the whole reason a dismissal mechanism is unnecessary.
 *
 * <p><strong>Members see nothing here</strong> (the lever is the owner's — S1.3's split: members shape
 * the plan, the owner keeps lifecycle, membership and existence). They still see the state badge above
 * it, which is a workspace-visible fact. The decision itself lives in the pure {@link lifecycleBanner},
 * where the Jest table drives it; this component renders the answer and nothing more.
 *
 * <p>Ownership comes from the roster query the Members screen and the offer banner already share —
 * cached and bounded, so this is a cache hit on most visits. While it is still loading nobody is
 * treated as the owner, so the banner appears rather than flickering away.
 *
 * <p><strong>Named `Trip…` rather than matching its helper</strong>: `LifecycleBanner.tsx` beside
 * `lifecycleBanner.ts` collides on a case-insensitive filesystem (Windows, macOS), and TypeScript
 * resolves the import to whichever it saw first — so the screen imported the *helper* and failed with
 * "only refers to a type". A distinct name is the fix that cannot regress; matching case is not.
 */
export function TripLifecycleBanner({ itinerary }: { itinerary: ItineraryResponse }) {
  const members = useMembers(itinerary.id);
  const { state: meState } = useMe();
  const myId = meState.kind === 'ok' ? meState.me.id : undefined;
  const { isOwner } = memberControls(members.data?.items ?? [], myId);

  const start = useStartTrip(itinerary.id);
  const complete = useCompleteTrip(itinerary.id);

  const banner = lifecycleBanner(itinerary, isOwner, deviceToday());
  if (banner === null) {
    return null;
  }

  const starting = banner.act === 'start';
  const mutation = starting ? start : complete;
  const wording = starting ? startTripWording() : completeTripWording();

  const onPress = () => {
    // Platform-forked: `Alert.alert` is a no-op on react-native-web, so an unforked confirm would make
    // this button do nothing at all in the browser (the S1.3 gotcha). The mutation runs only inside
    // the confirm callback, which is what makes "cancel" genuinely cancel.
    confirmWith(wording, () => mutation.mutate());
  };

  return (
    <View style={[styles.banner, banner.overdue && styles.overdue]}>
      <View style={styles.text}>
        <Text style={styles.title}>{title(banner.act, banner.overdue, itinerary)}</Text>
        <Text style={styles.body}>{body(banner.act, banner.overdue)}</Text>
        {mutation.isError && <Text style={styles.error}>{mutation.error.message}</Text>}
      </View>
      {mutation.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Pressable
          style={styles.action}
          accessibilityRole="button"
          disabled={mutation.isPending}
          onPress={onPress}>
          <Text style={styles.actionText}>{starting ? 'Start' : 'Complete'}</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * The headline. When a date has passed it leads with that date, because the fact is the nudge — an
 * owner who sees "Start date was 10 Jan" knows immediately whether the suggestion is right, in a way
 * "Ready to start?" never tells them.
 */
function title(act: 'start' | 'complete', overdue: boolean, itinerary: ItineraryResponse): string {
  if (!overdue) {
    return act === 'start' ? 'Not started yet' : 'Trip in progress';
  }
  const date = act === 'start' ? itinerary.startDate : itinerary.endDate;
  return act === 'start' ? `Start date was ${date}` : `End date was ${date}`;
}

function body(act: 'start' | 'complete', overdue: boolean): string {
  if (act === 'start') {
    return overdue ? 'Is this trip underway?' : 'Mark it active when the trip begins.';
  }
  return overdue ? 'Is this trip over?' : 'Mark it complete when the trip ends.';
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
    borderColor: colors.accentMuted,
    backgroundColor: colors.surface,
  },
  // The nudge, rendered: a stronger border when the trip's own dates say the transition is due. Colour
  // alone is not the signal — the copy changes too — so this reads correctly without colour perception.
  overdue: { borderColor: colors.accent },
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
