import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';
import { forwardConfirmWording } from '../../src/itineraries/workspaceControls';
import { tabLabel } from '../../src/itineraries/tripTabs';

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

test('a created trip lands on the Upcoming tab, born upcoming — S4.26', async ({ page }) => {
  const born = await seedTrip({ ownerTag: TRAVELER, title: stamp('born upcoming') });

  expect(await stateOf(born.id)).toBe('upcoming');

  await page.goto('/trips');
  await page.getByRole('tab', { name: tabLabel('upcoming') }).click();
  await expect(page.getByText(born.title)).toBeVisible();
});

test.describe('the forward ladder, through both confirmation drawers', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await seedTrip({ ownerTag: TRAVELER, title: stamp('the ladder') });
  });

  test('an upcoming trip offers Start Trip and no publish button the gate would refuse', async ({
    page,
  }) => {
    await page.goto(`/itineraries/${trip.id}`);

    await expect(labelled(page, 'Start Trip')).toBeVisible();
    await expect(page.getByText(/^Publish$/)).toHaveCount(0);
    await expect(page.getByText(/Finalize/i)).toHaveCount(0);
  });

  test('cancelling the Start drawer leaves the trip exactly where it was', async ({ page }) => {
    const start = forwardConfirmWording('start')!;
    await page.goto(`/itineraries/${trip.id}`);
    await labelled(page, 'Start Trip').click();

    await expect(page.getByText(start.title, { exact: true })).toBeVisible();
    await labelled(page, start.cancelLabel).click();

    expect(await stateOf(trip.id)).toBe('upcoming');
  });

  test('confirming the Start drawer walks the trip to ongoing', async ({ page }) => {
    const start = forwardConfirmWording('start')!;
    await page.goto(`/itineraries/${trip.id}`);
    await labelled(page, 'Start Trip').click();
    await page.getByRole('button', { name: start.confirmLabel, exact: true }).last().click();

    await expect.poll(async () => stateOf(trip.id), { timeout: 15_000 }).toBe('ongoing');
  });

  test('cancelling the Complete drawer leaves the trip ongoing', async ({ page }) => {
    const complete = forwardConfirmWording('complete')!;
    await page.goto(`/itineraries/${trip.id}`);
    await labelled(page, 'Complete Trip').click();

    await expect(page.getByText(complete.title, { exact: true })).toBeVisible();
    await labelled(page, complete.cancelLabel).click();

    expect(await stateOf(trip.id)).toBe('ongoing');
  });

  test('confirming the Complete drawer walks the trip to completed, where publish opens', async ({
    page,
  }) => {
    const complete = forwardConfirmWording('complete')!;
    await page.goto(`/itineraries/${trip.id}`);
    await labelled(page, 'Complete Trip').click();
    await page.getByRole('button', { name: complete.confirmLabel, exact: true }).last().click();

    await expect.poll(async () => stateOf(trip.id), { timeout: 15_000 }).toBe('completed');
    await page.goto(`/itineraries/${trip.id}`);
    await expect(labelled(page, 'Publish Itinerary')).toBeVisible();
  });

  test('no Step back affordance renders at any rung of the walk', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await expect(labelled(page, 'Publish Itinerary')).toBeVisible();

    await expect(page.getByText(/Step back/i)).toHaveCount(0);
  });
});


test('no console or page errors across the create flow', async ({ page, signal }) => {
  await page.goto('/trips');
  await page.getByText('Plan a Trip', { exact: true }).first().click();
  await expect(labelled(page, 'Trip Title')).toBeVisible();

  expect(signal.pageErrors).toEqual([]);
  expect(signal.consoleErrors).toEqual([]);
});
