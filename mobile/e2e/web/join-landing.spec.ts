import { test, expect } from '../support/fixtures';
import { api, profileFor, request, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor, type PoolTag } from '../support/identities';
import { climbTo, seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';
import {
  DEAD_QUIET,
  KICKER,
  LEAVE_LANDING_LABEL,
  MEMBER_CTA,
  PENDING_QUIET,
  REQUEST_CTA,
  SIGNED_OUT_CTA,
  WORDMARK,
} from '../../src/members/travelerCopy';
import { TRIPS_TAB_ROUTE } from '../../src/navigation/authRoutes';
import { APP_HANDOFF_PARAM } from '../../src/join/handoffParam';

const PREVIEW = process.env.LARGATA_PREVIEW_URL ?? 'http://localhost:8081';

const OWNER = ownerTagFor('web/join-landing');
const VISITOR: PoolTag = IDENTITY_MAP['web/join-landing'].tags[1]!;

requireStack(OWNER);

let ownerToken: string;
let visitorToken: string;

async function linkFor(tripId: string): Promise<string> {
  return (await api(`/v1/itineraries/${tripId}/join-link`, 'GET', ownerToken)).body.token;
}

const landing = (token: string) => `/join/${token}`;

const originOf = (url: string) => new URL(url).origin;

test.beforeAll(async () => {
  ownerToken = await tokenFor(OWNER);
  visitorToken = await tokenFor(VISITOR);
  await profileFor(VISITOR);
});

test.describe('7a · the link opens for somebody with no account', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;
  let token: string;

  test.beforeAll(async () => {
    trip = await seedTrip({
      ownerTag: OWNER,
      title: stamp('join landing signed out'),
      destination: 'El Nido',
    });
    token = await linkFor(trip.id);
  });

  test('the postcard renders without a session at all', async ({ page }) => {
    await page.goto(landing(token));

    await expect(page.getByText(WORDMARK, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(KICKER, { exact: true })).toBeVisible();
    await expect(page.getByText(trip.title).first()).toBeVisible();
  });

  test('it offers the one CTA that leads into the standard signup', async ({ page }) => {
    await page.goto(landing(token));

    await expect(labelled(page, SIGNED_OUT_CTA)).toBeVisible();
  });

  test('and offers no way back to Trips, because a signed-out visitor has none', async ({
    page,
  }) => {
    await page.goto(landing(token));
    await expect(labelled(page, SIGNED_OUT_CTA)).toBeVisible();

    await expect(labelled(page, LEAVE_LANDING_LABEL)).toHaveCount(0);
  });

  test('it names the trip and its shape, and nobody who is on it', async ({ page }) => {
    await page.goto(landing(token));
    await expect(page.getByText(trip.title).first()).toBeVisible();

    await expect(page.getByText(/El Nido/).first()).toBeVisible();
    await expect(page.getByText(/travelers?$/).first()).toBeVisible();

    const ownerHandle = (await api('/v1/me', 'GET', ownerToken)).body.handle;
    await expect(page.getByText(new RegExp(`@${ownerHandle}`))).toHaveCount(0);
    await expect(page.getByText(/invited by/i)).toHaveCount(0);
  });

  test('the landing carries no plan content whatsoever', async ({ page }) => {
    await page.goto(landing(token));
    await expect(page.getByText(trip.title).first()).toBeVisible();

    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('day 1');
    expect(body).not.toContain('itinerary');
  });
});

test.describe('7b → 7c · a signed-in visitor asks, in place', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;
  let token: string;

  test.beforeAll(async () => {
    trip = await seedTrip({ ownerTag: OWNER, title: stamp('join landing request') });
    token = await linkFor(trip.id);
  });

  test('a signed-in stranger is offered the ask', async ({ page, signIn }) => {
    await signIn(VISITOR);
    await page.goto(landing(token));

    await expect(labelled(page, REQUEST_CTA)).toBeVisible();
  });

  test('asking swaps the CTA for the quiet state without navigating', async ({ page, signIn }) => {
    await signIn(VISITOR);
    await page.goto(landing(token));
    await expect(labelled(page, REQUEST_CTA)).toBeVisible();

    await labelled(page, REQUEST_CTA).click();

    await expect(page.getByText(PENDING_QUIET, { exact: true })).toBeVisible({ timeout: 20_000 });
    expect(new URL(page.url()).pathname).toBe(landing(token));
  });

  test('the owner sees the ask waiting on their tab', async () => {
    const queue = await api(`/v1/itineraries/${trip.id}/join-requests`, 'GET', ownerToken);

    expect(queue.body.items.length).toBe(1);
  });

  test('a waiting traveler is not stranded — the landing offers a way back to Trips', async ({
    page,
    signIn,
  }) => {
    await signIn(VISITOR);
    await page.goto(landing(token));
    await expect(page.getByText(PENDING_QUIET, { exact: true })).toBeVisible({ timeout: 20_000 });

    await labelled(page, LEAVE_LANDING_LABEL).click();

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe(TRIPS_TAB_ROUTE);
  });

  test('7c · re-opening the link while pending lands on the quiet state', async ({
    page,
    signIn,
  }) => {
    await signIn(VISITOR);
    await page.goto(landing(token));

    await expect(page.getByText(PENDING_QUIET, { exact: true })).toBeVisible();
    await expect(labelled(page, REQUEST_CTA)).toHaveCount(0);
  });
});

