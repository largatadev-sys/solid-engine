import type { FeedPostcardResponse } from '../types/api';

const MINUTE = 60_000;

const HOUR = 60 * MINUTE;

const DAY = 24 * HOUR;

const WEEK = 7 * DAY;

const COMPACT_FROM = 1000;


export function compactCount(count: number): string {
  if (count < COMPACT_FROM) {
    return String(count);
  }
  const thousands = count / COMPACT_FROM;
  const rounded = Math.floor(thousands * 10) / 10;
  return `${trimTrailingZero(rounded)}k`;
}


export function timeSince(sharedAt: string, now: number): string {
  const elapsed = now - Date.parse(sharedAt);
  if (Number.isNaN(elapsed) || elapsed < MINUTE) {
    return 'now';
  }
  if (elapsed < HOUR) {
    return `${Math.floor(elapsed / MINUTE)}m`;
  }
  if (elapsed < DAY) {
    return `${Math.floor(elapsed / HOUR)}h`;
  }
  if (elapsed < WEEK) {
    return `${Math.floor(elapsed / DAY)}d`;
  }
  return `${Math.floor(elapsed / WEEK)}w`;
}


export function authorName(card: FeedPostcardResponse): string {
  const named = card.author.displayName;
  if (named !== null && named.trim() !== '') {
    return named;
  }
  const handle = card.author.handle;
  return handle !== null && handle.trim() !== '' ? handle : 'A traveler';
}


export function authorInitials(card: FeedPostcardResponse): string {
  const name = authorName(card);
  const tagged = name.includes('+');
  const words = name.split(/[\s._+-]+/).filter((word) => word !== '');
  if (words.length === 0) {
    return '?';
  }
  const first = words[0] ?? '';
  const last = words[words.length - 1] ?? '';
  const chosen = tagged ? [first, last] : [first, words[1] ?? ''];
  return chosen
    .filter((word) => word !== '')
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}


export function tripLine(card: FeedPostcardResponse): string | null {
  if (card.tripTitle === null || card.tripTitle.trim() === '') {
    return null;
  }
  return `${card.tripTitle} · ${card.dayLabel}`;
}


export function tripLineNavigates(card: FeedPostcardResponse): boolean {
  return card.publishedItineraryId !== null;
}


function trimTrailingZero(value: number): string {
  return value % 1 === 0 ? String(Math.trunc(value)) : value.toFixed(1);
}
