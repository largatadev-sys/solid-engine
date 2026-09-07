import { test, expect } from '../support/fixtures';
import { labelled } from '../support/screen';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { STRANGER_TAG, ownerTagFor } from '../support/identities';
import {
  SeedFailure,
  climbTo,
  joinTrip,
  seedTrip,
  stamp,
} from '../support/seed';
import {
  ACCOUNT_BACK_LABEL,
  ACCOUNT_LABEL,
  DIARY_TAB_LABEL,
  EDIT_PROFILE_LABEL,
  FOLLOWERS_STAT_LABEL,
  FOLLOWING_STAT_LABEL,
  ITINERARIES_TAB_LABEL,
  PER_PERSON_SUFFIX,
  PUBLISHED_BADGE,
} from '../../src/profile/profileCopy';
import { DIARIES_STAT_LABEL, ITINERARIES_STAT_LABEL } from '../../src/diary/memoryCopy';
import { PROFILE_TAB_ROUTE } from '../../src/navigation/authRoutes';

const TRAVELER = ownerTagFor('web/profile');
const HOST = STRANGER_TAG;

requireStack(TRAVELER);



let token: string;
let hostToken: string;
let me: { handle: string | null; displayName: string | null; vanityNumber: string | null };
let run: string;
let showcaseTitle: string;
let draftTitle: string;
let hostedTitle: string;
let showcasedId: string;
let draftId: string;
let hostedId: string;

async function everyItem(readToken: string, path: string): Promise<any[]> {
  const items: any[] = [];
  const followed = new Set<string>();
  let cursor: string | undefined;
  for (;;) {
    const query =
      `${path}${path.includes('?') ? '&' : '?'}limit=100`
      + (cursor === undefined ? '' : `&cursor=${encodeURIComponent(cursor)}`);
    const page = (await api(query, 'GET', readToken)).body;
    items.push(...(page.items ?? []));
    const next = page.nextCursor ?? undefined;
    if (next === undefined || followed.has(next)) return items;
    followed.add(next);
    cursor = next;
  }
}

async function publishedTrip(ownerTag: typeof TRAVELER, title: string, destination: string, days: number) {
  const trip = await seedTrip({ ownerTag, title, destination, durationDays: days });
  await climbTo(trip, 'completed');
  const published = await api(`/v1/itineraries/${trip.id}/publish`, 'POST', trip.ownerToken, {  });
  if (published.status !== 200) throw new SeedFailure(`publishing "${title}"`, published.body);
  return trip;
}

test.beforeAll(async () => {
  token = await tokenFor(TRAVELER);
  hostToken = await tokenFor(HOST);
  me = (await api('/v1/me', 'GET', token)).body;
  run = stamp('p').split(' ')[1]!;

  showcaseTitle = `Profile showcase ${run}`;
  draftTitle = `Profile draft ${run}`;
  hostedTitle = `Profile hosted ${run}`;

  const showcased = await publishedTrip(TRAVELER, showcaseTitle, 'El Nido, Palawan', 5);
  showcasedId = showcased.id;

  const draft = await seedTrip({
    ownerTag: TRAVELER,
    title: draftTitle,
    destination: 'Cebu',
    durationDays: 2,
  });
  draftId = draft.id;

  const hosted = await seedTrip({
    ownerTag: HOST,
    title: hostedTitle,
    destination: 'Tokyo, Japan',
    durationDays: 4,
  });
  await joinTrip(hosted, TRAVELER);
  await climbTo(hosted, 'completed');
  const hostedPublished = await api(`/v1/itineraries/${hosted.id}/publish`, 'POST', hostToken, {  });
  if (hostedPublished.status !== 200) {
    throw new SeedFailure('publishing the hosted trip', hostedPublished.body);
  }
  hostedId = hosted.id;
});

test.beforeEach(async ({ signIn }) => {
  await signIn(TRAVELER);
});

