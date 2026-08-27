import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor, type PoolTag } from '../support/identities';
import { joinTrip, seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';
import { TRIPS_TAB_ROUTE } from '../../src/navigation/authRoutes';
import {
  BACK_IN_TRIP_TOAST,
  DELETE_TRIP_BODY,
  DELETE_TRIP_CANCEL_LABEL,
  DELETE_TRIP_CTA_LABEL,
  LEFT_TRIP_TOAST,
  TRIP_DELETED_TOAST,
  UNDO_LABEL,
  deleteTripAcknowledgement,
  deleteTripTitle,
  swipeActionLabel,
} from '../../src/removal/removalCopy';
import { REVEAL_PX } from '../../src/removal/swipeReveal';

declare global {
  interface Window { __swipeStage: (of: string) => HTMLElement | null }
}

const SETTLE_MS = 700;

const SNAP_SETTLE_MS = 400;

const OWNER = ownerTagFor('web/trips-swipe');
const MEMBER = IDENTITY_MAP['web/trips-swipe'].tags[1] as PoolTag;

requireStack(OWNER);

test.describe.configure({ mode: 'serial' });

let ownerToken: string;
let memberToken: string;
let owned: SeededTrip;
let joined: SeededTrip;
let ownedTitle: string;
let joinedTitle: string;

async function isArchived(id: string, token: string): Promise<boolean> {
  const read = await api(`/v1/itineraries/${id}`, 'GET', token);
  return read.body?.archived === true;
}

async function amMember(id: string): Promise<boolean> {
  const read = await api(`/v1/itineraries/${id}`, 'GET', memberToken);
  return read.status === 200;
}

function panelAction(page: Page, action: 'delete' | 'leave', title: string) {
  return page.locator(`[aria-label="${swipeActionLabel(action, title)}" i]`);
}


async function swipeOpen(page: Page, action: 'delete' | 'leave', title: string): Promise<void> {
  const panel = page.locator(`[aria-label="${swipeActionLabel(action, title)}" i]`);
  await expect(panel).toHaveCount(1, { timeout: 20_000 });

  const label = swipeActionLabel(action, title);
  await page.evaluate((wanted) => {
    window.__swipeStage = (of: string) => {
      const found = Array.from(document.querySelectorAll('[aria-label]')).find(
        (node) => node.getAttribute('aria-label')?.toLowerCase() === of.toLowerCase(),
      );
      return (found?.parentElement?.parentElement as HTMLElement | null) ?? null;
    };
    window.__swipeStage(wanted)?.scrollIntoView({ block: 'center' });
  }, label);
  await page.waitForTimeout(SETTLE_MS);

  const box = await page.evaluate((wanted) => {
    const card = window.__swipeStage(wanted)?.lastElementChild as HTMLElement | null;
    if (card === null || card === undefined) return null;
    const rect = card.getBoundingClientRect();
    if (rect.y < 0 || rect.y + rect.height > window.innerHeight) return null;
    return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
  }, label);
  if (box === null) throw new Error(`the swipe card for ${title} is not fully on screen`);

  const y = Math.round(box.y + box.h / 2);
  const from = Math.round(box.x + box.w - 24);
  await page.mouse.move(from, y);
  await page.mouse.down();
  for (const step of [0.3, 0.6, 0.85, 1]) {
    await page.mouse.move(from - (REVEAL_PX + 12) * step, y, { steps: 4 });
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await page.waitForTimeout(SNAP_SETTLE_MS);
}

async function openTrips(page: Page): Promise<void> {
  await page.goto(TRIPS_TAB_ROUTE);
}

test.beforeAll(async () => {
  ownerToken = await tokenFor(OWNER);
  memberToken = await tokenFor(MEMBER);

  ownedTitle = stamp('Swipe owned');
  owned = await seedTrip({ ownerTag: OWNER, title: ownedTitle, durationDays: 2 });

  joinedTitle = stamp('Swipe joined');
  joined = await seedTrip({ ownerTag: OWNER, title: joinedTitle, durationDays: 2 });
  await joinTrip(joined, MEMBER);
});

test('the owner of a trip reveals Delete, never Leave', async ({ signIn, page }) => {
  await signIn(OWNER);
  await openTrips(page);

  await expect(labelled(page, swipeActionLabel('delete', ownedTitle))).toHaveCount(1);
  await expect(labelled(page, swipeActionLabel('leave', ownedTitle))).toHaveCount(0);
});

test('a member of a trip reveals Leave, never Delete', async ({ signIn, page }) => {
  await signIn(MEMBER);
  await openTrips(page);

  await expect(labelled(page, swipeActionLabel('leave', joinedTitle))).toHaveCount(1);
  await expect(labelled(page, swipeActionLabel('delete', joinedTitle))).toHaveCount(0);
});

test('Leave collapses the row and offers Undo — and undo sends NOTHING', async ({
  signIn,
  page,
  signal,
}) => {
  await signIn(MEMBER);
  await openTrips(page);

  await swipeOpen(page, 'leave', joinedTitle);
  await panelAction(page, 'leave', joinedTitle).click();

  await expect(page.getByText(LEFT_TRIP_TOAST)).toBeVisible();
  await labelled(page, UNDO_LABEL).click();
  await expect(page.getByText(BACK_IN_TRIP_TOAST)).toBeVisible();

  const memberDeletes = signal.apiRequests.filter((request) =>
    /\/members\/[0-9a-f-]{36}$/.test(request.url));
  expect(memberDeletes).toHaveLength(0);
  expect(await amMember(joined.id)).toBe(true);
});

test("the owner's Delete opens the modal, and its copy claims no destruction that does not happen", async ({
  signIn,
  page,
}) => {
  await signIn(OWNER);
  await openTrips(page);

  await swipeOpen(page, 'delete', ownedTitle);
  await panelAction(page, 'delete', ownedTitle).click();

  await expect(page.getByText(deleteTripTitle(ownedTitle))).toBeVisible();
  await expect(page.getByText(DELETE_TRIP_BODY)).toBeVisible();
  await expect(page.getByText('It cannot be undone.')).toHaveCount(0);
});

test('the CTA is inert until the acknowledgement is ticked, and Cancel leaves the trip untouched', async ({
  signIn,
  page,
}) => {
  await signIn(OWNER);
  await openTrips(page);

  await swipeOpen(page, 'delete', ownedTitle);
  await panelAction(page, 'delete', ownedTitle).click();

  await expect(labelled(page, DELETE_TRIP_CTA_LABEL)).toBeDisabled();
  await expect(page.getByText(deleteTripTitle(ownedTitle))).toBeVisible();
  expect(await isArchived(owned.id, ownerToken)).toBe(false);

  await labelled(page, DELETE_TRIP_CANCEL_LABEL).click();
  await expect(page.getByText(deleteTripTitle(ownedTitle))).toHaveCount(0);
  expect(await isArchived(owned.id, ownerToken)).toBe(false);
});

test('acknowledging and committing archives the trip, with a plain toast and no undo', async ({
  signIn,
  page,
}) => {
  await signIn(OWNER);
  await openTrips(page);

  await swipeOpen(page, 'delete', ownedTitle);
  await panelAction(page, 'delete', ownedTitle).click();
  await labelled(page, deleteTripAcknowledgement(1)).click();
  await labelled(page, DELETE_TRIP_CTA_LABEL).click();

  await expect(page.getByText(TRIP_DELETED_TOAST)).toBeVisible();
  await expect(labelled(page, UNDO_LABEL)).toHaveCount(0);

  await expect.poll(() => isArchived(owned.id, ownerToken), { timeout: 20_000 }).toBe(true);
});

test('the archived trip lives in Archived trips, and nowhere else in the owner app', async ({
  signIn,
  page,
}) => {
  await signIn(OWNER);
  await page.goto('/itineraries/archived');

  await expect(page.getByText(ownedTitle).first()).toBeVisible({ timeout: 20_000 });

  await openTrips(page);
  await expect(labelled(page, swipeActionLabel('delete', ownedTitle))).toHaveCount(0);
});

test('letting the Leave toast expire ends the membership for real, exactly once', async ({
  signIn,
  page,
  signal,
}) => {
  await signIn(MEMBER);
  await openTrips(page);

  await swipeOpen(page, 'leave', joinedTitle);
  await panelAction(page, 'leave', joinedTitle).click();
  await expect(page.getByText(LEFT_TRIP_TOAST)).toBeVisible();

  await expect.poll(() => amMember(joined.id), { timeout: 20_000 }).toBe(false);

  const memberDeletes = signal.apiRequests.filter((request) =>
    /\/members\/[0-9a-f-]{36}$/.test(request.url));
  expect(memberDeletes).toHaveLength(1);
});
