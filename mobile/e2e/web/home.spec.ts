import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { API, api, request, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor, type PoolTag } from '../support/identities';
import { FIXTURE_PHOTO, SeedFailure, climbTo, seedTrip, stamp } from '../support/seed';
import { labelled } from '../support/screen';
import {
  FEED_CAPTION_MORE,
  FEED_NEW_POSTS,
  FEED_NOTIFICATIONS_LABEL,
  CAUGHT_UP_TOAST,
  FEED_SEARCH_LABEL,
  FEED_TITLE,
  FEED_TRIP_BADGE,
  PHOTO_SHEET_REPORT,
  PHOTO_SHEET_SAVE,
  PHOTO_SHEET_SHARE,
} from '../../src/feed/feedCopy';
import { POLL_MS } from '../../src/feed/freshPosts';
import { HOME_TAB_ROUTE, TRIPS_TAB_ROUTE } from '../../src/navigation/authRoutes';

const AUTHOR = ownerTagFor('web/home');
const READER: PoolTag = IDENTITY_MAP['web/home'].tags[1]!;

requireStack(AUTHOR);

const POLL_WAIT_MS = POLL_MS + 8_000;

interface PostedEntry {
  id: string;
  caption: string;
  sharedAt: string | null;
  createdAt: string | null;
  photos: unknown[];
}

let authorToken: string;
let readerToken: string;
let trip: { id: string; title: string };
let mark: string;
let longCaption: string;
let shortCaption: string;
let siblingCaption: string;
let longEntry: PostedEntry;
let siblingEntry: PostedEntry;
let pillActivityId: string;
let secondPillActivityId: string;

async function postcard(
  token: string,
  itineraryId: string,
  entry: Record<string, unknown>,
  photos: number,
): Promise<{ status: number; body: PostedEntry }> {
  const boundary = `----largatahome${process.hrtime.bigint().toString(36)}`;
  const parts: Buffer[] = [
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="entry"\r\n`
        + `Content-Type: application/json\r\n\r\n${JSON.stringify(entry)}\r\n`,
    ),
  ];
  for (let index = 0; index < photos; index += 1) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="photos"; `
          + `filename="photo.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
      ),
      readFileSync(FIXTURE_PHOTO),
      Buffer.from('\r\n'),
    );
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return request(`${API}/v1/itineraries/${itineraryId}/diary/entries`, 'POST', Buffer.concat(parts), {
    Authorization: `Bearer ${token}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });
}

async function activity(token: string, itineraryId: string, day: number, title: string): Promise<string> {
  const plan = (await api(`/v1/itineraries/${itineraryId}`, 'GET', token)).body;
  const made = await api(
    `/v1/itineraries/${itineraryId}/days/${plan.days[day - 1].id}/activities`,
    'POST',
    token,
    { title },
  );
  if (made.status !== 201) throw new SeedFailure(`an activity named ${title}`, made.body);
  return made.body.id;
}

const feedCards = (page: Page) => page.locator('[aria-label$=", photo 1"]').locator('visible=true');

async function clickWithinOwnCard(page: Page, tripTitle: string, labelPrefix: string): Promise<boolean> {
  return page.evaluate(
    ([title, prefix]) => {
      const line = Array.from(document.querySelectorAll('*'))
        .filter((node) => node.children.length === 0)
        .filter((node) => (node.textContent ?? '').includes(title))
        .filter((node) => (node as HTMLElement).offsetParent !== null)[0];
      if (line === undefined) return false;
      let card: HTMLElement | null = line as HTMLElement;
      for (let up = 0; up < 8 && card !== null; up += 1) {
        const found = Array.from(card.querySelectorAll('[aria-label]'))
          .filter((node) => (node.getAttribute('aria-label') ?? '').startsWith(prefix))
          .filter((node) => (node as HTMLElement).offsetParent !== null)[0] as HTMLElement | undefined;
        if (found !== undefined) {
          found.click();
          return true;
        }
        card = card.parentElement;
      }
      return false;
    },
    [tripTitle, labelPrefix] as const,
  );
}

