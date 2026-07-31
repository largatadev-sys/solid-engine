import type { LeaseHolderResponse } from '../types/api';


export function holderLabel(holder: Pick<LeaseHolderResponse, 'handle' | 'displayName'>): string {
  if (holder.handle !== null && holder.handle !== '') return `@${holder.handle}`;
  if (holder.displayName !== null && holder.displayName !== '') return holder.displayName;
  return 'another member';
}


export function leaseNotice(
  lease: LeaseHolderResponse | null | undefined,
  myTravelerId: string | undefined,
): string | null {
  if (lease === null || lease === undefined) return null;
  if (myTravelerId !== undefined && lease.travelerId === myTravelerId) return null;
  return `Being edited by ${holderLabel(lease)}`;
}


export function attributionLine(
  activity: {
    lastEditedByHandle?: string | null;
    lastEditedByName?: string | null;
    lastEditedAt: string;
  },
  now: number,
): string {
  const who = activity.lastEditedByHandle ?? null;
  const name = who !== null && who !== '' ? `@${who}` : (activity.lastEditedByName ?? 'a member');
  return `Updated ${relativeTime(activity.lastEditedAt, now)} by ${name}`;
}


export function relativeTime(isoInstant: string, now: number): string {
  const then = Date.parse(isoInstant);
  if (Number.isNaN(then)) return 'recently';

  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return 'just now';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
