import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { seedTrip, stamp, type SeededTrip } from '../support/seed';
import { DISCOVER_TAB_LABEL } from '../../src/discovery/discoveryCopy';
import { HOME_TAB_ROUTE, TRIPS_TAB_ROUTE } from '../../src/navigation/authRoutes';
import { POLL_MS } from '../../src/feed/freshPosts';

const SETTLE_MS = 3_000;

const DESTINATION = 'Palawan';

const SAMPLE_MS = 40;

const TRAVELER = ownerTagFor('web/focus-freshness');

requireStack(TRAVELER);

let token: string;
let trip: SeededTrip;

test.beforeAll(async () => {
  token = await tokenFor(TRAVELER);
  trip = await seedTrip({
    ownerTag: TRAVELER,
    title: stamp('focus freshness'),
    destination: DESTINATION,
    durationDays: 2,
  });
});

test.beforeEach(async ({ signIn }) => {
  await signIn(TRAVELER);
});

const tab = (page: Page, name: string) =>
  page.locator('[role="tab"]').filter({ hasText: new RegExp(`^${name}$`) }).last();

const HEADER_LEASE = { subjectType: 'header' };

async function renameTheTrip(title: string): Promise<void> {
  const lease = await api(`/v1/itineraries/${trip.id}/edit-lock`, 'POST', token, HEADER_LEASE);
  expect([200, 201]).toContain(lease.status);

  const edited = await api(`/v1/itineraries/${trip.id}`, 'PATCH', token, {
    title,
    destination: DESTINATION,
  });
  await api(`/v1/itineraries/${trip.id}/edit-lock`, 'DELETE', token, HEADER_LEASE);

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

test('the revalidation happens underneath the list — the rows never blank out (AC 1)', async ({
  page,
}) => {
  await page.goto(TRIPS_TAB_ROUTE);
  await expect(page.getByText(trip.title)).toBeVisible();

  const renamed = stamp('renamed while nobody watched');
  await renameTheTrip(renamed);

  await tab(page, 'Home').click();
  await expect(page).toHaveURL(new RegExp(`${HOME_TAB_ROUTE}$`));

  const rowsShowing = () =>
    page.evaluate(
      (heading) =>
        Array.from(document.querySelectorAll('*')).some(
          (el) =>
            el.children.length === 0
            && (el.textContent ?? '').trim().length > 0
            && (el.textContent ?? '').trim() !== heading,
        ),
      'Trips',
    );

  const watch: boolean[] = [];
  const sampling = setInterval(() => {
    void rowsShowing().then((showing) => watch.push(showing)).catch(() => undefined);
  }, SAMPLE_MS);

  await tab(page, 'Trips').click();
  await expect(page.getByText(renamed)).toBeVisible();
  clearInterval(sampling);
  trip.title = renamed;

  expect(watch.length).toBeGreaterThan(0);
  expect(watch.filter((showing) => !showing)).toEqual([]);
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

test('the feed poll runs on Home and stops on every other tab (AC 4)', async ({ page, signal }) => {
  test.setTimeout(POLL_MS * 3 + 60_000);

  await page.goto(HOME_TAB_ROUTE);
  await expect(tab(page, 'Home')).toHaveAttribute('aria-selected', 'true');

  const parked = signal.apiRequests.filter(isAFeedRead).length;
  await expect
    .poll(() => signal.apiRequests.filter(isAFeedRead).length, { timeout: POLL_MS + 20_000 })
    .toBeGreaterThan(parked);

  await tab(page, 'Trips').click();
  await expect(page).toHaveURL(new RegExp(`${TRIPS_TAB_ROUTE}$`));
  await page.waitForTimeout(SETTLE_MS);

  const away = signal.apiRequests.filter(isAFeedRead).length;
  await page.waitForTimeout(POLL_MS + 10_000);

  expect(signal.apiRequests.filter(isAFeedRead).length).toBe(away);

  await tab(page, 'Home').click();
  await expect(tab(page, 'Home')).toHaveAttribute('aria-selected', 'true');

  await expect
    .poll(() => signal.apiRequests.filter(isAFeedRead).length, { timeout: POLL_MS + 20_000 })
    .toBeGreaterThan(away);
});

const RETAP_TABS: ReadonlyArray<readonly [string, string]> = [
  ['Home', HOME_TAB_ROUTE],
  [DISCOVER_TAB_LABEL, '/discover'],
  ['Trips', TRIPS_TAB_ROUTE],
  ['Profile', '/profile'],
];

for (const [name, route] of RETAP_TABS) {
  test(`retapping ${name} at the top refreshes it rather than doing nothing (AC 6)`, async ({
    page,
    signal,
  }) => {
    await page.goto(route);
    await expect(tab(page, name)).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(SETTLE_MS);

    const before = signal.apiRequests.length;
    await tab(page, name).click();

    await expect.poll(() => signal.apiRequests.length).toBeGreaterThan(before);
    await expect(page).toHaveURL(new RegExp(`${route === HOME_TAB_ROUTE ? '/' : route}$`));
    expect(signal.pageErrors).toEqual([]);
  });

  test(`retapping ${name} scrolled down returns it to the top (AC 6)`, async ({ page }) => {
    await page.goto(route);
    await expect(tab(page, name)).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(SETTLE_MS);

    const scroller = scrollerOn(page);
    await page.evaluate(() => {
      const node = document.scrollingElement ?? document.documentElement;
      node.scrollTop = 600;
      for (const el of Array.from(document.querySelectorAll('*'))) {
        if (el.scrollHeight > el.clientHeight + 40) (el as HTMLElement).scrollTop = 600;
      }
    });
    await page.waitForTimeout(SETTLE_MS);

    const scrolled = await scroller();
    test.skip(scrolled === 0, `${name} has nothing to scroll in this fixture`);

    await tab(page, name).click();
    await expect.poll(scroller).toBe(0);
  });
}

function scrollerOn(page: Page): () => Promise<number> {
  return () =>
    page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      let deepest = root.scrollTop;
      for (const el of Array.from(document.querySelectorAll('*'))) {
        if (el.scrollHeight > el.clientHeight + 40) deepest = Math.max(deepest, el.scrollTop);
      }
      return deepest;
    });
}
