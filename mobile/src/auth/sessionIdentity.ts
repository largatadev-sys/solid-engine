import type { AuthState } from '../hooks/authContext';

export const SIGNED_OUT = 'signed-out';

export type ObservedTraveler = string | null;

export function observedTravelerOf(auth: AuthState): ObservedTraveler {
  if (auth.kind === 'restoring') return null;
  if (auth.kind === 'signedOut') return SIGNED_OUT;

  return auth.firebaseUid;
}

export function cacheBelongsToSomebodyElse(
  previous: ObservedTraveler,
  next: ObservedTraveler,
): boolean {
  if (previous === null || next === null) return false;

  return previous !== next;
}
