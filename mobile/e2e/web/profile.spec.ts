import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { API, api, request, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { STRANGER_TAG, ownerTagFor } from '../support/identities';
import {
  FIXTURE_PHOTO,
  SeedFailure,
  climbTo,
  joinTrip,
  seedTrip,
  stamp,
  uploadPhoto,
  type SeededTrip,
} from '../support/seed';
import { labelStarting, labelled } from '../support/screen';
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
  PUBLISHED_STAT_LABEL,
  TRIPS_STAT_LABEL,
} from '../../src/profile/profileCopy';
import { PROFILE_TAB_ROUTE } from '../../src/navigation/authRoutes';

const TRAVELER = ownerTagFor('web/profile');
const HOST = STRANGER_TAG;

requireStack(TRAVELER);

const DIARY_ENTRY_TITLE = 'Sunset at Las Cabanas';
const DIARY_CAPTION = 'The most magical sunset we have ever seen';

const TRIP_DIARY_ROUTE = /\/diary\/[0-9a-f-]{36}(\?|$)/;
const ENTRY_ROUTE = /\/diary\/[0-9a-f-]{36}\/[0-9a-f-]{36}(\?|$)/;

let token: string;
let hostToken: string;
let me: { handle: string | null; displayName: string | null; vanityNumber: string | null };
let run: string;
let showcaseTitle: string;
let draftTitle: string;
let hostedTitle: string;
let diaryTitle: string;
let showcasedId: string;
let draftId: string;
let hostedId: string;
let diaryTripId: string;

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
  const trip = await seedTrip({ ownerTag, title, destinations: [destination], durationDays: days });
  await climbTo(trip, 'completed');
  const published = await api(`/v1/itineraries/${trip.id}/publish`, 'POST', trip.ownerToken, {
    visibility: 'public',
  });
  if (published.status !== 200) throw new SeedFailure(`publishing "${title}"`, published.body);
  return trip;
}

async function postDiaryEntry(
  trip: SeededTrip,
  entry: Record<string, unknown>,
  photoIds: string[],
): Promise<any> {
  const boundary = `----largataprofile${process.hrtime.bigint().toString(36)}`;
  const payload = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="entry"\r\n`
      + `Content-Type: application/json\r\n\r\n`
      + `${JSON.stringify({ ...entry, fromDump: photoIds })}\r\n--${boundary}--\r\n`,
  );
  return request(`${API}/v1/itineraries/${trip.id}/diary/entries`, 'POST', payload, {
    Authorization: `Bearer ${trip.ownerToken}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });
}

const sectionOf = (page: Page, tripTitle: string) =>
  page.locator(`[aria-label^="Open the diary for ${tripTitle}"]`).locator('visible=true').last();

async function postcardsInSection(page: Page, tripTitle: string): Promise<number> {
  return page.evaluate((title) => {
    const header = Array.from(document.querySelectorAll('[aria-label]'))
      .filter((node) => (node.getAttribute('aria-label') ?? '').startsWith(`Open the diary for ${title}`))
      .filter((node) => (node as HTMLElement).offsetParent !== null)
      .map((node) => node.parentElement)[0];
    if (header === undefined || header === null) return -1;
    const section = header.parentElement;
    if (section === null) return -1;
    return Array.from(section.querySelectorAll('[aria-label]'))
      .filter((node) => (node.getAttribute('aria-label') ?? '').startsWith('Open your entry for'))
      .filter((node) => (node as HTMLElement).offsetParent !== null).length;
  }, tripTitle);
}

async function dragStrip(page: Page, fraction: number) {
  return page.evaluate((portion) => {
    const photo = Array.from(document.querySelectorAll('[aria-label$=", photo 1"]')).filter(
      (node) => (node as HTMLElement).offsetParent !== null,
    )[0];
    let strip: HTMLElement | null = (photo as HTMLElement) ?? null;
    while (
      strip !== null
      && !(strip.scrollWidth > strip.clientWidth
        && /auto|scroll/.test(getComputedStyle(strip).overflowX))
    ) {
      strip = strip.parentElement;
    }
    if (strip === null) return null;
    const box = strip.getBoundingClientRect();
    const centreX = box.x + box.width / 2;
    const centreY = box.y + box.height / 2;
    const travel = Math.round(strip.clientWidth * portion);
    const before = Math.round(strip.scrollLeft);
    const pointer = (type: string, x: number, buttons: number) =>
      strip!.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: x,
          clientY: centreY,
          button: 0,
          buttons,
        }),
      );
    pointer('pointerdown', centreX, 1);
    for (const step of [0.25, 0.5, 0.75, 1]) pointer('pointermove', centreX - travel * step, 1);
    const dragged = Math.round(strip.scrollLeft);
    pointer('pointerup', centreX - travel, 0);
    return { before, dragged };
  }, fraction);
}

