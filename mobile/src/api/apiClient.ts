import { ApiError } from './ApiError';
import type { ErrorEnvelope } from '../types/api';

/**
 * The one typed outbound client (06b §6, P6). Components never call `fetch` — everything goes
 * through here, and this is the only module in the app that knows `fetch` exists.
 *
 * Returns typed data or throws exactly one error type ({@link ApiError}). Auth-token attach and
 * refresh land here at S0.2 — once, in this file, never at a call site.
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
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      headers: { Accept: 'application/json' },
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
