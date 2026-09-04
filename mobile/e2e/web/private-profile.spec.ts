import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { labelled, labelStarting } from '../support/screen';
import {
  DESTINATIONS_STAT_LABEL,
  FOLLOWING_LABEL,
  FOLLOW_LABEL,
  FOLLOW_LIST_RETRY_LABEL,
  PUBLIC_PROFILE_TITLE,
  firstNameOf,
  followersCountLabel,
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
  ACCOUNT_TITLE,
  APPROVE_LABEL,
  DECLINE_LABEL,
  FOLLOW_REQUESTS_ROW_LABEL,
  FOLLOW_REQUESTS_TITLE,
  GO_PUBLIC_TITLE,
  NO_REQUESTS_BODY,
  NO_REQUESTS_TITLE,
  PRIVATE_PROFILE_ROW_LABEL,
  VISIBILITY_FAILED_TOAST,
  approveFailedToast,
  REMOVE_FOLLOWER_LABEL,
  removeFollowerTitle,
} from '../../src/profile/privateProfileCopy';
import { FOLLOW_REQUESTS_ROUTE } from '../../src/profile/travelerRoutes';

const ACCOUNT_ROUTE = '/account';

const OWNER = ownerTagFor('web/private-profile');
const STRANGER = 't3';

requireStack(OWNER);
requireStack(STRANGER);

test.describe.configure({ mode: 'serial' });

let ownerToken: string;
let strangerToken: string;
let owner: { handle: string; displayName?: string | null };
let ownerId: string;
let strangerId: string;
let ownerFirstName: string;
let stranger: { handle: string };

async function idOf(token: string): Promise<string> {
  return (await api('/v1/me', 'GET', token)).body.id;
}

async function setVisibility(visibility: 'public' | 'private'): Promise<void> {
  const patched = await api('/v1/me', 'PATCH', ownerToken, { profileVisibility: visibility });
  expect(patched.body.profileVisibility).toBe(visibility);
}

async function visibilityOnServer(): Promise<string> {
  return (await api('/v1/me', 'GET', ownerToken)).body.profileVisibility;
}

async function relationOfStranger(): Promise<string> {
  return (await api(`/v1/travelers/${owner.handle}`, 'GET', strangerToken)).body.viewerRelation;
}

const COUNT_SEARCH_CEILING = 50;

async function followerCountOn(page: import('@playwright/test').Page): Promise<number> {
  for (let count = 0; count < COUNT_SEARCH_CEILING; count += 1) {
    if (await page.getByText(followersCountLabel(count), { exact: true }).count()) {
      return count;
    }
  }
  return -1;
}

async function publishedTripOfOwner(): Promise<string | null> {
  const showcase = await api(`/v1/travelers/${owner.handle}/published`, 'GET', strangerToken);
  const first = (showcase.body.items ?? [])[0];
  return first === undefined ? null : first.id;
}

async function clearEdge(): Promise<void> {
  await api(`/v1/travelers/${ownerId}/follow`, 'DELETE', strangerToken);
  await api(`/v1/me/follow-requests/${strangerId}/decline`, 'POST', ownerToken);
  await api(`/v1/me/followers/${strangerId}`, 'DELETE', ownerToken);
}

test.beforeAll(async () => {
  ownerToken = await tokenFor(OWNER);
  strangerToken = await tokenFor(STRANGER);
  owner = await profileFor(OWNER);
  stranger = await profileFor(STRANGER);
  ownerId = await idOf(ownerToken);
  strangerId = await idOf(strangerToken);
  ownerFirstName = firstNameOf(
    (await api('/v1/me', 'GET', ownerToken)).body.displayName ?? null,
  );
});

test.beforeEach(async ({ signIn }) => {
  await clearEdge();
  await setVisibility('private');
  await expect.poll(visibilityOnServer, { timeout: 15_000 }).toBe('private');
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

  for (const label of [
    PUBLISHED_STAT_LABEL,
    DESTINATIONS_STAT_LABEL,
    FOLLOWERS_STAT_LABEL,
    FOLLOWING_STAT_LABEL,
  ]) {
    await expect(page.getByText(label, { exact: true }).last()).toBeVisible();
  }

  await expect(page.getByText(DIARY_TAB_LABEL, { exact: true })).toHaveCount(0);
  await expect(page.getByText(ITINERARIES_TAB_LABEL, { exact: true })).toHaveCount(0);
});