async function stripRest(page: Page) {
  return page.evaluate(() => {
    const photo = Array.from(document.querySelectorAll('[aria-label$=", photo 1"]')).filter(
      (node) => (node as HTMLElement).offsetParent !== null,
    )[0];
    let strip: HTMLElement | null = (photo as HTMLElement) ?? null;
    while (
      strip !== null
      && !(strip.scrollWidth > strip.clientWidth
        && /auto|scroll/.test(getComputedStyle(strip).overflowX))
    ) {
      strip = strip.parentElement;
    }
    return strip === null
      ? null
      : { left: Math.round(strip.scrollLeft), pitch: Math.round(strip.clientWidth) };
  });
}

test.beforeAll(async () => {
  token = await tokenFor(TRAVELER);
  hostToken = await tokenFor(HOST);
  me = (await api('/v1/me', 'GET', token)).body;
  run = stamp('p').split(' ')[1]!;

  showcaseTitle = `Profile showcase ${run}`;
  draftTitle = `Profile draft ${run}`;
  hostedTitle = `Profile hosted ${run}`;
  diaryTitle = `Profile diary ${run}`;

  const showcased = await publishedTrip(TRAVELER, showcaseTitle, 'El Nido, Palawan', 5);
  showcasedId = showcased.id;

  const draft = await seedTrip({
    ownerTag: TRAVELER,
    title: draftTitle,
    destinations: ['Cebu'],
    durationDays: 2,
  });
  draftId = draft.id;

  const hosted = await seedTrip({
    ownerTag: HOST,
    title: hostedTitle,
    destinations: ['Tokyo, Japan'],
    durationDays: 4,
  });
  await climbTo(hosted, 'completed');
  const hostedPublished = await api(`/v1/itineraries/${hosted.id}/publish`, 'POST', hostToken, {
    visibility: 'public',
  });
  if (hostedPublished.status !== 200) {
    throw new SeedFailure('publishing the hosted trip', hostedPublished.body);
  }
  await joinTrip(hosted, TRAVELER);
  hostedId = hosted.id;

  const diaryTrip = await seedTrip({
    ownerTag: TRAVELER,
    title: diaryTitle,
    destinations: ['Palawan'],
    durationDays: 2,
  });
  diaryTripId = diaryTrip.id;

  const plan = (await api(`/v1/itineraries/${diaryTrip.id}`, 'GET', token)).body;
  const activity = await api(
    `/v1/itineraries/${diaryTrip.id}/days/${plan.days[0].id}/activities`,
    'POST',
    token,
    { title: DIARY_ENTRY_TITLE, timeOfDay: '18:12' },
  );
  if (activity.status !== 201) throw new SeedFailure('the diary activity', activity.body);
  await climbTo(diaryTrip, 'ongoing');

  const dumped: string[] = [];
  for (let index = 0; index < 3; index += 1) {
    const photo = await uploadPhoto(`/v1/itineraries/${diaryTrip.id}/photo-dump`, token, FIXTURE_PHOTO);
    if (photo.status !== 200 && photo.status !== 201) {
      throw new SeedFailure('a dumped photo', photo.body);
    }
    dumped.push(photo.body.id);
  }

  const entry = await postDiaryEntry(
    diaryTrip,
    { activityId: activity.body.id, caption: DIARY_CAPTION },
    dumped,
  );
  if (entry.status !== 201 || entry.body.photos?.length !== 3) {
    throw new SeedFailure('the three-photo diary entry', entry.body);
  }
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
      PUBLISHED_STAT_LABEL,
      TRIPS_STAT_LABEL,
      FOLLOWERS_STAT_LABEL,
      FOLLOWING_STAT_LABEL,
    ]) {
      await expect(page.getByText(cell, { exact: true }).first()).toBeVisible();
    }
  });

  test('Published counts exactly the showcase it sits above', async () => {
    const showcase = await everyItem(token, '/v1/me/profile/published');
    const stats = (await api('/v1/me/profile/stats', 'GET', token)).body;
    expect(stats.publishedCount).toBe(showcase.length);
  });

  test('Trips counts every trip the traveler belongs to, the hosted one included', async () => {
    const trips = await everyItem(token, '/v1/itineraries');
    const stats = (await api('/v1/me/profile/stats', 'GET', token)).body;
    expect(stats.tripCount).toBe(trips.length);
    expect(trips.some((trip) => trip.id === hostedId)).toBe(true);
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
    await expect(page.getByText(PUBLISHED_STAT_LABEL, { exact: true }).first()).toBeVisible();

    const shown = await page.evaluate(() => document.body.innerText);
    expect(shown).toContain(String(stats.publishedCount));
    expect(shown).toContain(String(stats.tripCount));
  });
});

