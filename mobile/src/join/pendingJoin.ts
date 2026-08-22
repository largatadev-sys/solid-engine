export const PENDING_JOIN_STORAGE_KEY = 'largata.join.pending';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,512}$/;


export function joinRouteFor(token: string): string {
  return `/join/${encodeURIComponent(token)}`;
}


export function pendingJoinFromStorage(raw: string | null): string | null {
  if (raw === null) return null;

  const token = raw.trim();
  return TOKEN_PATTERN.test(token) ? token : null;
}


export function pendingJoinToStorage(token: string): string {
  return token.trim();
}


export function tokenFromJoinPath(pathname: string): string | null {
  const match = /^\/join\/([^/?#]+)/.exec(pathname);
  if (match === null) return null;

  try {
    return pendingJoinFromStorage(decodeURIComponent(match[1]!));
  } catch {
    return null;
  }
}