test('every stat cell on a locked page is inert — not one of them is a control', async ({
  page,
}) => {
  await page.goto(`/travelers/${owner.handle}`);
  await expect(page.getByText(lockedProfileTitle(ownerFirstName)).last()).toBeVisible({
    timeout: 20_000,
  });
  const before = page.url();

  for (const label of [
    PUBLISHED_STAT_LABEL,
    DESTINATIONS_STAT_LABEL,
    FOLLOWERS_STAT_LABEL,
    FOLLOWING_STAT_LABEL,
  ]) {
    await expect(
      page.locator(`[aria-label$="${label}" i]`),
      'an inert cell renders no button label at all, which is what makes it inert',
    ).toHaveCount(0);
  }

  await page.getByText(FOLLOWERS_STAT_LABEL, { exact: true }).last().click();
  await page.getByText(FOLLOWING_STAT_LABEL, { exact: true }).last().click();

  expect(page.url(), 'and tapping one goes nowhere').toBe(before);
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


test('the Account switch saves on flip, both ways, and confirms only going public', async ({
  page,
  signIn,
  signal,
}) => {
  await setVisibility('public');
  await signIn(OWNER);
  await page.goto(ACCOUNT_ROUTE);
  await expect(page.getByText(ACCOUNT_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await labelled(page, PRIVATE_PROFILE_ROW_LABEL).click();

  await expect.poll(visibilityOnServer, { timeout: 15_000 }).toBe('private');
  expect(
    signal.dialogs.filter((line) => line.startsWith('confirm:')),
    'closing a door asks nothing',
  ).toEqual([]);

  await labelled(page, PRIVATE_PROFILE_ROW_LABEL).click();

  await expect.poll(visibilityOnServer, { timeout: 15_000 }).toBe('public');
  expect(
    signal.dialogs.filter((line) => line.startsWith('confirm:')).join(' '),
    'going public says what it approves',
  ).toContain(GO_PUBLIC_TITLE);
});


test('a refused save slides the switch back and says so', async ({ page, signIn }) => {
  await setVisibility('public');
  await signIn(OWNER);
  await page.goto(ACCOUNT_ROUTE);
  await expect(page.getByText(ACCOUNT_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await page.route('**/v1/me', (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"code":"UNAVAILABLE"}' })
      : route.continue(),
  );

  await labelled(page, PRIVATE_PROFILE_ROW_LABEL).click();

  await expect(page.getByText(VISIBILITY_FAILED_TOAST).last()).toBeVisible({ timeout: 10_000 });
  expect(await visibilityOnServer()).toBe('public');
});


test('the Follow requests row exists only while the profile is private', async ({
  page,
  signIn,
}) => {
  await setVisibility('public');
  await signIn(OWNER);
  await page.goto(ACCOUNT_ROUTE);
  await expect(page.getByText(ACCOUNT_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await expect(page.getByText(FOLLOW_REQUESTS_ROW_LABEL)).toHaveCount(0);

  await labelled(page, PRIVATE_PROFILE_ROW_LABEL).click();

  await expect(labelled(page, FOLLOW_REQUESTS_ROW_LABEL)).toBeVisible({ timeout: 10_000 });
});


test('a request is approved from the list, and the requester gets the whole profile', async ({
  page,
  signIn,
}) => {
  await api(`/v1/travelers/${ownerId}/follow`, 'POST', strangerToken);
  await signIn(OWNER);
  await page.goto(FOLLOW_REQUESTS_ROUTE);
  await expect(page.getByText(FOLLOW_REQUESTS_TITLE).last()).toBeVisible({ timeout: 20_000 });

  const row = labelled(page, `${APPROVE_LABEL} @${stranger.handle}`);
  await expect(row).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/^Asked /).last()).toBeVisible();

  await row.click();

  await expect(row).toHaveCount(0, { timeout: 10_000 });
  await expect.poll(relationOfStranger, { timeout: 15_000 }).toBe('following');
});


test('a declined request leaves the list and the requester may ask again', async ({
  page,
  signIn,
}) => {
  await api(`/v1/travelers/${ownerId}/follow`, 'POST', strangerToken);
  await signIn(OWNER);
  await page.goto(FOLLOW_REQUESTS_ROUTE);

  const decline = labelled(page, `${DECLINE_LABEL} @${stranger.handle}`);
  await expect(decline).toBeVisible({ timeout: 20_000 });

  await decline.click();

  await expect(decline).toHaveCount(0, { timeout: 10_000 });
  await expect.poll(relationOfStranger, { timeout: 15_000 }).toBe('none');

  const asked = await api(`/v1/travelers/${ownerId}/follow`, 'POST', strangerToken);
  expect(asked.body.state, 'declining is not a block').toBe('requested');
});


test('an empty inbox says so rather than showing a bare list', async ({ page, signIn }) => {
  await signIn(OWNER);
  await page.goto(FOLLOW_REQUESTS_ROUTE);

  await expect(page.getByText(NO_REQUESTS_TITLE).last()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(NO_REQUESTS_BODY).last()).toBeVisible();
});


test('a refused approve puts the row back and names the traveler', async ({ page, signIn }) => {
  await api(`/v1/travelers/${ownerId}/follow`, 'POST', strangerToken);
  await signIn(OWNER);
  await page.goto(FOLLOW_REQUESTS_ROUTE);

  const approve = labelled(page, `${APPROVE_LABEL} @${stranger.handle}`);
  await expect(approve).toBeVisible({ timeout: 20_000 });

  await page.route('**/approve', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{"code":"UNAVAILABLE"}' }),
  );

  await approve.click();

  await expect(page.getByText(approveFailedToast(stranger.handle)).last()).toBeVisible({
    timeout: 10_000,
  });
  await expect(approve).toBeVisible();
});


test('a follower is removed from the own list, with a sheet and a confirm and no undo', async ({
  page,
  signIn,
  signal,
}) => {
  await setVisibility('public');
  await api(`/v1/travelers/${ownerId}/follow`, 'POST', strangerToken);
  await signIn(OWNER);
  await page.goto(`/travelers/${owner.handle}/followers`);

  const kebab = labelled(page, `More about @${stranger.handle}`);
  await expect(kebab).toBeVisible({ timeout: 20_000 });

  await kebab.click();
  await expect(labelled(page, REMOVE_FOLLOWER_LABEL)).toBeVisible({ timeout: 10_000 });

  await labelled(page, REMOVE_FOLLOWER_LABEL).click();

  await expect
    .poll(() => signal.dialogs.filter((line) => line.startsWith('confirm:')).join(' '), {
      timeout: 10_000,
    })
    .toContain(removeFollowerTitle(stranger.handle));

  await expect(kebab).toHaveCount(0, { timeout: 10_000 });
  await expect.poll(relationOfStranger, { timeout: 15_000 }).toBe('none');
  await expect(page.getByText(/^Undo$/)).toHaveCount(0);
});


test('removing works on a private owner too, where followers were approved one by one', async ({
  page,
  signIn,
}) => {
  await api(`/v1/travelers/${ownerId}/follow`, 'POST', strangerToken);
  await api(`/v1/me/follow-requests/${strangerId}/approve`, 'POST', ownerToken);
  expect(await relationOfStranger()).toBe('following');

  await signIn(OWNER);
  await page.goto(`/travelers/${owner.handle}/followers`);

  const kebab = labelled(page, `More about @${stranger.handle}`);
  await expect(kebab).toBeVisible({ timeout: 20_000 });
  await kebab.click();
  await labelled(page, REMOVE_FOLLOWER_LABEL).click();

  await expect.poll(relationOfStranger, { timeout: 15_000 }).toBe('none');
});


test('the own Following list carries no kebab — leaving there is unfollowing', async ({
  page,
  signIn,
}) => {
  await setVisibility('public');
  await api(`/v1/travelers/${strangerId}/follow`, 'POST', ownerToken);
  await signIn(OWNER);
  await page.goto(`/travelers/${owner.handle}/following`);

  await expect(page.getByText(`@${stranger.handle}`).last()).toBeVisible({ timeout: 20_000 });
  await expect(labelled(page, `More about @${stranger.handle}`)).toHaveCount(0);

  await api(`/v1/travelers/${strangerId}/follow`, 'DELETE', ownerToken);
});


test("another traveler's followers list carries no kebab either", async ({ page, signIn }) => {
  await setVisibility('public');
  await api(`/v1/travelers/${ownerId}/follow`, 'POST', strangerToken);
  await signIn(STRANGER);
  await page.goto(`/travelers/${owner.handle}/followers`);

  await expect(page.getByText(`@${stranger.handle}`).last()).toBeVisible({ timeout: 20_000 });
  await expect(labelled(page, `More about @${stranger.handle}`)).toHaveCount(0);
});


test('the published page of a private creator offers Requested, from the same machine', async ({
  page,
}) => {
  const trip = await publishedTripOfOwner();
  test.skip(trip === null, 'the owner has no published trip on this stack');

  await page.goto(`/published/${trip}`);

  await expect(labelStarting(page, `${FOLLOW_LABEL} `)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Follow, coming soon')).toHaveCount(0);

  await labelStarting(page, `${FOLLOW_LABEL} `).click();

  await expect(labelStarting(page, `${REQUESTED_LABEL} `)).toBeVisible({ timeout: 10_000 });
  await expect.poll(relationOfStranger, { timeout: 15_000 }).toBe('requested');
});


test('an approved follower reads Following on the published page', async ({ page }) => {
  const trip = await publishedTripOfOwner();
  test.skip(trip === null, 'the owner has no published trip on this stack');

  await api(`/v1/travelers/${ownerId}/follow`, 'POST', strangerToken);
  await api(`/v1/me/follow-requests/${strangerId}/approve`, 'POST', ownerToken);

  await page.goto(`/published/${trip}`);

  await expect(labelStarting(page, `${FOLLOWING_LABEL} `)).toBeVisible({ timeout: 20_000 });
});


test('the creator own published page carries no pill at all', async ({ page, signIn }) => {
  const trip = await publishedTripOfOwner();
  test.skip(trip === null, 'the owner has no published trip on this stack');

  await signIn(OWNER);
  await page.goto(`/published/${trip}`);

  await expect(page.getByText(owner.handle, { exact: false }).last()).toBeVisible({
    timeout: 20_000,
  });
  await expect(labelStarting(page, `${FOLLOW_LABEL} `)).toHaveCount(0);
  await expect(labelStarting(page, `${FOLLOWING_LABEL} `)).toHaveCount(0);
});


test('a request arriving lands in an OPEN Follow requests list without a refresh', async ({
  page,
  signIn,
}) => {
  await signIn(OWNER);
  await page.goto(FOLLOW_REQUESTS_ROUTE);
  await expect(page.getByText(NO_REQUESTS_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await api(`/v1/travelers/${ownerId}/follow`, 'POST', strangerToken);

  await expect(labelled(page, `${APPROVE_LABEL} @${stranger.handle}`)).toBeVisible({
    timeout: 20_000,
  });
  expect(page.url(), 'nothing navigated — the list refreshed where it stood').toContain(
    'follow-requests',
  );
});


test('a departure lands in an OPEN Followers list, and the count line moves with it', async ({
  page,
  signIn,
}) => {
  await setVisibility('public');
  await api(`/v1/travelers/${ownerId}/follow`, 'POST', strangerToken);
  await signIn(OWNER);
  await page.goto(`/travelers/${owner.handle}/followers`);
  await expect(page.getByText(`@${stranger.handle}`).last()).toBeVisible({ timeout: 20_000 });

  const before = await followerCountOn(page);

  await api(`/v1/travelers/${ownerId}/follow`, 'DELETE', strangerToken);

  await expect(page.getByText(`@${stranger.handle}`)).toHaveCount(0, { timeout: 20_000 });
  await expect.poll(() => followerCountOn(page), { timeout: 20_000 }).toBe(before - 1);
});
