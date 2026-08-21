import { test, expect } from '../support/fixtures';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { seedPlan, seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';
import { EDIT_PROFILE_LABEL } from '../../src/profile/profileCopy';
import { DISCOVER_TAB_LABEL } from '../../src/discovery/discoveryCopy';
import { HOME_TAB_ROUTE, PROFILE_TAB_ROUTE, TRIPS_TAB_ROUTE } from '../../src/navigation/authRoutes';

const TRAVELER = ownerTagFor('web/tab-bar');

requireStack(TRAVELER);

let trip: SeededTrip;

test.beforeAll(async () => {
  trip = await seedTrip({ ownerTag: TRAVELER, title: stamp('tab bar'), durationDays: 2 });
  await seedPlan(trip, [{ title: 'A stop worth keeping' }]);
});

test.beforeEach(async ({ signIn }) => {
  await signIn(TRAVELER);
});

const tab = (page: import('@playwright/test').Page, name: string) =>
  page.locator('[role="tab"]').filter({ hasText: new RegExp(`^${name}$`) }).last();

const profileIsShowing = (page: import('@playwright/test').Page) =>
  labelled(page, EDIT_PROFILE_LABEL);

test('the tab bar carries its four tabs, each a real tab rather than a bare pressable', async ({
  page,
}) => {
  await page.goto(TRIPS_TAB_ROUTE);

  for (const name of ['Home', DISCOVER_TAB_LABEL, 'Trips', 'Profile']) {
    await expect(tab(page, name)).toBeVisible();
  }
});

test('the bar marks the tab the traveler is standing on, and only that one', async ({ page }) => {
  await page.goto(TRIPS_TAB_ROUTE);
  await expect(tab(page, 'Trips')).toHaveAttribute('aria-selected', 'SABOTAGE-H2-TICKET-06');
  await expect(tab(page, 'Home')).toHaveAttribute('aria-selected', 'false');
  await expect(tab(page, 'Profile')).toHaveAttribute('aria-selected', 'false');
});

test('the bar follows the traveler into a trip, where the founder found Profile dead', async ({
  page,
}) => {
  await page.goto(`/itineraries/${trip.id}`);
  await expect(page.getByText(trip.title)).toBeVisible();

  await expect(tab(page, 'Profile')).toBeVisible();
  await expect(tab(page, 'Trips')).toHaveAttribute('aria-selected', 'true');
});

test('the profile is not already showing beneath the trip — the mounted-underneath trap', async ({
  page,
}) => {
  await page.goto(`/itineraries/${trip.id}`);
  await expect(page.getByText(trip.title)).toBeVisible();

  await expect(profileIsShowing(page)).toHaveCount(0);
});

test('tapping Profile from inside a trip shows the profile, not a dead click (founder, 08/12)', async ({
  page,
}) => {
  await page.goto(`/itineraries/${trip.id}`);
  await expect(page.getByText(trip.title)).toBeVisible();

  await tab(page, 'Profile').click();

  await expect(profileIsShowing(page)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${PROFILE_TAB_ROUTE}$`));
});

test('every tab lands on its own route from inside a trip, with no dead clicks', async ({
  page,
  signal,
}) => {
  const landings: Array<[string, RegExp]> = [
    ['Home', new RegExp(`${HOME_TAB_ROUTE}$`)],
    [DISCOVER_TAB_LABEL, /\/discover$/],
    ['Trips', new RegExp(`${TRIPS_TAB_ROUTE}$`)],
    ['Profile', new RegExp(`${PROFILE_TAB_ROUTE}$`)],
  ];

  for (const [name, route] of landings) {
    await page.goto(`/itineraries/${trip.id}`);
    await expect(page.getByText(trip.title)).toBeVisible();

    await tab(page, name).click();
    await expect(page).toHaveURL(route);
    await expect(tab(page, name)).toHaveAttribute('aria-selected', 'true');
  }

  expect(signal.pageErrors).toEqual([]);
});

test('the tab bar draws no centre + — the create act lives on the Trips surface', async ({
  page,
}) => {
  await page.goto(TRIPS_TAB_ROUTE);
  const navTabs = page.getByRole('tablist').filter({ hasText: 'Home' }).getByRole('tab');
  await expect(navTabs).toHaveCount(4);
  await expect(page.getByText('+', { exact: true })).toHaveCount(0);
});
