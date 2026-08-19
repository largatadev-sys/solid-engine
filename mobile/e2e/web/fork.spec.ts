import type { Locator } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP } from '../support/identities';
import { climbTo, seedCover, seedPlan, seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';
import {
  FORK_CANCEL_LABEL,
  FORK_CONFIRM_LABEL,
  FORK_CTA_LABEL,
  FORK_HONESTY_LINE,
  FORK_SHEET_BODY,
  FORK_SUCCESS_TITLE,
  FORKED_STAT_LABEL,
  OPEN_FORKED_WORKSPACE_LABEL,
  attributionLabel,
  forkHighlights,
  forkSuccessBody,
  forkSuccessMeta,
} from '../../src/itineraries/forkCopy';
import { sectionLabel } from '../../src/itineraries/tripSections';

const AUTHOR = ownerTagFor('web/fork');
const FORKER = IDENTITY_MAP['web/fork'].tags[1]!;

requireStack(AUTHOR);

const DESTINATION = 'Palawan';
const BEST_TIME = 'Dec to Mar';
const STANDOUT = 'Big Lagoon Kayaking';
const ACTIVITY = 'Island Hopping Tour A';
const PLACE = 'Lio Airport';
const TIP = 'Book the earliest slot';
const DESCRIPTION = 'A van transfer to the pier';
const DURATION_DAYS = 4;

const PLAN = [
  {
    title: ACTIVITY,
    place: PLACE,
    notes: TIP,
    externalUrl: 'https://example.com/book',
    startTime: '14:00',
    costAmount: 500,
    costCurrency: 'PHP',
    description: DESCRIPTION,
  },
];

let forkerToken: string;
let authorHandle: string;
let CREDIT: string;


function visible(locator: Locator): Locator {
  return locator.locator('visible=true').last();
}

async function seedPublishedTrip(title: string): Promise<SeededTrip> {
  const trip = await seedTrip({
    ownerTag: AUTHOR,
    title,
    destination: DESTINATION,
    durationDays: DURATION_DAYS,
    bestTimeOfYear: BEST_TIME,
    standouts: [STANDOUT],
  });
  await seedPlan(trip, PLAN);
  await seedCover(trip);
  await climbTo(trip, 'completed');

  const published = await api(`/v1/itineraries/${trip.id}/publish`, 'POST', trip.ownerToken, {
    audience: 'public',
  });
  if (published.status !== 200) throw new Error(`could not publish the source: ${published.status}`);
  return trip;
}

const projectionOf = async (id: string) =>
  (await api(`/v1/published-itineraries/${id}`, 'GET', forkerToken)).body;

const itineraryOf = async (id: string) => (await api(`/v1/itineraries/${id}`, 'GET', forkerToken)).body;

test.beforeAll(async () => {
  forkerToken = await tokenFor(FORKER);
  authorHandle = (await profileFor(AUTHOR)).handle;
  CREDIT = attributionLabel({ sourceItineraryId: 'any', ownerHandle: authorHandle, sourceVisible: true })!;
});


test.describe('the fork loop — reading someone else\'s plan to standing in your own copy', () => {
  test.describe.configure({ mode: 'serial' });

  let source: SeededTrip;
  let forkId: string;

  test.beforeAll(async () => {
    source = await seedPublishedTrip(stamp('the fork loop'));
  });

  test.beforeEach(async ({ signIn }) => {
    await signIn(FORKER);
  });

  test('the published page carries the docked Fork This Trip CTA', async ({ page }) => {
    await page.goto(`/published/${source.id}`);
    await expect(visible(page.getByText(source.title, { exact: true }))).toBeVisible();
    await expect(labelled(page, FORK_CTA_LABEL)).toBeVisible();
  });

  test('the CTA opens a sheet that says what forking does and collects nothing', async ({ page }) => {
    await page.goto(`/published/${source.id}`);
    await labelled(page, FORK_CTA_LABEL).click();

    await expect(visible(page.getByText(FORK_SHEET_BODY))).toBeVisible();
    for (const highlight of forkHighlights(authorHandle)) {
      await expect(visible(page.getByText(highlight.text, { exact: true }))).toBeVisible();
    }
    await expect(visible(page.getByText(FORK_HONESTY_LINE, { exact: true }))).toBeVisible();
    await expect(labelled(page, FORK_CONFIRM_LABEL)).toBeVisible();
    await expect(labelled(page, FORK_CANCEL_LABEL)).toBeVisible();

    await expect(page.locator('input')).toHaveCount(0);
  });

  test('Cancel leaves the published page standing and mints nothing', async ({ page }) => {
    const before = (await projectionOf(source.id)).forkCount;

    await page.goto(`/published/${source.id}`);
    await labelled(page, FORK_CTA_LABEL).click();
    await labelled(page, FORK_CANCEL_LABEL).click();

    await expect(labelled(page, FORK_CTA_LABEL)).toBeVisible();
    expect((await projectionOf(source.id)).forkCount).toBe(before);
  });

  test('Fork It lands on the success screen with the attribution pill and a placeholder thumb', async ({
    page,
  }) => {
    await page.goto(`/published/${source.id}`);
    await labelled(page, FORK_CTA_LABEL).click();
    await labelled(page, FORK_CONFIRM_LABEL).click();

    await expect(visible(page.getByText(FORK_SUCCESS_TITLE, { exact: true }))).toBeVisible();
    await expect(visible(page.getByText(forkSuccessBody(source.title), { exact: true }))).toBeVisible();

    await expect(visible(page.getByText(CREDIT, { exact: true }))).toBeVisible();

    await expect(
      visible(page.getByText(forkSuccessMeta({ destination: DESTINATION, days: DURATION_DAYS }))),
    ).toBeVisible();
    await expect(labelled(page, 'Trip cover photo').locator('img')).toHaveCount(0);

    await expect.poll(async () => (await projectionOf(source.id)).forkCount, { timeout: 15_000 }).toBe(1);
  });

  test('the copy the server made is a photo-less, date-less draft the forker owns', async () => {
    const mine = (await api('/v1/itineraries', 'GET', forkerToken)).body.items as Array<{
      id: string;
      title: string;
    }>;
    const copy = mine.find((trip) => trip.title === source.title);
    expect(copy, 'the fork sits in the forker\'s own trips').toBeDefined();
    forkId = copy!.id;

    const fork = await itineraryOf(forkId);
    expect(fork.state).toBe('draft');
    expect(fork.published).toBe(false);
    expect(fork.startDate).toBeNull();
    expect(fork.endDate).toBeNull();
    expect(fork.coverImageUrl).toBeNull();
    expect(fork.days.length).toBe(DURATION_DAYS);
    expect(fork.days[0].activities[0].title).toBe(ACTIVITY);
    expect(fork.days[0].activities[0].notes).toBe(TIP);
    expect(fork.forkedFrom.sourceItineraryId).toBe(source.id);
    expect(fork.forkedFrom.ownerHandle).toBe(authorHandle);
    expect(fork.forkedFrom.sourceVisible).toBe(true);
  });

  test('Open Trip Workspace enters the copy, and its subtitle credits the original', async ({ page }) => {
    await page.goto(`/itineraries/${forkId}/forked`);
    await labelled(page, OPEN_FORKED_WORKSPACE_LABEL).click();

    await expect(visible(page.getByText(source.title, { exact: true }))).toBeVisible();
    await expect(visible(page.getByText(CREDIT, { exact: true }))).toBeVisible();
    await expect(labelled(page, CREDIT)).toBeVisible();
  });

  test('back from the success screen lands on Trips, never the spent published page', async ({ page }) => {
    await page.goto('/trips');
    await expect(visible(page.getByText('Plan a Trip', { exact: true }))).toBeVisible();
    await page.goto(`/published/${source.id}`);

    await labelled(page, FORK_CTA_LABEL).click();
    await labelled(page, FORK_CONFIRM_LABEL).click();
    await expect(visible(page.getByText(FORK_SUCCESS_TITLE, { exact: true }))).toBeVisible();

    await page.goBack();

    await expect(visible(page.getByText('Plan a Trip', { exact: true }))).toBeVisible();
    await expect(visible(page.getByText(FORK_SUCCESS_TITLE, { exact: true }))).toHaveCount(0);
    await expect(labelled(page, FORK_CTA_LABEL)).toHaveCount(0);
  });

  test('the draft sits in Trips\' Draft section without needing the success screen', async ({ page }) => {
    await page.goto('/trips');

    await expect(visible(page.getByText(sectionLabel('draft'), { exact: true }))).toBeVisible();
    await expect(visible(page.getByText(source.title))).toBeVisible();
  });

  test('the source page shows the incremented Forked count as a plain stat', async ({ page, signal }) => {
    const counted = (await projectionOf(source.id)).forkCount;
    expect(counted).toBeGreaterThanOrEqual(2);

    await page.goto(`/published/${source.id}`);
    await expect(visible(page.getByText(FORKED_STAT_LABEL, { exact: true }))).toBeVisible();
    await expect(visible(page.getByText(String(counted), { exact: true }))).toBeVisible();

    await visible(page.getByText(FORKED_STAT_LABEL, { exact: true })).click();
    expect(signal.dialogs.join(' ')).not.toMatch(/coming soon/i);
  });

  test('no console or page errors across the whole fork loop', async ({ page, signal }) => {
    await page.goto(`/published/${source.id}`);
    await labelled(page, FORK_CTA_LABEL).click();
    await labelled(page, FORK_CANCEL_LABEL).click();
    await page.goto(`/itineraries/${forkId}`);

    expect(signal.pageErrors).toEqual([]);
    expect(signal.consoleErrors).toEqual([]);
  });
});


test.describe('attribution when the source stops being visible', () => {
  test.describe.configure({ mode: 'serial' });

  let source: SeededTrip;
  let forkId: string;

  test.beforeAll(async () => {
    source = await seedPublishedTrip(stamp('the vanishing source'));
    const forked = await api(`/v1/itineraries/${source.id}/fork`, 'POST', forkerToken);
    if (forked.status !== 201) throw new Error(`could not fork: ${forked.status}`);
    forkId = forked.body.id;
  });

  test.beforeEach(async ({ signIn }) => {
    await signIn(FORKER);
  });

  test('the credit survives an unpublish, and stops linking', async ({ page }) => {
    expect((await itineraryOf(forkId)).forkedFrom.sourceVisible).toBe(true);

    const hidden = await api(`/v1/itineraries/${source.id}/unpublish`, 'POST', source.ownerToken);
    expect(hidden.status).toBe(200);

    await expect
      .poll(async () => (await itineraryOf(forkId)).forkedFrom.sourceVisible, { timeout: 15_000 })
      .toBe(false);

    await page.goto(`/itineraries/${forkId}`);
    const credit = attributionLabel({
      sourceItineraryId: source.id,
      ownerHandle: authorHandle,
      sourceVisible: false,
    })!;
    await expect(visible(page.getByText(credit, { exact: true }))).toBeVisible();
    await expect(page.locator(`[aria-label="${credit}"]`)).toHaveCount(0);
  });

  test('unpublishing the source deletes nobody\'s fork', async () => {
    const fork = await itineraryOf(forkId);
    expect(fork.id).toBe(forkId);
    expect(fork.days.length).toBe(DURATION_DAYS);
  });
});
