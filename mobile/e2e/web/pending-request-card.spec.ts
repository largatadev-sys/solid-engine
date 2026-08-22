import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor, type PoolTag } from '../support/identities';
import { seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';
import { REQUESTED_GHOST_LABEL, WITHDRAW_LABEL } from '../../src/members/travelerCopy';
import { withdrawJoinRequestWording } from '../../src/components/confirmDestructiveMessage';
import { TRIPS_TAB_ROUTE } from '../../src/navigation/authRoutes';

const OWNER = ownerTagFor('web/pending-request-card');
const ASKER: PoolTag = IDENTITY_MAP['web/pending-request-card'].tags[1]!;

requireStack(OWNER);

let ownerToken: string;
let askerToken: string;

async function joinTokenFor(tripId: string): Promise<string> {
  const link = await api(`/v1/itineraries/${tripId}/join-link`, 'GET', ownerToken);
  return link.body.token;
}

async function askToJoin(tripId: string): Promise<void> {
  const token = await joinTokenFor(tripId);
  const asked = await api(`/v1/join/${token}/request`, 'POST', askerToken, {});
  expect(asked.status).toBe(200);
}

async function myRequests(): Promise<{ id: string; tripTitle: string }[]> {
  return (await api('/v1/join-requests', 'GET', askerToken)).body.items ?? [];
}

test.beforeAll(async () => {
  ownerToken = await tokenFor(OWNER);
  askerToken = await tokenFor(ASKER);
});

test.describe('the card a traveler sees while waiting on a trip', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await seedTrip({
      ownerTag: OWNER,
      title: stamp('waiting card'),
      destination: 'Coron',
    });
    await askToJoin(trip.id);
  });

  test('carries the trip context, so the wait is not a blank fact', async ({ page, signIn }) => {
    await signIn(ASKER);
    await page.goto(TRIPS_TAB_ROUTE);

    await expect(page.getByText(trip.title).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Coron/).first()).toBeVisible();
  });

  test('says Requested on a pill that does not act', async ({ page, signIn }) => {
    await signIn(ASKER);
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(page.getByText(trip.title).first()).toBeVisible({ timeout: 20_000 });

    await expect(page.getByText(REQUESTED_GHOST_LABEL, { exact: true }).first()).toBeVisible();
    await expect(labelled(page, REQUESTED_GHOST_LABEL)).toHaveCount(0);
  });

  test('shows no expiry, because a request has none to show', async ({ page, signIn }) => {
    await signIn(ASKER);
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(page.getByText(trip.title).first()).toBeVisible({ timeout: 20_000 });

    await expect(page.getByText(/Expires in/)).toHaveCount(0);
  });

  test('never renders an address', async ({ page, signIn }) => {
    await signIn(ASKER);
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(page.getByText(trip.title).first()).toBeVisible({ timeout: 20_000 });

    expect(await page.locator('body').innerText()).not.toContain('@gmail.com');
  });

  test('fetches the cover through the request, which is what authorizes it', async ({
    page,
    signIn,
    signal,
  }) => {
    await signIn(ASKER);
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(page.getByText(trip.title).first()).toBeVisible({ timeout: 20_000 });

    for (const call of signal.apiRequests.filter((c) => c.url.includes('/cover'))) {
      expect(call.auth).toBe('bearer');
    }
  });
});

test.describe('withdrawing, behind its confirm', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await seedTrip({ ownerTag: OWNER, title: stamp('withdraw card') });
    await askToJoin(trip.id);
  });

  test('warns that asking again needs the link, then clears the card', async ({
    page,
    signIn,
    signal,
  }) => {
    await signIn(ASKER);
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(
      labelled(page, `${WITHDRAW_LABEL} request to join ${trip.title}`),
    ).toBeVisible({ timeout: 20_000 });

    await labelled(page, `${WITHDRAW_LABEL} request to join ${trip.title}`).click();

    await expect
      .poll(() => signal.dialogs.join(' '), { timeout: 15_000 })
      .toContain(withdrawJoinRequestWording().body);

    await expect
      .poll(async () => (await myRequests()).map((r) => r.tripTitle), { timeout: 30_000 })
      .not.toContain(trip.title);
  });

  test('takes the ask off the owner queue too', async () => {
    const queue = await api(`/v1/itineraries/${trip.id}/join-requests`, 'GET', ownerToken);

    expect(queue.body.items ?? []).toHaveLength(0);
  });

  test('and the traveler may ask again through the same link', async () => {
    await askToJoin(trip.id);

    expect((await myRequests()).map((r) => r.tripTitle)).toContain(trip.title);
  });
});