test.describe('the Diary tab, which opens selected', () => {
  test('the newest section is this spec own trip, subtitled by place and length', async ({
    page,
  }) => {
    await page.goto(PROFILE_TAB_ROUTE);

    await expect(sectionOf(page, diaryTitle)).toBeVisible();
    await expect(page.getByText('Palawan · 2 days').first()).toBeVisible();
  });

  test('the newest section is already expanded, its postcard wearing the mock anatomy', async ({
    page,
  }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await expect(sectionOf(page, diaryTitle)).toBeVisible();

    await expect(labelled(page, `Open your entry for ${DIARY_ENTRY_TITLE}`)).toBeVisible();
    await expect(page.getByText(/Day \d+ · \d+:\d\d [AP]M/).first()).toBeVisible();
    await expect(page.getByText(/\d+ likes?/).first()).toBeVisible();
  });

  test('a multi-photo postcard wears the counter pill', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await expect(labelled(page, `Open your entry for ${DIARY_ENTRY_TITLE}`)).toBeVisible();

    await expect(page.getByText('1/3').first()).toBeVisible();
  });

  test('one photo owns the viewport — no sliver of the next (founder, 08/12)', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await expect(labelled(page, `${DIARY_ENTRY_TITLE}, photo 1`)).toBeVisible();

    const peek = await page.evaluate(() => {
      const photos = Array.from(document.querySelectorAll('img')).filter(
        (node) => (node as HTMLElement).offsetParent !== null,
      );
      if (photos.length < 2) return { photos: photos.length, photoWidth: 0, stageWidth: 0 };
      let scroller: HTMLElement | null = photos[0] as HTMLElement;
      while (scroller !== null && scroller.scrollWidth <= scroller.clientWidth) {
        scroller = scroller.parentElement;
      }
      return {
        photos: photos.length,
        photoWidth: Math.round(photos[0]!.getBoundingClientRect().width),
        stageWidth: scroller === null ? 0 : Math.round(scroller.clientWidth),
      };
    });

    expect(peek.photos).toBeGreaterThanOrEqual(2);
    expect(peek.stageWidth).toBeGreaterThan(0);
    expect(peek.photoWidth).toBe(peek.stageWidth);
  });

  test('a pointer drag scrolls the photo strip, now that the scrollbar is gone', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await expect(labelled(page, `${DIARY_ENTRY_TITLE}, photo 1`)).toBeVisible();

    const dragged = await dragStrip(page, 0.7);
    expect(dragged).not.toBeNull();
    expect(dragged!.dragged).toBeGreaterThan(dragged!.before);
  });

  test('releasing a drag slides to the nearest photo rather than stopping mid-swipe', async ({
    page,
  }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await expect(labelled(page, `${DIARY_ENTRY_TITLE}, photo 1`)).toBeVisible();

    await dragStrip(page, 0.7);
    await page.waitForTimeout(1200);

    const settled = await stripRest(page);
    expect(settled).not.toBeNull();
    expect(settled!.pitch).toBeGreaterThan(0);
    expect(settled!.left).toBeGreaterThan(0);
    expect(settled!.left % settled!.pitch).toBe(0);
  });

  test('tapping the section header collapses it, and its postcards go with it', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await expect(sectionOf(page, diaryTitle)).toBeVisible();
    expect(await postcardsInSection(page, diaryTitle)).toBeGreaterThan(0);

    await labelStarting(page, `Collapse entries for ${diaryTitle}`).click();

    await expect
      .poll(async () => postcardsInSection(page, diaryTitle), { timeout: 15_000 })
      .toBe(0);
  });

  test('tapping again expands it, and the postcards come back', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await expect(sectionOf(page, diaryTitle)).toBeVisible();

    await labelStarting(page, `Collapse entries for ${diaryTitle}`).click();
    await expect.poll(async () => postcardsInSection(page, diaryTitle), { timeout: 15_000 }).toBe(0);

    await labelStarting(page, `Expand entries for ${diaryTitle}`).click();
    await expect
      .poll(async () => postcardsInSection(page, diaryTitle), { timeout: 15_000 })
      .toBeGreaterThan(0);
  });
});

