import { createRequire } from 'node:module';
import type { PoolTag } from './identities';

const require = createRequire(__filename);

interface PoolApi {
  API: string;
  api: (path: string, method?: string, token?: string, body?: unknown) => Promise<ApiResponse>;
  request: (
    url: string,
    method: string,
    body?: unknown,
    headers?: Record<string, string>,
  ) => Promise<ApiResponse>;
  address: (tag: string) => string;
  poolToken: (tag: string) => Promise<string>;
  allMyTrips: (token: string) => Promise<unknown[]>;
  requirePoolEnv: () => void;
}

export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

interface ProfileTool {
  precompleteProfile: (
    api: PoolApi['api'],
    token: string,
    tag: string,
  ) => Promise<{ handle: string; onboardingCompleted: boolean }>;
  handleForTag: (tag: string) => string;
}

const pool = require('../../scripts/poolApi.js') as PoolApi;
const { precompleteProfile, handleForTag } = require('../../scripts/precomplete-profile.js') as ProfileTool;

export { handleForTag };

export const API = pool.API;
export const api = pool.api;
export const request = pool.request;
export const address = pool.address;

const TOKEN_LIFETIME_MS = 30 * 60 * 1000;

const tokens = new Map<PoolTag, { minted: Promise<string>; at: number }>();

export function tokenFor(tag: PoolTag): Promise<string> {
  const existing = tokens.get(tag);
  if (existing !== undefined && Date.now() - existing.at < TOKEN_LIFETIME_MS) {
    return existing.minted;
  }
  const minted = pool.poolToken(tag);
  tokens.set(tag, { minted, at: Date.now() });
  return minted;
}

export function missingPoolEnv(): string[] {
  return [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'LARGATA_TEST_POOL_EMAIL_BASE',
    'LARGATA_TEST_POOL_PASSWORD',
  ].filter((name) => {
    const value = process.env[name];
    return value === undefined || value === '';
  });
}

export async function backendReachable(): Promise<boolean> {
  try {
    const health = await api('/v1/health');
    return health.status === 200;
  } catch {
    return false;
  }
}

export async function authenticatedReadiness(tag: PoolTag): Promise<boolean> {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const answered = await api('/v1/me', 'GET', await tokenFor(tag)).catch(() => undefined);
    if (answered?.status === 200) return true;

    tokens.delete(tag);
    await new Promise((resume) => setTimeout(resume, 1000 * attempt));
  }
  return false;
}

export async function profileFor(tag: PoolTag): Promise<{ handle: string }> {
  const token = await tokenFor(tag);
  return precompleteProfile(api, token, tag);
}
