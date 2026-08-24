import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { seedTrip, stamp, type SeededTrip } from '../support/seed';
import { DISCOVER_TAB_LABEL } from '../../src/discovery/discoveryCopy';
import { HOME_TAB_ROUTE, TRIPS_TAB_ROUTE } from '../../src/navigation/authRoutes';

const TRAVELER = ownerTagFor('web/focus-freshness');

requireStack(TRAVELER);

let token: string;
let trip: SeededTrip;

test.beforeAll(async () => {
  token = await tokenFor(TRAVELER);
  trip = await seedTrip({ ownerTag: TRAVELER, title: stamp('focus freshness'), durationDays: 2 });
});

test.beforeEach(async ({ signIn }) => {
  await signIn(TRAVELER);
});

const tab = (page: Page, name: string) =>
  page.locator('[role="tab"]').filter({ hasText: new RegExp(`^${name}$`) }).last();

async function renameTheTrip(title: string): Promise<void> {
  const edited = await api(`/v1/itineraries/${trip.id}`, 'PATCH', token, { title });
  expect(edited.status).toBe(200);
}

test('a trip edited elsewhere is correct on returning to Trips, with no refresh gesture (AC 1)', async ({
  page,
}) => {
  await page.goto(TRIPS_TAB_ROUTE);
  await expect(page.getByText(trip.title)).toBeVisible();

  const renamed = stamp('renamed by another traveler');
  await renameTheTrip(renamed);

  await tab(page, 'Home').click();
  await expect(page).toHaveURL(new RegExp(`${HOME_TAB_ROUTE}$`));

  await tab(page, 'Trips').click();

  await expect(page.getByText(renamed)).toBeVisible();
  trip.title = renamed;
});

test('the revalidation happens underneath the list — no spinner, the old rows never leave (AC 1)', async ({
  page,
}) => {
  await page.goto(TRIPS_TAB_ROUTE);
  await expect(page.getByText(trip.title)).toBeVisible();

  const renamed = stamp('renamed while nobody watched');
  await renameTheTrip(renamed);

  await tab(page, 'Home').click();
  await expect(page).toHaveURL(new RegExp(`${HOME_TAB_ROUTE}$`));

  const stale = page.getByText(trip.title);
  await tab(page, 'Trips').click();

  await expect(stale).toBeVisible();
  await expect(page.getByText(renamed)).toBeVisible();
  trip.title = renamed;
});

test('returning to Trips re-reads the list — the request is the proof (AC 1)', async ({
  page,
  signal,
}) => {
  await page.goto(TRIPS_TAB_ROUTE);
  await expect(page.getByText(trip.title)).toBeVisible();

  await tab(page, 'Home').click();
  await expect(page).toHaveURL(new RegExp(`${HOME_TAB_ROUTE}$`));

  const before = signal.apiRequests.filter(isATripsRead).length;
  await tab(page, 'Trips').click();
  await expect(page.getByText(trip.title)).toBeVisible();

  await expect
    .poll(() => signal.apiRequests.filter(isATripsRead).length)
    .toBeGreaterThan(before);
});

test('Discover revalidates on return (AC 2)', async ({ page, signal }) => {
  await page.goto('/discover');
  await expect(tab(page, DISCOVER_TAB_LABEL)).toHaveAttribute('aria-selected', 'true');

  await tab(page, 'Trips').click();
  await expect(page).toHaveURL(new RegExp(`${TRIPS_TAB_ROUTE}$`));

  const before = signal.apiRequests.filter(isADiscoveryRead).length;
  await tab(page, DISCOVER_TAB_LABEL).click();

  await expect
    .poll(() => signal.apiRequests.filter(isADiscoveryRead).length)
    .toBeGreaterThan(before);
});

test('Profile revalidates on return (AC 2)', async ({ page, signal }) => {
  await page.goto('/profile');
  await expect(tab(page, 'Profile')).toHaveAttribute('aria-selected', 'true');

  await tab(page, 'Trips').click();
  await expect(page).toHaveURL(new RegExp(`${TRIPS_TAB_ROUTE}$`));

  const before = signal.apiRequests.filter(isAProfileRead).length;
  await tab(page, 'Profile').click();

  await expect
    .poll(() => signal.apiRequests.filter(isAProfileRead).length)
    .toBeGreaterThan(before);
});

test('Home revalidates on return (AC 2)', async ({ page, signal }) => {
  await page.goto(HOME_TAB_ROUTE);
  await expect(tab(page, 'Home')).toHaveAttribute('aria-selected', 'true');

  await tab(page, 'Trips').click();
  await expect(page).toHaveURL(new RegExp(`${TRIPS_TAB_ROUTE}$`));

  const before = signal.apiRequests.filter(isAFeedRead).length;
  await tab(page, 'Home').click();

  await expect
    .poll(() => signal.apiRequests.filter(isAFeedRead).length)
    .toBeGreaterThan(before);
});

function isATripsRead(entry: { url: string }): boolean {
  return /\/v1\/itineraries(\?|$)/.test(entry.url);
}

function isADiscoveryRead(entry: { url: string }): boolean {
  return entry.url.includes('/v1/discovery/');
}

function isAProfileRead(entry: { url: string }): boolean {
  return entry.url.includes('/v1/me/');
}

function isAFeedRead(entry: { url: string }): boolean {
  return entry.url.includes('/v1/feed');
}
