import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { identitiesFor } from '../support/identities';
import { FIXTURE_PHOTO, postPostcard } from '../support/seed';
import { labelled } from '../support/screen';
import {
  ADD_A_DAY_CTA,
  ADD_POSTCARD_CTA,
  ADD_TO_DIARY_ACTION,
  DAY_ADD_PHOTO,
  DAY_CAPTION_LABEL,
  DELETE_ACTION,
  DELETE_DIARY_ACTION,
  DIARY_TITLE_LABEL,
  EDIT_DIARY_ACTION,
  NO_POSTCARDS_ON_THIS_DAY,
  POSTCARD_CAPTION_LABEL,
  POSTCARD_POST_CTA,
  SAVE_CTA,
  dayOrdinalLabel,
  deleteDiaryTitle,
} from '../../src/diary/memoryCopy';

const [AUTHOR, VISITOR] = identitiesFor('web/diary-detail').tags;

requireStack(AUTHOR!);

test.describe.configure({ mode: 'serial' });

let token: string;
let visitorToken: string;
let diaryId: string;
let firstDayId: string;

const TITLE = `Detail walk ${Date.now().toString(36)}`;

test.beforeAll(async () => {
  token = await tokenFor(AUTHOR!);
  visitorToken = await tokenFor(VISITOR!);

  const created = await api('/v1/diaries', 'POST', token, {
    title: TITLE,
    destination: 'Portugal',
    startDate: aPastDay(5),
    endDate: aPastDay(9),
  });
  diaryId = created.body.id;

  const day = await api(`/v1/diaries/${diaryId}/days`, 'POST', token, {
    date: aPastDay(5),
    place: 'Alfama, Lisbon',
  });
  firstDayId = day.body.id;
});

test.beforeEach(async ({ signIn }) => {
  await signIn(AUTHOR!);
});


test('the owner sees the kebab, the per-day Postcard control and Add a day', async ({ page }) => {
  await page.goto(`/diaries/${diaryId}`);

  await expect(page.getByText(TITLE).locator('visible=true').last()).toBeVisible();
  await expect(labelled(page, `${TITLE} menu`)).toBeVisible();
  await expect(labelled(page, ADD_A_DAY_CTA)).toBeVisible();
  await expect(labelled(page, `${ADD_POSTCARD_CTA} to ${dayOrdinalLabel(1)}`)).toBeVisible();

  await expect(
    page.getByText(NO_POSTCARDS_ON_THIS_DAY).locator('visible=true').last(),
    'a day with nothing on it says so, rather than drawing a dashed target',
  ).toBeVisible();
});


test('the owner adds a day, and the server numbers it from its date', async ({ page }) => {
  await page.goto(`/diaries/${diaryId}`);
  await labelled(page, ADD_A_DAY_CTA).click();

  await labelled(page, SAVE_CTA).click();

  await expect
    .poll(async () => {
      const read = (await api(`/v1/diaries/${diaryId}`, 'GET', token)).body;
      return read.days.length;
    }, { timeout: 10_000 })
    .toBeGreaterThan(1);

  const read = (await api(`/v1/diaries/${diaryId}`, 'GET', token)).body;
  const ordinals = read.days.map((day: any) => day.ordinal);
  expect(
    ordinals,
    'the ordinal comes from the date, so the fifth day of a Mar 5-9 diary reads Day 5',
  ).toEqual([...ordinals].sort((a: number, b: number) => a - b));
});


test('the owner posts a postcard onto a day and it reads back there', async ({ page }) => {
  await page.goto(`/diaries/${diaryId}`);
  await labelled(page, `${ADD_POSTCARD_CTA} to ${dayOrdinalLabel(1)}`).click();

  const chooser = page.waitForEvent('filechooser');
  await labelled(page, DAY_ADD_PHOTO).click();
  await (await chooser).setFiles([FIXTURE_PHOTO]);

  const caption = `On the first day ${Date.now().toString(36)}`;
  await labelled(page, DAY_CAPTION_LABEL).fill(caption);
  await labelled(page, POSTCARD_POST_CTA).click();

  await expect
    .poll(async () => {
      const read = (await api(`/v1/diaries/${diaryId}`, 'GET', token)).body;
      return read.days.find((day: any) => day.id === firstDayId)?.postcardCount ?? 0;
    }, { timeout: 15_000 })
    .toBe(1);
});


