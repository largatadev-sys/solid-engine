import { initialsFor } from '../onboarding/initials';
import type { ChatMessageResponse } from '../types/api';


export const MAX_MESSAGE_LENGTH = 2_000;

export const COUNTER_VISIBLE_FROM = 1_900;

const GROUPING_WINDOW_MS = 5 * 60 * 1_000;

const GAP_TIMESTAMP_MS = 20 * 60 * 1_000;

const MS_PER_DAY = 24 * 60 * 60 * 1_000;


export type SendState = 'confirmed' | 'pending' | 'failed';


export type ThreadMessage = {
  readonly id: string;
  readonly authorId: string;
  readonly handle: string | null;
  readonly displayName: string | null;
  readonly body: string;
  readonly at: string;
  readonly mine: boolean;
  readonly state: SendState;
};


export type MessageRow = {
  readonly kind: 'message';
  readonly key: string;
  readonly message: ThreadMessage;
  readonly startsGroup: boolean;
  readonly endsGroup: boolean;
};


export type DateSeparatorRow = {
  readonly kind: 'date';
  readonly key: string;
  readonly label: string;
};


export type TimestampRow = {
  readonly kind: 'timestamp';
  readonly key: string;
  readonly label: string;
};


export type ThreadRow = MessageRow | DateSeparatorRow | TimestampRow;


export function threadRows(messages: readonly ThreadMessage[], now: Date): ThreadRow[] {
  const rows: ThreadRow[] = [];

  messages.forEach((message, index) => {
    const previous = messages[index - 1] ?? null;
    const next = messages[index + 1] ?? null;

    if (previous === null || !sameCalendarDay(previous.at, message.at)) {
      rows.push({
        kind: 'date',
        key: `date:${message.id}`,
        label: dateSeparatorLabel(message.at, now),
      });
    } else if (millisBetween(previous.at, message.at) >= GAP_TIMESTAMP_MS) {
      rows.push({
        kind: 'timestamp',
        key: `time:${message.id}`,
        label: timeOfDayLabel(message.at),
      });
    }

    const startsGroup = previous === null || !groupsWith(previous, message, rows);
    const endsGroup = next === null || !groupsWith(message, next, null);

    rows.push({ kind: 'message', key: message.id, message, startsGroup, endsGroup });
  });

  return rows;
}


export function counterState(length: number): {
  readonly visible: boolean;
  readonly atCap: boolean;
  readonly label: string;
} {
  return {
    visible: length >= COUNTER_VISIBLE_FROM,
    atCap: length >= MAX_MESSAGE_LENGTH,
    label: `${withThousands(length)} / ${withThousands(MAX_MESSAGE_LENGTH)}`,
  };
}


export function canSend(draft: string): boolean {
  return draft.trim().length > 0;
}


export function clampToCap(draft: string): string {
  return [...draft].slice(0, MAX_MESSAGE_LENGTH).join('');
}


export function avatarLabel(message: ThreadMessage): string {
  return initialsFor(message.displayName, message.handle);
}


export function authorLabel(message: ThreadMessage): string {
  if (message.handle !== null && message.handle !== '') return `@${message.handle}`;
  if (message.displayName !== null && message.displayName !== '') return message.displayName;
  return 'Someone';
}


export function tintIndexFor(authorId: string, paletteSize: number): number {
  if (paletteSize <= 0) return 0;

  let hash = 0;
  for (const character of authorId) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return Math.abs(hash) % paletteSize;
}


export function toThreadMessage(
  response: ChatMessageResponse,
  viewerId: string | null,
): ThreadMessage {
  return {
    id: response.id,
    authorId: response.author?.travelerId ?? '',
    handle: response.author?.handle ?? null,
    displayName: response.author?.displayName ?? null,
    body: response.body,
    at: response.at,
    mine: viewerId !== null && response.author?.travelerId === viewerId,
    state: 'confirmed',
  };
}


export function mergeById(
  existing: readonly ThreadMessage[],
  incoming: readonly ThreadMessage[],
): ThreadMessage[] {
  const byId = new Map<string, ThreadMessage>();
  for (const message of [...existing, ...incoming]) {
    byId.set(message.id, message);
  }
  return [...byId.values()].sort(byTimeThenId);
}


function byTimeThenId(left: ThreadMessage, right: ThreadMessage): number {
  const byTime = Date.parse(left.at) - Date.parse(right.at);
  if (byTime !== 0 && Number.isFinite(byTime)) return byTime;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}


function groupsWith(
  earlier: ThreadMessage,
  later: ThreadMessage,
  rowsSoFar: readonly ThreadRow[] | null,
): boolean {
  if (earlier.authorId !== later.authorId) return false;
  if (earlier.mine !== later.mine) return false;
  if (millisBetween(earlier.at, later.at) >= GROUPING_WINDOW_MS) return false;
  if (!sameCalendarDay(earlier.at, later.at)) return false;
  if (rowsSoFar === null) return true;

  const last = rowsSoFar[rowsSoFar.length - 1];
  return last === undefined || last.kind === 'message';
}


function millisBetween(earlier: string, later: string): number {
  const from = Date.parse(earlier);
  const to = Date.parse(later);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return to - from;
}


function sameCalendarDay(left: string, right: string): boolean {
  const a = new Date(left);
  const b = new Date(right);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return true;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}


function dateSeparatorLabel(at: string, now: Date): string {
  const when = new Date(at);
  if (Number.isNaN(when.getTime())) return '';

  const days = calendarDaysBetween(when, now);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';

  return when.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}


function calendarDaysBetween(when: Date, now: Date): number {
  const startOfWhen = Date.UTC(when.getFullYear(), when.getMonth(), when.getDate());
  const startOfNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((startOfNow - startOfWhen) / MS_PER_DAY);
}


function timeOfDayLabel(at: string): string {
  const when = new Date(at);
  if (Number.isNaN(when.getTime())) return '';
  return when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}


function withThousands(value: number): string {
  return value.toLocaleString('en-US');
}
