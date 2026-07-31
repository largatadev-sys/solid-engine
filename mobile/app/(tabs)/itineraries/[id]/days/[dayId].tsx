import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../../../../src/api/ApiError';
import { comingSoon } from '../../../../../src/components/comingSoon';
import { archivedPlanNotice } from '../../../../../src/components/editLockedMessage';
import { Icon } from '../../../../../src/components/Icon';
import { missingItineraryMessage } from '../../../../../src/components/missingItineraryMessage';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useMe } from '../../../../../src/hooks/useMe';
import { formatTimeOfDay } from '../../../../../src/itineraries/formatActivityCost';
import { dayHeading } from '../../../../../src/itineraries/dayHeading';
import { attributionLine, leaseNotice } from '../../../../../src/itineraries/leaseIndicator';
import { initialsFor } from '../../../../../src/onboarding/initials';
import { useItinerary } from '../../../../../src/query/itineraryQueries';
import type { ActivityResponse } from '../../../../../src/types/api';
import { colors, radii, spacing, typography } from '../../../../../src/theme';


export default function DayDetailScreen() {
  const router = useRouter();
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const { data, isPending, isError, error } = useItinerary(id);

  const { state: meState } = useMe();
  const myId = meState.kind === 'ok' ? meState.me.id : undefined;

  if (isPending) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Day' }} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isError) {
    const missing = error instanceof ApiError && error.code === 'ITINERARY_NOT_FOUND';
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Day' }} />
        <Text style={styles.errorTitle}>
          {missing ? missingItineraryMessage.title : 'Could not load this day'}
        </Text>
        <Text style={styles.caption}>{missing ? missingItineraryMessage.body : error.message}</Text>
      </View>
    );
  }

  if (data.archived) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Day' }} />
        <Text style={styles.errorTitle}>{archivedPlanNotice.title}</Text>
        <Text style={styles.caption}>{archivedPlanNotice.body}</Text>
      </View>
    );
  }

  const day = data.days.find((candidate) => candidate.id === dayId);

  if (day === undefined) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Day' }} />
        <Text style={styles.errorTitle}>This day is no longer in the plan</Text>
        <Text style={styles.caption}>Somebody may have removed it. Open the trip to see what is there now.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {}
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={dayHeading(day)} size="heading" back />

      {day.activities.length === 0 ? (
        <Text style={styles.emptyState}>Nothing planned for this day yet.</Text>
      ) : (
        day.activities.map((activity) => (
          <ActivityBlock
            key={activity.id}
            activity={activity}
            myTravelerId={myId}
            onOpen={() =>
              router.push({
                pathname: '/itineraries/[id]/activity',
                params: { id, dayId: day.id, activityId: activity.id },
              })
            }
          />
        ))
      )}

      {}
      <Pressable
        style={styles.historyLink}
        onPress={() => comingSoon('activityHistory')}
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        accessibilityLabel="View activity history, coming soon"
      >
        <Text style={styles.historyLinkText}>View Activity History</Text>
      </Pressable>
    </ScrollView>
  );
}


function ActivityBlock({
  activity,
  myTravelerId,
  onOpen,
}: {
  activity: ActivityResponse;
  myTravelerId: string | undefined;
  onOpen: () => void;
}) {
  const clock = formatTimeOfDay(activity.timeOfDay);
  const notice = leaseNotice(activity.lease, myTravelerId);

  return (
    <View style={styles.block}>
      {}
      <Pressable
        style={[styles.card, notice !== null && styles.cardLeased]}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={activity.title}
      >
        {clock !== undefined && <Text style={styles.time}>{clock}</Text>}
        <Text style={styles.name}>{activity.title}</Text>
        {activity.place !== null && (
          <View style={styles.placeRow}>
            <Icon name="mapPin" size={PLACE_ICON_SIZE} color={colors.textSecondary} />
            <Text style={styles.place}>{activity.place}</Text>
          </View>
        )}
      </Pressable>

      {}
      {notice !== null && (
        <View style={styles.leaseRow}>
          <View style={styles.leaseAvatar}>
            <Text style={styles.leaseAvatarText}>
              {initialsFor(activity.lease?.displayName ?? null, null)}
            </Text>
          </View>
          <Text style={styles.leaseNotice}>{notice}</Text>
        </View>
      )}
      <Text style={styles.attribution}>{attributionLine(activity, Date.now())}</Text>
    </View>
  );
}

const LEASE_AVATAR_SIZE = 18;

const PLACE_ICON_SIZE = 14;

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.lg, backgroundColor: colors.background, flexGrow: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  emptyState: { ...typography.body, color: colors.textSecondary },
  block: { gap: spacing.xs },
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardLeased: { borderColor: colors.accent, borderWidth: 2 },
  time: { ...typography.caption, color: colors.accent, fontWeight: '700' },
  name: { ...typography.bodyStrong, color: colors.textPrimary },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  place: { ...typography.caption, color: colors.textSecondary },
  leaseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  leaseAvatar: {
    width: LEASE_AVATAR_SIZE,
    height: LEASE_AVATAR_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaseAvatarText: { ...typography.fine, color: colors.textPrimary },
  leaseNotice: { ...typography.caption, color: colors.accent, fontWeight: '700' },
  attribution: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.accentMuted,
    ...typography.fine,
    color: colors.accent,
    fontWeight: '700',
  },
  historyLink: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    opacity: 0.7,
  },
  historyLinkText: { ...typography.bodyStrong, color: colors.textSecondary },
  errorTitle: { ...typography.heading, color: colors.danger },
  caption: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
});
