import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../../../../src/api/ApiError';
import { comingSoon } from '../../../../../src/components/comingSoon';
import { confirmDestructive } from '../../../../../src/components/confirmDestructive';
import { archivedPlanNotice } from '../../../../../src/components/editLockedMessage';
import { missingItineraryMessage } from '../../../../../src/components/missingItineraryMessage';
import { useEditLock } from '../../../../../src/hooks/useEditLock';
import { useMe } from '../../../../../src/hooks/useMe';
import { Icon } from '../../../../../src/components/Icon';
import { placeAndCost } from '../../../../../src/itineraries/activityMeta';
import { formatTimeOfDay } from '../../../../../src/itineraries/formatActivityCost';
import { initialsFor } from '../../../../../src/onboarding/initials';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { ActivityKebab } from '../../../../../src/itineraries/ActivityKebab';
import { attributionLine, leaseNotice } from '../../../../../src/itineraries/leaseIndicator';
import { applyMove, type ReorderMove } from '../../../../../src/itineraries/reorderActivityIds';
import { memberControls } from '../../../../../src/members/memberControls';
import { useMembers } from '../../../../../src/query/invitationQueries';
import {
  useAppendDay,
  useDeleteActivity,
  useDeleteDay,
  useItinerary,
  useRenameDay,
  useReorderActivities,
} from '../../../../../src/query/itineraryQueries';
import type { ActivityResponse, DayResponse } from '../../../../../src/types/api';
import { colors, radii, spacing, typography } from '../../../../../src/theme';


export default function DaySurfaceScreen() {
  const router = useRouter();
  const { id, day: dayParam } = useLocalSearchParams<{ id: string; day?: string }>();
  const { data, isPending, isError, error, refetch } = useItinerary(id);

  const members = useMembers(id);
  const { state: meState } = useMe();
  const myId = meState.kind === 'ok' ? meState.me.id : undefined;
  const { isOwner } = memberControls(members.data?.items ?? [], myId);

  const appendDay = useAppendDay(id);
  const renameDay = useRenameDay(id);
  const deleteDay = useDeleteDay(id);
  const deleteActivity = useDeleteActivity(id);
  const reorderActivities = useReorderActivities(id);

  const lease = useEditLock(id);

  const [selectedOrdinal, setSelectedOrdinal] = useState(() => {
    const requested = Number(dayParam ?? '1');
    return Number.isFinite(requested) && requested >= 1 ? requested : 1;
  });

  const mutationError = [appendDay, renameDay, deleteDay, deleteActivity]
    .map((m) => m.error)
    .find((e): e is Error => e !== null && e !== undefined);
  const mutationMessage = mutationError instanceof ApiError ? mutationError.message : mutationError?.message;

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isError) {
    const missing = error instanceof ApiError && error.code === 'ITINERARY_NOT_FOUND';
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>
          {missing ? missingItineraryMessage.title : 'Could not load this plan'}
        </Text>
        <Text style={styles.caption}>{missing ? missingItineraryMessage.body : error.message}</Text>
      </View>
    );
  }

  if (data.archived) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>{archivedPlanNotice.title}</Text>
        <Text style={styles.caption}>{archivedPlanNotice.body}</Text>
      </View>
    );
  }

  const days = data.days;
  const selected = days.find((d) => d.ordinal === selectedOrdinal) ?? days[0];

  async function withDayLease(dayId: string, act: () => void): Promise<void> {
    if (await lease.acquire({ subjectType: 'day', subjectId: dayId })) act();
  }

  async function withActivityLease(activityId: string, act: () => void): Promise<void> {
    if (await lease.acquire({ subjectType: 'activity', subjectId: activityId })) act();
  }

  function reorder(dayId: string, currentIds: string[], move: ReorderMove): void {
    const desired = applyMove(currentIds, move);
    if (desired === null) return;

    reorderActivities.mutate(
      { dayId, activityIds: desired, expectedActivityIds: currentIds },
      {
        onError: (reorderError) => {
          if (!(reorderError instanceof ApiError) || reorderError.code !== 'STALE_REORDER') return;
          void refetch().then((fresh) => {
            const freshIds =
              fresh.data?.days.find((d) => d.id === dayId)?.activities.map((a) => a.id) ?? null;
            if (freshIds === null) return;
            const reapplied = applyMove(freshIds, move);
            if (reapplied === null) return;
            reorderActivities.mutate({ dayId, activityIds: reapplied, expectedActivityIds: freshIds });
          });
        },
      },
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title={data.title}
          back
          backTo={{ pathname: '/itineraries/[id]', params: { id } }}
          action={
            <Pressable
              onPress={() => router.push({ pathname: '/itineraries/[id]', params: { id, tab: 'details' } })}
              accessibilityRole="button"
              accessibilityLabel="Trip settings"
              hitSlop={spacing.sm}
            >
              <Icon name="settings" size={SETTINGS_ICON_SIZE} color={colors.textPrimary} />
            </Pressable>
          }
        />

        {mutationMessage !== undefined && <Text style={styles.mutationError}>{mutationMessage}</Text>}

        {days.length === 0 ? (
          <Text style={styles.emptyState}>
            {isOwner
              ? 'No days yet. Add the first day to start building the plan.'
              : 'No days yet. The trip owner adds days to this plan.'}
          </Text>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabStripOuter}
              contentContainerStyle={styles.tabStrip}
            >
              {days.map((day) => (
                <DayChip
                  key={day.id}
                  day={day}
                  selected={day.ordinal === (selected?.ordinal ?? 1)}
                  onPress={() => setSelectedOrdinal(day.ordinal)}
                />
              ))}
              {isOwner && <AddDayChip pending={appendDay.isPending} onPress={() => appendDay.mutate({})} />}
            </ScrollView>

            {selected !== undefined && (
              <SelectedDay
                key={selected.id}
                day={selected}
                myTravelerId={myId}
                isOwner={isOwner}
                onTitleFocus={() => void withDayLease(selected.id, () => {})}
                onRename={(title) =>
                  renameDay.mutate({ dayId: selected.id, title }, { onSettled: () => lease.release() })
                }
                onDelete={() =>
                  confirmDeleteDay(selected, () => {
                    void withDayLease(selected.id, () => {
                      deleteDay.mutate({ dayId: selected.id });
                      setSelectedOrdinal(1);
                    });
                  })
                }
                onEditActivity={(activityId) =>
                  router.push({
                    pathname: '/itineraries/[id]/activity',
                    params: { id, dayId: selected.id, activityId },
                  })
                }
                onDeleteActivity={(activity) =>
                  confirmDeleteActivity(activity, () => {
                    void withActivityLease(activity.id, () =>
                      deleteActivity.mutate({ dayId: selected.id, activityId: activity.id }),
                    );
                  })
                }
                onReorder={(move) =>
                  reorder(
                    selected.id,
                    selected.activities.map((a) => a.id),
                    move,
                  )
                }
                deleting={deleteDay.isPending}
              />
            )}
          </>
        )}

        {days.length === 0 && isOwner && (
          <Pressable
            style={[styles.primaryButton, appendDay.isPending && styles.busy]}
            onPress={() => appendDay.mutate({})}
            disabled={appendDay.isPending}
            accessibilityRole="button"
          >
            {appendDay.isPending ? (
              <ActivityIndicator color={colors.textOnAccent} />
            ) : (
              <Text style={styles.primaryButtonText}>Add the first day</Text>
            )}
          </Pressable>
        )}

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

      {selected !== undefined && (
        <Pressable
          style={styles.fab}
          onPress={() =>
            router.push({ pathname: '/itineraries/[id]/activity', params: { id, dayId: selected.id } })
          }
          accessibilityRole="button"
          accessibilityLabel="Add activity"
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      )}
    </View>
  );
}