test.describe('7d · a member re-opening their own link', () => {
  let trip: SeededTrip;
  let token: string;

  test.beforeAll(async () => {
    trip = await seedTrip({
      ownerTag: OWNER,
      title: stamp('join landing member'),
      members: [VISITOR],
    });
    token = await linkFor(trip.id);
  });

  test('is offered the workspace, and is not redirected into it', async ({ page, signIn }) => {
    await signIn(VISITOR);
    await page.goto(landing(token));

    await expect(labelled(page, MEMBER_CTA)).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(landing(token));
  });

  test('and the CTA opens the workspace when pressed', async ({ page, signIn }) => {
    await signIn(VISITOR);
    await page.goto(landing(token));
    await expect(labelled(page, MEMBER_CTA)).toBeVisible();

    await labelled(page, MEMBER_CTA).click();

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toContain(`/itineraries/${trip.id}`);
  });

  test('is not stranded either — the way back to Trips is offered here too', async ({
    page,
    signIn,
  }) => {
    await signIn(VISITOR);
    await page.goto(landing(token));
    await expect(labelled(page, MEMBER_CTA)).toBeVisible();

    await expect(labelled(page, LEAVE_LANDING_LABEL)).toBeVisible();
  });

  test('and leaving goes to Trips rather than into the trip the CTA would have opened', async ({
    page,
    signIn,
  }) => {
    await signIn(VISITOR);
    await page.goto(landing(token));
    await expect(labelled(page, LEAVE_LANDING_LABEL)).toBeVisible({ timeout: 20_000 });

    await labelled(page, LEAVE_LANDING_LABEL).click();

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toBe(TRIPS_TAB_ROUTE);

    await page.waitForTimeout(2_000);
    expect(new URL(page.url()).pathname).toBe(TRIPS_TAB_ROUTE);
  });
});

