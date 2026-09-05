import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { labelled, labelStarting } from '../support/screen';
import {
  FOLLOWERS_STAT_LABEL,
  FOLLOWING_STAT_LABEL,
} from '../../src/profile/profileCopy';
import {
  FIND_PEOPLE_LABEL,
  FOLLOWERS_TITLE,
  FOLLOWING_LABEL,
  FOLLOWING_TITLE,
  FOLLOW_LABEL,
  PUBLIC_PROFILE_TITLE,
  SEE_ALL_PEOPLE_LABEL,
  followFailedToast,
} from '../../src/profile/publicProfileCopy';
import { FEED_SCOPE_ALL, FEED_SCOPE_FOLLOWING, FOLLOWING_EMPTY_TITLE } from '../../src/feed/feedCopy';
import { NO_TRIPS_SUPPORT, noTripsMatchTitle } from '../../src/discovery/discoveryCopy';
import { HOME_TAB_ROUTE, PROFILE_TAB_ROUTE } from '../../src/navigation/authRoutes';

const FOLLOWER = ownerTagFor('web/follow');
const FOLLOWED = 't2';

requireStack(FOLLOWER);

let followerToken: string;
let followedToken: string;
let follower: { handle: string };
let followed: { handle: string };
let followedId: string;
let followerId: string;

async function idOf(token: string): Promise<string> {
  return (await api('/v1/me', 'GET', token)).body.id;
}

async function clearEdges(): Promise<void> {
  await api(`/v1/travelers/${followedId}/follow`, 'DELETE', followerToken);
  await api(`/v1/travelers/${followerId}/follow`, 'DELETE', followedToken);
}

async function countOn(page: import('@playwright/test').Page, label: string): Promise<number> {
  const text = await page
    .locator(`[aria-label$="${label}" i]`)
    .locator('visible=true')
    .last()
    .getAttribute('aria-label');
  return Number((text ?? '').split(' ')[0]);
}

test.beforeAll(async () => {
  followerToken = await tokenFor(FOLLOWER);
  followedToken = await tokenFor(FOLLOWED);
  follower = await profileFor(FOLLOWER);
  followed = await profileFor(FOLLOWED);
  followedId = await idOf(followedToken);
  followerId = await idOf(followerToken);
});

test.beforeEach(async ({ signIn }) => {
  await clearEdges();
  await signIn(FOLLOWER);
});


test('the pill follows, the counts move on both profiles, and unfollow needs no confirmation', async ({
  page,
  signal,
}) => {
  await page.goto(`/travelers/${followed.handle}`);
  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });

  const before = await countOn(page, FOLLOWERS_STAT_LABEL);

  await labelStarting(page, `${FOLLOW_LABEL} `).click();

  await expect(labelStarting(page, `${FOLLOWING_LABEL} `)).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => countOn(page, FOLLOWERS_STAT_LABEL), { timeout: 10_000 }).toBe(before + 1);

  await expect
    .poll(async () => (await api(`/v1/travelers/${followed.handle}`, 'GET', followerToken)).body.followedByViewer,
      { timeout: 10_000 })
    .toBe(true);

  await labelStarting(page, `${FOLLOWING_LABEL} `).click();

  await expect(labelStarting(page, `${FOLLOW_LABEL} `)).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => countOn(page, FOLLOWERS_STAT_LABEL), { timeout: 10_000 }).toBe(before);
  expect(
    signal.dialogs.filter((line) => line.startsWith('confirm:')),
    'leaving is as light as joining — nothing asks the traveler to confirm',
  ).toEqual([]);
});


test('a refused follow puts the pill back and names the traveler in a toast', async ({ page }) => {
  await page.goto(`/travelers/${followed.handle}`);
  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });

  const before = await countOn(page, FOLLOWERS_STAT_LABEL);
  await page.route('**/follow', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"code":"UNAVAILABLE"}' })
      : route.continue(),
  );

  await labelStarting(page, `${FOLLOW_LABEL} `).click();

  await expect(page.getByText(followFailedToast(followed.handle)).last()).toBeVisible({
    timeout: 10_000,
  });
  await expect(labelStarting(page, `${FOLLOW_LABEL} `)).toBeVisible();
  await expect.poll(() => countOn(page, FOLLOWERS_STAT_LABEL), { timeout: 10_000 }).toBe(before);
});


test('no profile claims a traveler follows me — the chip retired at S4.40', async ({ page }) => {
  await api(`/v1/travelers/${followerId}/follow`, 'POST', followedToken);

  await page.goto(`/travelers/${followed.handle}`);
  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await expect(page.getByText('Follows you')).toHaveCount(0);
});


test('my own profile never claims to follow me', async ({ page }) => {
  await page.goto(`/travelers/${follower.handle}`);

  await expect(labelled(page, 'Edit Profile')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Follows you')).toHaveCount(0);
});


test('the stat cells open the lists, and a row leads to that traveler', async ({ page }) => {
  await api(`/v1/travelers/${followedId}/follow`, 'POST', followerToken);

  await page.goto(`/travelers/${followed.handle}`);
  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await page
    .locator(`[aria-label$="${FOLLOWERS_STAT_LABEL}" i]`)
    .locator('visible=true')
    .last()
    .click();

  await expect(page.getByText(FOLLOWERS_TITLE).last()).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByText(`@${follower.handle}`).last(),
    'the traveler who just followed is in the list',
  ).toBeVisible({ timeout: 20_000 });

  await page.getByText(`@${follower.handle}`).last().click();
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
    .toBe(PROFILE_TAB_ROUTE);
});


