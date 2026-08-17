import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';

const TRAVELER = ownerTagFor('web/create-flow');

requireStack(TRAVELER);

let token: string;

test.beforeAll(async () => {
  token = await tokenFor(TRAVELER);
});

test.beforeEach(async ({ signIn }) => {
  await signIn(TRAVELER);
});

const stateOf = async (id: string): Promise<string> =>
  (await api(`/v1/itineraries/${id}`, 'GET', token)).body.state;

test('Plan a Trip opens the create form, which says Standouts and never Highlights', async ({ page }) => {
  await page.goto('/trips');
  await page.getByText('Plan a Trip', { exact: true }).first().click();

  await expect(labelled(page, 'Trip Title')).toBeVisible();
  await expect(labelled(page, 'Destination')).toBeVisible();
  await expect(page.getByText('Standouts')).toBeVisible();
  await expect(page.getByText('Highlights')).toHaveCount(0);
  await expect(labelled(page, 'Add Standout')).toBeVisible();
});

test('the terminal CTA continues on from the form', async ({ page }) => {
  await page.goto('/itineraries/new');
  await expect(page.getByText('Create Trip', { exact: true })).toBeVisible();
});

test('the tab bar is four tabs including Discover, with no centre +', async ({ page }) => {
  await page.goto('/trips');

  for (const tab of ['Home', 'Discover', 'Trips', 'Profile']) {
    await expect(page.getByText(tab, { exact: true }).last()).toBeVisible();
  }
  await expect(page.getByText('+', { exact: true })).toHaveCount(0);
});

test('the terminal lifecycle rung is never labelled Complete on the landing', async ({ page }) => {
  const trip = await seedTrip({ ownerTag: TRAVELER, title: stamp('ladder') });
  await api(`/v1/itineraries/${trip.id}/finish-planning`, 'POST', token);
  await api(`/v1/itineraries/${trip.id}/start`, 'POST', token);
  await api(`/v1/itineraries/${trip.id}/complete`, 'POST', token);

  await page.goto('/trips');
  await expect(page.getByText(trip.title)).toBeVisible();
  await expect(page.getByText('Complete Trips', { exact: true })).toHaveCount(0);
});

test('the landing groups the lifecycle as sections, not chips', async ({ page }) => {
  const draft = await seedTrip({ ownerTag: TRAVELER, title: stamp('draft section') });
  const upcoming = await seedTrip({ ownerTag: TRAVELER, title: stamp('upcoming section') });
  await api(`/v1/itineraries/${upcoming.id}/finish-planning`, 'POST', token);

  await page.goto('/trips');
  await expect(page.getByText(draft.title)).toBeVisible();
  await expect(page.getByText(upcoming.title)).toBeVisible();
  await expect(page.getByText(/Upcoming Trips/i)).toBeVisible();
});

test.describe('the dark acts — the ladder nothing has watched since the walks rotted', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await seedTrip({ ownerTag: TRAVELER, title: stamp('the ladder') });
  });

  test('a draft preview offers Finish Itinerary and no publish controls', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}/preview`);

    await expect(page.getByText('Finish Itinerary')).toBeVisible();
    await expect(page.getByText('Complete', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Publish', { exact: true })).toHaveCount(0);
  });

  test('Finish Itinerary moves the trip to upcoming on the server, with no celebration screen', async ({
    page,
  }) => {
    await page.goto(`/itineraries/${trip.id}/preview`);
    await page.getByText('Finish Itinerary').click();

    await expect.poll(async () => stateOf(trip.id), { timeout: 15_000 }).toBe('upcoming');
    await expect(page.getByText(/Your Itinerary is Live/i)).toHaveCount(0);
  });

  test('an upcoming trip offers Start trip, and no publish button the gate would refuse', async ({
    page,
  }) => {
    await page.goto(`/itineraries/${trip.id}?tab=details`);

    await expect(page.getByText(/Start trip/i)).toBeVisible();
    await expect(page.getByText(/^Publish$/)).toHaveCount(0);
  });

  test('Step back is a one-step undo: upcoming reopens planning as a draft', async ({
    page,
    signal,
  }) => {
    await page.goto(`/itineraries/${trip.id}?tab=details`);
    await expect(page.getByText(/Step back/i)).toBeVisible();
    await page.getByText(/Step back/i).first().click();

    await expect.poll(() => signal.dialogs.join(' '), { timeout: 15_000 }).toMatch(/Reopen planning/i);
    await expect.poll(async () => stateOf(trip.id), { timeout: 15_000 }).toBe('draft');
  });
});

test('no console or page errors across the create flow', async ({ page, signal }) => {
  await page.goto('/trips');
  await page.getByText('Plan a Trip', { exact: true }).first().click();
  await expect(labelled(page, 'Trip Title')).toBeVisible();

  expect(signal.pageErrors).toEqual([]);
  expect(signal.consoleErrors).toEqual([]);
});
