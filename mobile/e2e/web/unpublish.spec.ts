import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { SeedFailure, climbTo, seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';
import { ITINERARIES_TAB_LABEL, PUBLISHED_BADGE } from '../../src/profile/profileCopy';
import { PROFILE_TAB_ROUTE } from '../../src/navigation/authRoutes';
import {
  EDIT_ITINERARY_DETAILS_LABEL,
  ITINERARY_REPUBLISHED_TOAST,
  ITINERARY_UNPUBLISHED_TOAST,
  REPUBLISH_LABEL,
  UNPUBLISH_LABEL,
  VIEW_PUBLISHED_PAGE_LABEL,
  itineraryMenuLabel,
} from '../../src/removal/removalCopy';

const TRAVELER = ownerTagFor('web/unpublish');

requireStack(TRAVELER);

test.describe.configure({ mode: 'serial' });

let token: string;
let trip: SeededTrip;
let title: string;

async function publish(): Promise<void> {
  const published = await api(`/v1/itineraries/${trip.id}/publish`, 'POST', token, {
    audience: 'public',
  });
  if (published.status !== 200) throw new SeedFailure('publishing the trip', published.body);
}

async function isPublished(): Promise<boolean> {
  const read = await api(`/v1/itineraries/${trip.id}`, 'GET', token);
  return read.body?.published === true;
}

async function openItinerariesTab(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(PROFILE_TAB_ROUTE);
  await page.getByText(ITINERARIES_TAB_LABEL).first().click();
}

test.beforeAll(async () => {
  token = await tokenFor(TRAVELER);
  title = stamp('Unpublish web');
  trip = await seedTrip({ ownerTag: TRAVELER, title, durationDays: 3 });
  await climbTo(trip, 'completed');
  await publish();
});

test.beforeEach(async ({ signIn, page }) => {
  await signIn(TRAVELER);
  if (!(await isPublished())) await publish();
  await openItinerariesTab(page);
  await expect(labelled(page, itineraryMenuLabel(title))).toBeVisible({ timeout: 20_000 });
});

test('the published card carries a kebab whose menu is details, the page, then Unpublish', async ({
  page,
}) => {
  await labelled(page, itineraryMenuLabel(title)).click();

  await expect(labelled(page, EDIT_ITINERARY_DETAILS_LABEL)).toBeVisible();
  await expect(labelled(page, VIEW_PUBLISHED_PAGE_LABEL)).toBeVisible();
  await expect(labelled(page, UNPUBLISH_LABEL)).toBeVisible();
});

test('View published page opens the published route, rather than dying as a dead click', async ({
  page,
}) => {
  await labelled(page, itineraryMenuLabel(title)).click();
  await labelled(page, VIEW_PUBLISHED_PAGE_LABEL).click();

  await expect(page).toHaveURL(new RegExp(`/showcase/${trip.id}`));
});

test('Edit details opens the details editor', async ({ page }) => {
  await labelled(page, itineraryMenuLabel(title)).click();
  await labelled(page, EDIT_ITINERARY_DETAILS_LABEL).click();

  await expect(page).toHaveURL(new RegExp(`/itineraries/${trip.id}/edit`));
});

test('Unpublish collapses the card and offers Republish — and it is called immediately', async ({
  page,
}) => {
  await labelled(page, itineraryMenuLabel(title)).click();
  await labelled(page, UNPUBLISH_LABEL).click();

  await expect(page.getByText(ITINERARY_UNPUBLISHED_TOAST)).toBeVisible();
  await expect(labelled(page, REPUBLISH_LABEL)).toBeVisible();
  await expect(labelled(page, itineraryMenuLabel(title))).toHaveCount(0);

  await expect.poll(isPublished, { timeout: 20_000 }).toBe(false);
});

test('Republish restores the card, the PUBLISHED pill and the public page', async ({ page }) => {
  await labelled(page, itineraryMenuLabel(title)).click();
  await labelled(page, UNPUBLISH_LABEL).click();
  await expect(labelled(page, REPUBLISH_LABEL)).toBeVisible();

  await labelled(page, REPUBLISH_LABEL).click();

  await expect(page.getByText(ITINERARY_REPUBLISHED_TOAST)).toBeVisible();
  await expect.poll(isPublished, { timeout: 20_000 }).toBe(true);

  await openItinerariesTab(page);
  await expect(labelled(page, itineraryMenuLabel(title))).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(PUBLISHED_BADGE).first()).toBeVisible();
});
