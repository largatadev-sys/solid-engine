import type { Locator } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP } from '../support/identities';
import { climbTo, seedCover, seedPlan, seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';
import { audienceBlurb, audienceLabel } from '../../src/itineraries/publishControls';
import { comingSoonMessage } from '../../src/components/comingSoonMessage';
import { copyLinkFeedback } from '../../src/itineraries/shareLinkContract';
import { tabLabel } from '../../src/itineraries/tripTabs';
import { publicationBadge } from '../../src/itineraries/tripCardAnatomy';

const OWNER = ownerTagFor('web/publish');
const STRANGER = IDENTITY_MAP['web/publish'].tags[1]!;

requireStack(OWNER);

const PUBLISHED_TABS = ['Overview', 'Day-by-Day', 'Diary Entry', 'Comments', 'Reviews'] as const;

const DESTINATION = 'Palawan';
const BEST_TIME = 'Dec to Mar';
const STANDOUT = 'Big Lagoon Kayaking';
const ACTIVITY = 'Island Hopping Tour A';
const PLACE = 'Lio Airport';
const TIP = 'Book the earliest slot';
const TIME_RAIL = '02:00 PM';
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

let token: string;

async function seedCompletedTrip(title: string): Promise<SeededTrip> {
  const trip = await seedTrip({
    ownerTag: OWNER,
    title,
    destination: DESTINATION,
    durationDays: DURATION_DAYS,
    bestTimeOfYear: BEST_TIME,
    standouts: [STANDOUT],
  });
  await seedPlan(trip, PLAN);
  await seedCover(trip);
  await climbTo(trip, 'completed');
  return trip;
}

const itineraryOf = async (id: string) => (await api(`/v1/itineraries/${id}`, 'GET', token)).body;

const accentBorderOf = async (chip: Locator): Promise<string> =>
  chip.evaluate((node) => getComputedStyle(node as HTMLElement).borderColor);

test.beforeAll(async () => {
  token = await tokenFor(OWNER);
});

test.describe('the publish act — dark since the walk was retired', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await seedCompletedTrip(stamp('the publish act'));
  });

  test.beforeEach(async ({ signIn }) => {
    await signIn(OWNER);
  });

  test('an unpublished completed trip offers the owner a reachable Publish CTA', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);

    await expect(labelled(page, 'Publish Itinerary')).toBeVisible();
    await labelled(page, 'Publish Itinerary').click();

    await expect(page).toHaveURL(new RegExp(`/itineraries/${trip.id}/preview`));
  });

  test('the preview carries the amber scrub banner in the honest tense', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}/preview`);

    await expect(
      page.getByText('what other travelers will see if you publish', { exact: false }),
    ).toBeVisible();
  });

  test('the preview is WYSIWYG: destination pill, derived duration, best time of year, Standouts', async ({
    page,
  }) => {
    await page.goto(`/itineraries/${trip.id}/preview`);

    await expect(page.getByText(DESTINATION.toUpperCase(), { exact: true })).toBeVisible();
    await expect(page.getByText(`${DURATION_DAYS} Days`, { exact: true })).toBeVisible();
    await expect(page.getByText(BEST_TIME, { exact: true })).toBeVisible();
    await expect(page.getByText('Standouts', { exact: true })).toBeVisible();
    await expect(page.getByText(STANDOUT, { exact: true })).toBeVisible();
  });

  test('the Est. Cost row renders on the preview', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}/preview`);

    await expect(page.getByText('Est. Cost', { exact: true })).toBeVisible();
    await expect(page.getByText('/Person')).toHaveCount(0);
  });

  test("the preview's day cards carry Creator Tips and the location, and nothing else", async ({
    page,
  }) => {
    await page.goto(`/itineraries/${trip.id}/preview`);
    await labelled(page, 'Day-by-Day').click();

    await expect(page.getByText(ACTIVITY, { exact: true })).toBeVisible();
    await expect(page.getByText(PLACE, { exact: true })).toBeVisible();
    await expect(page.getByText('Creator tip', { exact: true })).toBeVisible();
    await expect(page.getByText(TIP, { exact: true })).toBeVisible();

    await expect(page.getByText(TIME_RAIL)).toHaveCount(0);
    await expect(page.getByText(DESCRIPTION)).toHaveCount(0);
  });

  test('the absence rule on the preview: no calendar date, no roster', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}/preview`);
    await expect(page.getByText('Est. Cost', { exact: true })).toBeVisible();

    const shown = await page.evaluate(() => document.body.innerText);
    expect(shown).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(shown).not.toMatch(/\b\d{1,2} [A-Z][a-z]{2} \d{4}\b/);
    await expect(page.getByText('Travelers', { exact: true })).toHaveCount(0);
    await expect(labelled(page, ', view profile')).toHaveCount(0);
  });

  test('the preview carries the same five-tab shell the public page does', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}/preview`);

    for (const tab of PUBLISHED_TABS) {
      await expect(page.getByText(tab, { exact: true }).last()).toBeVisible();
    }
  });

  test('the preview offers Publish Itinerary and Continue Editing', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}/preview`);

    await expect(page.getByText('Publish Itinerary', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Continue Editing', { exact: true })).toBeVisible();
  });

  test('the preview asks which audience, defaulting to Public', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}/preview`);

    const chosen = labelled(page, `Publish ${audienceLabel('public').toLowerCase()}`);
    const other = labelled(page, `Publish ${audienceLabel('private').toLowerCase()}`);

    await expect(chosen).toBeVisible();
    await expect(other).toBeVisible();
    await expect(page.getByText(audienceBlurb('public'), { exact: true })).toBeVisible();
    await expect(page.getByText(audienceBlurb('private'), { exact: true })).toHaveCount(0);

    expect(await accentBorderOf(chosen)).not.toBe(await accentBorderOf(other));
  });

  test('choosing Private swaps the blurb and the selection, so the question is a live control', async ({
    page,
  }) => {
    await page.goto(`/itineraries/${trip.id}/preview`);
    const publicChip = labelled(page, `Publish ${audienceLabel('public').toLowerCase()}`);
    const privateChip = labelled(page, `Publish ${audienceLabel('private').toLowerCase()}`);
    const wasSelected = await accentBorderOf(publicChip);

    await privateChip.click();

    await expect(page.getByText(audienceBlurb('private'), { exact: true })).toBeVisible();
    await expect(page.getByText(audienceBlurb('public'), { exact: true })).toHaveCount(0);
    expect(await accentBorderOf(privateChip)).toBe(wasSelected);
    expect(await accentBorderOf(publicChip)).not.toBe(wasSelected);
  });

  test('Publish lands the success screen and publishes the trip on the server', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}/preview`);
    await page.getByText('Publish Itinerary', { exact: true }).last().click();

    await expect(page.getByText(/Your Itinerary is Live/i)).toBeVisible();

    await expect
      .poll(async () => (await itineraryOf(trip.id)).published, { timeout: 15_000 })
      .toBe(true);
    expect((await itineraryOf(trip.id)).visibility).toBe('public');
  });

  test('the success screen offers Copy Link and Share, and shows the route it copies', async ({
    page,
  }) => {
    await page.goto(`/itineraries/${trip.id}/published`);

    await expect(page.getByText('Copy Link', { exact: true })).toBeVisible();
    await expect(page.getByText('Share to…', { exact: true })).toBeVisible();
    await expect(page.getByText(new RegExp(`/published/${trip.id}$`))).toBeVisible();
  });

  test('Copy Link is a live control, not a dead click', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`/itineraries/${trip.id}/published`);
    await page.getByText('Copy Link', { exact: true }).click();

    await expect(page.getByText(copyLinkFeedback('copied'), { exact: true })).toBeVisible();
  });

  test('the eyebrow names the trip position while out of the feed: Completed, badged Published', async ({
    page,
  }) => {
    await page.goto('/trips');
    await page.getByRole('tab', { name: tabLabel('completed') }).click();
    await expect(labelled(page, trip.title)).toBeVisible();

    const badge = publicationBadge({ published: true, visibility: 'public' })!;
    await expect(labelled(page, trip.title).getByText(badge, { exact: true })).toBeVisible();
  });

  test('unpublishing leaves the trip COMPLETE and returns the Publish CTA', async ({ page }) => {
    const unpublished = await api(`/v1/itineraries/${trip.id}/unpublish`, 'POST', token, {});
    expect(unpublished.status).toBe(200);

    await expect
      .poll(async () => (await itineraryOf(trip.id)).published, { timeout: 15_000 })
      .toBe(false);
    expect((await itineraryOf(trip.id)).state).toBe('completed');

    await page.goto(`/itineraries/${trip.id}`);
    await expect(labelled(page, 'Publish Itinerary')).toBeVisible();
  });
});

test.describe('the public projection, read by a stranger', () => {
  test.describe.configure({ mode: 'serial' });

  let published: SeededTrip;

  test.beforeAll(async () => {
    published = await seedCompletedTrip(stamp('the projection'));
    const act = await api(`/v1/itineraries/${published.id}/publish`, 'POST', token, {
      audience: 'public',
    });
    expect(act.status).toBe(200);
  });

  test.beforeEach(async ({ signIn }) => {
    await signIn(STRANGER);
  });

  test('the stranger opens the copied route and reads the projection', async ({ page }) => {
    await page.goto(`/published/${published.id}`);

    await expect(page.getByText(published.title, { exact: true })).toBeVisible();
  });

  test('the five-tab shell renders with Overview winning', async ({ page }) => {
    await page.goto(`/published/${published.id}`);

    for (const tab of PUBLISHED_TABS) {
      await expect(page.getByText(tab, { exact: true }).last()).toBeVisible();
    }

    await expect(page.getByText('Standouts', { exact: true })).toBeVisible();
    await expect(page.getByText('Day 1', { exact: true })).toHaveCount(0);
  });

  test('the derived total is real and carries no /Person', async ({ page }) => {
    await page.goto(`/published/${published.id}`);

    await expect(page.getByText('Est. Cost', { exact: true })).toBeVisible();
    await expect(page.getByText('/Person')).toHaveCount(0);
  });

  test('the absence rule holds on the consumer screen too', async ({ page }) => {
    await page.goto(`/published/${published.id}`);
    await expect(page.getByText('Est. Cost', { exact: true })).toBeVisible();

    const shown = await page.evaluate(() => document.body.innerText);
    expect(shown).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(shown).not.toMatch(/\b\d{1,2} [A-Z][a-z]{2} \d{4}\b/);
    await expect(page.getByText('Travelers', { exact: true })).toHaveCount(0);
    await expect(labelled(page, ', view profile')).toHaveCount(0);
  });

  test('Day-by-Day is a real tab whose cards carry the tips and the booking link', async ({
    page,
  }) => {
    await page.goto(`/published/${published.id}`);
    await labelled(page, 'Day-by-Day').click();

    await expect(page.getByText('Day 1', { exact: true })).toBeVisible();
    await expect(page.getByText(ACTIVITY, { exact: true })).toBeVisible();
    await expect(page.getByText(TIP, { exact: true })).toBeVisible();
    await expect(page.getByText('View Booking Options', { exact: true })).toBeVisible();
  });

  test('View Booking Options greys with a message rather than opening a URL', async ({
    page,
    signal,
  }) => {
    await page.goto(`/published/${published.id}`);
    await labelled(page, 'Day-by-Day').click();
    await labelled(page, 'View booking options').click();

    await expect
      .poll(() => signal.dialogs.join(' '), { timeout: 15_000 })
      .toContain(comingSoonMessage('booking').title);
  });

  test('Diary Entry, Comments and Reviews each grey with a message — no dead clicks', async ({
    page,
    signal,
  }) => {
    await page.goto(`/published/${published.id}`);

    for (const [tab, surface] of [
      ['Diary Entry', 'diary'],
      ['Comments', 'comments'],
      ['Reviews', 'reviews'],
    ] as const) {
      await labelled(page, `${tab}, coming soon`).click();
      await expect
        .poll(() => signal.dialogs.join(' '), { timeout: 15_000 })
        .toContain(comingSoonMessage(surface).title);
    }
  });

  test('Follow greys with a message too', async ({ page, signal }) => {
    await page.goto(`/published/${published.id}`);
    await labelled(page, 'Follow, coming soon').click();

    await expect
      .poll(() => signal.dialogs.join(' '), { timeout: 15_000 })
      .toContain(comingSoonMessage('follow').title);
  });

  test('no console or page errors for the stranger reading the projection', async ({
    page,
    signal,
  }) => {
    await page.goto(`/published/${published.id}`);
    await expect(page.getByText(published.title, { exact: true })).toBeVisible();
    await labelled(page, 'Day-by-Day').click();
    await expect(page.getByText(ACTIVITY, { exact: true })).toBeVisible();

    expect(signal.pageErrors).toEqual([]);
    expect(signal.consoleErrors).toEqual([]);
  });
});

test('no console or page errors for the owner across the publish act', async ({
  page,
  signIn,
  signal,
}) => {
  const trip = await seedCompletedTrip(stamp('publish signals'));
  await signIn(OWNER);

  await page.goto(`/itineraries/${trip.id}/preview`);
  await expect(page.getByText('Est. Cost', { exact: true })).toBeVisible();
  await page.getByText('Publish Itinerary', { exact: true }).last().click();
  await expect(page.getByText(/Your Itinerary is Live/i)).toBeVisible();

  expect(signal.pageErrors).toEqual([]);
  expect(signal.consoleErrors).toEqual([]);
});
