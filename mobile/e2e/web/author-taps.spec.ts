import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { SeedFailure, climbTo, seedTrip, stamp } from '../support/seed';
import { labelStarting, labelled } from '../support/screen';
import { EDIT_PROFILE_LABEL } from '../../src/profile/profileCopy';
import { FOLLOW_LABEL } from '../../src/profile/publicProfileCopy';
import { PROFILE_TAB_ROUTE } from '../../src/navigation/authRoutes';

const VIEWER = ownerTagFor('web/author-taps');
const AUTHOR = 't2';

requireStack(VIEWER);

let author: { handle: string };
let viewer: { handle: string };
let publishedTitle: string;
let publishedId: string;

const PROFILE_ROUTE = /\/travelers\/[a-z0-9_]+(\?|$)/;


async function refusalsSeen(page: Page): Promise<number> {
  return page.locator('[aria-label*="coming soon" i]').count();
}


test.beforeAll(async () => {
  author = await profileFor(AUTHOR);
  viewer = await profileFor(VIEWER);

  publishedTitle = `Author tap ${stamp('S4.36')}`;
  const trip = await seedTrip({
    ownerTag: AUTHOR,
    title: publishedTitle,
    destination: 'Kyoto',
    durationDays: 3,
  });
  publishedId = trip.id;
  await climbTo(trip, 'completed');
  const published = await api(`/v1/itineraries/${trip.id}/publish`, 'POST', trip.ownerToken, {
    audience: 'public',
  });
  if (published.status !== 200) throw new SeedFailure('publishing the author trip', published.body);
});

test.beforeEach(async ({ signIn }) => {
  await signIn(VIEWER);
});


test('the discovery card author tap opens the profile, and refuses nothing', async ({ page }) => {
  await page.goto(`/discovery-results?q=${encodeURIComponent(publishedTitle)}`);

  const byline = labelled(page, `Open the profile of @${author.handle}`);
  await expect(byline).toBeVisible({ timeout: 25_000 });
  expect(await refusalsSeen(page), 'no refusal survives on this tap').toBe(0);

  await byline.click();

  await expect.poll(() => page.url(), { timeout: 20_000 }).toMatch(PROFILE_ROUTE);
  await expect(labelStarting(page, FOLLOW_LABEL)).toBeVisible({ timeout: 20_000 });
});


test('the published itinerary traveler chrome opens the profile, and refuses nothing', async ({
  page,
}) => {
  await page.goto(`/feed/published/${publishedId}`);

  const creator = labelled(page, 'Open the profile of');
  await expect(creator).toBeVisible({ timeout: 25_000 });

  await creator.click();

  await expect.poll(() => page.url(), { timeout: 20_000 }).toMatch(PROFILE_ROUTE);
  await expect(labelStarting(page, FOLLOW_LABEL)).toBeVisible({ timeout: 20_000 });
});


test('a people result opens the profile, and refuses nothing', async ({ page }) => {
  await page.goto(`/discovery-people?q=${author.handle.slice(0, 4)}`);

  const row = labelled(page, `Open the profile of @${author.handle}`);
  await expect(row).toBeVisible({ timeout: 25_000 });
  expect(await refusalsSeen(page), 'no refusal survives on this tap').toBe(0);

  await row.click();

  await expect.poll(() => page.url(), { timeout: 20_000 }).toMatch(PROFILE_ROUTE);
  await expect(labelStarting(page, FOLLOW_LABEL)).toBeVisible({ timeout: 20_000 });
});


test('my own byline lands on my own Profile tab, never the public screen', async ({ page }) => {
  const mine = `My own trip ${stamp('S4.36')}`;
  const trip = await seedTrip({
    ownerTag: VIEWER,
    title: mine,
    destination: 'Manila',
    durationDays: 2,
  });
  await climbTo(trip, 'completed');
  const published = await api(`/v1/itineraries/${trip.id}/publish`, 'POST', trip.ownerToken, {
    audience: 'public',
  });
  if (published.status !== 200) throw new SeedFailure('publishing my own trip', published.body);

  await page.goto(`/feed/published/${trip.id}`);

  const creator = labelled(page, 'Open the profile of');
  await expect(creator).toBeVisible({ timeout: 25_000 });

  await creator.click();

  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe(PROFILE_TAB_ROUTE);
  await expect(labelled(page, EDIT_PROFILE_LABEL)).toBeVisible({ timeout: 20_000 });
  await expect(page.url()).not.toMatch(/[/]travelers[/]/);
});
