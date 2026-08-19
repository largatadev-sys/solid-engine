import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { PollOptionRow } from './PollOptionRow';
import {
  deadlineMetaFor,
  isClosed,
  kebabMenuFor,
  optionStateFor,
  progressFor,
  submitLabelFor,
  voteGrammarFor,
  winnerIdsOf,
} from './pollBoard';
import {
  POLL_ACTIONS_LABEL,
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
  const [menuOpen, setMenuOpen] = useState(false);

  const closed = isClosed(poll);
  const winners = winnerIdsOf(poll);
  const submit = canVote ? submitLabelFor(poll, selected) : null;
  const menu = kebabMenuFor(poll, isOwner, archived);
  const changing = voteGrammarFor(poll, selected) === 'changing';
  const progress = progressFor(poll);
  const nobodyVoted = closed && poll.votedCount === 0;

  const pick = (optionId: string) => {
    setSelected((current) => (current === optionId ? null : optionId));
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

        <View style={styles.headerActions}>
          <View style={[styles.badge, closed ? styles.badgeClosed : styles.badgeOpen]}>
            <Text style={closed ? styles.badgeClosedText : styles.badgeOpenText}>
              {closed ? POLL_CLOSED_BADGE : POLL_OPEN_BADGE}
            </Text>
          </View>

          {menu.length > 0 && (
            <Pressable
              onPress={() => setMenuOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel={POLL_ACTIONS_LABEL}
              hitSlop={8}
              style={styles.kebab}
            >
              <Icon
                name="kebab"
                size={16}
                color={menuOpen ? workspaceColors.title : workspaceColors.muted}
              />
            </Pressable>
          )}
        </View>
      </View>

      {menuOpen && (
        <View style={styles.menu}>
          {menu.includes('close') && (
            <Pressable
              style={styles.menuItem}
              disabled={busy}
              onPress={() => {
                setMenuOpen(false);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={POLL_CLOSE_NOW_LABEL}
            >
              <Icon name="clock" size={15} color={pollColors.ink} />
              <Text style={styles.menuItemText}>{POLL_CLOSE_NOW_LABEL}</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.menuItem}
            disabled={busy}
            onPress={() => {
              setMenuOpen(false);
              onDelete();
            }}
            accessibilityRole="button"
            accessibilityLabel={POLL_DELETE_LABEL}
          >
            <Icon name="trash" size={15} color={pollColors.danger} />
            <Text style={[styles.menuItemText, styles.menuItemDanger]}>{POLL_DELETE_LABEL}</Text>
          </Pressable>
        </View>
      )}

      {nobodyVoted ? (
        <Text style={styles.emptyBody}>{POLL_NO_VOTES_BODY}</Text>
      ) : (
        <View style={styles.options}>
          {poll.options.map((option) => (
            <PollOptionRow
              key={option.id}
              option={option}
              state={optionStateFor(poll, option.id, selected)}
              starred={winners.includes(option.id)}
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
            <View style={[styles.progressFill, { width: `${progress.fraction * 100}%` }]} />
          </View>
        </View>
      )}

      {submit !== null && (
        <Pressable
          style={[
            styles.submit,
            changing ? styles.submitFilled : styles.submitOutline,
            (!submit.enabled || busy) && styles.submitDisabled,
          ]}
          disabled={!submit.enabled || busy}
          onPress={() => selected !== null && onVote(selected)}
          accessibilityRole="button"
          accessibilityLabel={submit.label}
        >
          <Text
            style={changing ? styles.submitFilledText : styles.submitOutlineText}
            numberOfLines={1}
          >
            {submit.label}
          </Text>
        </Pressable>
      )}

      {canVote && !closed && submit === null && (
        <Text style={styles.hint}>{POLL_CHANGE_HINT}</Text>
      )}
    </View>
  );
}


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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
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
  kebab: {
    padding: 2,
  },
  menu: {
    alignSelf: 'flex-end',
    minWidth: 180,
    borderRadius: pollMetrics.optionRadius,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    backgroundColor: workspaceColors.surface,
    ...workspaceCardShadow,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuItemText: {
    ...pollTypography.menuItem,
    color: pollColors.ink,
  },
  menuItemDanger: {
    color: pollColors.danger,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  submitOutline: {
    borderWidth: 1,
    borderColor: workspaceColors.accent,
  },
  submitOutlineText: {
    ...pollTypography.optionLabel,
    color: workspaceColors.accent,
  },
  submitFilled: {
    backgroundColor: workspaceColors.accent,
  },
  submitFilledText: {
    ...pollTypography.optionLabel,
    color: workspaceColors.onAccent,
  },
  submitDisabled: {
    opacity: 0.45,
  },
  hint: {
    ...pollTypography.hint,
    color: workspaceColors.muted,
  },
});