test.describe('the header the profile tab lands on', () => {
  test('the tab renders the traveler, not a settings page', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);

    await expect(page.getByText(me.displayName!).first()).toBeVisible();
    await expect(page.getByText('SIGNED IN')).toHaveCount(0);
  });

  test('the handle and vanity number render together on the meta line', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);

    await expect(page.getByText(`@${me.handle}`).first()).toBeVisible();
    await expect(page.getByText(new RegExp(`@${me.handle}\\s*·\\s*#${me.vanityNumber}`))).toBeVisible();
  });

  test('the stats row draws all four cells', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);

    for (const cell of [
      DIARIES_STAT_LABEL,
      ITINERARIES_STAT_LABEL,
      FOLLOWERS_STAT_LABEL,
      FOLLOWING_STAT_LABEL,
    ]) {
      await expect(page.getByText(cell, { exact: true }).first()).toBeVisible();
    }
  });

  test('Published counts the showcase it sits above — it cannot contradict the list', async () => {
    const showcase = await everyItem(token, '/v1/me/profile/published');
    expect(showcase.some((card) => card.id === showcasedId)).toBe(true);

    const stats = (await api('/v1/me/profile/stats', 'GET', token)).body;
    expect(stats.publishedCount).toBeGreaterThanOrEqual(showcase.length);
  });

  test('Destinations counts places they OWN, so a hosted trip contributes none', async () => {
    const trips = await everyItem(token, '/v1/trips');
    const hosted = trips.find((trip) => trip.id === hostedId);
    expect(hosted, 'the hosted trip is in sight but not owned').toBeDefined();

    const owned = await everyItem(token, '/v1/me/profile/published');
    const stats = (await api('/v1/me/profile/stats', 'GET', token)).body;

    const hostedPlace = (hosted.destination ?? '').trim().toLowerCase();
    const ownedPlaces = new Set(
      owned
        .map((card: { destination?: string | null }) => (card.destination ?? '').trim().toLowerCase())
        .filter((place: string) => place !== ''),
    );

    expect(
      ownedPlaces.has(hostedPlace),
      'the fixture only proves something if the hosted place is unique to the hosted trip',
    ).toBe(false);
    expect(
      stats.destinationCount,
      'the hosted trip adds no destination, so the count never reaches every trip in sight',
    ).toBeLessThan(trips.length);
    expect(stats.destinationCount).toBeGreaterThanOrEqual(ownedPlaces.size);
  });

  test('the counts move with the fixture this spec planted', async () => {
    const showcase = await everyItem(token, '/v1/me/profile/published');
    expect(showcase.some((card) => card.id === showcasedId)).toBe(true);
    expect(showcase.some((card) => card.id === draftId)).toBe(false);
    expect(showcase.some((card) => card.id === hostedId)).toBe(false);
  });

  test('the row renders the true counts, never placeholders', async ({ page }) => {
    const stats = (await api('/v1/me/profile/stats', 'GET', token)).body;
    await page.goto(PROFILE_TAB_ROUTE);
    await expect(page.getByText(ITINERARIES_STAT_LABEL, { exact: true }).first()).toBeVisible();

    await expect
      .poll(() => page.evaluate(() => document.body.innerText), { timeout: 20_000 })
      .toContain(String(stats.publishedCount));

    const sections = (await api(`/v1/travelers/${me.handle}/diaries`, 'GET', token)).body;
    await expect
      .poll(() => page.evaluate(() => document.body.innerText), { timeout: 20_000 })
      .toContain(String(sections.diaryCount));
    const shown = await page.evaluate(() => document.body.innerText);
    for (const label of [DIARIES_STAT_LABEL, ITINERARIES_STAT_LABEL, FOLLOWERS_STAT_LABEL, FOLLOWING_STAT_LABEL]) {
      expect(shown, `the ${label} cell is served, so it holds no dash`).not.toContain(`—
${label}`);
    }
  });
});

