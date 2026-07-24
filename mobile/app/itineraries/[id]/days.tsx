import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../../src/api/ApiError';
import { comingSoon } from '../../../src/components/comingSoon';
import { confirmDestructive } from '../../../src/components/confirmDestructive';
import { useEditLock } from '../../../src/hooks/useEditLock';
import { activityMetaLine } from '../../../src/itineraries/formatActivityCost';
import { reorderActivityIds } from '../../../src/itineraries/reorderActivityIds';
import {
  useAppendDay,
  useDeleteActivity,
  useDeleteDay,
  useItinerary,
  useRenameDay,
  useReorderActivities,
} from '../../../src/query/itineraryQueries';
import type { ActivityResponse, DayResponse } from '../../../src/types/api';
import { colors, radii, spacing, typography } from '../../../src/theme';

/**
 * Daily Schedules (S1.3, the 07/18 mock's frames 3 + 5) — the plan's days and their activities.
 *
 * Ticket 01 built the day layer (tab strip, editable day title, add/delete-day); ticket 02 fills the
 * body with activity cards (time • cost meta line, title, place, edit/delete) and an add-activity
 * button — both routing to the Add/Edit Activity screen.
 *
 * The plan is read from the single-itinerary cache (`useItinerary`), which embeds `days` and their
 * `activities` (ADR-013); every mutation invalidates it, so the screen refetches to truth. No
 * optimistic ordinals — a day delete renumbers server-side, and the client does not guess.
 */