async function feedScrollTop(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('[aria-label$=", photo 1"]')).find(
      (node) => (node as HTMLElement).offsetParent !== null,
    );
    let scroller: HTMLElement | null = (card as HTMLElement) ?? null;
    while (
      scroller !== null
      && !(scroller.scrollHeight > scroller.clientHeight
        && /auto|scroll/.test(getComputedStyle(scroller).overflowY))
    ) {
      scroller = scroller.parentElement;
    }
    return scroller === null ? null : Math.round(scroller.scrollTop);
  });
}

async function scrollFeed(page: Page, by: number): Promise<number | null> {
  const at = await page.evaluate((delta) => {
    const card = Array.from(document.querySelectorAll('[aria-label$=", photo 1"]')).find(
      (node) => (node as HTMLElement).offsetParent !== null,
    );
    let scroller: HTMLElement | null = (card as HTMLElement) ?? null;
    while (
      scroller !== null
      && !(scroller.scrollHeight > scroller.clientHeight
        && /auto|scroll/.test(getComputedStyle(scroller).overflowY))
    ) {
      scroller = scroller.parentElement;
    }
    if (scroller === null) return null;
    scroller.scrollTop = Math.max(0, scroller.scrollTop + delta);
    scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
    return Math.round(scroller.scrollTop);
  }, by);
  await page.waitForTimeout(800);
  return at;
}

async function dragStrip(page: Page, fraction: number) {
  return page.evaluate((portion) => {
    const multiPhoto = Array.from(document.querySelectorAll('[aria-label$=", photo 1"]'))
      .filter((node) => (node as HTMLElement).offsetParent !== null)
      .find((node) => {
        const label = node.getAttribute('aria-label') ?? '';
        return document.querySelector(`[aria-label="${label.replace(', photo 1', ', photo 2')}"]`) !== null;
      });
    let strip: HTMLElement | null = (multiPhoto as HTMLElement) ?? null;
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
    return { before, dragged, snapAfter: getComputedStyle(strip).scrollSnapType };
  }, fraction);
}

async function diagonalDrag(page: Page) {
  return page.evaluate(() => {
    const multiPhoto = Array.from(document.querySelectorAll('[aria-label$=", photo 1"]'))
      .filter((node) => (node as HTMLElement).offsetParent !== null)
      .find((node) => {
        const label = node.getAttribute('aria-label') ?? '';
        return document.querySelector(`[aria-label="${label.replace(', photo 1', ', photo 2')}"]`) !== null;
      });
    let strip: HTMLElement | null = (multiPhoto as HTMLElement) ?? null;
    while (
      strip !== null
      && !(strip.scrollWidth > strip.clientWidth
        && /auto|scroll/.test(getComputedStyle(strip).overflowX))
    ) {
      strip = strip.parentElement;
    }
    if (strip === null) return null;

    let feed: HTMLElement | null = strip.parentElement;
    while (
      feed !== null
      && !(feed.scrollHeight > feed.clientHeight
        && /auto|scroll/.test(getComputedStyle(feed).overflowY))
    ) {
      feed = feed.parentElement;
    }
    const surface = feed ?? (document.scrollingElement as HTMLElement);

    const startedDown = surface.scrollTop;
    const startedAcross = strip.scrollLeft;
    const box = strip.getBoundingClientRect();
    const centreX = box.x + box.width / 2;
    const centreY = box.y + box.height / 2;
    const pointer = (type: string, x: number, y: number, buttons: number) =>
      strip!.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 7,
          pointerType: 'mouse',
          clientX: x,
          clientY: y,
          button: 0,
          buttons,
        }),
      );

    pointer('pointerdown', centreX, centreY, 1);
    for (const step of [0.3, 0.6, 1]) {
      pointer('pointermove', centreX - 120 * step, centreY - 140 * step, 1);
    }
    const across = strip.scrollLeft - startedAcross;
    const down = surface.scrollTop - startedDown;
    pointer('pointerup', centreX - 120, centreY - 140, 0);
    return { across, down };
  });
}

async function heartState(page: Page) {
  return page.evaluate(() => {
    const hearts = Array.from(document.querySelectorAll('[aria-label]'))
      .filter((node) => /^(Like|Unlike) this postcard$/.test(node.getAttribute('aria-label') ?? ''))
      .filter((node) => (node as HTMLElement).offsetParent !== null);
    const heart = hearts[hearts.length - 1] as HTMLElement | undefined;
    return heart === undefined
      ? null
      : { label: heart.getAttribute('aria-label'), text: heart.innerText.trim() };
  });
}

