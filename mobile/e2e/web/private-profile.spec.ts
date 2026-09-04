import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { labelStarting } from '../support/screen';
import {
  DESTINATIONS_STAT_LABEL,
  FOLLOWING_LABEL,
  FOLLOW_LABEL,
  FOLLOW_LIST_RETRY_LABEL,
  PUBLIC_PROFILE_TITLE,
  firstNameOf,
} from '../../src/profile/publicProfileCopy';
import {
  DIARY_TAB_LABEL,
  FOLLOWERS_STAT_LABEL,
  FOLLOWING_STAT_LABEL,
  ITINERARIES_TAB_LABEL,
  PUBLISHED_STAT_LABEL,
} from '../../src/profile/profileCopy';
import {
  CANCEL_REQUEST_FAILED_TOAST,
  REQUESTED_LABEL,
  lockedProfileBody,
  lockedProfileTitle,
  requestFailedToast,
} from '../../src/profile/privateProfileCopy';

const OWNER = ownerTagFor('web/private-profile');
const STRANGER = 't3';

requireStack(OWNER);

let ownerToken: string;
let strangerToken: string;
let owner: { handle: string; displayName?: string | null };
let ownerId: string;
let strangerId: string;
let ownerFirstName: string;

async function idOf(token: string): Promise<string> {
  return (await api('/v1/me', 'GET', token)).body.id;
}

async function setVisibility(visibility: 'public' | 'private'): Promise<void> {
  const patched = await api('/v1/me', 'PATCH', ownerToken, { profileVisibility: visibility });
  expect(patched.body.profileVisibility).toBe(visibility);
}

async function relationOfStranger(): Promise<string> {
  return (await api(`/v1/travelers/${owner.handle}`, 'GET', strangerToken)).body.viewerRelation;
}

async function clearEdge(): Promise<void> {
  await api(`/v1/travelers/${ownerId}/follow`, 'DELETE', strangerToken);
}

test.beforeAll(async () => {
  ownerToken = await tokenFor(OWNER);
  strangerToken = await tokenFor(STRANGER);
  owner = await profileFor(OWNER);
  ownerId = await idOf(ownerToken);
  strangerId = await idOf(strangerToken);
  ownerFirstName = firstNameOf(
    (await api('/v1/me', 'GET', ownerToken)).body.displayName ?? null,
  );
});

test.beforeEach(async ({ signIn }) => {
  await clearEdge();
  await setVisibility('private');
  await signIn(STRANGER);
});

test.afterAll(async () => {
  await clearEdge();
  await setVisibility('public');
});


test('a tap on a private profile reads Requested at once, and the server agrees', async ({
  page,
  signal,
}) => {
  await page.goto(`/travelers/${owner.handle}`);
  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await labelStarting(page, `${FOLLOW_LABEL} `).click();

  await expect(labelStarting(page, `${REQUESTED_LABEL} `)).toBeVisible({ timeout: 10_000 });
  await expect.poll(relationOfStranger, { timeout: 10_000 }).toBe('requested');
  expect(
    signal.dialogs.filter((line) => line.startsWith('confirm:')),
    'asking to follow is as light as following',
  ).toEqual([]);
});


test('a second tap cancels the request, confirm-free, and the server forgets it', async ({
  page,
  signal,
}) => {
  await page.goto(`/travelers/${owner.handle}`);
  await labelStarting(page, `${FOLLOW_LABEL} `).click();
  await expect(labelStarting(page, `${REQUESTED_LABEL} `)).toBeVisible({ timeout: 10_000 });

  await labelStarting(page, `${REQUESTED_LABEL} `).click();

  await expect(labelStarting(page, `${FOLLOW_LABEL} `)).toBeVisible({ timeout: 10_000 });
  await expect.poll(relationOfStranger, { timeout: 10_000 }).toBe('none');
  expect(signal.dialogs.filter((line) => line.startsWith('confirm:'))).toEqual([]);
});


test('a refused request puts the pill back and names the traveler in a toast', async ({ page }) => {
  await page.goto(`/travelers/${owner.handle}`);
  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await page.route('**/follow', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"code":"UNAVAILABLE"}' })
      : route.continue(),
  );

  await labelStarting(page, `${FOLLOW_LABEL} `).click();

  await expect(page.getByText(requestFailedToast(owner.handle)).last()).toBeVisible({
    timeout: 10_000,
  });
  await expect(labelStarting(page, `${FOLLOW_LABEL} `)).toBeVisible();
});


