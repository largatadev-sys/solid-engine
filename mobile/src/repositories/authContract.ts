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
 * `google` was a boolean until S0.5, when the founders asked for the preview's sign-in screen to
 * *look like* the app they will ship — Google + email. That request split the flag: rendering the
 * button and having a working doorway had been the same question only because the answers happened
 * to coincide (native: yes/yes; web: no/no). They diverge on the preview, and a boolean cannot say
 * "show it, but there is nothing behind it".
 *
 * - `'full'` — a working doorway: render the button, configure the native SDK (the shipping app).
 * - `'cosmetic'` — render the button, install nothing; a tap surfaces the repository's message. The
 *   founders' preview, which exists to show what the app looks like (S0.5). Deliberately not a dead
 *   click: a button that does nothing reads as a broken app, so `authRepository.web` throws an
 *   `AuthError` whose text says where Google *does* work, and the sign-in screen already renders it.
 * - `'none'` — no button. Nothing declares this today; it is what makes the type honest rather than
 *   a two-value enum wearing a third name, and it is what a future surface without Google would say.
 *
 * The state that cannot be spelled here is the point: "working but hidden" is unrepresentable.
 *
 * Call sites ask this rather than `Platform.OS`, because their real questions are "should I render
 * this button" and "is there an SDK to configure" — the platform is only today's reason for the
 * answers. When the real web surface builds the browser doorway (backlog), web moves to `'full'`:
 * the sign-in screen will not notice, and `_layout.tsx` will need a web install path (its current
 * one configures the *native* Google SDK, which a browser has no use for) — the gate stays, what it
 * gates forks. `'full'` means "a doorway exists", never "the native SDK's doorway exists".
 */
export type AuthDoorway = 'full' | 'cosmetic' | 'none';

export interface AuthCapabilities {
  readonly google: AuthDoorway;
}

export type { AuthRepository };
