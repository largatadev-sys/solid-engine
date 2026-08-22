export const EXPIRY_URGENT_HOURS = 48;


export function expiryLabelOf(expiresAt: string, now: number): string | null {
  const at = new Date(expiresAt).getTime();
  if (Number.isNaN(at)) return null;

  const hours = Math.floor((at - now) / 3_600_000);
  if (hours < 0) return null;
  if (hours < 1) return 'Expires within the hour';
  if (hours < 24) return `Expires in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;

  const days = Math.floor(hours / 24);
  return `Expires in ${days} ${days === 1 ? 'day' : 'days'}`;
}


export function expiryIsUrgent(expiresAt: string, now: number): boolean {
  const at = new Date(expiresAt).getTime();
  if (Number.isNaN(at)) return false;
  return at - now < EXPIRY_URGENT_HOURS * 3_600_000;
}


export function invitationHasExpired(expiresAt: string, now: number): boolean {
  const at = new Date(expiresAt).getTime();
  if (Number.isNaN(at)) return false;
  return at <= now;
}


export function invitedAgoLabel(createdAt: string, now: number): string {
  const then = new Date(createdAt).getTime();
  if (Number.isNaN(then)) return 'just now';

  const hours = Math.max(0, Math.floor((now - then) / 3_600_000));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}


export function inviterLine(inviterHandle: string | null, inviterName: string, createdAt: string, now: number): string {
  const who =
    inviterHandle !== null && inviterHandle !== ''
      ? `@${inviterHandle}`
      : inviterName === ''
        ? 'A traveler'
        : inviterName;
  return `Invited by ${who} · ${invitedAgoLabel(createdAt, now)}`;
}


export function tripMetaLine(destination: string | null, startDate: string | null, endDate: string | null): string | null {
  const parts: string[] = [];
  if (destination !== null && destination !== '') parts.push(destination);

  const dates = compactDateRange(startDate, endDate);
  if (dates !== null) parts.push(dates);

  return parts.length === 0 ? null : parts.join(' · ');
}


export function compactDateRange(startDate: string | null, endDate: string | null): string | null {
  if (startDate === null) return null;

  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;

  const opts = { month: 'short', day: 'numeric', timeZone: 'UTC' } as const;
  const from = start.toLocaleDateString('en-US', opts);
  if (endDate === null) return from;

  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) return from;

  return start.getUTCMonth() === end.getUTCMonth()
    ? `${from}–${end.getUTCDate()}`
    : `${from}–${end.toLocaleDateString('en-US', opts)}`;
}