test('a refused cancel puts Requested back and says so, without naming a follow', async ({
  page,
}) => {
  await page.goto(`/travelers/${owner.handle}`);
  await labelStarting(page, `${FOLLOW_LABEL} `).click();
  await expect(labelStarting(page, `${REQUESTED_LABEL} `)).toBeVisible({ timeout: 10_000 });

  await page.route('**/follow', (route) =>
    route.request().method() === 'DELETE'
      ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"code":"UNAVAILABLE"}' })
      : route.continue(),
  );

  await labelStarting(page, `${REQUESTED_LABEL} `).click();

  await expect(page.getByText(CANCEL_REQUEST_FAILED_TOAST).last()).toBeVisible({ timeout: 10_000 });
  await expect(labelStarting(page, `${REQUESTED_LABEL} `)).toBeVisible();
});


test('the same pill on a public profile still follows outright, not requests', async ({ page }) => {
  await setVisibility('public');

  await page.goto(`/travelers/${owner.handle}`);
  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await labelStarting(page, `${FOLLOW_LABEL} `).click();

  await expect(labelStarting(page, `${FOLLOWING_LABEL} `)).toBeVisible({ timeout: 10_000 });
  await expect.poll(relationOfStranger, { timeout: 10_000 }).toBe('following');
});


test('a stranger meets the header, four inert cells, the pill and the notice — nothing else', async ({
  page,
}) => {
  await page.goto(`/travelers/${owner.handle}`);
  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await expect(page.getByText(lockedProfileTitle(ownerFirstName)).last()).toBeVisible();
  await expect(page.getByText(lockedProfileBody(ownerFirstName)).last()).toBeVisible();

  for (const label of [PUBLISHED_STAT_LABEL, DESTINATIONS_STAT_LABEL, FOLLOWERS_STAT_LABEL, FOLLOWING_STAT_LABEL]) {
    await expect(page.locator(`[aria-label$="${label}" i]`).locator('visible=true').last()).toBeVisible();
  }

  await expect(page.getByText(DIARY_TAB_LABEL, { exact: true })).toHaveCount(0);
  await expect(page.getByText(ITINERARIES_TAB_LABEL, { exact: true })).toHaveCount(0);
});


test('the Followers and Following cells do nothing on a locked page', async ({ page }) => {
  await page.goto(`/travelers/${owner.handle}`);
  await expect(page.getByText(lockedProfileTitle(ownerFirstName)).last()).toBeVisible({
    timeout: 20_000,
  });
  const before = page.url();

  await page.locator(`[aria-label$="${FOLLOWERS_STAT_LABEL}" i]`).locator('visible=true').last().click();
  await page.locator(`[aria-label$="${FOLLOWING_STAT_LABEL}" i]`).locator('visible=true').last().click();

  expect(page.url(), 'an inert cell has no destination to go to').toBe(before);
  await expect(page.getByText(lockedProfileTitle(ownerFirstName)).last()).toBeVisible();
});


test('the published showcase is not drawn on a locked page, published trips or not', async ({
  page,
}) => {
  const published = await api(`/v1/travelers/${owner.handle}/published`, 'GET', strangerToken);
  expect(published.status, 'the showcase itself is never fenced (S4.39 decision 7)').toBe(200);

  await page.goto(`/travelers/${owner.handle}`);
  await expect(page.getByText(lockedProfileTitle(ownerFirstName)).last()).toBeVisible({
    timeout: 20_000,
  });

  for (const trip of published.body.items ?? []) {
    await expect(page.getByText(trip.title, { exact: true })).toHaveCount(0);
  }
});


test('a followers list reached by address renders the notice with the name as the way out', async ({
  page,
}) => {
  await page.goto(`/travelers/${owner.handle}/followers`);

  await expect(page.getByText(lockedProfileTitle(ownerFirstName)).last()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(FOLLOW_LIST_RETRY_LABEL)).toHaveCount(0);

  await page.getByText(ownerFirstName, { exact: true }).last().click();

  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 10_000 });
  expect(page.url()).toContain(owner.handle);
});


test('an approved follower sees the whole profile, tabs and all', async ({ page, signIn }) => {
  await api(`/v1/travelers/${ownerId}/follow`, 'POST', strangerToken);
  await api(`/v1/me/follow-requests/${strangerId}/approve`, 'POST', ownerToken);
  await signIn(STRANGER);

  await page.goto(`/travelers/${owner.handle}`);
  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await expect(labelStarting(page, `${FOLLOWING_LABEL} `)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(DIARY_TAB_LABEL, { exact: true }).last()).toBeVisible();
  await expect(page.getByText(lockedProfileTitle(ownerFirstName))).toHaveCount(0);
});
