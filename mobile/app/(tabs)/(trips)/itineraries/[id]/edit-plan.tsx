import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiError } from '../../../../../src/api/ApiError';
import { Icon } from '../../../../../src/components/Icon';
import { chooseOnStalePlan } from '../../../../../src/components/chooseOnStalePlan';
import { stalePlanWording } from '../../../../../src/components/stalePlanMessage';
import { confirmWith } from '../../../../../src/components/confirmDestructive';
import {
  confirmDestructiveMessage,
  discardStagedEditsWording,
} from '../../../../../src/components/confirmDestructiveMessage';
import { itineraryLoadMessage, ScreenMessage } from '../../../../../src/components/ScreenMessage';
import { useEditLock } from '../../../../../src/hooks/useEditLock';
import { useMe } from '../../../../../src/hooks/useMe';
import { defaultOpenDay, toggleOpenDay } from '../../../../../src/itineraries/dayAccordion';
import { dayName, dayPrefix } from '../../../../../src/itineraries/dayTitle';
import { DraggableActivityList } from '../../../../../src/itineraries/DraggableActivityList';
import { applyDrop, applyMove } from '../../../../../src/itineraries/reorderActivityIds';
import { WorkspaceDayCard } from '../../../../../src/itineraries/WorkspaceDayCard';
import { WorkspaceDetailsTab } from '../../../../../src/itineraries/WorkspaceDetailsTab';
import { WorkspaceHeader } from '../../../../../src/itineraries/WorkspaceHeader';
import { WorkspaceTabRow, type WorkspaceTab } from '../../../../../src/itineraries/WorkspaceTabRow';
import { WorkspaceTravelersTab } from '../../../../../src/itineraries/WorkspaceTravelersTab';
import { stateBadge, workspaceAffordances } from '../../../../../src/itineraries/workspaceControls';
import {
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../../../../../src/theme/workspaceTokens';
import { memberControls } from '../../../../../src/members/memberControls';
import { useMembers } from '../../../../../src/query/invitationQueries';
import { useItinerary, useSavePlan } from '../../../../../src/query/itineraryQueries';
import {
  baseOf,
  closeDraft,
  draftOf,
  openDraft,
  stageInto,
  useDraft,
} from '../../../../../src/itineraries/draftStore';
import {
  appendDay as stageAppendDay,
  deleteActivity as stageDeleteActivity,
  deleteDay as stageDeleteDay,
  isDirty,
  planFrom,
  renameDay as stageRenameDay,
  reorderActivities as stageReorder,
  saveRequestFor,
} from '../../../../../src/itineraries/stagedPlan';
import { stagedDays } from '../../../../../src/itineraries/stagedView';
import { useExitGuard } from '../../../../../src/navigation/useExitGuard';
import { colors, typography } from '../../../../../src/theme';
import type { ActivityResponse, SavePlanRequest } from '../../../../../src/types/api';


export default function DraftWorkspaceScreen() {
  const router = useRouter();
  const { id, day } = useLocalSearchParams<{ id: string; day?: string }>();
  const { data, isPending, isError, error, refetch } = useItinerary(id);

  const members = useMembers(id);
  const { state: meState } = useMe();
  const myId = meState.kind === 'ok' ? meState.me.id : undefined;
  const roster = members.data?.items ?? [];
  const { isOwner } = memberControls(roster, myId, data?.archived ?? false);

  const session = useEditLock(id);
  const savePlan = useSavePlan(id);
  const staged = useDraft(id);

  const [active, setActive] = useState<WorkspaceTab>('day-by-day');
  const [openDayId, setOpenDayId] = useState<string | null | undefined>(undefined);
  const [editingTitleOf, setEditingTitleOf] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const acquire = session.acquire;
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    void acquire({ subjectType: 'session' }).then((granted) => {
      setSettled(true);
      if (!granted) router.back();
    });
  }, [acquire, router]);

  useEffect(() => {
    if (data === undefined || draftOf(id) !== undefined) return;
    openDraft(id, planFrom(data));
  }, [data, id]);

  const [leaving, setLeaving] = useState(false);
  const dirty = !leaving && staged !== undefined && isDirty(staged.draft, staged.base);

  const leaveWithoutSaving = useCallback(() => {
    setLeaving(true);
    closeDraft(id);
    session.release();
  }, [id, session]);

  useEffect(() => {
    if (leaving) router.back();
  }, [leaving, router]);

  const attemptExit = useCallback(() => {
    if (!dirty) {
      leaveWithoutSaving();
      return;
    }
    confirmWith(discardStagedEditsWording(), leaveWithoutSaving);
  }, [dirty, leaveWithoutSaving]);

  useExitGuard(dirty, useCallback((proceed: () => void) => {
    confirmWith(discardStagedEditsWording(), () => {
      setLeaving(true);
      closeDraft(id);
      session.release();
      proceed();
    });
  }, [id, session]));

  if (isPending || staged === undefined || !settled) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isError) {
    return <ScreenMessage {...itineraryLoadMessage(error, 'Could not load this trip')} />;
  }

  const shownDays = stagedDays(staged.draft);
  const dayIds = shownDays.map((d) => d.id);
  const requestedDay = day !== undefined ? shownDays.find((d) => String(d.ordinal) === day)?.id : undefined;
  const expandedDayId = openDayId === undefined ? defaultOpenDay(dayIds, requestedDay) : openDayId;
  const affordances = workspaceAffordances('editor', isOwner);

  const commit = (request: SavePlanRequest) => {
    savePlan.mutate(request, {
      onSuccess: leaveWithoutSaving,
      onError: (saveError) => {
        if (!(saveError instanceof ApiError) || saveError.code !== 'STALE_PLAN') return;
        const current = saveError.detailNumber('currentPlanVersion');
        if (current === undefined) return;
        chooseOnStalePlan(stalePlanWording(), (choice) => {
          if (choice === 'discard') void reloadOntoTheirPlan();
          if (choice === 'overwrite') commit({ ...request, basePlanVersion: current });
        });
      },
    });
  };

  const reloadOntoTheirPlan = async () => {
    const fresh = await refetch();
    if (fresh.data === undefined) return;
    openDraft(id, planFrom(fresh.data));
  };

  const saveChanges = () => {
    if (!dirty) {
      leaveWithoutSaving();
      return;
    }
    void session.acquire({ subjectType: 'session' }).then((granted) => {
      if (granted) commit(saveRequestFor(staged.draft));
    });
  };

  const addDay = () => {
    const before = draftOf(id)?.days.length ?? 0;
    stageInto(id, stageAppendDay);
    const appended = draftOf(id)?.days[before];
    if (appended === undefined) return;
    setOpenDayId(appended.id);
    setEditingTitleOf(appended.id);
    setDraftTitle('');
  };

  const commitTitle = (dayId: string) => {
    setEditingTitleOf(null);
    stageInto(id, (plan) => stageRenameDay(plan, dayId, draftTitle));
  };

  const dropActivity = (dayId: string, activityId: string, toIndex: number) => {
    const currentIds = shownDays.find((d) => d.id === dayId)?.activities.map((a) => a.id) ?? [];
    const desired = applyDrop(currentIds, { activityId, toIndex });
    if (desired === null) return;
    stageInto(id, (plan) => stageReorder(plan, dayId, desired));
  };

  const nudgeActivity = (dayId: string, activityId: string, direction: 'up' | 'down') => {
    const currentIds = shownDays.find((d) => d.id === dayId)?.activities.map((a) => a.id) ?? [];
    const desired = applyMove(currentIds, { activityId, direction });
    if (desired === null) return;
    stageInto(id, (plan) => stageReorder(plan, dayId, desired));
  };

  const openActivityForm = (dayId: string, activity?: ActivityResponse) => {
    router.push({
      pathname: '/itineraries/[id]/activity',
      params: activity === undefined
        ? { id, dayId }
        : { id, dayId, activityId: activity.id },
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <WorkspaceHeader
          badge={stateBadge(data, 'editor')}
          title={data.title}
          onBack={attemptExit}
          actionLabel="Invite Traveler"
          actionIcon="userPlus"
          onAction={() => router.push({ pathname: '/itineraries/[id]/invite', params: { id } })}
          onEditTitle={() => router.push({ pathname: '/itineraries/[id]/edit', params: { id } })}
        />

        <WorkspaceTabRow active={active} onSelect={setActive} />

        {active === 'day-by-day' ? (
          <View style={styles.tabBody}>
            {shownDays.map((d) => (
              <WorkspaceDayCard
                key={d.id}
                day={d}
                expanded={d.id === expandedDayId}
                affordances={affordances}
                onToggle={() => setOpenDayId(toggleOpenDay(expandedDayId, d.id))}
                onAddActivity={() => openActivityForm(d.id)}
                activitySlot={
                  <DraggableActivityList
                    activities={d.activities}
                    affordances={affordances}
                    onEdit={(activity) => openActivityForm(d.id, activity)}
                    onDelete={(activity) =>
                      confirmWith(confirmDestructiveMessage(activity.title), () =>
                        stageInto(id, (plan) => stageDeleteActivity(plan, activity.id)),
                      )
                    }
                    onDrop={(activityId, toIndex) => dropActivity(d.id, activityId, toIndex)}
                    onNudge={(activityId, direction) => nudgeActivity(d.id, activityId, direction)}
                  />
                }
                onDeleteDay={() =>
                  confirmWith(
                    confirmDestructiveMessage(`Day ${d.ordinal} and everything in it`),
                    () => stageInto(id, (plan) => stageDeleteDay(plan, d.id)),
                  )
                }
                onRenameDay={() => {
                  setEditingTitleOf(d.id);
                  setDraftTitle(dayName(d));
                }}
                titleSlot={
                  editingTitleOf === d.id ? (
                    <View style={styles.titleRow}>
                      <Text style={styles.dayTitle} numberOfLines={1}>
                        {dayPrefix(d)}:
                      </Text>
                      <TextInput
                        style={styles.titleInput}
                        value={draftTitle}
                        onChangeText={setDraftTitle}
                        onBlur={() => commitTitle(d.id)}
                        autoFocus
                        accessibilityLabel={`Name for ${dayPrefix(d)}`}
                        placeholder="Name this day"
                        placeholderTextColor={workspaceColors.placeholder}
                      />
                    </View>
                  ) : undefined
                }
              />
            ))}

            {affordances.showsAddDay ? (
              <Pressable
                style={styles.addDay}
                onPress={addDay}
                accessibilityRole="button"
                accessibilityLabel="Add a Day"
              >
                <Text style={styles.addDayLabel} numberOfLines={1}>
                  Add a Day
                </Text>
                <Icon name="calendarPlus" size={16} color={workspaceColors.accent} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {active === 'travelers' ? <WorkspaceTravelersTab itineraryId={id} /> : null}

        {active === 'details' ? <WorkspaceDetailsTab itinerary={data} isOwner={isOwner} /> : null}
      </ScrollView>

      <View style={styles.rail}>
        {savePlan.isError ? <Text style={styles.saveProblem}>{savePlan.error.message}</Text> : null}
        <Pressable
          style={styles.secondaryCta}
          onPress={saveChanges}
          disabled={savePlan.isPending}
          accessibilityRole="button"
          accessibilityLabel="Save Changes"
        >
          <Text style={styles.secondaryCtaLabel}>Save Changes</Text>
        </Pressable>
      </View>
    </View>
  );
}


const TITLE_ROW_BASIS = 200;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  container: {
    paddingBottom: 24,
  },
  tabBody: {
    padding: 16,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: TITLE_ROW_BASIS,
    minWidth: 0,
  },
  dayTitle: {
    ...workspaceTypography.dayTitle,
    color: workspaceColors.title,
    flexShrink: 0,
  },
  titleInput: {
    ...workspaceTypography.dayTitle,
    color: workspaceColors.title,
    flex: 1,
    minWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: workspaceColors.accent,
    paddingVertical: 2,
  },
  addDay: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
  },
  addDayLabel: {
    ...workspaceTypography.headerAction,
    color: workspaceColors.accent,
    flexShrink: 0,
  },
  rail: {
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: workspaceColors.railBorder,
  },
  secondaryCta: {
    height: workspaceMetrics.secondaryCtaHeight,
    borderRadius: workspaceRadii.control,
    borderWidth: 1,
    borderColor: workspaceColors.railBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaLabel: {
    ...workspaceTypography.ctaSecondary,
    color: workspaceColors.secondaryLabel,
  },
  saveProblem: {
    ...typography.caption,
    color: colors.danger,
  },
});
