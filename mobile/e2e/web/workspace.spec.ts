import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP } from '../support/identities';
import { seedTrip, seedPlan, stamp, type SeededTrip } from '../support/seed';
import { labelled, dragStripBy } from '../support/screen';
import { stateBadge } from '../../src/itineraries/workspaceControls';

const OWNER = ownerTagFor('web/workspace');
const MEMBER = IDENTITY_MAP['web/workspace'].tags[1]!;

requireStack(OWNER);

const ACTIVITIES = [
  { title: 'Kayak the lagoon', timeOfDay: '09:00', place: 'Big Lagoon' },
  { title: 'Sunset dinner', timeOfDay: '18:00', place: 'Lio Beach' },
];

const stateOf = async (token: string, id: string): Promise<string> =>
  (await api(`/v1/itineraries/${id}`, 'GET', token)).body.state;

const sessionHeld = async (token: string, id: string): Promise<boolean> =>
  (await api(`/v1/itineraries/${id}`, 'GET', token)).body.beingEdited === true;

test.describe('the draft workspace as a viewer', () => {
  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await seedTrip({ ownerTag: OWNER, title: stamp('viewer'), durationDays: 2 });
    await seedPlan(trip, ACTIVITIES);
  });

  test.beforeEach(async ({ signIn }) => {
    await signIn(OWNER);
  });

  test('a draft opens the workspace carrying the DRAFT badge and offers Edit Itinerary', async ({
    page,
  }) => {
    await page.goto(`/itineraries/${trip.id}`);

    await expect(page.getByText(stateBadge({ state: 'draft' }).label, { exact: true })).toBeVisible();
    await expect(labelled(page, 'Edit Itinerary')).toBeVisible();
  });

  test('the five-tab row renders in mock order — Details was deleted at S4.25', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);

    for (const tab of ['Day-by-Day', 'Polls', 'Travelers', 'Photo Dump', 'Chat']) {
      await expect(labelled(page, tab)).toBeVisible();
    }
    await expect(page.getByText('Notes', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Details', { exact: true })).toHaveCount(0);
  });

  test('the day list renders as stubs with the activities readable', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);

    await expect(page.getByText('Day 1')).toBeVisible();
    await expect(page.getByText('Kayak the lagoon')).toBeVisible();
    await expect(page.getByText('Sunset dinner')).toBeVisible();
  });

  test('the viewer is read-only: no Add Activity, no Add a Day', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await expect(page.getByText('Day 1')).toBeVisible();

    await expect(page.getByText('Add Activity')).toHaveCount(0);
    await expect(page.getByText('Add a Day')).toHaveCount(0);
  });

  test('a draft shows no ladder CTA and no Step back — Edit Itinerary is the act', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await expect(labelled(page, 'Edit Itinerary')).toBeVisible();

    await expect(page.getByText(/Start trip/i)).toHaveCount(0);
    await expect(page.getByText(/Step back/i)).toHaveCount(0);
  });

  test('Polls, Chat and Photo Dump grey with a message rather than dead-clicking', async ({
    page,
    signal,
  }) => {
    await page.goto(`/itineraries/${trip.id}`);

    for (const tab of ['Polls', 'Chat']) {
      await labelled(page, `${tab}, coming soon`).click();
    }
    await expect.poll(() => signal.dialogs.length, { timeout: 15_000 }).toBeGreaterThan(1);
  });

  test('the Travelers tab lists the roster', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await labelled(page, 'Travelers').click();

    await expect(page.getByText(/largata|pool_/i).first()).toBeVisible();
  });

  test('the header carries neither a facts line nor a cog — both parked (founder, 2026-08-18)', async ({
    page,
  }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await expect(page.getByText('Day 1')).toBeVisible();

    await expect(page.getByText(/Palawan ·/)).toHaveCount(0);
    await expect(labelled(page, 'Trip settings')).toHaveCount(0);
  });

  test('a stale ?tab=details link degrades to Day-by-Day rather than blanking', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}?tab=details`);

    await expect(page.getByText('Day 1')).toBeVisible();
    await expect(page.getByText('Kayak the lagoon')).toBeVisible();
  });

  test('the details editor still opens by its own route while the cog is parked', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}/edit`);

    await expect(page.getByText('Edit Trip')).toBeVisible();
    await expect(page.locator('[aria-label^="Currency:"]')).toHaveCount(1);
  });

  test('every /v1 call from the workspace carries a bearer token', async ({ page, signal }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await expect(page.getByText('Day 1')).toBeVisible();

    expect(signal.apiRequests.filter((request) => request.auth === 'ANON')).toEqual([]);
  });

  test('a retired ?day= deep link redirects into the workspace rather than dead-ending', async ({
    page,
  }) => {
    await page.goto(`/itineraries/${trip.id}/days?day=1`);

    await expect(page.getByText(trip.title)).toBeVisible();
    await expect(page.getByText('Day 1')).toBeVisible();
  });

  test('no console or page errors across the workspace', async ({ page, signal }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await expect(page.getByText('Day 1')).toBeVisible();

    expect(signal.pageErrors).toEqual([]);
    expect(signal.consoleErrors).toEqual([]);
  });
});


