/**
 * Web preview auth via Firebase's Identity Toolkit REST API — no Firebase JS SDK (S0.4).
 *
 * <p><strong>Why REST instead of the SDK.</strong> The Firebase JS SDK registers its auth component
 * through an import *side effect* that Metro's tree-shaker removes from the web export — the bundle
 * ships without the registration and `getAuth`/`initializeAuth` throw "Component auth has not been
 * registered yet", a white screen before React renders. Several documented Metro workarounds
 * (disable package-exports, steer conditions, initializeAuth, .cjs) each fixed a layer without
 * fixing the registration, verified at the bundle. REST sidesteps the whole class: it is `fetch`
 * calls to Google's Identity Toolkit, imports nothing from `firebase/*`, so there is no component to
 * register and no bundler behaviour to fight. For a throwaway founder preview (spec: interim, never
 * device-AC evidence) this is more robust than the SDK, not less.
 *
 * <p><strong>What it is not.</strong> This is the preview only. The shipping app is the native
 * build, which uses `@react-native-firebase` (a real native SDK) — untouched by any of this. The
 * tokens minted here are ordinary Firebase ID tokens; the backend validates them exactly as it
 * validates the native app's (ADR-006), so nothing downstream knows or cares that the preview took
 * the REST path.
 *
 * <p>The only config it needs is the Firebase Web API key (the `key=` query param). authDomain,
 * appId, etc. are SDK concerns and gone.
 */

import type { AuthUser } from '../repositories/authContract';

const IDENTITY_BASE = 'https://identitytoolkit.googleapis.com/v1/accounts';
const SECURETOKEN_URL = 'https://securetoken.googleapis.com/v1/token';
const STORAGE_KEY = 'largata.web.session';

// Refresh a little before the hour is actually up, so an in-flight request never rides an
// already-expired token because the clocks disagreed by a second.
const EXPIRY_SKEW_MS = 60_000;

// Direct static access, not process.env[name]: Expo inlines EXPO_PUBLIC_* on web by literal text
// substitution, and a computed key is invisible to that pass (S0.4 gotcha — the reason a helper
// silently shipped `undefined` for two of these before).
const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

interface Session {
  idToken: string;
  refreshToken: string;
  uid: string;
  expiresAt: number; // epoch ms
}

type Listener = (user: AuthUser | null) => void;

const listeners = new Set<Listener>();
let session: Session | null = restore();