test.describe('the Itineraries tab — the showcase, and only the showcase', () => {
  test('the tab switches to Itineraries', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await labelled(page, ITINERARIES_TAB_LABEL).click();

    await expect(page.getByText(PUBLISHED_BADGE).first()).toBeVisible();
  });

  test('it shows the published trips the traveler owns, with place and length', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await labelled(page, ITINERARIES_TAB_LABEL).click();
    await expect(page.getByText(PUBLISHED_BADGE).first()).toBeVisible();

    await expect(page.getByText(showcaseTitle).first()).toBeVisible();
    await expect(page.getByText('El Nido, Palawan · 5 days').first()).toBeVisible();
  });

  test('it shows neither the draft nor the published trip the traveler merely joined', async ({
    page,
  }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await labelled(page, ITINERARIES_TAB_LABEL).click();
    await expect(page.getByText(showcaseTitle).first()).toBeVisible();

    await expect(page.getByText(draftTitle)).toHaveCount(0);
    await expect(page.getByText(hostedTitle)).toHaveCount(0);
  });

  test('the stub star and price pill render in the mock format', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await labelled(page, ITINERARIES_TAB_LABEL).click();
    await expect(page.getByText(showcaseTitle).first()).toBeVisible();

    await expect(page.getByText(/\d\.\d/).first()).toBeVisible();
    await expect(page.getByText(new RegExp(`₱[\\d,]+ ${PER_PERSON_SUFFIX}`)).first()).toBeVisible();
  });

  test('tapping a card opens the published view — what an audience sees', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await labelled(page, ITINERARIES_TAB_LABEL).click();
    await expect(page.getByText(showcaseTitle).first()).toBeVisible();

    await labelled(page, `Open the published view of ${showcaseTitle}`).click();

    await expect(page).toHaveURL(new RegExp(`/showcase/${showcasedId}`));
  });

  test('back returns to the profile with Itineraries still selected', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await labelled(page, ITINERARIES_TAB_LABEL).click();
    await expect(page.getByText(showcaseTitle).first()).toBeVisible();
    await labelled(page, `Open the published view of ${showcaseTitle}`).click();
    await expect(page).toHaveURL(/\/showcase\//);

    await labelled(page, 'Go back').click();

    await expect(page).toHaveURL(new RegExp(`${PROFILE_TAB_ROUTE}$`));
    await expect(page.getByText(PUBLISHED_BADGE).first()).toBeVisible();
  });
});

test.describe('the cogwheel and the account page behind it', () => {
  test('the cogwheel opens the account screen, which is rows now (S4.40)', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await labelled(page, ACCOUNT_LABEL).click();

    await expect(page).toHaveURL(/\/account/);
    for (const label of [
      EDIT_PROFILE_LABEL.replace('Profile', 'profile'),
      'Private profile',
      'Sign out',
    ]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    for (const gone of ['Reload', 'My Trips']) {
      await expect(page.getByText(gone, { exact: true })).toHaveCount(0);
    }
  });

  test('the My Diary section is gone — the Diary tab is its one home', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await labelled(page, ACCOUNT_LABEL).click();
    await expect(page).toHaveURL(/\/account/);

    await expect(page.getByText('My Diary')).toHaveCount(0);
  });

  test('the account page returns to the profile, not to some other stack', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await labelled(page, ACCOUNT_LABEL).click();
    await expect(page).toHaveURL(/\/account/);

    await labelled(page, ACCOUNT_BACK_LABEL).click();

    await expect(page).toHaveURL(new RegExp(`${PROFILE_TAB_ROUTE}$`));
  });
});

test('the surface is own-view only — the host reads their own showcase, never this traveler one', async () => {
  const hostShowcase = (await api('/v1/me/profile/published?limit=100', 'GET', hostToken)).body;
  expect((hostShowcase.items ?? []).every((card: { id: string }) => card.id !== showcasedId)).toBe(
    true,
  );
});

test('no page or console errors across the profile', async ({ page, signal }) => {
  await page.goto(PROFILE_TAB_ROUTE);
  await expect(page.getByText(DIARY_TAB_LABEL, { exact: true }).first()).toBeVisible();
  await labelled(page, ITINERARIES_TAB_LABEL).click();
  await expect(page.getByText(PUBLISHED_BADGE).first()).toBeVisible();

  expect(signal.pageErrors).toEqual([]);
  expect(signal.consoleErrors).toEqual([]);
});
