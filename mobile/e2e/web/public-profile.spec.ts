import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { SeedFailure, climbTo, seedTrip, stamp } from '../support/seed';
import { labelled, labelStarting } from '../support/screen';
import {
  DIARY_TAB_LABEL,
  FOLLOWERS_STAT_LABEL,
  FOLLOWING_STAT_LABEL,
  ITINERARIES_TAB_LABEL,
  PUBLISHED_STAT_LABEL,
} from '../../src/profile/profileCopy';
import {
  FOLLOW_LABEL,
  POSTCARDS_STAT_LABEL,
  PROFILE_UNAVAILABLE,
  PUBLIC_DIARY_EMPTY_TITLE,
  PUBLIC_PROFILE_TITLE,
  publicDiaryEmptyBody,
} from '../../src/profile/publicProfileCopy';
import { PROFILE_TAB_ROUTE } from '../../src/navigation/authRoutes';

const VIEWER = ownerTagFor('web/public-profile');
const SUBJECT = 't2';

requireStack(VIEWER);

let subject: { handle: string };
let viewer: { handle: string };
let showcaseTitle: string;
let privateTitle: string;

test.beforeAll(async () => {
  subject = await profileFor(SUBJECT);
  viewer = await profileFor(VIEWER);

  const run = stamp('S4.36');
  showcaseTitle = `Public showcase ${run}`;
  privateTitle = `Private plan ${run}`;

  const shown = await seedTrip({
    ownerTag: SUBJECT,
    title: showcaseTitle,
    destination: 'Kyoto',
    durationDays: 3,
  });
  await climbTo(shown, 'completed');
  const published = await api(`/v1/itineraries/${shown.id}/publish`, 'POST', shown.ownerToken, {
    audience: 'public',
  });
  if (published.status !== 200) throw new SeedFailure('publishing the showcase trip', published.body);

  const hidden = await seedTrip({
    ownerTag: SUBJECT,
    title: privateTitle,
    destination: 'Siargao',
    durationDays: 2,
  });
  await climbTo(hidden, 'completed');
  const kept = await api(`/v1/itineraries/${hidden.id}/publish`, 'POST', hidden.ownerToken, {
    audience: 'private',
  });
  if (kept.status !== 200) throw new SeedFailure('publishing the private trip', kept.body);
});

test.beforeEach(async ({ signIn }) => {
  await signIn(VIEWER);
});


test('the public profile shows the header the canvas draws, and no owner chrome', async ({ page }) => {
  await page.goto(`/travelers/${subject.handle}`);

  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(`@${subject.handle}`, { exact: false }).last()).toBeVisible();

  await expect(page.getByText(PUBLISHED_STAT_LABEL).last()).toBeVisible();
  await expect(page.getByText(POSTCARDS_STAT_LABEL).last()).toBeVisible();
  await expect(page.getByText(FOLLOWERS_STAT_LABEL).last()).toBeVisible();
  await expect(page.getByText(FOLLOWING_STAT_LABEL).last()).toBeVisible();
  await expect(page.getByText('Trips', { exact: true })).toHaveCount(0);

  await expect(labelStarting(page, `${FOLLOW_LABEL} `)).toBeVisible();
  await expect(labelled(page, 'Edit Profile')).toHaveCount(0);
  await expect(labelled(page, 'Open your account settings')).toHaveCount(0);
});


test('the Itineraries tab shows the published trip and never the private one', async ({ page }) => {
  await page.goto(`/travelers/${subject.handle}`);
  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await labelled(page, ITINERARIES_TAB_LABEL).click();

  await expect(page.getByText(showcaseTitle).last()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(privateTitle)).toHaveCount(0);
});


test('the Follow pill answers honestly and writes nothing', async ({ page, signal }) => {
  await page.goto(`/travelers/${subject.handle}`);
  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });

  const before = signal.apiRequests.length;
  await labelStarting(page, `${FOLLOW_LABEL} `).click();

  await expect
    .poll(() => signal.dialogs.join(' | '), { timeout: 10_000 })
    .toContain('coming soon');

  const wrote = signal.apiRequests
    .slice(before)
    .filter((call) => call.url.includes('/follow') || call.url.includes('/followers'));
  expect(wrote, 'the pill mutates nothing — no write leaves the app').toEqual([]);
});


test('a traveler who has published nothing renders honestly rather than dead-ending', async ({ page }) => {
  const emptyOne = await profileFor('t4');
  const emptyName = (await api('/v1/me', 'GET', await tokenFor('t4'))).body.displayName;
  await page.goto(`/travelers/${emptyOne.handle}`);

  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });
  await expect(labelled(page, DIARY_TAB_LABEL)).toBeVisible();

  const bodies = await page.getByText(PUBLIC_DIARY_EMPTY_TITLE).count();
  const emptyBody = publicDiaryEmptyBody(emptyName ?? null);
  if (bodies > 0) {
    await expect(page.getByText(emptyBody).last()).toBeVisible();
  }
});


test('an unknown handle answers with the unavailable state, never a blank screen', async ({ page }) => {
  await page.goto('/travelers/nosuchtravelerhere');

  await expect(page.getByText(PROFILE_UNAVAILABLE).last()).toBeVisible({ timeout: 20_000 });
});


test('addressing my own handle lands me on my own Profile tab, not the public screen', async ({ page }) => {
  await page.goto(`/travelers/${viewer.handle}`);

  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe(PROFILE_TAB_ROUTE);
  await expect(labelled(page, 'Edit Profile')).toBeVisible({ timeout: 20_000 });
});
