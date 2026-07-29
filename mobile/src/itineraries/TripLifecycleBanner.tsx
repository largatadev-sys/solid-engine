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
