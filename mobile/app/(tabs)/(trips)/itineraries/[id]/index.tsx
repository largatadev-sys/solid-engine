import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { itineraryLoadMessage, ScreenMessage } from '../../../../../src/components/ScreenMessage';
import { notify } from '../../../../../src/components/notify';
import { useMe } from '../../../../../src/hooks/useMe';
import { defaultOpenDay, toggleOpenDay } from '../../../../../src/itineraries/dayAccordion';
import {
  canPublish,
  PUBLISH_NEEDS_COMPLETE_TITLE,
  publishNeedsCompleteBody,
} from '../../../../../src/itineraries/publishControls';
import { TripArchiveBanner } from '../../../../../src/itineraries/TripArchiveBanner';
import { WorkspaceDayCard } from '../../../../../src/itineraries/WorkspaceDayCard';
import { WorkspaceDetailsTab } from '../../../../../src/itineraries/WorkspaceDetailsTab';
import { WorkspaceHeader } from '../../../../../src/itineraries/WorkspaceHeader';
import { WorkspaceTabRow, type WorkspaceTab } from '../../../../../src/itineraries/WorkspaceTabRow';
import { WorkspaceTravelersTab } from '../../../../../src/itineraries/WorkspaceTravelersTab';
import {
  editItineraryAction,
  ladderCta,
  showsStepBack,
  stateBadge,
  workspaceAffordances,
} from '../../../../../src/itineraries/workspaceControls';
import {
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../../../../../src/theme/workspaceTokens';
import { memberControls } from '../../../../../src/members/memberControls';
import { OwnershipOfferBanner } from '../../../../../src/members/OwnershipOfferBanner';
import { useMembers } from '../../../../../src/query/invitationQueries';
import { useItinerary, useTripLifecycle } from '../../../../../src/query/itineraryQueries';
import { colors, typography } from '../../../../../src/theme';


export default function TripWorkspaceScreen() {
  const router = useRouter();
  const { id, day, tab } = useLocalSearchParams<{ id: string; day?: string; tab?: string }>();
  const { data, isPending, isError, error } = useItinerary(id);

  const members = useMembers(id);
  const { state: meState } = useMe();
  const myId = meState.kind === 'ok' ? meState.me.id : undefined;
  const roster = members.data?.items ?? [];
  const { isOwner } = memberControls(roster, myId, data?.archived ?? false);

  const lifecycle = useTripLifecycle(id);
  const [active, setActive] = useState<WorkspaceTab>(tab === 'details' ? 'details' : 'day-by-day');
  const [openDayId, setOpenDayId] = useState<string | null | undefined>(undefined);

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

  const dayIds = data.days.map((d) => d.id);
  const requestedDay = day !== undefined ? data.days.find((d) => String(d.ordinal) === day)?.id : undefined;
  const expandedDayId = openDayId === undefined ? defaultOpenDay(dayIds, requestedDay) : openDayId;

  const badge = stateBadge(data);
  const ladder = ladderCta(data, isOwner);
  const editAction = editItineraryAction(data, isOwner, myId);
  const affordances = workspaceAffordances('viewer', isOwner);

  const openEditor = () => {
    if (editAction.kind === 'edit') {
      router.push({ pathname: '/itineraries/[id]/edit-plan', params: { id } });
      return;
    }
    if (editAction.kind === 'reopen-then-edit') {
      lifecycle.mutate('reopen', {
        onSuccess: () => router.push({ pathname: '/itineraries/[id]/edit-plan', params: { id } }),
      });
    }
  };

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
    lifecycle.mutate(ladder.act);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <WorkspaceHeader
          badge={badge}
          title={data.title}
          onBack={() => router.push('/')}
          actionLabel={editAction.kind === 'hidden' ? undefined : 'Edit Itinerary'}
          actionIcon="pencilSquare"
          onAction={editAction.kind === 'blocked' ? () => undefined : openEditor}
          actionDisabled={editAction.kind === 'blocked' || lifecycle.isPending}
          actionHint={editAction.kind === 'blocked' ? `being edited by ${editAction.holder}` : null}
        />

        <TripArchiveBanner itinerary={data} />
        <OwnershipOfferBanner itineraryId={id} />

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
                  onToggle={() => setOpenDayId(toggleOpenDay(expandedDayId, d.id))}
                />
              ))
            )}
          </View>
        ) : null}

        {active === 'travelers' ? <WorkspaceTravelersTab itineraryId={id} /> : null}

        {active === 'details' ? <WorkspaceDetailsTab itinerary={data} isOwner={isOwner} /> : null}
      </ScrollView>

      {ladder !== null || showsStepBack(data, isOwner) ? (
        <View style={styles.rail}>
          {ladder !== null ? (
            <Pressable
              style={styles.primaryCta}
              onPress={runLadder}
              disabled={lifecycle.isPending}
              accessibilityRole="button"
              accessibilityLabel={ladder.label}
            >
              <Text style={styles.primaryCtaLabel}>{ladder.label}</Text>
            </Pressable>
          ) : null}

          {showsStepBack(data, isOwner) ? (
            <Pressable
              style={styles.stepBack}
              onPress={() => lifecycle.mutate('reopen')}
              disabled={lifecycle.isPending}
              accessibilityRole="button"
              accessibilityLabel="Step back"
            >
              <Text style={styles.stepBackLabel}>Step back</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
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
  container: {
    paddingBottom: 24,
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
  stepBack: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  stepBackLabel: {
    ...workspaceTypography.note,
    color: workspaceColors.muted,
    textDecorationLine: 'underline',
  },
});
