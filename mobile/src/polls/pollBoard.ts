import type { PollResponse } from '../types/api';


export const MAX_QUESTION_LENGTH = 120;

export const MAX_OPTION_LENGTH = 80;

export const MIN_OPTIONS = 2;

export const MAX_OPTIONS = 10;

const A_DAY_IN_MS = 24 * 60 * 60 * 1000;


export type VoteGrammar = 'none' | 'selected' | 'recorded' | 'changing';

export type OptionState = 'idle' | 'selected' | 'recorded' | 'demoted';

export type OptionMarker = 'none' | 'star' | 'radio' | 'selected' | 'check' | 'demotedCheck';

export type PollFooterAction = 'close' | 'delete';

export const SUBMIT_VOTE_LABEL = 'Submit Vote';


export function isClosed(poll: PollResponse): boolean {
  return poll.status === 'closed';
}


export function winnerIdsOf(poll: PollResponse): string[] {
  return isClosed(poll) ? poll.winningOptionIds : [];
}


export function progressFor(poll: PollResponse): { label: string; fraction: number } {
  const denominator = Math.max(poll.memberCount, 0);
  const fraction = denominator === 0 ? 0 : Math.min(poll.votedCount / denominator, 1);
  return { label: `${poll.votedCount} of ${poll.memberCount} voted`, fraction };
}


export function deadlineMetaFor(poll: PollResponse, now: number): string {
  const stamp = localStampOf(poll.closedAt ?? poll.closesAt);
  if (!isClosed(poll)) {
    return `Poll closes in ${remainingFrom(Date.parse(poll.closesAt) - now)} · ${stamp}`;
  }
  return `Poll closed · ${stamp}${closedQualifierFor(poll)}`;
}


export function voteGrammarFor(poll: PollResponse, selectedOptionId: string | null): VoteGrammar {
  if (isClosed(poll)) return 'none';
  if (poll.myVoteOptionId === null) return selectedOptionId === null ? 'none' : 'selected';
  return selectedOptionId === null || selectedOptionId === poll.myVoteOptionId
    ? 'recorded'
    : 'changing';
}


export function optionStateFor(
  poll: PollResponse,
  optionId: string,
  selectedOptionId: string | null,
): OptionState {
  if (isClosed(poll)) return 'idle';
  if (optionId === selectedOptionId) return 'selected';
  if (optionId !== poll.myVoteOptionId) return 'idle';
  return selectedOptionId === null ? 'recorded' : 'demoted';
}


export function markerFor(
  poll: PollResponse,
  optionId: string,
  selectedOptionId: string | null,
): OptionMarker {
  if (isClosed(poll)) {
    return winnerIdsOf(poll).includes(optionId) ? 'star' : 'none';
  }
  switch (optionStateFor(poll, optionId, selectedOptionId)) {
    case 'selected':
      return 'selected';
    case 'recorded':
      return 'check';
    case 'demoted':
      return 'demotedCheck';
    default:
      return 'radio';
  }
}

export function submitButtonFor(
  poll: PollResponse,
  selectedOptionId: string | null,
  busy: boolean,
): { label: string; enabled: boolean } | null {
  if (isClosed(poll)) return null;
  if (selectedOptionId !== null && selectedOptionId === poll.myVoteOptionId) return null;
  if (selectedOptionId === null && poll.myVoteOptionId !== null) return null;
  return { label: SUBMIT_VOTE_LABEL, enabled: selectedOptionId !== null && !busy };
}


export function footerActionsFor(
  poll: PollResponse,
  isOwner: boolean,
  archived: boolean,
): PollFooterAction[] {
  if (archived || !(poll.mine || isOwner)) return [];
  return isClosed(poll) ? ['delete'] : ['close', 'delete'];
}

export function boardIsWritable(archived: boolean): boolean {
  return !archived;
}


export function createFormValidity(
  question: string,
  options: readonly string[],
): {
  valid: boolean;
  canAddOption: boolean;
  canRemoveOption: boolean;
  submittable: { question: string; options: string[] };
} {
  const trimmedQuestion = question.trim();
  const filled = options.map((option) => option.trim()).filter((option) => option.length > 0);
  const withinCaps =
    trimmedQuestion.length <= MAX_QUESTION_LENGTH &&
    filled.every((option) => option.length <= MAX_OPTION_LENGTH);

  return {
    valid:
      trimmedQuestion.length > 0 &&
      filled.length >= MIN_OPTIONS &&
      filled.length <= MAX_OPTIONS &&
      withinCaps,
    canAddOption: options.length < MAX_OPTIONS,
    canRemoveOption: options.length > MIN_OPTIONS,
    submittable: { question: trimmedQuestion, options: filled },
  };
}


export function defaultDeadline(now: number): string {
  return new Date(now + A_DAY_IN_MS).toISOString();
}


function closedQualifierFor(poll: PollResponse): string {
  if (poll.winningOptionIds.length === 0) return ' · No votes';
  return poll.winningOptionIds.length > 1 ? ' · Tie' : '';
}


function remainingFrom(milliseconds: number): string {
  const minutes = Math.max(Math.round(milliseconds / 60_000), 0);
  if (minutes < 60) return plural(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 48) return plural(hours, 'hour');
  return plural(Math.round(hours / 24), 'day');
}


function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}


function localStampOf(instant: string): string {
  const at = new Date(instant);
  const month = at.toLocaleString(undefined, { month: 'short' });
  const time = at.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${month} ${at.getDate()}, ${time}`;
}
