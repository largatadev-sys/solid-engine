import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor, type PoolTag } from '../support/identities';
import { SeedFailure, seedPlan, seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';
import { TRIPS_TAB_ROUTE } from '../../src/navigation/authRoutes';

const OWNER = ownerTagFor('web/archive');
const MEMBER: PoolTag = IDENTITY_MAP['web/archive'].tags[1]!;

requireStack(OWNER);

const ARCHIVED_ROUTE = '/itineraries/archived';

const ARCHIVED_NOTICE = 'Archived';
const READ_ONLY_BODY = 'This trip is read-only. Unarchive it to make changes.';
const UNARCHIVE_LABEL = 'Unarchive';

const PLANNED_STOP = 'A stop that must freeze';

let ownerToken: string;
let memberToken: string;

async function archived(id: string): Promise<boolean> {
  return (await api(`/v1/itineraries/${id}`, 'GET', ownerToken)).body.archived === true;
}

async function setArchived(id: string, to: boolean): Promise<void> {
  if ((await archived(id)) === to) return;
  const moved = await api(`/v1/itineraries/${id}/${to ? 'archive' : 'unarchive'}`, 'POST', ownerToken, {});
  if (moved.status !== 200) throw new SeedFailure(`the trip's move to archived=${to}`, moved.body);
}

async function tripFor(what: string): Promise<SeededTrip> {
  const seeded = await seedTrip({
    ownerTag: OWNER,
    title: stamp(`archive ${what}`),
    members: [MEMBER],
    durationDays: 2,
  });
  await seedPlan(seeded, [{ title: PLANNED_STOP }]);
  return seeded;
}

test.beforeAll(async () => {
  ownerToken = await tokenFor(OWNER);
  memberToken = await tokenFor(MEMBER);
});

test.describe('the live trip, before anything is archived', () => {
  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await tripFor('live');
  });

  test.beforeEach(async ({ signIn }) => {
    await signIn(OWNER);
  });

  test('a live trip renders its plan and its editing affordances', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);

    await expect(page.getByText(trip.title)).toBeVisible();
    await expect(page.getByText(PLANNED_STOP)).toBeVisible();
    await expect(labelled(page, 'Edit Itinerary')).toBeVisible();
  });

  test('…and wears no archived notice while it is live', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await expect(page.getByText(trip.title)).toBeVisible();

    await expect(page.getByText(READ_ONLY_BODY)).toHaveCount(0);
    await expect(page.getByText(UNARCHIVE_LABEL, { exact: true })).toHaveCount(0);
  });

  test('a live trip is listed on the Trips landing', async ({ page }) => {
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(page.getByText(trip.title).first()).toBeVisible();
  });
});

test.describe('the frozen posture the archive act produces', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await tripFor('frozen');
    await setArchived(trip.id, true);
  });

  test.afterAll(async () => {
    await setArchived(trip.id, false);
  });

  test.beforeEach(async ({ signIn }) => {
    await signIn(OWNER);
  });

  test('the server records the trip as archived', async () => {
    await expect.poll(async () => archived(trip.id), { timeout: 15_000 }).toBe(true);
  });

  test('the notice names the state and explains the freeze in its own words', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await expect(page.getByText(trip.title)).toBeVisible();

    await expect(page.getByText(ARCHIVED_NOTICE, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(READ_ONLY_BODY)).toBeVisible();
  });

  test('the owner is offered the way back out', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await expect(page.getByText(READ_ONLY_BODY)).toBeVisible();

    await expect(page.getByText(UNARCHIVE_LABEL, { exact: true }).last()).toBeVisible();
  });

  test('the editing affordances are gone — hidden, never a dead control', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await expect(page.getByText(READ_ONLY_BODY)).toBeVisible();

    await expect(labelled(page, 'Edit Itinerary')).toHaveCount(0);
    const clickable = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="button"],button,a'))
        .filter((node) => (node as HTMLElement).offsetParent !== null)
        .map((node) => (node as HTMLElement).innerText.trim())
        .filter((text) => text.length > 0),
    );
    expect(clickable).not.toContain('Edit Itinerary');
    expect(clickable).not.toContain('Start Trip');
  });

  test('the plan is still readable — archiving freezes it rather than hiding it', async ({
    page,
  }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await expect(page.getByText(READ_ONLY_BODY)).toBeVisible();

    await expect(page.getByText(PLANNED_STOP)).toBeVisible();
  });

  test('the Travelers tab still shows the roster on an archived trip', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}?tab=travelers`);

    await expect(page.getByText(/^Travelers · \d+$/).first()).toBeVisible();
    await expect(page.getByText('Trip owner').first()).toBeVisible();
  });

  test('…but the roster offers no act that would change the frozen trip', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}?tab=travelers`);
    await expect(page.getByText(/^Travelers · \d+$/).first()).toBeVisible();

    await expect(page.getByText('Add traveler', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/^Invited · \d+$/)).toHaveCount(0);
    await expect(page.getByText(/^Requests · \d+$/)).toHaveCount(0);
  });

  test('My Trips no longer lists the archived trip', async ({ page }) => {
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(page.getByText(/Trips/i).first()).toBeVisible();

    await expect(page.getByText(trip.title)).toHaveCount(0);
  });

  test('the archived view lists it under its own heading', async ({ page }) => {
    await page.goto(ARCHIVED_ROUTE);

    await expect(page.getByText('Archived Trips')).toBeVisible();
    await expect(page.getByText(trip.title)).toBeVisible();
  });
});