function confirmDeleteDay(day: DayResponse, onConfirm: () => void): void {
  const label = day.title !== null ? `"${day.title}"` : `Day ${day.ordinal}`;
  confirmDestructive(`${label} and everything in it`, onConfirm);
}


function confirmDeleteActivity(activity: ActivityResponse, onConfirm: () => void): void {
  confirmDestructive(`"${activity.title}"`, onConfirm);
}


function DayChip({ day, selected, onPress }: { day: DayResponse; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.tab, selected && styles.tabSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.tabText, selected && styles.tabTextSelected]}>Day {day.ordinal}</Text>
    </Pressable>
  );
}

function AddDayChip({ pending, onPress }: { pending: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={styles.addChip}
      onPress={onPress}
      disabled={pending}
      accessibilityRole="button"
      accessibilityLabel="Add a day"
    >
      <Text style={styles.addChipText}>{pending ? '…' : '+'}</Text>
    </Pressable>
  );
}


function SelectedDay(props: {
  day: DayResponse;
  myTravelerId: string | undefined;
  isOwner: boolean;
  onTitleFocus: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onEditActivity: (activityId: string) => void;
  onDeleteActivity: (activity: ActivityResponse) => void;
  onReorder: (move: ReorderMove) => void;
  deleting: boolean;
}) {
  const [draftTitle, setDraftTitle] = useState(props.day.title ?? '');
  const dayLease = leaseNotice(props.day.lease, props.myTravelerId);

  return (
    <View style={styles.dayBody}>
      <View style={styles.field}>
        <Text style={styles.label}>Day {props.day.ordinal} title</Text>
        {dayLease !== null && <Text style={styles.leaseNotice}>{dayLease}</Text>}
        <TextInput
          style={[styles.input, dayLease !== null && styles.inputLeased]}
          value={draftTitle}
          onChangeText={setDraftTitle}
          accessibilityLabel={`Day ${props.day.ordinal} title`}
          onFocus={props.onTitleFocus}
          onBlur={() => {
            const next = draftTitle.trim();
            if (next !== (props.day.title ?? '')) props.onRename(next);
          }}
          placeholder="Arrival & Sunsets"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {props.day.activities.map((activity, index) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          myTravelerId={props.myTravelerId}
          onEdit={() => props.onEditActivity(activity.id)}
          onDelete={() => props.onDeleteActivity(activity)}
          onMoveUp={index > 0 ? () => props.onReorder({ activityId: activity.id, direction: 'up' }) : undefined}
          onMoveDown={
            index < props.day.activities.length - 1
              ? () => props.onReorder({ activityId: activity.id, direction: 'down' })
              : undefined
          }
        />
      ))}

      {props.isOwner && (
        <Pressable
          style={[styles.deleteButton, props.deleting && styles.busy]}
          onPress={props.onDelete}
          disabled={props.deleting}
          accessibilityRole="button"
        >
          <Text style={styles.deleteButtonText}>
            {props.deleting ? 'Removing…' : `Delete Day ${props.day.ordinal}`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}


function ActivityCard({
  activity,
  myTravelerId,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  activity: ActivityResponse;
  myTravelerId: string | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: (() => void) | undefined;
  onMoveDown: (() => void) | undefined;
}) {
  const clock = formatTimeOfDay(activity.timeOfDay);
  const meta = placeAndCost(activity.place, activity.costAmount, activity.costCurrency);
  const notice = leaseNotice(activity.lease, myTravelerId);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={styles.activityBlock}>
      <View
        style={[
          styles.activityCard,
          notice !== null && styles.activityCardLeased,
          menuOpen && styles.activityCardRaised,
        ]}
      >
        <View style={styles.reorderColumn}>
          <Pressable
            onPress={onMoveUp}
            disabled={onMoveUp === undefined}
            accessibilityRole="button"
            accessibilityLabel="Move activity up"
            hitSlop={6}
          >
            <Text style={[styles.reorderArrow, onMoveUp === undefined && styles.reorderArrowDisabled]}>↑</Text>
          </Pressable>
          <Pressable
            onPress={onMoveDown}
            disabled={onMoveDown === undefined}
            accessibilityRole="button"
            accessibilityLabel="Move activity down"
            hitSlop={6}
          >
            <Text style={[styles.reorderArrow, onMoveDown === undefined && styles.reorderArrowDisabled]}>↓</Text>
          </Pressable>
        </View>

        <Pressable style={styles.activityBody} onPress={onEdit} accessibilityRole="button">
          {clock !== undefined && <Text style={styles.activityTime}>{clock}</Text>}
          <Text style={styles.activityTitle}>{activity.title}</Text>
          {meta !== undefined && (
            <View style={styles.activityPlaceRow}>
              {activity.place !== null && (
                <Icon name="mapPin" size={PLACE_ICON_SIZE} color={colors.textSecondary} />
              )}
              <Text style={styles.activityPlace}>{meta}</Text>
            </View>
          )}
        </Pressable>

        <ActivityKebab
          activityTitle={activity.title}
          open={menuOpen}
          onToggle={() => setMenuOpen((wasOpen) => !wasOpen)}
          onEdit={() => {
            setMenuOpen(false);
            onEdit();
          }}
          onDelete={() => {
            setMenuOpen(false);
            onDelete();
          }}
        />
      </View>

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

const FAB_SIZE = 56;

const RAISED_CARD = 20;

const SETTINGS_ICON_SIZE = 24;

const LEASE_AVATAR_SIZE = 18;

const PLACE_ICON_SIZE = 14;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  fabText: { ...typography.title, color: colors.textOnAccent },
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

  tabStripOuter: { flexGrow: 0 },
  tabStrip: { gap: spacing.sm, paddingVertical: spacing.xs, alignItems: 'center' },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { ...typography.caption, color: colors.textSecondary },
  tabTextSelected: { color: colors.textOnAccent, fontWeight: '700' },
  addChip: {
    width: 40,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  addChipText: { ...typography.bodyStrong, color: colors.textPrimary },
  dayBody: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textSecondary },
  activityBlock: { gap: spacing.xs },
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
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputLeased: { borderColor: colors.accent },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  activityCardLeased: { borderColor: colors.accent, borderWidth: 2 },
  activityCardRaised: { position: 'relative', zIndex: RAISED_CARD },
  reorderColumn: { gap: spacing.xs, alignItems: 'center' },
  reorderArrow: { ...typography.bodyStrong, color: colors.accent },
  reorderArrowDisabled: { color: colors.border },
  activityBody: { flex: 1, gap: spacing.xs },
  activityTime: { ...typography.caption, color: colors.accent, fontWeight: '700' },
  activityTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  activityPlaceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  activityPlace: { ...typography.caption, color: colors.textSecondary },
  primaryButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  primaryButtonText: { ...typography.bodyStrong, color: colors.textOnAccent },
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
  deleteButton: { paddingVertical: spacing.sm, alignItems: 'center' },
  deleteButtonText: { ...typography.caption, color: colors.danger },
  busy: { opacity: 0.7 },
  mutationError: { ...typography.caption, color: colors.danger },
  errorTitle: { ...typography.heading, color: colors.danger },
  caption: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
});
