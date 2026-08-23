import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClient } from '@tanstack/react-query';
import type { AuthState } from '../src/hooks/authContext';
import { joinKeys } from '../src/query/joinKeys';
import { joinTeaserOptions } from '../src/query/joinQueries';
import { meKeys } from '../src/query/travelerQueries';
import type { JoinTeaserResponse } from '../src/types/api';
import {
  onViewerChanged,
  viewerChanged,
  viewerIdentityOf,
} from '../src/query/viewerScopedCache';

const TOKEN = 'invite-token';

const RESTORING: AuthState = { kind: 'restoring' };
const SIGNED_OUT: AuthState = { kind: 'signedOut' };

const signedIn = (firebaseUid: string): AuthState => ({
  kind: 'signedIn',
  firebaseUid,
  emailVerified: true,
});

const ANA = signedIn('uid-ana');
const BEN = signedIn('uid-ben');


describe('whether a cached answer outlives the traveler it was fetched for', () => {
  it('is discarded on sign-in, because the invite teaser said signedOut to the anonymous fetch', () => {
    expect(viewerChanged(SIGNED_OUT, ANA)).toBe(true);
  });

  it('is discarded on sign-out, so the next traveler never reads the last one', () => {
    expect(viewerChanged(ANA, SIGNED_OUT)).toBe(true);
  });

  it('is discarded when one traveler replaces another without signing out in between', () => {
    expect(viewerChanged(ANA, BEN)).toBe(true);
  });

  it('is kept when the same traveler re-emits, so a token refresh does not blank the app', () => {
    expect(viewerChanged(ANA, signedIn('uid-ana'))).toBe(false);
  });

  it('is kept while auth is still restoring, which is not yet an identity', () => {
    expect(viewerChanged(RESTORING, SIGNED_OUT)).toBe(false);
    expect(viewerChanged(RESTORING, ANA)).toBe(false);
  });

  it('is kept when a settled state falls back to restoring, so a remount discards nothing', () => {
    expect(viewerChanged(ANA, RESTORING)).toBe(false);
  });

  it('is kept when signed out twice, so a failed sign-in attempt costs no cache', () => {
    expect(viewerChanged(SIGNED_OUT, SIGNED_OUT)).toBe(false);
  });
});


describe('who the cache belongs to', () => {
  it('is the firebase uid while signed in', () => {
    expect(viewerIdentityOf(ANA)).toBe('uid-ana');
  });

  it('is nobody while signed out, which is a real identity the teaser answers for', () => {
    expect(viewerIdentityOf(SIGNED_OUT)).toBeNull();
  });

  it('is nobody while restoring, so it never collides with a real uid', () => {
    expect(viewerIdentityOf(RESTORING)).toBeNull();
  });
});


describe('what a viewer change does to cached answers', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient();
  });

  afterEach(() => {
    client.clear();
  });

  it('drops the invite teaser, which is what made the postcard keep saying Sign in', () => {
    client.setQueryData(joinKeys.teaser(TOKEN), { viewerState: 'signedOut' });

    onViewerChanged(client);

    expect(client.getQueryData(joinKeys.teaser(TOKEN))).toBeUndefined();
  });

  it('drops the traveler profile, so onboarding is never judged on the last account', () => {
    client.setQueryData(meKeys.me, { onboardingCompleted: true });

    onViewerChanged(client);

    expect(client.getQueryData(meKeys.me)).toBeUndefined();
  });
});


describe('how long an invite teaser is trusted', () => {
  it('is trusted for no time at all, because its answer depends on who is asking', () => {
    expect(joinTeaserOptions(TOKEN).staleTime).toBe(0);
  });
});


describe('the postcard a traveler reads after signing in from the invite', () => {
  const teaser = (viewerState: JoinTeaserResponse['viewerState']): JoinTeaserResponse => ({
    title: 'Island Hopping in El Nido',
    destination: 'El Nido',
    startDate: '2026-03-12',
    endDate: '2026-03-18',
    travelerCount: 2,
    hasCover: false,
    viewerState,
    itineraryId: null,
  });

  const APP_DEFAULTS = { defaultOptions: { queries: { staleTime: 30_000 } } };

  it('says Request to join, because the signed-out answer did not outlive the sign-in', async () => {
    const client = new QueryClient(APP_DEFAULTS);

    await client.fetchQuery({
      ...joinTeaserOptions(TOKEN),
      queryFn: () => Promise.resolve(teaser('signedOut')),
    });

    onViewerChanged(client);

    const after = await client.fetchQuery({
      ...joinTeaserOptions(TOKEN),
      queryFn: () => Promise.resolve(teaser('canRequest')),
    });

    expect(after.viewerState).toBe('canRequest');

    client.clear();
  });

  it('is stale on arrival without the clear, which is why the clear is the load-bearing half', async () => {
    const client = new QueryClient(APP_DEFAULTS);
    const options = { ...joinTeaserOptions(TOKEN), staleTime: 30_000 };

    await client.fetchQuery({ ...options, queryFn: () => Promise.resolve(teaser('signedOut')) });
    const reused = await client.fetchQuery({
      ...options,
      queryFn: () => Promise.resolve(teaser('canRequest')),
    });

    expect(reused.viewerState).toBe('signedOut');

    client.clear();
  });
});


describe('the provider that has to notice the viewer moved', () => {
  const source = readFileSync(join(__dirname, '..', 'src', 'hooks', 'useAuth.tsx'), 'utf8');

  it('asks whether the viewer changed on every auth emission', () => {
    expect(source).toMatch(/viewerChanged\(\s*previous\.current\s*,\s*next\s*\)/);
  });

  it('clears the cache when it did, or the invite postcard keeps the last traveler answer', () => {
    expect(source).toMatch(/if\s*\(viewerChanged\([^)]*\)\)\s*onViewerChanged\(client\)/);
  });

  it('remembers the state it just saw, or every emission compares against the first one', () => {
    expect(source).toMatch(/previous\.current\s*=\s*next/);
  });

  it('derives the state through the shared mapping, so the test pins what ships', () => {
    expect(source).toContain('authStateOf(user)');
  });
});
