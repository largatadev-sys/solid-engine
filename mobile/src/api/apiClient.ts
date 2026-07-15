import { ApiError } from './ApiError';
import { currentToken } from '../auth/tokenSource';
import type { ErrorEnvelope } from '../types/api';

/**
 * The one typed outbound client (06b §6, P6). Components never call `fetch` — everything goes
 * through here, and this is the only module in the app that knows `fetch` exists.
 *
 * Returns typed data or throws exactly one error type ({@link ApiError}).
 *
 * Auth-token attach lives here as promised at S0.1 — once, in this file, never at a call site
 * (S0.2). Refresh does not: `@react-native-firebase/auth` returns a valid token from its own cache
 * and refreshes it natively when it is close to expiring, so there is no refresh logic for us to
 * own. What we must never do is cache the token ourselves — that is how an app ends up sending a
 * token it refreshed past.
 */

const DEFAULT_BASE_URL = 'http://10.0.2.2:8080';

/**
 * `10.0.2.2` is the Android emulator's alias for the host machine's loopback: `localhost` inside
 * the emulator is the emulator itself, so it would never reach a backend running on the host.
 */
export function baseUrl(): string {
  return process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL;
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}

async function request<T>(path: string): Promise<T> {
  const token = await currentToken();

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      headers: {
        Accept: 'application/json',
        // Signed out: no header at all, rather than an empty or "Bearer null" one. The backend
        // treats every flavor of missing/invalid credential identically (UNAUTHENTICATED), but
        // sending a malformed header would be us manufacturing a rejection we could just not send.
        ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    // Travelers live in dead zones (ADR-001). An unreachable network is an expected outcome,
    // not an exception to leak upward untyped.
    throw ApiError.offline();
  }

  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (isErrorEnvelope(body)) {
      throw new ApiError({
        code: body.code,
        message: body.message,
        status: response.status,
        traceId: body.traceId,
      });
    }
    // A non-2xx that isn't our envelope means something upstream of the app answered — a proxy,
    // a load balancer, a captive portal.
    throw new ApiError({
      code: 'UNEXPECTED_RESPONSE',
      message: 'The server returned an unexpected response.',
      status: response.status,
    });
  }

  return body as T;
}

export const apiClient = {
  get: <T>(path: string): Promise<T> => request<T>(path),
};