test.describe('the postcard preview, one tap short of the editor', () => {
  test('tapping a postcard opens the preview rather than the editor', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    const before = page.url();
    await labelled(page, `Open your entry for ${DIARY_ENTRY_TITLE}`).click();

    await expect(page.getByText('Edit entry')).toBeVisible();
    await expect(page.getByText('Share', { exact: true }).last()).toBeVisible();
    expect(page.url()).toBe(before);
  });

  test('the Share slot refuses honestly — it sends a postcard, and that is unbuilt', async ({
    page,
    signal,
  }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await labelled(page, `Open your entry for ${DIARY_ENTRY_TITLE}`).click();
    await expect(page.getByText('Edit entry')).toBeVisible();

    await page.getByText('Share', { exact: true }).last().click();

    await expect.poll(() => signal.dialogs.join(' '), { timeout: 15_000 }).toMatch(/coming soon/i);
  });

  test('nothing in the preview offers to publish or unpublish the postcard', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await labelled(page, `Open your entry for ${DIARY_ENTRY_TITLE}`).click();
    await expect(page.getByText('Edit entry')).toBeVisible();

    await expect(page.getByText('Share to feed')).toHaveCount(0);
    await expect(page.getByText('Remove from feed')).toHaveCount(0);
  });

  test('Edit entry carries the traveler through to the editor — a doorway, not a dead end', async ({
    page,
  }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await labelled(page, `Open your entry for ${DIARY_ENTRY_TITLE}`).click();
    await expect(page.getByText('Edit entry')).toBeVisible();

    await page.getByText('Edit entry').last().click();

    await expect(page).toHaveURL(ENTRY_ROUTE);
  });

  test('back from the entry returns to the profile, not into the trip stack', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await labelled(page, `Open your entry for ${DIARY_ENTRY_TITLE}`).click();
    await expect(page.getByText('Edit entry')).toBeVisible();
    await page.getByText('Edit entry').last().click();
    await expect(page).toHaveURL(ENTRY_ROUTE);

    await labelled(page, 'Go back').click();

    await expect(page).toHaveURL(new RegExp(`${PROFILE_TAB_ROUTE}$`));
    await expect(page.getByText(DIARY_ENTRY_TITLE).first()).toBeVisible();
  });
});

test.describe('the trip diary screen, reached from the section row', () => {
  test('tapping the section row opens that trip diary screen', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await sectionOf(page, diaryTitle).click();

    await expect(page).toHaveURL(TRIP_DIARY_ROUTE);
    await expect(page.getByText(diaryTitle).first()).toBeVisible();
  });

  test('dragging the stream photos scrolls them and never opens the preview (founder, 08/12)', async ({
    page,
  }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await sectionOf(page, diaryTitle).click();
    await expect(page).toHaveURL(TRIP_DIARY_ROUTE);

    const dragged = await dragStrip(page, 0.7);
    expect(dragged).not.toBeNull();
    expect(dragged!.dragged).toBeGreaterThan(dragged!.before);

    await page.waitForTimeout(1000);
    await expect(page.getByText('Edit entry')).toHaveCount(0);
  });

  test('an entry in the stream opens the same postcard preview', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await sectionOf(page, diaryTitle).click();
    await expect(page).toHaveURL(TRIP_DIARY_ROUTE);

    await labelled(page, `Open your entry for ${DIARY_ENTRY_TITLE}`).click();
    await expect(page.getByText('Edit entry')).toBeVisible();
  });

  test('closing the preview leaves the traveler on the diary screen', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await sectionOf(page, diaryTitle).click();
    await labelled(page, `Open your entry for ${DIARY_ENTRY_TITLE}`).click();
    await expect(page.getByText('Edit entry')).toBeVisible();

    await labelled(page, 'Close this postcard').click();

    await expect(page.getByText(diaryTitle).first()).toBeVisible();
    await expect(page).toHaveURL(TRIP_DIARY_ROUTE);
  });

  test('back from the trip diary returns to the profile, not into the trip stack', async ({
    page,
  }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await sectionOf(page, diaryTitle).click();
    await expect(page).toHaveURL(TRIP_DIARY_ROUTE);

    await labelled(page, 'Go back').click();

    await expect(page).toHaveURL(new RegExp(`${PROFILE_TAB_ROUTE}$`));
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
    await expect(page.getByText(DIARY_ENTRY_TITLE)).toHaveCount(0);
  });
});

test.describe('the cogwheel and the account page behind it', () => {
  test('the cogwheel opens the account screen with its card and buttons', async ({ page }) => {
    await page.goto(PROFILE_TAB_ROUTE);
    await labelled(page, ACCOUNT_LABEL).click();

    await expect(page).toHaveURL(/\/account/);
    for (const label of [EDIT_PROFILE_LABEL.replace('Profile', 'profile'), 'Reload', 'Sign out']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
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
