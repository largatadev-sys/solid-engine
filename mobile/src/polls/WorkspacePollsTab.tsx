import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '../components/Icon';
import { PollCard } from './PollCard';
import { PollDeleteDialog } from './PollDeleteDialog';
import { boardIsWritable } from './pollBoard';
import {
  POLLS_ACTIVE_SECTION,
  POLLS_ARCHIVED_NOTE,
  POLLS_COMPLETED_SECTION,
  POLLS_CREATE_CTA,
  POLLS_EMPTY_BODY,
  POLLS_EMPTY_TITLE,
  POLLS_LOAD_FAILURE,
  pollErrorMessage,
} from './pollMessages';
import { useCastVote, useClosePoll, useDeletePoll, usePollBoard } from '../query/pollQueries';
import { colors } from '../theme';
import {
  pollColors,
  pollMetrics,
  pollTypography,
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
} from '../theme/workspaceTokens';
import type { PollResponse } from '../types/api';


interface WorkspacePollsTabProps {
  readonly itineraryId: string;
  readonly isOwner: boolean;
  readonly archived: boolean;
}


export function WorkspacePollsTab({ itineraryId, isOwner, archived }: WorkspacePollsTabProps) {
  const router = useRouter();
  const board = usePollBoard(itineraryId);
  const vote = useCastVote(itineraryId);
  const close = useClosePoll(itineraryId);
  const remove = useDeletePoll(itineraryId);
  const [failure, setFailure] = useState<string | null>(null);
  const [doomed, setDoomed] = useState<PollResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS);
    return () => clearInterval(tick);
  }, []);

  if (board.isPending) {
    return (
      <View style={styles.body}>
        <ActivityIndicator color={workspaceColors.accent} />
      </View>
    );
  }

  if (board.isError) {
    return (
      <View style={styles.body}>
        <Text style={styles.notice}>{POLLS_LOAD_FAILURE}</Text>
      </View>
    );
  }

  const active = board.data?.active ?? [];
  const completed = board.data?.completed ?? [];
  const writable = boardIsWritable(archived);
  const busy = vote.isPending || close.isPending || remove.isPending;

  const openCreate = () =>
    router.push({ pathname: '/itineraries/[id]/polls/new', params: { id: itineraryId } });

  const reportingFailure = (act: Promise<unknown>) => {
    setFailure(null);
    act.catch((error: Error) => setFailure(pollErrorMessage(error)));
  };

  const confirmDelete = () => {
    if (doomed === null) return;
    const poll = doomed;
    setDoomed(null);
    reportingFailure(remove.mutateAsync(poll.id));
  };

  const cardsOf = (polls: PollResponse[]) =>
    polls.map((poll) => (
      <PollCard
        key={poll.id}
        poll={poll}
        isOwner={isOwner}
        archived={archived}
        canVote={writable}
        busy={busy}
        now={now}
        onVote={(optionId) => reportingFailure(vote.mutateAsync({ pollId: poll.id, optionId }))}
        onClose={() => reportingFailure(close.mutateAsync(poll.id))}
        onDelete={() => setDoomed(poll)}
      />
    ));

  return (
    <View style={styles.body}>
      <PollDeleteDialog
        poll={doomed}
        busy={remove.isPending}
        onConfirm={confirmDelete}
        onDismiss={() => setDoomed(null)}
      />

      {archived && <Text style={styles.notice}>{POLLS_ARCHIVED_NOTE}</Text>}
      {failure !== null && <Text style={styles.failure}>{failure}</Text>}

      {active.length === 0 && completed.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyGlyph}>
            <Icon name="barChart" size={28} color={workspaceColors.muted} />
          </View>
          <Text style={styles.emptyTitle}>{POLLS_EMPTY_TITLE}</Text>
          <Text style={styles.emptyBody}>{POLLS_EMPTY_BODY}</Text>
          {writable && (
            <Pressable
              style={styles.primaryCta}
              onPress={openCreate}
              accessibilityRole="button"
              accessibilityLabel={POLLS_CREATE_CTA}
            >
              <Icon name="plus" size={14} color={workspaceColors.onAccent} />
              <Text style={styles.primaryCtaLabel}>{POLLS_CREATE_CTA}</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{POLLS_ACTIVE_SECTION}</Text>
            {writable && (
              <Pressable
                style={styles.textCta}
                onPress={openCreate}
                accessibilityRole="button"
                accessibilityLabel={POLLS_CREATE_CTA}
                hitSlop={8}
              >
                <Icon name="plus" size={14} color={workspaceColors.accent} />
                <Text style={styles.textCtaLabel} numberOfLines={1}>
                  {POLLS_CREATE_CTA}
                </Text>
              </Pressable>
            )}
          </View>

          {active.length === 0 ? (
            <Text style={styles.notice}>No polls are open right now.</Text>
          ) : (
            cardsOf(active)
          )}

          {completed.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>{POLLS_COMPLETED_SECTION}</Text>
              </View>
              {cardsOf(completed)}
            </>
          )}
        </>
      )}
    </View>
  );
}


const COUNTDOWN_TICK_MS = 30_000;


const styles = StyleSheet.create({
  body: {
    padding: 16,
    gap: 12,
  },
  notice: {
    ...pollTypography.hint,
    color: workspaceColors.muted,
  },
  failure: {
    ...pollTypography.hint,
    color: colors.danger,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  emptyGlyph: {
    width: pollMetrics.emptyGlyphWell,
    height: pollMetrics.emptyGlyphWell,
    borderRadius: workspaceRadii.pill,
    backgroundColor: pollColors.winnerPaper,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    ...pollTypography.emptyTitle,
    color: workspaceColors.title,
  },
  emptyBody: {
    ...pollTypography.hint,
    color: workspaceColors.muted,
    textAlign: 'center',
    maxWidth: 300,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    height: workspaceMetrics.primaryCtaHeight,
    paddingHorizontal: 24,
    borderRadius: workspaceRadii.control,
    backgroundColor: workspaceColors.accent,
  },
  primaryCtaLabel: {
    ...pollTypography.optionLabel,
    color: workspaceColors.onAccent,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  sectionLabel: {
    ...pollTypography.sectionLabel,
    color: workspaceColors.muted,
    flexShrink: 1,
  },
  textCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  textCtaLabel: {
    ...pollTypography.progressLabel,
    color: workspaceColors.accent,
  },
});