test.describe('7e · the dead link', () => {
  test('a published trip keeps its teaser and refuses new travelers', async ({ page, signIn }) => {
    const trip = await seedTrip({
      ownerTag: OWNER,
      title: stamp('join landing dead'),
      durationDays: 2,
    });
    const token = await linkFor(trip.id);
    await climbTo(trip, 'completed');
    await api(`/v1/itineraries/${trip.id}/publish`, 'POST', ownerToken, {});

    await signIn(VISITOR);
    await page.goto(landing(token));

    await expect(page.getByText(DEAD_QUIET, { exact: true })).toBeVisible();
    await expect(page.getByText(trip.title).first()).toBeVisible();
    await expect(labelled(page, REQUEST_CTA)).toHaveCount(0);
  });

  test('a garbage token shows the generic postcard rather than a crash', async ({ page }) => {
    await page.goto('/join/definitely-not-a-real-token-at-all');

    await expect(page.getByText(DEAD_QUIET, { exact: true })).toBeVisible();
  });

  test('an archived trip is dead to the link too', async ({ page, signIn }) => {
    const trip = await seedTrip({ ownerTag: OWNER, title: stamp('join landing archived') });
    const token = await linkFor(trip.id);
    await api(`/v1/itineraries/${trip.id}/archive`, 'POST', ownerToken, {});

    await signIn(VISITOR);
    await page.goto(landing(token));

    await expect(page.getByText(DEAD_QUIET, { exact: true })).toBeVisible();
  });
});

test.describe('the landing sits in no navigation graph', () => {
  test('nothing in the app links to it', async ({ page, signIn }) => {
    const trip = await seedTrip({ ownerTag: OWNER, title: stamp('join landing unlinked') });

    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}?tab=travelers`);
    await expect(page.getByText(/^Travelers · \d+$/).first()).toBeVisible();

    await expect(page.locator('a[href*="/join/"]')).toHaveCount(0);
  });

  test('it renders no page or console errors on any state', async ({ page, signIn, signal }) => {
    const trip = await seedTrip({ ownerTag: OWNER, title: stamp('join landing clean') });
    const token = await linkFor(trip.id);

    await signIn(VISITOR);
    await page.goto(landing(token));
    await expect(labelled(page, REQUEST_CTA)).toBeVisible();

    expect(signal.pageErrors).toEqual([]);
    expect(signal.consoleErrors).toEqual([]);
  });
});


test.describe('the hand-off lands on the build under test, and not some other one', () => {
  let trip: SeededTrip;
  let token: string;

  test.beforeAll(async () => {
    trip = await seedTrip({ ownerTag: OWNER, title: stamp('join landing origin') });
    token = await linkFor(trip.id);

    const answer = await request(`${PREVIEW}${landing(token)}`, 'GET');
    const served = typeof answer.body === 'string' ? answer.body : '';

    if (!served.includes(`${APP_HANDOFF_PARAM}=1`)) {
      test.skip(
        true,
        `${PREVIEW} serves the SPA directly on /join — the hand-off never runs here, so this ` +
          `spec never ran; set LARGATA_API_UPSTREAM on the preview container. Not a product failure`,
      );
    }
  });

  test('an invite link never moves the traveler to another origin', async ({
    page,
    signIn,
    baseURL,
  }) => {
    const expectedOrigin = originOf(baseURL as string);

    const visited = new Set<string>();
    page.on('framenavigated', (frame) => {
      if (frame !== page.mainFrame()) return;
      const url = frame.url();
      if (url !== '' && url !== 'about:blank') visited.add(originOf(url));
    });

    await signIn(VISITOR);
    await page.goto(landing(token));

    await expect.poll(() => originOf(page.url()), { timeout: 20_000 }).toBe(expectedOrigin);
    expect([...visited]).toEqual([expectedOrigin]);

    await expect(labelled(page, REQUEST_CTA)).toBeVisible({ timeout: 20_000 });
  });

  test('the traveler really did come through the hand-off, or the guard above proves nothing', async ({
    page,
    signIn,
  }) => {
    await signIn(VISITOR);
    await page.goto(landing(token));

    await expect
      .poll(() => new URL(page.url()).searchParams.get(APP_HANDOFF_PARAM), { timeout: 20_000 })
      .toBe('1');
  });

  test('the share url the owner hands out points at the origin the suite drives', async ({
    baseURL,
  }) => {
    const link = await api(`/v1/itineraries/${trip.id}/join-link`, 'GET', ownerToken);

    expect(originOf(link.body.shareUrl)).toBe(originOf(baseURL as string));
  });
});