export default function DailySchedulesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, error } = useItinerary(id);

  const appendDay = useAppendDay(id);
  const renameDay = useRenameDay(id);
  const deleteDay = useDeleteDay(id);
  const deleteActivity = useDeleteActivity(id);
  const reorderActivities = useReorderActivities(id);

  // The single-writer edit lock (S1.4, ADR-014): the Daily Schedules screen is the plan-editing hub —
  // day CRUD, reorder, and the route to add/edit activities all happen while it is mounted — so it
  // holds the lease for the whole editing session. Denied (another member editing, or offline) → the
  // modal fires and we return to the read-only plan; the lease renews while open and releases on exit.
  // A mid-session loss (someone took over after a network drop) surfaces through `mutationMessage`
  // below, since every write then 409s EDIT_LOCKED.
  const editLock = useEditLock(id);
  const locked = editLock.state.kind !== 'held';
  useEffect(() => {
    void editLock.acquire().then((granted) => {
      if (!granted) router.back();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Which day tab is selected. Held as an ordinal, not a day id: after a delete renumbers the days,
  // an id may vanish while "the 2nd day" still makes sense, so the ordinal is the stabler handle.
  const [selectedOrdinal, setSelectedOrdinal] = useState(1);

  // Every mutation on this screen surfaces its failure, the way the other itinerary screens do.
  // Without this the seven mutations here failed *silently* — a rejected reorder or a delete that
  // 404'd looked exactly like success (whole-branch review finding; the other three screens each
  // render their `serverMessage` and this one did not).
  const mutationError = [appendDay, renameDay, deleteDay, deleteActivity, reorderActivities]
    .map((m) => m.error)
    .find((e): e is Error => e !== null && e !== undefined);
  const mutationMessage = mutationError instanceof ApiError ? mutationError.message : mutationError?.message;

  if (isPending) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Daily Schedules' }} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isError) {
    const missing = error instanceof ApiError && error.code === 'ITINERARY_NOT_FOUND';
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Daily Schedules' }} />
        <Text style={styles.errorTitle}>{missing ? 'Trip not found' : 'Could not load this plan'}</Text>
        <Text style={styles.caption}>{error.message}</Text>
      </View>
    );
  }

  const days = data.days;
  const selected = days.find((d) => d.ordinal === selectedOrdinal) ?? days[0];

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Daily Schedules' }} />

      {/* A failed mutation says so. The envelope's `message` is written to be shown (Artifact 05). */}
      {mutationMessage !== undefined && <Text style={styles.mutationError}>{mutationMessage}</Text>}

      {days.length === 0 ? (
        <Text style={styles.emptyState}>
          No days yet. Add the first day to start building the plan.
        </Text>
      ) : (
        <>
          {/* The day-tab strip (mock DayTabs): one chip per day, plus an add-day chip. */}
          {/* `style={styles.tabStripOuter}` (flexGrow: 0) is load-bearing: a horizontal ScrollView
              nested in the screen's vertical one has no bounded cross-axis, so without it the strip
              claims a full screen-height band. Caught on the device — no unit test renders. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabStripOuter}
            contentContainerStyle={styles.tabStrip}
          >
            {days.map((day) => (
              <DayTab
                key={day.id}
                day={day}
                selected={day.ordinal === (selected?.ordinal ?? 1)}
                onPress={() => setSelectedOrdinal(day.ordinal)}
              />
            ))}
            <AddDayChip pending={appendDay.isPending || locked} onPress={() => appendDay.mutate({})} />
          </ScrollView>

          {selected !== undefined && (
            <SelectedDay
              day={selected}
              onRename={(title) => renameDay.mutate({ dayId: selected.id, title })}
              onDelete={() => confirmDeleteDay(selected, () => {
                deleteDay.mutate({ dayId: selected.id });
                // Reset to Day 1: the deleted day's ordinal may now belong to a different day after
                // the server renumbers, so the stable landing spot is the first tab.
                setSelectedOrdinal(1);
              })}
              onAddActivity={() =>
                router.push({ pathname: '/itineraries/[id]/activity', params: { id, dayId: selected.id } })
              }
              onEditActivity={(activityId) =>
                router.push({
                  pathname: '/itineraries/[id]/activity',
                  params: { id, dayId: selected.id, activityId },
                })
              }
              onDeleteActivity={(activity) =>
                confirmDeleteActivity(activity, () =>
                  deleteActivity.mutate({ dayId: selected.id, activityId: activity.id }),
                )
              }
              onReorder={(index, direction) => {
                const activityIds = reorderActivityIds(
                  selected.activities.map((a) => a.id),
                  index,
                  direction,
                );
                reorderActivities.mutate({ dayId: selected.id, activityIds });
              }}
              renaming={renameDay.isPending}
              deleting={deleteDay.isPending}
              disabled={locked}
            />
          )}
        </>
      )}

      {days.length === 0 && (
        <Pressable
          style={[styles.primaryButton, (appendDay.isPending || locked) && styles.busy]}
          onPress={() => appendDay.mutate({})}
          disabled={appendDay.isPending || locked}
          accessibilityRole="button"
        >
          {appendDay.isPending ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.primaryButtonText}>Add the first day</Text>
          )}
        </Pressable>
      )}

      {/* Preview Itinerary — the mock's CTA, disabled (ticket 05 grey-out). The publish/preview flow is
          S4.1's; this promises its position, and a tap says so gracefully rather than dead-clicking. */}
      {days.length > 0 && (
        <Pressable
          style={styles.previewDisabled}
          onPress={() => comingSoon('Preview itinerary')}
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
        >
          <Text style={styles.previewDisabledText}>Preview itinerary — coming soon</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

/**
 * Confirms a day delete before it fires (spec §Editing mechanics: "delete cascades activities after
 * UI confirm"). A delete removes the day and its activities and renumbers the rest — destructive
 * enough to ask first. Goes through the platform-forked `confirmDestructive`, because RN's `Alert` is
 * a no-op on web and this confirm's callback lives *inside* it: unforked, the delete silently never
 * happened in a browser.
 */
function confirmDeleteDay(day: DayResponse, onConfirm: () => void): void {
  const label = day.title !== null ? `"${day.title}"` : `Day ${day.ordinal}`;
  confirmDestructive(`${label} and everything in it`, onConfirm);
}

function DayTab({ day, selected, onPress }: { day: DayResponse; selected: boolean; onPress: () => void }) {
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
    <Pressable style={styles.addChip} onPress={onPress} disabled={pending} accessibilityRole="button">
      <Text style={styles.addChipText}>{pending ? '…' : '+'}</Text>
    </Pressable>
  );
}

/** Confirms an activity delete before it fires — the same discipline, and the same web fork. */
function confirmDeleteActivity(activity: ActivityResponse, onConfirm: () => void): void {
  confirmDestructive(`"${activity.title}"`, onConfirm);
}

/** The selected day: its editable title, its activity cards in order, add-activity, and day-delete. */
function SelectedDay(props: {
  day: DayResponse;
  onRename: (title: string) => void;
  onDelete: () => void;
  onAddActivity: () => void;
  onEditActivity: (activityId: string) => void;
  onDeleteActivity: (activity: ActivityResponse) => void;
  onReorder: (index: number, direction: 'up' | 'down') => void;
  renaming: boolean;
  deleting: boolean;
  // Every write control on this day is inert while the edit lock isn't held (S1.4, ADR-014). Gated
  // uniformly rather than per-control: "why is add-day disabled but delete-day live?" is the trap the
  // code review flagged. A denied acquire already routes the screen away, so this is mostly the brief
  // `acquiring` window — but making the whole surface honestly inert in that state is the point.
  disabled: boolean;
}) {
  // The title field is seeded from the day and committed on blur — a rename per keystroke would be a
  // write storm. `key` on the day id resets the draft when the selected day changes.
  const [draftTitle, setDraftTitle] = useState(props.day.title ?? '');

  return (
    <View style={styles.dayBody} key={props.day.id}>
      <View style={styles.field}>
        <Text style={styles.label}>Day {props.day.ordinal} title</Text>
        <TextInput
          style={styles.input}
          value={draftTitle}
          onChangeText={setDraftTitle}
          editable={!props.disabled}
          onBlur={() => {
            const next = draftTitle.trim();
            if (next !== (props.day.title ?? '')) props.onRename(next);
          }}
          placeholder="Arrival & Sunsets"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* The activities, in the server's manual order (ADR-013). Empty is fine — the add button below.
          The up/down controls nudge an activity's position; the reducer computes the new whole-list
          order and the reorder mutation sends it. All inert while the lock isn't held. */}
      {props.day.activities.map((activity, index) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          onEdit={props.disabled ? undefined : () => props.onEditActivity(activity.id)}
          onDelete={props.disabled ? undefined : () => props.onDeleteActivity(activity)}
          onMoveUp={!props.disabled && index > 0 ? () => props.onReorder(index, 'up') : undefined}
          onMoveDown={
            !props.disabled && index < props.day.activities.length - 1
              ? () => props.onReorder(index, 'down')
              : undefined
          }
        />
      ))}

      <Pressable
        style={[styles.addActivity, props.disabled && styles.busy]}
        onPress={props.onAddActivity}
        disabled={props.disabled}
        accessibilityRole="button"
      >
        <Text style={styles.addActivityText}>+ Add activity</Text>
      </Pressable>

      <Pressable
        style={[styles.deleteButton, (props.deleting || props.disabled) && styles.busy]}
        onPress={props.onDelete}
        disabled={props.deleting || props.disabled}
        accessibilityRole="button"
      >
        <Text style={styles.deleteButtonText}>{props.deleting ? 'Removing…' : `Delete Day ${props.day.ordinal}`}</Text>
      </Pressable>
    </View>
  );
}

/**
 * One activity card (the 07/18 mock's frame 5): the time • cost meta line, the title, the place, and
 * edit/delete, plus up/down controls to nudge its position (S1.3, ticket 03 — manual order is
 * authoritative). Tapping the card body edits; the trash deletes (after a confirm at the call site).
 * The up/down arrows are `undefined` at the ends, so they render disabled there.
 */
function ActivityCard({
  activity,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  activity: ActivityResponse;
  // `undefined` when the edit lock isn't held (S1.4): the card body and trash go inert, like the
  // move arrows already do at the list ends.
  onEdit: (() => void) | undefined;
  onDelete: (() => void) | undefined;
  onMoveUp: (() => void) | undefined;
  onMoveDown: (() => void) | undefined;
}) {
  const meta = activityMetaLine(activity.timeOfDay, activity.costAmount, activity.costCurrency);
  return (
    <View style={styles.activityCard}>
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
      <Pressable
        style={styles.activityBody}
        onPress={onEdit}
        disabled={onEdit === undefined}
        accessibilityRole="button"
      >
        {/* The meta line is empty when an activity has neither a time nor a cost — render nothing
            then, rather than an empty Text that would push the title down with dead space. */}
        {meta !== '' && <Text style={styles.activityMeta}>{meta}</Text>}
        <Text style={styles.activityTitle}>{activity.title}</Text>
        {activity.place !== null && <Text style={styles.activityPlace}>{activity.place}</Text>}
      </Pressable>
      <Pressable
        onPress={onDelete}
        disabled={onDelete === undefined}
        accessibilityRole="button"
        accessibilityLabel="Delete activity"
        hitSlop={8}
      >
        <Text style={styles.activityDelete}>Delete</Text>
      </Pressable>
    </View>
  );
}

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
  /** Bounds the strip to its content height — see the ScrollView's comment. */
  tabStripOuter: { flexGrow: 0 },
  // `alignItems: 'center'` keeps each chip at its own height rather than stretching to the tallest;
  // `tabStripOuter` above is what stops the strip itself claiming the screen. Both were needed —
  // caught on the device, where no unit test could see it.
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
  addActivity: {
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
  },
  addActivityText: { ...typography.bodyStrong, color: colors.textPrimary },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reorderColumn: { gap: spacing.xs, alignItems: 'center' },
  reorderArrow: { ...typography.bodyStrong, color: colors.accent },
  reorderArrowDisabled: { color: colors.border },
  activityBody: { flex: 1, gap: spacing.xs },
  activityMeta: { ...typography.caption, color: colors.textSecondary },
  activityTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  activityPlace: { ...typography.caption, color: colors.textSecondary },
  activityDelete: { ...typography.caption, color: colors.danger },
  primaryButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  primaryButtonText: { ...typography.bodyStrong, color: colors.textOnAccent },
  previewDisabled: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    opacity: 0.7,
  },
  previewDisabledText: { ...typography.bodyStrong, color: colors.textSecondary },
  deleteButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  deleteButtonText: { ...typography.caption, color: colors.danger },
  busy: { opacity: 0.7 },
  mutationError: { ...typography.caption, color: colors.danger },
  errorTitle: { ...typography.heading, color: colors.danger },
  caption: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
});