test.describe('the mask has two faces', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await tripFor('mask');
    await setArchived(trip.id, true);
  });

  test.afterAll(async () => {
    await setArchived(trip.id, false);
  });

  test('the owner reads the honest state — archived, and named as such', async () => {
    const seen = await api(`/v1/itineraries/${trip.id}`, 'GET', ownerToken);
    expect(seen.status).toBe(200);
    expect(seen.body.archived).toBe(true);
    expect(seen.body.title).toBe(trip.title);
  });

  test('a non-owner member reads not-found — the guard masks rather than refusing', async () => {
    const seen = await api(`/v1/itineraries/${trip.id}`, 'GET', memberToken);
    expect(seen.status).toBe(404);
  });

  test('…and the member is shown the mask on the screen, not the frozen trip', async ({
    page,
    signIn,
  }) => {
    await signIn(MEMBER);
    await page.goto(`/itineraries/${trip.id}`);
    await page.waitForTimeout(2500);

    await expect(page.getByText(trip.title)).toHaveCount(0);
    await expect(page.getByText(PLANNED_STOP)).toHaveCount(0);
  });

  test('the archived trip is gone from the member Trips landing too', async ({ page, signIn }) => {
    await signIn(MEMBER);
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(page.getByText(/Trips/i).first()).toBeVisible();

    await expect(page.getByText(trip.title)).toHaveCount(0);
  });
});

test.describe('unarchive restores the trip, which is what lets this spec repeat', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await tripFor('unarchive');
    await setArchived(trip.id, true);
  });

  test.afterAll(async () => {
    await setArchived(trip.id, false);
  });

  test('Unarchive asks before acting, naming what it restores', async ({ page, signIn, signal }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}`);
    await expect(page.getByText(READ_ONLY_BODY)).toBeVisible();

    await page.getByText(UNARCHIVE_LABEL, { exact: true }).last().click();

    await expect
      .poll(() => signal.dialogs.join(' '), { timeout: 15_000 })
      .toMatch(/Unarchive this trip\?/i);
    await expect
      .poll(() => signal.dialogs.join(' '), { timeout: 15_000 })
      .toMatch(/gets it back and can edit again/i);

    await expect.poll(async () => archived(trip.id), { timeout: 30_000 }).toBe(false);
  });

  test('…and the server agrees the trip is live again', async () => {
    expect(await archived(trip.id)).toBe(false);
  });

  test('the quiet archived notice is gone and the plan is editable again', async ({
    page,
    signIn,
  }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}`);
    await expect(page.getByText(trip.title)).toBeVisible();

    await expect(page.getByText(READ_ONLY_BODY)).toHaveCount(0);
    await expect(labelled(page, 'Edit Itinerary')).toBeVisible();
  });

  test('the trip is back on My Trips, and out of the archived view', async ({ page, signIn }) => {
    await signIn(OWNER);
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(page.getByText(trip.title).first()).toBeVisible();

    await page.goto(ARCHIVED_ROUTE);
    await expect(page.getByText('Archived Trips')).toBeVisible();
    await expect(page.getByText(trip.title)).toHaveCount(0);
  });

  test('the member can reach the trip again, so the mask lifted with the archive', async () => {
    await expect
      .poll(
        async () => (await api(`/v1/itineraries/${trip.id}`, 'GET', memberToken)).status,
        { timeout: 15_000 },
      )
      .toBe(200);
  });

  test('no page or console errors across the archive posture', async ({ page, signIn, signal }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}`);
    await expect(page.getByText(trip.title)).toBeVisible();

    expect(signal.pageErrors).toEqual([]);
    expect(signal.consoleErrors).toEqual([]);
  });
});