/** Reads a persisted session so a browser refresh does not sign the founder out. */
function restore(): Session | null {
  if (typeof window === 'undefined' || window.localStorage === undefined) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    // A stored idToken may already be expired; that is fine — getValidIdToken refreshes on demand.
    // We only need uid + refreshToken to consider the session restorable.
    if (typeof parsed.refreshToken === 'string' && typeof parsed.uid === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

function persist(next: Session | null): void {
  session = next;
  if (typeof window !== 'undefined' && window.localStorage !== undefined) {
    if (next === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  const user: AuthUser | null = next === null ? null : { uid: next.uid };
  for (const listener of listeners) listener(user);
}

/**
 * Firebase REST errors carry a machine code in `error.message` (e.g. `EMAIL_NOT_FOUND`). Map it to
 * the same `auth/*` code the SDK would have raised, so the shared `translate()` in authContract —
 * which the native path already uses — produces identical, deliberately-vague user messages. One
 * error vocabulary across both platforms; no second copy to drift.
 */
function mapRestError(restMessage: string): string {
  // Messages can be `WEAK_PASSWORD : Password should be...` — match on the leading code.
  const code = restMessage.split(' ')[0];
  switch (code) {
    case 'EMAIL_NOT_FOUND':
    case 'INVALID_PASSWORD':
    case 'INVALID_LOGIN_CREDENTIALS':
      return 'auth/invalid-credential';
    case 'EMAIL_EXISTS':
      return 'auth/email-already-in-use';
    case 'WEAK_PASSWORD':
      return 'auth/weak-password';
    case 'INVALID_EMAIL':
      return 'auth/invalid-email';
    case 'MISSING_PASSWORD':
    case 'MISSING_EMAIL':
      return 'auth/invalid-credential';
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return 'auth/too-many-requests';
    default:
      return 'auth/internal-error';
  }
}

/** Throws an error shaped like the SDK's (a `.code` translate() understands). */
function fail(restMessage: string): never {
  const error = new Error(restMessage) as Error & { code: string };
  error.code = mapRestError(restMessage);
  throw error;
}

async function post(url: string, body: unknown): Promise<Record<string, unknown>> {
  if (API_KEY === undefined || API_KEY === '') {
    // Fail loudly and early, matching the native side's stance — a preview with no key should not
    // look fine until the first sign-in tap.
    throw new Error(
      'EXPO_PUBLIC_FIREBASE_API_KEY is not set. The web preview reads it as the Identity Toolkit ' +
        'REST key. See mobile/.env.example.',
    );
  }

  let response: Response;
  try {
    response = await fetch(`${url}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // Network-shaped: mirror the SDK's auth/network-request-failed so translate() says the right
    // thing.
    const error = new Error('network') as Error & { code: string };
    error.code = 'auth/network-request-failed';
    throw error;
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const restError = (data.error as { message?: string } | undefined)?.message ?? 'UNKNOWN';
    fail(restError);
  }
  return data;
}

function storeFromAuthResponse(data: Record<string, unknown>): void {
  const expiresInSec = Number(data.expiresIn ?? 3600);
  persist({
    idToken: String(data.idToken),
    refreshToken: String(data.refreshToken),
    uid: String(data.localId),
    // No Date.now() ban here (browser runtime, not a workflow script) — a real clock is needed.
    expiresAt: Date.now() + expiresInSec * 1000,
  });
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const data = await post(`${IDENTITY_BASE}:signInWithPassword`, {
    email,
    password,
    returnSecureToken: true,
  });
  storeFromAuthResponse(data);
}

export async function signUpWithPassword(email: string, password: string): Promise<void> {
  const data = await post(`${IDENTITY_BASE}:signUp`, { email, password, returnSecureToken: true });
  storeFromAuthResponse(data);
  // Mirror native: send verification, gate nothing on it (S1.2 owns enforcement). Fire-and-forget —
  // a verification-email hiccup must not fail sign-up.
  void post(`${IDENTITY_BASE}:sendOobCode`, {
    requestType: 'VERIFY_EMAIL',
    idToken: String(data.idToken),
  }).catch(() => undefined);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await post(`${IDENTITY_BASE}:sendOobCode`, { requestType: 'PASSWORD_RESET', email });
}

export function signOut(): void {
  persist(null);
}

/**
 * The current ID token, refreshed if it is close to expiry. Returns null when signed out.
 *
 * The refresh mirrors the SDK's transparent behaviour: we never cache a token past its life, and the
 * refresh token is exchanged at the securetoken endpoint for a fresh pair. A dead refresh token
 * (revoked, or the account deleted) clears the session and signs the founder out — which the auth
 * listener turns into a bounce to the sign-in screen.
 */
export async function getValidIdToken(): Promise<string | null> {
  if (session === null) return null;
  if (session.expiresAt - Date.now() > EXPIRY_SKEW_MS) return session.idToken;

  if (API_KEY === undefined || API_KEY === '') return null;

  let response: Response;
  try {
    response = await fetch(`${SECURETOKEN_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(session.refreshToken)}`,
    });
  } catch {
    // A transient network failure should not sign the user out; return the (possibly stale) token
    // and let the backend reject it if it truly expired — the next call retries the refresh.
    return session.idToken;
  }

  if (!response.ok) {
    // A non-transient refresh failure means the refresh token is dead — sign out for real.
    persist(null);
    return null;
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const expiresInSec = Number(data.expires_in ?? 3600);
  persist({
    idToken: String(data.id_token),
    refreshToken: String(data.refresh_token),
    uid: String(data.user_id),
    expiresAt: Date.now() + expiresInSec * 1000,
  });
  return String(data.id_token);
}

/**
 * Subscribe to auth state. Fires immediately with the restored session (or null), then on every
 * sign-in / sign-up / sign-out / refresh-failure — the same contract the native SDK's
 * `onAuthStateChanged` offers, so AuthProvider is unaware which platform it is on.
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(session === null ? null : { uid: session.uid });
  return () => listeners.delete(listener);
}
