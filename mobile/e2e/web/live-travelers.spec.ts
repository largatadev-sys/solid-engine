import type { Page } from '@playwright/test';

import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor } from '../support/identities';
import { SeedFailure, stamp } from '../support/seed';

const OWNER = ownerTagFor('web/live-travelers');
const MEMBER = IDENTITY_MAP['web/live-travelers'].tags[1]!;
const REQUESTER = IDENTITY_MAP['web/live-travelers'].tags[2]!;

const ARRIVAL_TIMEOUT_MS = 15_000;

requireStack(OWNER);
requireStack(MEMBER);
requireStack(REQUESTER);

test.describe.configure({ mode: 'serial' });

let ownerToken: string;
let memberToken: string;
let requesterToken: string;
let trip: string;
let joinToken: string;

const travelersRoute = (): string => `/itineraries/${trip}?tab=travelers`;


async function seedSharedTrip(): Promise<void> {
  ownerToken = await tokenFor(OWNER);
  memberToken = await tokenFor(MEMBER);
  requesterToken = await tokenFor(REQUESTER);
  await Promise.all([profileFor(OWNER), profileFor(MEMBER), profileFor(REQUESTER)]);

  const created = await api('/v1/itineraries', 'POST', ownerToken, {
    title: stamp('Live Travelers Walk'),
    destination: 'Bohol',
    durationDays: 2,
  });
  if (created.status !== 201) throw new SeedFailure('the shared trip', created.body);
  trip = created.body.id;

  const memberHandle = (await api('/v1/me', 'GET', memberToken)).body.handle;
  const invited = await api(`/v1/itineraries/${trip}/invitations/by-handle`, 'POST', ownerToken, {
    handle: memberHandle,
  });
  if (invited.status !== 201) throw new SeedFailure('the invitation', invited.body);

  const inbox = (await api('/v1/invitations', 'GET', memberToken)).body.items ?? [];
  const mine = inbox.find((one: { itineraryId: string }) => one.itineraryId === trip);
  if (mine === undefined) throw new SeedFailure('the inbox invitation', inbox);
  const accepted = await api(`/v1/invitations/${mine.id}/accept`, 'POST', memberToken, {});
  if (accepted.status !== 200) throw new SeedFailure('the accept', accepted.body);

  const link = await api(`/v1/itineraries/${trip}/join-link`, 'GET', ownerToken);
  if (link.status !== 200) throw new SeedFailure('the join link', link.body);
  joinToken = link.body.token;
}


test.beforeAll(async () => {
  await seedSharedTrip();
});


test.describe('the Travelers tab, and the audience rule proved (S4.35 AC 7, 8)', () => {
  test('a join request reaches the owner alone — the member receives the frame and asks for nothing', async ({
    signIn,
    page,
    browser,
    baseURL,
  }) => {
    await signIn(OWNER);
    await page.goto(travelersRoute());
    const ownerSettled = trackApiTraffic(page);
    await ownerSettled();

    const memberContext = await browser.newContext({ baseURL });
    const memberPage = await memberContext.newPage();
    await injectSession(memberPage, memberToken, baseURL!);
    await memberPage.goto(travelersRoute(), { waitUntil: 'domcontentloaded' });
    const memberSettled = trackApiTraffic(memberPage);
    await memberSettled();

    const memberRequestsBefore = countedRequests(memberPage);
    const asked = await api(`/v1/join/${joinToken}/request`, 'POST', requesterToken, {});
    expect([200, 201], 'the requester must actually ask').toContain(asked.status);

    await expect
      .poll(() => countedRequests(page), {
        timeout: ARRIVAL_TIMEOUT_MS,
        message:
          'the owner refetches the queue — establishing the PRESENCE first, so the absence'
          + ' asserted below means something',
      })
      .toBeGreaterThan(0);

    await memberSettled();
    expect(
      countedRequests(memberPage),
      'a non-owner receives the same contentless frame and must issue NO request: the queue'
        + ' query is not mounted for them, so the invalidation is a no-op. A payload on this'
        + ' frame would have told them what REST withholds.',
    ).toBe(memberRequestsBefore);

    await memberContext.close();
  });


  test('the roster reflects a departure while the tab is open', async ({ signIn, page }) => {
    await signIn(OWNER);
    await page.goto(travelersRoute());

    const memberId = (await api('/v1/me', 'GET', memberToken)).body.id;
    const memberHandle = (await api('/v1/me', 'GET', memberToken)).body.handle;
    await expect(page.getByText(memberHandle)).toBeVisible({ timeout: ARRIVAL_TIMEOUT_MS });

    const removed = await api(`/v1/itineraries/${trip}/members/${memberId}`, 'DELETE', ownerToken);
    expect(removed.status, 'the member must actually be removed').toBe(204);

    await expect(
      page.getByText(memberHandle),
      'roster.changed is a signal: the tab refetches and the departed member goes, with no'
        + ' refresh gesture anywhere',
    ).toHaveCount(0, { timeout: ARRIVAL_TIMEOUT_MS });
  });
});


const counted = new WeakMap<Page, { total: number }>();


function countedRequests(page: Page): number {
  return counted.get(page)?.total ?? 0;
}


function trackApiTraffic(page: Page): () => Promise<void> {
  let inFlight = 0;
  const state = { total: 0 };
  counted.set(page, state);
  const counts = (url: string) => url.includes('/v1/');

  page.on('request', (r) => {
    if (counts(r.url())) {
      inFlight += 1;
      state.total += 1;
    }
  });
  page.on('requestfinished', (r) => {
    if (counts(r.url())) inFlight -= 1;
  });
  page.on('requestfailed', (r) => {
    if (counts(r.url())) inFlight -= 1;
  });

  return async () => {
    let seen = -1;
    await expect
      .poll(
        () => {
          const settled = inFlight === 0 && state.total === seen;
          seen = state.total;
          return settled;
        },
        {
          intervals: [1_000],
          timeout: 45_000,
          message:
            'the screen must stop fetching before its request count means anything — a count'
            + ' sampled mid-flight answers about the mount, not about the event under test',
        },
      )
      .toBe(true);
    state.total = 0;
    inFlight = 0;
  };
}


async function injectSession(page: Page, idToken: string, baseURL: string): Promise<void> {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ([token, expires]) => {
      window.localStorage.setItem(
        'largata.web.session',
        JSON.stringify({ idToken: token, refreshToken: token, uid: 'pool', expiresAt: expires }),
      );
    },
    [idToken, Date.now() + 50 * 60 * 1000] as const,
  );
}