test('the owner edits the title and the diary reads it back', async ({ page }) => {
  await page.goto(`/diaries/${diaryId}`);
  await labelled(page, `${TITLE} menu`).click();
  await labelled(page, EDIT_DIARY_ACTION).click();

  const retitled = `${TITLE} edited`;
  await labelled(page, DIARY_TITLE_LABEL).fill(retitled);
  await labelled(page, SAVE_CTA).click();

  await expect
    .poll(async () => (await api(`/v1/diaries/${diaryId}`, 'GET', token)).body.title, {
      timeout: 10_000,
    })
    .toBe(retitled);
});


test('a loose postcard is filed onto a day through the two-step picker', async ({ page }) => {
  const loose = await postLoosePostcard(token);

  await page.goto(`/postcards/${loose}`);
  await labelled(page, 'Postcard menu').click();
  await labelled(page, ADD_TO_DIARY_ACTION).click();

  await labelled(page, `${TITLE} edited`).click();
  await labelled(page, dayOrdinalLabel(1)).click();

  await expect
    .poll(async () => (await api(`/v1/postcards/${loose}`, 'GET', token)).body.diaryDayId, {
      timeout: 15_000,
    })
    .toBe(firstDayId);
});


test('a visitor sees the page and none of the owner controls', async ({ page, signIn }) => {
  await signIn(VISITOR!);
  await page.goto(`/diaries/${diaryId}`);

  await expect(page.getByText(`${TITLE} edited`).locator('visible=true').last()).toBeVisible();

  await expect(labelled(page, `${TITLE} edited menu`)).toHaveCount(0);
  await expect(labelled(page, ADD_A_DAY_CTA)).toHaveCount(0);
  await expect(labelled(page, `${ADD_POSTCARD_CTA} to ${dayOrdinalLabel(1)}`)).toHaveCount(0);
});


test('deleting the diary names the server count and takes everything with it', async ({ page }) => {
  const before = (await api(`/v1/diaries/${diaryId}`, 'GET', token)).body;

  await page.goto(`/diaries/${diaryId}`);
  await labelled(page, `${before.title} menu`).click();
  await labelled(page, DELETE_DIARY_ACTION).click();

  await expect(
    page.getByText(deleteDiaryTitle(before.postcardCount)).locator('visible=true').last(),
    'the confirm reads the count the server already put on screen',
  ).toBeVisible();

  await labelled(page, DELETE_ACTION).click();

  await expect
    .poll(async () => (await api(`/v1/diaries/${diaryId}`, 'GET', token)).status, {
      timeout: 15_000,
    })
    .toBe(404);
});


test('a visitor is refused a private author\'s diary by the profile fence', async () => {
  const mine = await api('/v1/diaries', 'POST', token, {
    title: `Fenced ${Date.now().toString(36)}`,
    destination: null,
    startDate: aPastDay(5),
    endDate: aPastDay(6),
  });

  await api('/v1/me', 'PATCH', token, { profileVisibility: 'private' });
  try {
    const refused = await api(`/v1/diaries/${mine.body.id}`, 'GET', visitorToken);
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('PROFILE_PRIVATE');
  } finally {
    await api('/v1/me', 'PATCH', token, { profileVisibility: 'public' });
    await api(`/v1/diaries/${mine.body.id}`, 'DELETE', token);
  }
});


async function postLoosePostcard(authorToken: string): Promise<string> {
  const created = await postPostcard('/v1/postcards', authorToken, {
    caption: `Loose ${Date.now().toString(36)}`,
    place: null,
  });
  return created.body.id;
}


function aPastDay(day: number): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, day))
    .toISOString()
    .slice(0, 10);
}
