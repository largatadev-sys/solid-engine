import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, type PoolTag } from '../support/identities';
import { FIXTURE_PHOTO } from '../support/seed';
import { labelled } from '../support/screen';
import {
  DAY_ADD_PHOTO,
  DIARIES_STAT_LABEL,
  DIARY_TAB_EMPTY_TITLE,
  POSTCARD_CAPTION_LABEL,
  POSTCARD_PLACE_LABEL,
  POSTCARD_POSTED_TOAST,
  POST_CTA,
  VIEW_ITINERARY_LINK,
  sectionMetaLine,
} from '../../src/diary/memoryCopy';
import { DIARY_TAB_LABEL } from '../../src/profile/profileCopy';

const AUTHOR = ownerTagFor('web/diary-tab');
const STRANGER: PoolTag = 't3';

requireStack(AUTHOR);

test.describe.configure({ mode: 'serial' });

const CAPTION = `Found the tile shop again ${Date.now().toString(36)}`;
const PLACE = 'Cacilhas, Almada';
const DIARY_TITLE = `Algarve tab ${Date.now().toString(36)}`;

let token: string;
let handle: string;

test.beforeAll(async () => {
  token = await tokenFor(AUTHOR);
  handle = (await api('/v1/me', 'GET', token)).body?.handle;
});

test.beforeEach(async ({ signIn }) => {
  await signIn(AUTHOR);
});


test('a loose postcard posts from nowhere and reads at the top of the Diary tab', async ({
  page,
}) => {
  await page.goto('/postcards/new');

  const post = labelled(page, POST_CTA);
  await expect(post, 'Post waits for a photo').toBeDisabled();

  const chooser = page.waitForEvent('filechooser');
  await labelled(page, DAY_ADD_PHOTO).click();
  await (await chooser).setFiles([FIXTURE_PHOTO]);

  await expect(post, 'a photo alone is not enough — a caption or a place is owed').toBeDisabled();

  await labelled(page, POSTCARD_CAPTION_LABEL).fill(CAPTION);
  await labelled(page, POSTCARD_PLACE_LABEL).fill(PLACE);
  await expect(post).toBeEnabled();

  await post.click();
  await expect(page.getByText(POSTCARD_POSTED_TOAST).locator('visible=true').last()).toBeVisible();
  await expect(
    page.getByText(POSTCARD_POSTED_TOAST).locator('visible=true'),
    'the toast holds two seconds and leaves on its own (M2)',
  ).toHaveCount(0, { timeout: 4_000 });

  await expect(page.getByText(CAPTION).locator('visible=true').last()).toBeVisible();

  const sections = (await api(`/v1/travelers/${handle}/diaries`, 'GET', token)).body;
  expect(
    sections.loosePostcards[0]?.caption,
    'the newest loose postcard is first, and it belongs to no diary',
  ).toBe(CAPTION);
  expect(sections.loosePostcards[0]?.diaryId).toBeNull();
});


test('a diary section carries its meta line, and no engagement row exists anywhere', async ({
  page,
}) => {
  const created = await api('/v1/diaries', 'POST', token, {
    title: DIARY_TITLE,
    destination: 'Portugal',
    startDate: aPastDay(5),
    endDate: aPastDay(9),
  });
  expect(created.status).toBe(201);

  await page.goto('/profile');
  await labelled(page, DIARY_TAB_LABEL).click();

  await expect(page.getByText(DIARY_TITLE).locator('visible=true').last()).toBeVisible();
  await expect(
    page.getByText(sectionMetaLine('Portugal', 0)).locator('visible=true').last(),
  ).toBeVisible();

  for (const engagement of ['likes', 'Like', 'Comment', 'comments']) {
    await expect(
      page.getByText(new RegExp(`\b${engagement}\b`)).locator('visible=true'),
      `no "${engagement}" anywhere on the Diary tab`,
    ).toHaveCount(0);
  }
});


test('the stats row counts diaries, and the itinerary link waits for a published trip', async ({
  page,
}) => {
  await page.goto('/profile');
  await labelled(page, DIARY_TAB_LABEL).click();

  const sections = (await api(`/v1/travelers/${handle}/diaries`, 'GET', token)).body;
  expect(
    sections.diaryCount,
    'the count is diaries alone — a loose postcard never moves it',
  ).toBe(sections.diaries.length);

  const unpublished = sections.diaries.filter((diary: any) => diary.itineraryId === null);
  expect(unpublished.length).toBeGreaterThan(0);

  await expect(
    page.getByText(VIEW_ITINERARY_LINK).locator('visible=true'),
    'the link shows only where the server sent an itinerary id',
  ).toHaveCount(sections.diaries.length - unpublished.length);

  await expect(page.getByText(DIARIES_STAT_LABEL).locator('visible=true').last()).toBeVisible();
});


test('a traveler with nothing posted sees the empty state and no button', async ({ page }) => {
  const emptyHandle = `t${Date.now().toString(36)}`.slice(0, 12);
  const strangerSections = await api(`/v1/travelers/${emptyHandle}/diaries`, 'GET', token);

  expect(strangerSections.status, 'a handle nobody holds answers not-found').toBe(404);

  await page.goto('/profile');
  await labelled(page, DIARY_TAB_LABEL).click();

  const mine = (await api(`/v1/travelers/${handle}/diaries`, 'GET', token)).body;
  if (mine.diaries.length === 0 && mine.loosePostcards.length === 0) {
    await expect(
      page.getByText(DIARY_TAB_EMPTY_TITLE).locator('visible=true').last(),
    ).toBeVisible();
  }
});


function aPastDay(day: number): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, day))
    .toISOString()
    .slice(0, 10);
}


test('a visitor reads the same tab the owner does; a stranger to a private author meets the notice', async ({
  page,
  signIn,
}) => {
  const mine = (await api(`/v1/travelers/${handle}/diaries`, 'GET', token)).body;
  expect(
    mine.diaries.some((diary: any) => diary.title === DIARY_TITLE),
    'the section test above leaves its diary in place for the visitor to read',
  ).toBe(true);

  await api('/v1/me', 'PATCH', token, { profileVisibility: 'public' });
  await signIn(STRANGER);
  await page.goto(`/travelers/${handle}`);
  await labelled(page, DIARY_TAB_LABEL).click();

  await expect(page.getByText(DIARY_TITLE).locator('visible=true').last()).toBeVisible();
  await expect(page.getByText(DIARIES_STAT_LABEL).locator('visible=true').last()).toBeVisible();
  await expect(
    page.getByLabel(`${DIARY_TITLE} menu`),
    'a visitor gets no kebab — the owner acts stay the owner\'s',
  ).toHaveCount(0);

  await api('/v1/me', 'PATCH', token, { profileVisibility: 'private' });
  try {
    await page.reload();
    await expect(page.getByText(`@${handle}`).locator('visible=true').last()).toBeVisible();
    await expect(page.getByRole('tab', { name: DIARY_TAB_LABEL })).toHaveCount(0);
    await expect(page.getByText(DIARY_TITLE)).toHaveCount(0);
  } finally {
    await api('/v1/me', 'PATCH', token, { profileVisibility: 'public' });
  }
});