async function tapHeart(page: Page): Promise<boolean> {
  const tapped = await page.evaluate(() => {
    const hearts = Array.from(document.querySelectorAll('[aria-label]'))
      .filter((node) => /^(Like|Unlike) this postcard$/.test(node.getAttribute('aria-label') ?? ''))
      .filter((node) => (node as HTMLElement).offsetParent !== null);
    const heart = hearts[hearts.length - 1] as HTMLElement | undefined;
    if (heart === undefined) return false;
    heart.click();
    return true;
  });
  await page.waitForTimeout(1400);
  return tapped;
}

async function doubleTapPhoto(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const photos = Array.from(document.querySelectorAll('[aria-label$=", photo 1"]')).filter(
      (node) => (node as HTMLElement).offsetParent !== null,
    );
    const target = photos[photos.length - 1] as HTMLElement | undefined;
    if (target === undefined) return false;
    const box = target.getBoundingClientRect();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const pointer = (type: string, buttons: number) =>
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 3,
          pointerType: 'mouse',
          clientX: x,
          clientY: y,
          button: 0,
          buttons,
        }),
      );
    const mouse = (type: string, buttons: number) =>
      target.dispatchEvent(
        new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons }),
      );
    for (const _ of [0, 1]) {
      pointer('pointerdown', 1);
      mouse('mousedown', 1);
      pointer('pointerup', 0);
      mouse('mouseup', 0);
      mouse('click', 0);
    }
    return true;
  });
}

async function longPressPhoto(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    const photos = Array.from(document.querySelectorAll('[aria-label$=", photo 1"]')).filter(
      (node) => (node as HTMLElement).offsetParent !== null,
    );
    const target = photos[photos.length - 1] as HTMLElement | undefined;
    if (target === undefined) return false;
    const box = target.getBoundingClientRect();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const pointer = (type: string, buttons: number) =>
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 9,
          pointerType: 'mouse',
          clientX: x,
          clientY: y,
          button: 0,
          buttons,
        }),
      );
    const mouse = (type: string, buttons: number) =>
      target.dispatchEvent(
        new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons }),
      );
    pointer('pointerdown', 1);
    mouse('mousedown', 1);
    await new Promise((settle) => setTimeout(settle, 700));
    pointer('pointerup', 0);
    mouse('mouseup', 0);
    return true;
  });
}

async function burstDrawn(page: Page) {
  return page.evaluate(() => {
    const photos = Array.from(document.querySelectorAll('[aria-label$=", photo 1"]')).filter(
      (node) => (node as HTMLElement).offsetParent !== null,
    );
    const card = photos[photos.length - 1] as HTMLElement | undefined;
    if (card === undefined) return null;
    let stage: HTMLElement | null = card.parentElement;
    while (stage !== null && stage.querySelectorAll('svg').length === 0) stage = stage.parentElement;
    const large = Array.from((stage ?? document).querySelectorAll('svg')).filter(
      (node) => node.getBoundingClientRect().width > 60,
    );
    if (large.length === 0) return { drawn: false, opacity: 0 };
    let node: HTMLElement | null = large[0] as unknown as HTMLElement;
    let opacity = 1;
    for (let up = 0; up < 4 && node !== null; up += 1) {
      const value = Number(getComputedStyle(node).opacity);
      if (!Number.isNaN(value)) opacity = Math.min(opacity, value);
      node = node.parentElement;
    }
    return { drawn: true, opacity: Number(opacity.toFixed(2)) };
  });
}

async function wordmarkTop(page: Page): Promise<number | null> {
  return page.evaluate((title) => {
    const mark = Array.from(document.querySelectorAll('*'))
      .filter((node) => node.children.length === 0 && node.textContent?.trim() === title)
      .filter((node) => (node as HTMLElement).offsetParent !== null)[0] as HTMLElement | undefined;
    if (mark === undefined) return null;
    let box: HTMLElement = mark;
    while (box.parentElement !== null && box.getBoundingClientRect().height < 30) {
      box = box.parentElement;
    }
    return Math.round(box.getBoundingClientRect().top);
  }, FEED_TITLE);
}

