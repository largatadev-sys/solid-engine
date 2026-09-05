import { TRIPS_TAB_ROUTE } from '../../../../../src/navigation/authRoutes';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { itineraryLoadMessage, ScreenMessage } from '../../../../../src/components/ScreenMessage';
import { confirmWith } from '../../../../../src/components/confirmDestructive';
import { unpublishTripWording } from '../../../../../src/components/confirmDestructiveMessage';
import { notify } from '../../../../../src/components/notify';
import { useMe } from '../../../../../src/hooks/useMe';
import { canEditPlan } from '../../../../../src/itineraries/archiveControls';
import { defaultOpenDay, toggleOpenDay } from '../../../../../src/itineraries/dayAccordion';
import {
  canPublish,
  PUBLISH_NEEDS_COMPLETE_TITLE,
  publishNeedsCompleteBody,
} from '../../../../../src/itineraries/publishControls';
import {
  TransitionDrawer,
  type TransitionConfirmation,
} from '../../../../../src/itineraries/TransitionDrawer';
import { attributionLabel, attributionLinks } from '../../../../../src/itineraries/forkCopy';
import { TripArchiveBanner } from '../../../../../src/itineraries/TripArchiveBanner';
import { WorkspaceDayCard } from '../../../../../src/itineraries/WorkspaceDayCard';
import { WorkspaceHeader } from '../../../../../src/itineraries/WorkspaceHeader';
import { WorkspaceSettingsMenu } from '../../../../../src/itineraries/WorkspaceSettingsMenu';
import { showsSettingsCog, workspaceMenuItems, type WorkspaceMenuItem } from '../../../../../src/itineraries/tripSettingsItems';
import {
  WorkspaceTabRow,
  workspaceTabFrom,
  type WorkspaceTab,
} from '../../../../../src/itineraries/WorkspaceTabRow';
import { WorkspacePhotoDumpTab } from '../../../../../src/itineraries/WorkspacePhotoDumpTab';
import { WorkspaceTravelersTab } from '../../../../../src/itineraries/WorkspaceTravelersTab';
import { WorkspacePollsTab } from '../../../../../src/polls/WorkspacePollsTab';
import { WorkspaceChatTab } from '../../../../../src/chat/WorkspaceChatTab';
import {
  editItineraryAction,
  forwardConfirmWording,
  ladderCta,
  stateBadge,
  workspaceAffordances,
} from '../../../../../src/itineraries/workspaceControls';
import {
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../../../../../src/theme/workspaceTokens';
import { docksItsOwnBar, laddersOn } from '../../../../../src/itineraries/workspaceChrome';
import { memberControls } from '../../../../../src/members/memberControls';
import { useMembers } from '../../../../../src/query/invitationQueries';
import { useItinerary, useTripLifecycle, useUnpublishTrip } from '../../../../../src/query/itineraryQueries';
import { useMyDiaryEntries } from '../../../../../src/query/diaryQueries';
import {
  captureLabel,
  capturesAreOpen,
  entryForActivity,
} from '../../../../../src/diary/diaryCapture';
import { colors, typography } from '../../../../../src/theme';


export default function TripWorkspaceScreen() {
  const router = useRouter();
  const { id, day, tab } = useLocalSearchParams<{ id: string; day?: string; tab?: string }>();
  const { data, isPending, isError, error } = useItinerary(id);

  const members = useMembers(id);
  const { state: meState } = useMe();
  const myId = meState.kind === 'ok' ? meState.me.id : undefined;
  const roster = members.data?.items ?? [];
  const { isOwner } = memberControls(roster, myId);

  const lifecycle = useTripLifecycle(id);
  const capturing = data !== undefined && capturesAreOpen(data.state);
  const myEntries = useMyDiaryEntries(id, capturing);
  const [active, setActive] = useState<WorkspaceTab>(workspaceTabFrom(tab));
  const [openDayId, setOpenDayId] = useState<string | null | undefined>(undefined);
  const [confirming, setConfirming] = useState<TransitionConfirmation | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cogY, setCogY] = useState(0);
  const unpublish = useUnpublishTrip(id);

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isError) {
    return <ScreenMessage {...itineraryLoadMessage(error, 'Could not load this trip')} />;
  }

  if (data.published && !data.archived) {
    return <Redirect href={{ pathname: '/published/[id]', params: { id } }} />;
  }

  const dayIds = data.days.map((d) => d.id);
  const requestedDay = day !== undefined ? data.days.find((d) => String(d.ordinal) === day)?.id : undefined;
  const expandedDayId = openDayId === undefined ? defaultOpenDay(dayIds, requestedDay) : openDayId;

  const badge = stateBadge(data);
  const ladder = ladderCta(data, isOwner, myId);
  const editAction = editItineraryAction(data, canEditPlan(data), myId);
  const affordances = workspaceAffordances('viewer', isOwner);

  const openEditor = () => {
    if (editAction.kind !== 'edit') return;
    router.push({ pathname: '/itineraries/[id]/edit-plan', params: { id } });
  };

  const chooseSetting = (item: WorkspaceMenuItem) => {
    setSettingsOpen(false);
    if (item === 'edit-details') {
      router.push({ pathname: '/itineraries/[id]/edit', params: { id } });
      return;
    }
    if (item === 'view-published') {
      router.push({ pathname: '/published/[id]', params: { id } });
      return;
    }
    confirmWith(unpublishTripWording(), () => unpublish.mutate());
  };

  const visibleSource = attributionLinks(data.forkedFrom) ? data.forkedFrom : null;

  const runLadder = () => {
    if (ladder === null) return;
    if (ladder.act === 'publish') {
      if (canPublish(data)) {
        router.push({ pathname: '/itineraries/[id]/preview', params: { id } });
      } else {
        notify(PUBLISH_NEEDS_COMPLETE_TITLE, publishNeedsCompleteBody(data.state));
      }
      return;
    }
    const wording = forwardConfirmWording(ladder.act);
    if (wording !== null) setConfirming({ wording, busy: false });
  };

  const confirmTransition = () => {
    if (ladder === null || confirming === null || ladder.act === 'publish') return;
    setConfirming({ ...confirming, busy: true });
    lifecycle.mutate(ladder.act, {
      onSuccess: () => setConfirming(null),
      onError: () => setConfirming({ ...confirming, busy: false }),
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={docksItsOwnBar(active) ? styles.dockedContainer : styles.container}
        scrollEnabled={!docksItsOwnBar(active)}
      >
        <WorkspaceHeader
          badge={badge}
          title={data.title}
          provenance={attributionLabel(data.forkedFrom)}
          onProvenancePress={
            visibleSource === null || visibleSource === undefined
              ? undefined
              : () =>
                  router.push({
                    pathname: '/published/[id]',
                    params: { id: visibleSource.sourceItineraryId },
                  })
          }
          onBack={() => router.push(TRIPS_TAB_ROUTE)}
          actionLabel={editAction.kind === 'hidden' ? undefined : 'Edit Itinerary'}
          actionIcon="pencilSquare"
          onAction={editAction.kind === 'blocked' ? () => undefined : openEditor}
          actionDisabled={editAction.kind === 'blocked' || lifecycle.isPending}
          actionHint={editAction.kind === 'blocked' ? `being edited by ${editAction.holder}` : null}
          onSettings={showsSettingsCog(data, isOwner) ? () => setSettingsOpen(true) : undefined}
          onSettingsLayout={setCogY}
        />

        <WorkspaceSettingsMenu
          visible={settingsOpen}
          items={workspaceMenuItems(data, isOwner)}
          anchorY={cogY}
          onDismiss={() => setSettingsOpen(false)}
          onSelect={chooseSetting}
        />

        <TripArchiveBanner itinerary={data} />

        <WorkspaceTabRow active={active} onSelect={setActive} />

        {active === 'day-by-day' ? (
          <View style={styles.tabBody}>
            {data.days.length === 0 ? (
              <Text style={styles.empty}>No days yet. Edit the itinerary to build this trip out.</Text>
            ) : (
              data.days.map((d) => (
                <WorkspaceDayCard
                  key={d.id}
                  day={d}
                  expanded={d.id === expandedDayId}
                  affordances={affordances}
                  destination={data.destination}
                  onToggle={() => setOpenDayId(toggleOpenDay(expandedDayId, d.id))}
                  diaryLinkFor={(activity) => {
                    if (!capturing) return null;
                    const mine = entryForActivity(myEntries.data ?? [], activity.id);
                    if (mine === null && (data.archived ?? false)) return null;
                    return {
                      label: captureLabel(mine),
                      added: mine !== null,
                      onPress: () =>
                        router.push({
                          pathname:
                            mine === null
                              ? '/itineraries/[id]/diary/compose'
                              : '/itineraries/[id]/diary/[entryId]',
                          params:
                            mine === null
                              ? { id, activityId: activity.id, dayId: d.id }
                              : { id, entryId: mine.id },
                        }),
                    };
                  }}
                />
              ))
            )}
          </View>
        ) : null}

        {active === 'polls' ? (
          <WorkspacePollsTab
            itineraryId={id}
            isOwner={isOwner}
            archived={data.archived ?? false}
          />
        ) : null}

        {active === 'travelers' ? (
          <WorkspaceTravelersTab
            itineraryId={id}
            tripTitle={data.title}
            myId={myId}
            published={data.published}
            archived={data.archived ?? false}
          />
        ) : null}

        {active === 'chat' ? (
          <View style={styles.chatBody}>
            <WorkspaceChatTab itineraryId={id} myId={myId} archived={data.archived ?? false} />
          </View>
        ) : null}

        {active === 'photo-dump' ? (
          <WorkspacePhotoDumpTab
            itineraryId={id}
            myId={myId}
            isOwner={isOwner}
            archived={data.archived ?? false}
          />
        ) : null}

      </ScrollView>

      {ladder !== null && laddersOn(active) ? (
        <View style={styles.rail}>
          {ladder.blockedBy !== undefined ? (
            <Text style={styles.blockedNote}>{`Being edited by ${ladder.blockedBy}`}</Text>
          ) : null}
          <Pressable
            style={[styles.primaryCta, ladder.blockedBy !== undefined && styles.ctaBlocked]}
            onPress={runLadder}
            disabled={lifecycle.isPending || ladder.blockedBy !== undefined}
            accessibilityRole="button"
            accessibilityState={{ disabled: ladder.blockedBy !== undefined }}
            accessibilityLabel={ladder.label}
          >
            <Text style={styles.primaryCtaLabel}>{ladder.label}</Text>
          </Pressable>
        </View>
      ) : null}

      <TransitionDrawer
        confirmation={confirming}
        onConfirm={confirmTransition}
        onDismiss={() => setConfirming(null)}
      />
    </View>
  );
}


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
  scroller: {
    flex: 1,
  },
  container: {
    paddingBottom: 24,
  },
  dockedContainer: {
    flexGrow: 1,
    height: '100%',
  },
  chatBody: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  tabBody: {
    padding: 16,
    gap: 12,
  },
  empty: {
    ...workspaceTypography.note,
    color: workspaceColors.muted,
  },
  rail: {
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: workspaceColors.railBorder,
  },
  primaryCta: {
    height: workspaceMetrics.primaryCtaHeight,
    borderRadius: workspaceRadii.control,
    backgroundColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaLabel: {
    ...workspaceTypography.ctaPrimary,
    color: workspaceColors.onAccent,
  },
  ctaBlocked: {
    opacity: 0.5,
  },
  blockedNote: {
    ...workspaceTypography.activityTime,
    color: workspaceColors.muted,
    textAlign: 'center',
  },
});
