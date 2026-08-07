import { ApiError } from './ApiError';
import { currentToken } from '../auth/tokenSource';
import type { ErrorEnvelope } from '../types/api';



const DEFAULT_BASE_URL = 'http://10.0.2.2:8080';


export function baseUrl(): string {
  return process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL;
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}

async function request<T>(path: string, init?: { method: string; body?: unknown }): Promise<T> {
  const token = await currentToken();
  const hasBody = init !== undefined && init.body !== undefined;

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(hasBody ? { body: JSON.stringify(init.body) } : {}),
    });
  } catch {
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
    throw new ApiError({
      code: 'UNEXPECTED_RESPONSE',
      message: 'The server returned an unexpected response.',
      status: response.status,
    });
  }

  return body as T;
}

async function upload<T>(path: string, part: FormData): Promise<T> {
  const token = await currentToken();

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: part,
    });
  } catch {
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
    throw new ApiError({
      code: 'UNEXPECTED_RESPONSE',
      message: 'The server returned an unexpected response.',
      status: response.status,
    });
  }

  return body as T;
}

async function fetchBlob(path: string): Promise<Blob | null> {
  const token = await currentToken();
  if (token === null) return null;

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw ApiError.offline();
  }

  return response.ok ? await response.blob() : null;
}

export const apiClient = {
  get: <T>(path: string): Promise<T> => request<T>(path),

  upload: <T>(path: string, part: FormData): Promise<T> => upload<T>(path, part),

  fetchBlob: (path: string): Promise<Blob | null> => fetchBlob(path),

  post: <T>(path: string, body: unknown): Promise<T> => request<T>(path, { method: 'POST', body }),

  patch: <T>(path: string, body: unknown): Promise<T> => request<T>(path, { method: 'PATCH', body }),

  put: <T>(path: string, body: unknown): Promise<T> => request<T>(path, { method: 'PUT', body }),

  delete: (path: string, body?: unknown): Promise<void> => request<void>(path, { method: 'DELETE', body }),
};
