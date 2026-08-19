import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { FadeUp } from './FadeUp';
import { animateRowGrowth } from './rowGrowth';
import { PollOptionRow } from './PollOptionRow';
import {
  deadlineMetaFor,
  footerActionsFor,
  isClosed,
  markerFor,
  optionStateFor,
  progressFor,
  submitButtonFor,
} from './pollBoard';
import {
  POLL_CHANGE_HINT,
  POLL_CLOSED_BADGE,
  POLL_CLOSE_NOW_LABEL,
  POLL_DELETE_LABEL,
  POLL_NO_VOTES_BODY,
  POLL_OPEN_BADGE,
  POLL_PROGRESS_LABEL,
} from './pollMessages';
import {
  pollColors,
  pollMetrics,
  pollMotion,
  pollTypography,
  workspaceBadgeColors,
  workspaceCardShadow,
  workspaceColors,
  workspaceRadii,
} from '../theme/workspaceTokens';
import type { PollResponse } from '../types/api';


interface PollCardProps {
  readonly poll: PollResponse;
  readonly isOwner: boolean;
  readonly archived: boolean;
  readonly canVote: boolean;
  readonly busy: boolean;
  readonly now: number;
  readonly onVote: (optionId: string) => void;
  readonly onClose: () => void;
  readonly onDelete: () => void;
}


export function PollCard({
  poll,
  isOwner,
  archived,
  canVote,
  busy,
  now,
  onVote,
  onClose,
  onDelete,
}: PollCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const fill = useRef(new Animated.Value(progressFor(poll).fraction)).current;

  const closed = isClosed(poll);
  const submit = canVote ? submitButtonFor(poll, selected, busy) : null;
  const footer = footerActionsFor(poll, isOwner, archived);
  const progress = progressFor(poll);
  const nobodyVoted = closed && poll.votedCount === 0;
  const showHint = canVote && !closed && submit === null;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: progress.fraction,
      duration: pollMotion.progressMs,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [fill, progress.fraction]);

  const grown = useRef(false);
  useEffect(() => {
    if (!grown.current) {
      grown.current = true;
      return;
    }
    animateRowGrowth();
  }, [poll.options]);

  const pick = (optionId: string) => {
    setSelected((current) => (current === optionId ? null : optionId));
  };

  const submitVote = () => {
    if (selected === null) return;
    onVote(selected);
    setSelected(null);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.question}>{poll.question}</Text>
          <Text style={styles.meta} numberOfLines={2}>
            {deadlineMetaFor(poll, now)}
          </Text>
        </View>

        <View style={[styles.badge, closed ? styles.badgeClosed : styles.badgeOpen]}>
          <Text style={closed ? styles.badgeClosedText : styles.badgeOpenText}>
            {closed ? POLL_CLOSED_BADGE : POLL_OPEN_BADGE}
          </Text>
        </View>
      </View>

      {nobodyVoted ? (
        <Text style={styles.emptyBody}>{POLL_NO_VOTES_BODY}</Text>
      ) : (
        <View style={styles.options}>
          {poll.options.map((option) => (
            <PollOptionRow
              key={option.id}
              option={option}
              state={optionStateFor(poll, option.id, selected)}
              marker={markerFor(poll, option.id, selected)}
              onPress={canVote && !closed && !busy ? () => pick(option.id) : undefined}
            />
          ))}
        </View>
      )}

      {!closed && (
        <View style={styles.progress}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{POLL_PROGRESS_LABEL}</Text>
            <Text style={styles.progressCount}>{progress.label}</Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>
        </View>
      )}

      {submit !== null && (
        <FadeUp key="submit">
          <Pressable
          style={[styles.submit, !submit.enabled && styles.submitDisabled]}
          disabled={!submit.enabled}
          onPress={submitVote}
          accessibilityRole="button"
          accessibilityLabel={submit.label}
        >
          <Text style={styles.submitLabel} numberOfLines={1}>
            {submit.label}
          </Text>
          </Pressable>
        </FadeUp>
      )}

      {showHint && (
        <FadeUp key="hint">
          <Text style={styles.hint}>{POLL_CHANGE_HINT}</Text>
        </FadeUp>
      )}

      {footer.length > 0 && (
        <View style={styles.footer}>
          {footer.includes('close') && (
            <Pressable
              style={styles.footerAction}
              disabled={busy}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={POLL_CLOSE_NOW_LABEL}
            >
              <Icon name="clock" size={13} color={pollColors.ink} />
              <Text style={styles.footerActionLabel} numberOfLines={1}>
                {POLL_CLOSE_NOW_LABEL}
              </Text>
            </Pressable>
          )}
          <Pressable
            style={styles.footerAction}
            disabled={busy}
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={POLL_DELETE_LABEL}
          >
            <Icon name="trash" size={13} color={pollColors.danger} />
            <Text style={[styles.footerActionLabel, styles.footerActionDanger]} numberOfLines={1}>
              {POLL_DELETE_LABEL}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}


const FOOTER_HIT_AREA = 44;


const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
    borderRadius: pollMetrics.cardRadius,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    backgroundColor: workspaceColors.surface,
    ...workspaceCardShadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  question: {
    ...pollTypography.question,
    color: workspaceColors.title,
  },
  meta: {
    ...pollTypography.meta,
    color: workspaceColors.muted,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: pollMetrics.badgeRadius,
    flexShrink: 0,
  },
  badgeOpen: {
    backgroundColor: workspaceBadgeColors.draft.background,
  },
  badgeOpenText: {
    ...pollTypography.tag,
    color: workspaceBadgeColors.draft.foreground,
    textTransform: 'uppercase',
  },
  badgeClosed: {
    backgroundColor: workspaceBadgeColors.completed.background,
  },
  badgeClosedText: {
    ...pollTypography.tag,
    color: workspaceBadgeColors.completed.foreground,
    textTransform: 'uppercase',
  },
  options: {
    gap: 8,
  },
  emptyBody: {
    ...pollTypography.hint,
    color: workspaceColors.muted,
  },
  progress: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    ...pollTypography.progressLabel,
    color: workspaceColors.title,
  },
  progressCount: {
    ...pollTypography.count,
    color: workspaceColors.muted,
    flexShrink: 0,
  },
  progressTrack: {
    height: pollMetrics.progressHeight,
    borderRadius: workspaceRadii.pill,
    backgroundColor: workspaceColors.hairline,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: workspaceRadii.pill,
    backgroundColor: workspaceColors.accent,
  },
  submit: {
    height: pollMetrics.submitHeight,
    borderRadius: workspaceRadii.control,
    borderWidth: 1,
    borderColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  submitLabel: {
    ...pollTypography.optionLabel,
    color: workspaceColors.accent,
  },
  submitDisabled: {
    opacity: 0.45,
  },
  hint: {
    ...pollTypography.hint,
    color: workspaceColors.muted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: pollColors.footerHairline,
    paddingTop: 10,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: FOOTER_HIT_AREA,
    flexShrink: 0,
  },
  footerActionLabel: {
    ...pollTypography.progressLabel,
    color: pollColors.ink,
  },
  footerActionDanger: {
    color: pollColors.danger,
  },
});