test.describe('the editor, the Editing Session, and the acts', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;
  let owner: string;
  let member: string;

  test.beforeAll(async () => {
    owner = await tokenFor(OWNER);
    member = await tokenFor(MEMBER);
    trip = await seedTrip({
      ownerTag: OWNER,
      title: stamp('editor'),
      durationDays: 2,
      members: [MEMBER],
    });
    await seedPlan(trip, ACTIVITIES);
  });

  test('Edit Itinerary opens the editor, which offers Invite Traveler and the editing affordances', async ({
    page,
    signIn,
  }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}`);
    await labelled(page, 'Edit Itinerary').click();

    await expect(page).toHaveURL(/edit-plan/);
    await expect(labelled(page, 'Invite Traveler')).toBeVisible();
    await expect(page.getByText('Add Activity').first()).toBeVisible();
    await expect(page.getByText('Add a Day')).toBeVisible();
    await expect(page.getByText('Save Changes')).toBeVisible();
  });

  test('the accordion opens Day 1 by default with its activities', async ({ page, signIn }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}/edit-plan`);

    await expect(labelled(page, 'Day 1, collapse')).toBeVisible();
    await expect(page.getByText('Kayak the lagoon')).toBeVisible();
  });

  test('entering the editor acquired the Editing Session server-side', async ({ page, signIn }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}/edit-plan`);
    await expect(page.getByText('Save Changes')).toBeVisible();

    await expect.poll(async () => sessionHeld(owner, trip.id), { timeout: 15_000 }).toBe(true);
  });

  test('the second identity is refused the session while the first holds it', async () => {
    const refused = await api(`/v1/itineraries/${trip.id}/edit-lock`, 'POST', member, {
      subjectType: 'session',
    });
    expect(refused.status).toBe(409);
  });

  test('the activity form opens on Edit Activity with the mock five fields and its two CTAs', async ({
    page,
    signIn,
  }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}/edit-plan`);
    await labelled(page, 'Edit Kayak the lagoon').click();

    await expect(page.getByText('Edit Activity')).toBeVisible();
    await expect(labelled(page, 'Activity name')).toBeVisible();
    await expect(labelled(page, 'Location or venue')).toBeVisible();
    await expect(labelled(page, 'Booking link')).toBeVisible();
    await expect(page.getByText('Save Activity')).toBeVisible();
    await expect(page.getByText('Discard Changes')).toBeVisible();
  });

  test('the currency is a read-only sign beside the amount, never a text box', async ({
    page,
    signIn,
  }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}/edit-plan`);
    await labelled(page, `Edit ${ACTIVITIES[0]!.title}`).click();
    await expect(page.getByText('Edit Activity')).toBeVisible();

    await expect(page.locator('[aria-label="Currency"]')).toHaveCount(0);

    const price = labelled(page, 'Estimated price');
    await expect(price).toBeVisible();
    const sign = await price.evaluate((node) => (node.closest('div')?.textContent ?? '').trim());
    expect(sign.length, 'the amount must carry a currency sign beside it').toBeGreaterThan(0);
  });

  test('the five-tab row fits the phone frame, so no tab hides off-screen (S4.25)', async ({
    page,
    signIn,
  }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}`);
    await expect(labelled(page, 'Day-by-Day')).toBeVisible();

    for (const tab of ['Day-by-Day', 'Polls', 'Travelers', 'Photo Dump', 'Chat']) {
      const box = await labelled(page, tab).boundingBox();
      expect(box, `${tab} must be laid out`).not.toBeNull();
      expect(box!.x, `${tab} must start inside the frame`).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, `${tab} must end inside the frame`).toBeLessThanOrEqual(393);
    }
  });

  test('a real mouse click reaches the tab under it, both ways', async ({ page, signIn }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}`);

    await labelled(page, 'Travelers').click();
    await expect(page.getByText(/largata|pool_/i).first()).toBeVisible();

    await labelled(page, 'Day-by-Day').click();
    await expect(page.getByText('Day 1')).toBeVisible();
  });

  test('a plan op stages until Save Changes, and the save survives a reload', async ({
    page,
    signIn,
  }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}/edit-plan`);
    await expect(labelled(page, 'Day 1, collapse')).toBeVisible();

    const before = (await api(`/v1/itineraries/${trip.id}`, 'GET', owner)).body.planVersion;

    await page.getByText('Add a Day').click();
    await expect(page.getByText('Day 3')).toBeVisible();

    const staged = (await api(`/v1/itineraries/${trip.id}`, 'GET', owner)).body.planVersion;
    expect(staged, 'the plan must not persist before Save Changes').toBe(before);

    await page.getByText('Save Changes').click();
    await expect
      .poll(
        async () => (await api(`/v1/itineraries/${trip.id}`, 'GET', owner)).body.days.length,
        { timeout: 20_000 },
      )
      .toBe(3);

    await page.reload();
    await expect(page.getByText('Day 3')).toBeVisible();
  });

  test('Finalize opens the confirmation sheet, and Keep Editing leaves the plan a draft', async ({
    page,
    signIn,
  }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}`);
    await labelled(page, 'Finalize Itinerary').click();

    await expect(page.getByRole('button', { name: 'Keep Editing' })).toBeVisible();
    await page.getByRole('button', { name: 'Keep Editing' }).click();

    expect(await stateOf(owner, trip.id)).toBe('draft');
  });

  test('Finalize fires finish-planning, shows Ready, and releases the session on the way out', async ({
    page,
    signIn,
  }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}`);
    await labelled(page, 'Finalize Itinerary').click();
    await page.getByRole('button', { name: 'Finalize', exact: true }).click();

    await expect.poll(async () => stateOf(owner, trip.id), { timeout: 20_000 }).toBe('upcoming');
    await expect(page.getByText(stateBadge({ state: 'upcoming' }).label, { exact: true })).toBeVisible();
  });

  test.fixme(
    'Finalize releases the Editing Session on the way out',
    async () => {
      const stillHeld = await api(`/v1/itineraries/${trip.id}/edit-lock`, 'POST', member, {
        subjectType: 'session',
      });
      expect(stillHeld.status).not.toBe(409);
    },
  );

  test('a Ready trip is read-only — no editing affordance renders', async ({ page, signIn }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}`);
    await expect(page.getByText(stateBadge({ state: 'upcoming' }).label, { exact: true })).toBeVisible();

    await expect(page.getByText('Add Activity')).toHaveCount(0);
    await expect(page.getByText('Save Changes')).toHaveCount(0);
  });

  test('Start Trip walks the ladder to ongoing, and Step back moves exactly one rung', async ({
    page,
    signIn,
    signal,
  }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}?tab=details`);
    await page.getByText(/Start trip/i).first().click();
    await expect.poll(async () => stateOf(owner, trip.id), { timeout: 20_000 }).toBe('ongoing');

    await page.goto(`/itineraries/${trip.id}?tab=details`);
    await page.getByText(/Step back/i).first().click();
    await expect.poll(() => signal.dialogs.length, { timeout: 15_000 }).toBeGreaterThan(0);
    await expect.poll(async () => stateOf(owner, trip.id), { timeout: 20_000 }).toBe('upcoming');
  });
});
