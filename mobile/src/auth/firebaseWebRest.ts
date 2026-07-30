

import type { AuthUser } from '../repositories/authContract';

const IDENTITY_BASE = 'https://identitytoolkit.googleapis.com/v1/accounts';
const SECURETOKEN_URL = 'https://securetoken.googleapis.com/v1/token';
const STORAGE_KEY = 'largata.web.session';

const EXPIRY_SKEW_MS = 60_000;

const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

interface Session {
  idToken: string;
  refreshToken: string;
  uid: string;
  expiresAt: number;
  emailVerified: boolean;
}

type Listener = (user: AuthUser | null) => void;

const listeners = new Set<Listener>();
let session: Session | null = restore();


function restore(): Session | null {
  if (typeof window === 'undefined' || window.localStorage === undefined) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    if (typeof parsed.refreshToken === 'string' && typeof parsed.uid === 'string') {
      return { ...parsed, emailVerified: emailVerifiedIn(parsed.idToken) };
    }
    return null;
  } catch {
    return null;
  }
}


export function emailVerifiedIn(idToken: string): boolean {
  const payload = idToken?.split('.')[1];
  if (payload === undefined) return false;
  try {
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(globalThis.atob(padded)) as { email_verified?: boolean };
    return claims.email_verified === true;
  } catch {
    return false;
  }
}

function persist(next: Session | null): void {
  session = next;
  if (typeof window !== 'undefined' && window.localStorage !== undefined) {
    if (next === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  const user: AuthUser | null =
    next === null ? null : { uid: next.uid, emailVerified: next.emailVerified };
  for (const listener of listeners) listener(user);
}


function mapRestError(restMessage: string): string {
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
    case 'INVALID_IDP_RESPONSE':
    case 'INVALID_CREDENTIAL_OR_PROVIDER_ID':
      return 'auth/invalid-credential';
    case 'FEDERATED_USER_ID_ALREADY_LINKED':
    case 'EMAIL_EXISTS_DIFFERENT_CREDENTIAL':
      return 'auth/account-exists-with-different-credential';
    case 'USER_DISABLED':
      return 'auth/user-disabled';
    default:
      return 'auth/internal-error';
  }
}


function fail(restMessage: string): never {
  const error = new Error(restMessage) as Error & { code: string };
  error.code = mapRestError(restMessage);
  throw error;
}

async function post(url: string, body: unknown): Promise<Record<string, unknown>> {
  if (API_KEY === undefined || API_KEY === '') {
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
  const idToken = String(data.idToken);
  persist({
    idToken,
    refreshToken: String(data.refreshToken),
    uid: String(data.localId),
    expiresAt: Date.now() + expiresInSec * 1000,
    emailVerified: emailVerifiedIn(idToken),
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


export async function signInWithGoogleIdToken(idToken: string, requestUri: string): Promise<void> {
  const data = await post(`${IDENTITY_BASE}:signInWithIdp`, {
    postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`,
    requestUri,
    returnSecureToken: true,
  });
  storeFromAuthResponse(data);
}

export async function signUpWithPassword(email: string, password: string): Promise<void> {
  const data = await post(`${IDENTITY_BASE}:signUp`, { email, password, returnSecureToken: true });
  storeFromAuthResponse(data);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await post(`${IDENTITY_BASE}:sendOobCode`, { requestType: 'PASSWORD_RESET', email });
}


export async function refreshVerification(): Promise<boolean> {
  if (session === null) return false;
  if (API_KEY === undefined || API_KEY === '') return false;
  try {
    const response = await fetch(`${SECURETOKEN_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(session.refreshToken)}`,
    });
    if (!response.ok) return false;
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const expiresInSec = Number(data.expires_in ?? 3600);
    const idToken = String(data.id_token);
    const verified = emailVerifiedIn(idToken);
    persist({
      idToken,
      refreshToken: String(data.refresh_token),
      uid: String(data.user_id),
      expiresAt: Date.now() + expiresInSec * 1000,
      emailVerified: verified,
    });
    return verified;
  } catch {
    return false;
  }
}

export function signOut(): void {
  persist(null);
}


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
    return session.idToken;
  }

  if (!response.ok) {
    persist(null);
    return null;
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const expiresInSec = Number(data.expires_in ?? 3600);
  const idToken = String(data.id_token);
  persist({
    idToken,
    refreshToken: String(data.refresh_token),
    uid: String(data.user_id),
    expiresAt: Date.now() + expiresInSec * 1000,
    emailVerified: emailVerifiedIn(idToken),
  });
  return idToken;
}


export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(session === null ? null : { uid: session.uid, emailVerified: session.emailVerified });
  return () => listeners.delete(listener);
}
