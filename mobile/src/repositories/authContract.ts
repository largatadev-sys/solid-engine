/**
 * The auth boundary's shared contract — the half that is not platform-specific.
 *
 * <p><strong>Why this file exists (S0.4).</strong> `authRepository` has two implementations:
 * `.native.ts` on the RNFirebase SDK (the app that ships) and `.web.ts` on the Firebase JS SDK (the
 * founders' preview — interim, per the S0.4 spec). Metro picks one per platform, and callers cannot
 * tell which they got. The error *types*, though, must not fork: a screen does `error instanceof
 * AuthError`, and two copies of that class — one per platform file — would be two different classes,
 * so the check would silently fail on whichever build did not define the one being thrown. Types and
 * errors live here, once; only the SDK calls fork.
 *
 * The doorway asymmetry this encodes: Firebase owns identity uniformly (same user pool, same JWT,
 * same backend contract), but *getting* a credential is per-platform — a native account picker on
 * Android, a form on web. Everything above this seam is written once.
 */

import type { AuthRepository } from './authRepository';

/** The user backed out of the native picker. Not an error to show — nothing went wrong. */
export class AuthCancelled extends Error {
  constructor() {
    super('Sign-in was cancelled.');
    this.name = 'AuthCancelled';
  }
}

/**
 * The one typed error the auth layer throws — the counterpart to `ApiError` for the identity
 * provider (06b §6, P6: one typed gateway per boundary).
 *
 * Screens render `message` and never see a Firebase `auth/…` code. That is the ADR-001 boundary
 * doing its job: an earlier version translated these codes inside the sign-in screen, which meant
 * UI code knew the provider existed — and every future auth screen would have re-implemented the
 * same cascade (and drifted).
 */
export class AuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

/**
 * Firebase's `auth/…` codes, translated once, at the boundary — shared because both SDKs raise the
 * same code strings (the wire contract is Firebase's, not the SDK's).
 *
 * Deliberately vague about *which half* of a credential was wrong: distinguishing "no such account"
 * from "wrong password" hands anyone with a list of emails a way to learn which are registered.
 */
export function translate(error: unknown): never {
  if (error instanceof AuthCancelled) throw error;

  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';

  switch (code) {
    case 'auth/invalid-email':
      throw new AuthError(code, 'That email address is not valid.');
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      throw new AuthError(code, 'Email or password is incorrect.');
    case 'auth/email-already-in-use':
      throw new AuthError(code, 'An account with that email already exists.');
    case 'auth/weak-password':
      throw new AuthError(code, 'Password must be at least 6 characters.');
    case 'auth/network-request-failed':
      throw new AuthError(code, 'Could not reach the server. Check your connection.');
    case 'auth/too-many-requests':
      throw new AuthError(code, 'Too many attempts. Try again shortly.');
    default:
      throw new AuthError(code === '' ? 'AUTH_FAILED' : code, 'Sign-in failed. Please try again.');
  }
}

/**
 * What a signed-in traveler looks like to code above this boundary: an id and nothing else.
 *
 * Neither SDK's user object appears above the seam — the native SDK's `FirebaseAuthTypes.User` and
 * the JS SDK's `User` are different types, and a screen that named either would compile on one
 * platform only. Only `uid` is needed (the AuthProvider's whole job is signed-in-or-not), so only
 * `uid` crosses.
 */
export interface AuthUser {
  readonly uid: string;
}

/**
 * The capabilities a platform's auth doorway may or may not have.
 *
 * `google` is false on web by decision, not by accident (S0.4 spec): the browser doorway is a
 * different flow — popup/redirect, authorized domains, its own failure modes — and the founders'
 * preview does not earn that work. The sign-in screen asks this rather than checking `Platform.OS`,
 * because the question it actually has is "should I render this button", not "am I on Android" — and
 * when the real web surface ships and builds the Google doorway properly, this flips to true in one
 * file and no screen changes.
 */
export interface AuthCapabilities {
  readonly google: boolean;
}

export type { AuthRepository };