test('a row for someone else opens THEIR profile, not mine', async ({ page }) => {
  await api(`/v1/travelers/${followedId}/follow`, 'POST', followerToken);

  await page.goto(`/travelers/${follower.handle}/following`);
  await expect(page.getByText(FOLLOWING_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await page.getByText(`@${followed.handle}`).last().click();

  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
    .toContain(followed.handle);
});


test('the own Profile tab opens its own following list from the same cell', async ({ page }) => {
  await api(`/v1/travelers/${followedId}/follow`, 'POST', followerToken);

  await page.goto('/profile');
  await expect(labelled(page, 'Edit Profile')).toBeVisible({ timeout: 20_000 });

  await page.locator(`[aria-label$="${FOLLOWING_STAT_LABEL}" i]`).locator('visible=true').last().click();

  await expect(page.getByText(FOLLOWING_TITLE).last()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(`@${followed.handle}`).last()).toBeVisible({ timeout: 20_000 });
});


test('the list screens draw their own header and no navigator one above it', async ({ page }) => {
  for (const which of ['followers', 'following']) {
    await page.goto(`/travelers/${follower.handle}/${which}`);
    await expect(page.getByText(which === 'followers' ? FOLLOWERS_TITLE : FOLLOWING_TITLE).last())
      .toBeVisible({ timeout: 20_000 });

    const shown = await page.evaluate(() => document.body.innerText);
    expect(shown, 'the route pattern must never render as a title').not.toContain('[handle]');
    expect(shown).not.toContain('travelers/');
  }
});


test('following nobody renders the empty state and its door into People search', async ({ page }) => {
  await page.goto(`/travelers/${follower.handle}/following`);

  await expect(page.getByText(FOLLOWING_TITLE).last()).toBeVisible({ timeout: 20_000 });
  await expect(labelled(page, FIND_PEOPLE_LABEL)).toBeVisible({ timeout: 20_000 });
});


test('Home lands on All at every cold start, and Following narrows the feed', async ({ page }) => {
  await page.goto(HOME_TAB_ROUTE);

  const all = page.locator(`[aria-label="${FEED_SCOPE_ALL}" i]`).locator('visible=true').last();
  const following = page
    .locator(`[aria-label="${FEED_SCOPE_FOLLOWING}" i]`)
    .locator('visible=true')
    .last();

  await expect(all).toBeVisible({ timeout: 20_000 });
  await expect(all, 'a cold start always lands on All').toHaveAttribute('aria-selected', 'true');
  await expect(following).toHaveAttribute('aria-selected', 'false');


  await following.click();
  await expect(following).toHaveAttribute('aria-selected', 'true', { timeout: 10_000 });

  await expect(page.getByText(FOLLOWING_EMPTY_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await page.goto(HOME_TAB_ROUTE);
  await expect(
    page.locator(`[aria-label="${FEED_SCOPE_ALL}" i]`).locator('visible=true').last(),
    'the choice is remembered only while the app runs',
  ).toHaveAttribute('aria-selected', 'true', { timeout: 20_000 });
});


test('the results screen shows the query once, in the field, per frame 4', async ({ page }) => {
  const query = followed.handle.slice(0, 5);
  await page.goto(`/discovery-results?q=${query}`);

  await expect(labelled(page, `Edit the search for ${query}`)).toBeVisible({ timeout: 20_000 });

  const shown = await page.evaluate(() => document.body.innerText);
  const echoed = shown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line === query);
  expect(echoed, 'a heading above the field repeated the query').toHaveLength(1);
});


test('a query only people match keeps the People group and says the trips half is empty (4b)', async ({
  page,
}) => {
  const query = followed.handle;
  await page.goto(`/discovery-results?q=${query}`);

  await expect(page.getByText(`@${query}`).last()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(noTripsMatchTitle(query)).last()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(NO_TRIPS_SUPPORT).last()).toBeVisible();
});


test('submitting a search finds the person — the S4.36 escape, closed', async ({ page }) => {
  await page.goto('/discovery-search');

  const field = page.locator('input').last();
  await field.fill(followed.handle.slice(0, 6));
  await field.press('Enter');

  await expect(page.getByText(`@${followed.handle}`).last()).toBeVisible({ timeout: 20_000 });
});


test('one matching person is enough for the group and its See all door', async ({ page }) => {
  await page.goto('/discovery-search');

  const field = page.locator('input').last();
  await field.fill(followed.handle);
  await field.press('Enter');

  await expect(page.getByText(`@${followed.handle}`).last()).toBeVisible({ timeout: 20_000 });
  await expect(
    labelled(page, SEE_ALL_PEOPLE_LABEL),
    'the door no longer waits for a fourth match',
  ).toBeVisible({ timeout: 20_000 });
});