test.beforeAll(async () => {
  authorToken = await tokenFor(AUTHOR);
  readerToken = await tokenFor(READER);
  mark = stamp('h').split(' ')[1]!;

  const seeded = await seedTrip({
    ownerTag: AUTHOR,
    title: `Feed walk ${mark}`,
    durationDays: 3,
  });
  trip = { id: seeded.id, title: seeded.title };
  await climbTo(seeded, 'ongoing');

  const first = await activity(authorToken, trip.id, 1, `Lempuyang Gate ${mark}`);
  const second = await activity(authorToken, trip.id, 2, `Rice terraces ${mark}`);
  const brief = await activity(authorToken, trip.id, 1, `A brief stop ${mark}`);
  pillActivityId = await activity(authorToken, trip.id, 3, `Fresh stop ${mark}`);
  secondPillActivityId = await activity(authorToken, trip.id, 3, `Pill stop ${mark}`);

  longCaption =
    `Shared to the feed ${mark}. Stood in line for two hours before sunrise and the`
    + ' reflection in the water was worth every minute of it, though the priests only let small'
    + ' groups climb up to the gate at a time.';
  siblingCaption = `The second postcard ${mark}`;
  shortCaption = `Short ${mark}`;

  const long = await postcard(authorToken, trip.id, { activityId: first, caption: longCaption, fromDump: [] }, 3);
  if (long.status !== 201) throw new SeedFailure('the three-photo postcard', long.body);
  longEntry = long.body;

  const sibling = await postcard(
    authorToken,
    trip.id,
    { activityId: second, caption: siblingCaption, fromDump: [] },
    1,
  );
  if (sibling.status !== 201) throw new SeedFailure('the sibling postcard', sibling.body);
  siblingEntry = sibling.body;

  const short = await postcard(
    authorToken,
    trip.id,
    { activityId: brief, caption: shortCaption, fromDump: [] },
    1,
  );
  if (short.status !== 201) throw new SeedFailure('the short-caption postcard', short.body);
});

test.beforeEach(async ({ signIn }) => {
  await signIn(READER);
});

test.describe('the wire, read by a traveler who shares no trip with the author', () => {
  test('the composer posted a public postcard carrying its three photos', async () => {
    expect(longEntry.sharedAt).not.toBeNull();
    expect(longEntry.photos).toHaveLength(3);
  });

  test('posting is publishing — the sibling went public at the instant it was written', async () => {
    expect(siblingEntry.sharedAt).not.toBeNull();
    expect(siblingEntry.sharedAt).toBe(siblingEntry.createdAt);
  });

  test('another traveler reads the postcard, and its sibling, over the wire', async () => {
    const feed = (await api('/v1/feed/postcards?limit=50', 'GET', readerToken)).body;
    const captions = (feed.items ?? []).map((card: { caption: string }) => card.caption);
    expect(captions).toContain(longCaption);
    expect(captions).toContain(siblingCaption);
  });

  test('the trip line carries name and day but no link while the trip is unpublished', async () => {
    const feed = (await api('/v1/feed/postcards?limit=50', 'GET', readerToken)).body;
    const card = (feed.items ?? []).find((item: { caption: string }) => item.caption === longCaption);
    expect(card.tripTitle).toBe(trip.title);
    expect(card.dayLabel).toBe('Day 1');
    expect(card.publishedItineraryId).toBeNull();
  });
});

test.describe('the feed as another traveler cold-starts onto it', () => {
  test('the root path lands on the feed, not on Trips', async ({ page }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(page.getByText(FEED_TITLE, { exact: true }).last()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${HOME_TAB_ROUTE}$`));
  });

  test('the reader sees the shared postcard and the sibling beside it', async ({ page }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(page.getByText(longCaption.slice(0, 24), { exact: false }).first()).toBeVisible();
    await expect(page.getByText(siblingCaption).first()).toBeVisible();
  });

  test('the card shows the trip line with its day label', async ({ page }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(page.getByText(`${trip.title} · Day 1`).first()).toBeVisible();
  });

  test('the byline is the author @handle, never the display name the wire also carries', async ({
    page,
  }) => {
    const author = (await api('/v1/me', 'GET', authorToken)).body;
    await page.goto(HOME_TAB_ROUTE);
    await expect(page.getByText(`@${author.handle}`).last()).toBeVisible();

    const shown = await page.evaluate(() => document.body.innerText);
    if (author.displayName !== null && author.displayName !== author.handle) {
      expect(shown).not.toContain(author.displayName);
    }
  });

  test('every feed photo arrives bearer-authenticated — no anonymous media GETs', async ({
    page,
    signal,
  }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();
    await page.waitForTimeout(2500);

    const media = signal.apiRequests.filter((call) => call.url.includes('/v1/media/'));
    expect(media.length).toBeGreaterThan(0);
    expect(media.filter((call) => call.auth === 'ANON')).toEqual([]);
  });

  test('the caption offers "more" only where it clamps, never on one that already fits', async ({
    page,
  }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();

    const counts = await page.evaluate((word) => {
      const mores = Array.from(document.querySelectorAll('*'))
        .filter((node) => node.children.length === 0 && node.textContent?.trim() === word)
        .filter((node) => (node as HTMLElement).offsetParent !== null);
      const cards = Array.from(document.querySelectorAll('[aria-label$=", photo 1"]')).filter(
        (node) => (node as HTMLElement).offsetParent !== null,
      );
      return { mores: mores.length, cards: cards.length };
    }, FEED_CAPTION_MORE);

    expect(counts.cards).toBeGreaterThanOrEqual(2);
    expect(counts.mores).toBeGreaterThanOrEqual(1);
    expect(counts.mores).toBeLessThan(counts.cards);
  });
});

test.describe('the Trip Post badge', () => {
  const openOwnBadge = async (page: Page) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(page.getByText(`${trip.title} · Day 1`).first()).toBeVisible();
    expect(await clickWithinOwnCard(page, trip.title, FEED_TRIP_BADGE)).toBe(true);
    await expect(page).toHaveURL(/\/feed\/diary\//);
  };

  test('the badge opens the public trip diary, listing that trip postcards', async ({ page }) => {
    await openOwnBadge(page);

    await expect(page.getByText(shortCaption).locator('visible=true').last()).toBeVisible();
    await expect(page.getByText(siblingCaption).locator('visible=true').last()).toBeVisible();
  });

  test('…and drops the badge there, since it would only lead back to this screen', async ({
    page,
  }) => {
    await openOwnBadge(page);

    await expect(page.getByText(trip.title).locator('visible=true').last()).toBeVisible();
    const badgesOnScreen = await page.evaluate((badge) => {
      const screen = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((node) => (node.getAttribute('aria-label') ?? '').startsWith(badge))
        .filter((node) => (node as HTMLElement).offsetParent !== null);
      return screen.length;
    }, FEED_TRIP_BADGE);
    expect(badgesOnScreen).toBe(0);
  });

  test('the public diary bylines the @handle too — the second reader surface', async ({ page }) => {
    const author = (await api('/v1/me', 'GET', authorToken)).body;
    await openOwnBadge(page);

    await expect(page.getByText(`@${author.handle}`).last()).toBeVisible();
    const shown = await page.evaluate(() => document.body.innerText);
    if (author.displayName !== null && author.displayName !== author.handle) {
      expect(shown).not.toContain(author.displayName);
    }
  });

  test('back from the public diary returns to the feed', async ({ page }) => {
    await openOwnBadge(page);

    await labelled(page, 'Go back').click();
    await expect(page).toHaveURL(new RegExp(`${HOME_TAB_ROUTE}$`));
  });
});

test.describe('the photo carousel on the web rung', () => {
  test('the photo strip drags — real PointerEvents move it', async ({ page }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();

    const dragged = await dragStrip(page, 0.7);
    expect(dragged).not.toBeNull();
    expect(dragged!.dragged).toBeGreaterThan(dragged!.before);
  });

  test('snap is restored after the drag, so paging still works', async ({ page }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();

    const dragged = await dragStrip(page, 0.7);
    expect(dragged!.snapAfter).toBe('x mandatory');
  });

  test('the counter tracks the page the strip settled on', async ({ page }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();
    await dragStrip(page, 0.7);
    await page.waitForTimeout(1200);

    await expect(page.getByText(/\b[1-3]\/3\b/).first()).toBeVisible();
  });

  test('a diagonal drag moves the strip and never the feed beneath it — the axis locks', async ({
    page,
  }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();

    const locked = await diagonalDrag(page);
    expect(locked).not.toBeNull();
    expect(locked!.across).toBeGreaterThan(0);
    expect(locked!.down).toBe(0);
  });
});

test.describe('the heart', () => {
  test('the heart toggles instantly, and toggling back restores the count exactly', async ({
    page,
  }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();

    const before = await heartState(page);
    expect(before).not.toBeNull();

    expect(await tapHeart(page)).toBe(true);
    const afterLike = await heartState(page);
    expect(afterLike!.label).not.toBe(before!.label);

    expect(await tapHeart(page)).toBe(true);
    const afterUnlike = await heartState(page);
    expect(afterUnlike!.label).toBe(before!.label);
    expect(afterUnlike!.text).toBe(before!.text);
  });

  test('the white heart burst is drawn over the photo, not merely counted', async ({ page }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();

    await doubleTapPhoto(page);
    await page.waitForTimeout(300);

    const burst = await burstDrawn(page);
    expect(burst).not.toBeNull();
    expect(burst!.drawn).toBe(true);
    expect(burst!.opacity).toBeGreaterThan(0);
  });

  test('double-tapping the photo likes it, and doing it again never unlikes', async ({ page }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();

    if ((await heartState(page))!.label === 'Unlike this postcard') await tapHeart(page);
    expect((await heartState(page))!.label).toBe('Like this postcard');

    await doubleTapPhoto(page);
    await page.waitForTimeout(1500);
    expect((await heartState(page))!.label).toBe('Unlike this postcard');

    await doubleTapPhoto(page);
    await page.waitForTimeout(1500);
    expect((await heartState(page))!.label).toBe('Unlike this postcard');
  });
});

test.describe('the controls with no backend behind them yet', () => {
  test('every backendless control refuses out loud rather than dead-clicking', async ({
    page,
    signal,
  }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();

    for (const label of [FEED_SEARCH_LABEL, FEED_NOTIFICATIONS_LABEL]) {
      await page.locator(`[aria-label="${label}"]`).locator('visible=true').first().click();
      await page.waitForTimeout(600);
    }

    for (const label of [
      'Comment on this postcard',
      'Share this postcard',
      'Save this postcard',
    ]) {
      await page.locator(`[aria-label="${label}"]`).locator('visible=true').first().click();
      await page.waitForTimeout(600);
    }

    await expect.poll(() => signal.dialogs.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(5);
  });

  test('the postcard byline opens the real profile now — S4.36 replaced the refusal', async ({
    page,
  }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();

    await page.locator('[aria-label$=", traveler profile"]').locator('visible=true').first().click();

    await expect
      .poll(() => page.url(), { timeout: 20_000 })
      .toMatch(/[/]travelers[/][a-z0-9_]+|[/]profile/);
  });

  test('long-pressing a photo opens the three-action sheet the mock draws', async ({ page }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();

    await longPressPhoto(page);
    await page.waitForTimeout(1200);

    for (const label of [PHOTO_SHEET_SAVE, PHOTO_SHEET_SHARE, PHOTO_SHEET_REPORT]) {
      await expect(page.getByText(label, { exact: true }).last()).toBeVisible();
    }
  });

  test('each sheet action refuses under its own name, not one shared refusal', async ({
    page,
    signal,
  }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();

    await longPressPhoto(page);
    await page.waitForTimeout(1200);
    await labelled(page, PHOTO_SHEET_REPORT).click();

    await expect
      .poll(() => signal.dialogs.join(' '), { timeout: 15_000 })
      .toMatch(new RegExp(PHOTO_SHEET_REPORT, 'i'));
  });
});

test.describe('the header and the scroll it answers to', () => {
  test('the header hides on the way down and comes back on the way up', async ({ page }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();

    const atRest = await wordmarkTop(page);
    expect(atRest).not.toBeNull();

    await scrollFeed(page, 600);
    const scrolledDown = await wordmarkTop(page);
    expect(scrolledDown).toBeLessThan(atRest!);

    await scrollFeed(page, -200);
    const cameBack = await wordmarkTop(page);
    expect(cameBack).toBeGreaterThanOrEqual(atRest!);
  });

  test('re-tapping Home while scrolled brings the feed back to the top', async ({ page }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();

    await scrollFeed(page, 700);
    expect(await feedScrollTop(page)).toBeGreaterThan(0);

    await page.locator('[role="tab"]').filter({ hasText: /^Home$/ }).last().click();
    await expect.poll(async () => feedScrollTop(page), { timeout: 15_000 }).toBe(0);
  });

  test('re-tapping Home at the top refreshes and says so, because nothing new had arrived', async ({
    page,
    signal,
  }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();
    await page.waitForTimeout(1500);

    const readsBefore = signal.apiRequests.filter((call) =>
      call.url.includes('/v1/feed/postcards'),
    ).length;

    await page.locator('[role="tab"]').filter({ hasText: /^Home$/ }).last().click();

    await expect
      .poll(
        () => signal.apiRequests.filter((call) => call.url.includes('/v1/feed/postcards')).length,
        { timeout: 15_000 },
      )
      .toBeGreaterThan(readsBefore);
    await expect(page.getByText(CAUGHT_UP_TOAST).first()).toBeVisible();
  });
});

test.describe('the trip line self-heals at publish', () => {
  test.describe.configure({ mode: 'serial' });

  test('the trip line gains its link the moment the trip publishes', async () => {
    const completed = await api(`/v1/itineraries/${trip.id}/complete`, 'POST', authorToken, {});
    expect(completed.status).toBe(200);
    const published = await api(`/v1/itineraries/${trip.id}/publish`, 'POST', authorToken, {
      visibility: 'public',
    });
    expect(published.status).toBe(200);

    await expect
      .poll(
        async () => {
          const feed = (await api('/v1/feed/postcards?limit=50', 'GET', readerToken)).body;
          const card = (feed.items ?? []).find(
            (item: { caption: string }) => item.caption === longCaption,
          );
          return card?.publishedItineraryId ?? null;
        },
        { timeout: 15_000 },
      )
      .toBe(trip.id);
  });

  test('tapping the trip line lands on the published itinerary', async ({ page }) => {
    await page.goto(HOME_TAB_ROUTE);
    await labelled(page, `${trip.title} · Day 1, open the published trip`).click();
    await expect(page).toHaveURL(/\/feed\/published\//);
  });

  test('back from the itinerary returns to the feed, not to Trips', async ({ page }) => {
    await page.goto(HOME_TAB_ROUTE);
    await labelled(page, `${trip.title} · Day 1, open the published trip`).click();
    await expect(page).toHaveURL(/\/feed\/published\//);

    await labelled(page, 'Go back').click();
    await expect(page).toHaveURL(new RegExp(`${HOME_TAB_ROUTE}$`));
  });

  test('the feed is where it was left after a detour to the itinerary', async ({ page }) => {
    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();

    expect(
      await clickWithinOwnCard(page, trip.title, `${trip.title} · Day 1, open the published trip`),
    ).toBe(true);
    await expect(page).toHaveURL(/\/feed\/published\//);
    await labelled(page, 'Go back').click();
    await expect(page).toHaveURL(new RegExp(`${HOME_TAB_ROUTE}$`));
    await expect(feedCards(page).first()).toBeVisible();

    await scrollFeed(page, 500);
    const leftAt = await feedScrollTop(page);
    expect(leftAt).toBeGreaterThan(0);

    expect(
      await clickWithinOwnCard(page, trip.title, `${trip.title} · Day 1, open the published trip`),
    ).toBe(true);
    await expect(page).toHaveURL(/\/feed\/published\//);
    await labelled(page, 'Go back').click();
    await expect(page).toHaveURL(new RegExp(`${HOME_TAB_ROUTE}$`));

    await expect.poll(async () => feedScrollTop(page), { timeout: 15_000 }).toBe(leftAt);
  });
});

test.describe('the new-posts pill, waited out over one real poll cycle', () => {
  test.describe.configure({ mode: 'serial' });

  test('the pill appears within a poll cycle, and the feed never moves uninvited', async ({
    page,
    signal,
  }) => {
    test.setTimeout(POLL_WAIT_MS + 180_000);

    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();

    await scrollFeed(page, 700);
    const restingAt = await feedScrollTop(page);
    expect(restingAt).toBeGreaterThan(0);

    const fresh = await postcard(
      authorToken,
      trip.id,
      { activityId: pillActivityId, caption: `Landed while reading ${mark}`, fromDump: [] },
      1,
    );
    expect(fresh.status).toBe(201);
    expect(fresh.body.sharedAt).not.toBeNull();

    const polledBefore = signal.apiRequests.filter((call) =>
      call.url.includes('/v1/feed/postcards'),
    ).length;

    await page.waitForTimeout(POLL_WAIT_MS);

    const polled =
      signal.apiRequests.filter((call) => call.url.includes('/v1/feed/postcards')).length
      - polledBefore;
    expect(polled).toBeGreaterThan(0);

    await expect(page.getByText(FEED_NEW_POSTS).last()).toBeVisible();
    expect(await feedScrollTop(page)).toBe(restingAt);
  });

  test('tapping the pill lands at the top with the new postcard first', async ({ page }) => {
    test.setTimeout(POLL_WAIT_MS + 180_000);

    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();
    await scrollFeed(page, 700);

    const newest = `Read it on the pill ${mark}`;
    const fresh = await postcard(
      authorToken,
      trip.id,
      { activityId: secondPillActivityId, caption: newest, fromDump: [] },
      1,
    );
    expect(fresh.status).toBe(201);

    await expect(page.getByText(FEED_NEW_POSTS).last()).toBeVisible({ timeout: POLL_WAIT_MS });
    await page.locator(`[aria-label="${FEED_NEW_POSTS}"]`).locator('visible=true').last().click();

    await expect.poll(async () => feedScrollTop(page), { timeout: 15_000 }).toBe(0);

    await expect(page.getByText(newest).last()).toBeVisible({ timeout: 15_000 });

    const shown = await page.evaluate(() => document.body.innerText);
    expect(shown.indexOf(newest), 'the new postcard must be on screen after the pill').toBeGreaterThan(-1);
    expect(await feedCards(page).count(), 'the feed must render cards to sort').toBeGreaterThan(0);

    const older = [siblingCaption, shortCaption, longCaption]
      .map((caption) => shown.indexOf(caption))
      .filter((at) => at > -1);
    for (const at of older) expect(shown.indexOf(newest)).toBeLessThan(at);
  });
});

test.describe('delete is the retraction the traveler still has', () => {
  test.describe.configure({ mode: 'serial' });

  test('deleting the postcard removes it from the feed on the next fetch', async ({ page }) => {
    const removed = await api(
      `/v1/itineraries/${trip.id}/diary/entries/${longEntry.id}`,
      'DELETE',
      authorToken,
    );
    expect([200, 204]).toContain(removed.status);

    await page.goto(HOME_TAB_ROUTE);
    await expect(feedCards(page).first()).toBeVisible();
    await expect(page.getByText(longCaption.slice(0, 24), { exact: false })).toHaveCount(0);
  });

  test('…and the wire agrees — no public read path serves it', async () => {
    const feed = (await api('/v1/feed/postcards?limit=50', 'GET', readerToken)).body;
    const captions = (feed.items ?? []).map((card: { caption: string }) => card.caption);
    expect(captions).not.toContain(longCaption);
  });

  test('there is no unshare endpoint left as an alternative', async () => {
    const unshared = await api(
      `/v1/itineraries/${trip.id}/diary/entries/${siblingEntry.id}/share`,
      'DELETE',
      authorToken,
    );
    expect(unshared.status).toBe(404);
  });
});

test('Trips keeps its surface at its own path, with no page or console errors on the feed', async ({
  page,
  signal,
}) => {
  await page.goto(HOME_TAB_ROUTE);
  await expect(feedCards(page).first()).toBeVisible();

  await page.goto(TRIPS_TAB_ROUTE);
  await expect(page.getByText(FEED_TITLE, { exact: true })).toHaveCount(0);

  expect(signal.pageErrors).toEqual([]);
  expect(signal.consoleErrors).toEqual([]);
});
