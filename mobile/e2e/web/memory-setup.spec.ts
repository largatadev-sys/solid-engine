import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { FIXTURE_PHOTO } from '../support/seed';
import { labelled } from '../support/screen';
import {
  BACK_LABEL,
  DAY_ADD_PHOTO,
  DAY_CAPTION_LABEL,
  DAY_PLACE_LABEL,
  DIARY_DAYS_HINT,
  DIARY_NEXT_CTA,
  POST_CTA,
  DIARY_POSTED_TOAST,
  DIARY_TITLE_LABEL,
  DIARY_DESTINATION_LABEL,
  NEW_DIARY_TITLE,
  POST_SHEET_DIARY_TITLE,
  POST_SHEET_TITLE,
  dayHeading,
} from '../../src/diary/memoryCopy';

const AUTHOR = ownerTagFor('web/memory-setup');

requireStack(AUTHOR);

test.describe.configure({ mode: 'serial' });

const TITLE = `Lisbon walk ${Date.now().toString(36)}`;
const DESTINATION = 'Portugal';

const START = dayOfAMonthWellBehind(5);
const END = dayOfAMonthWellBehind(9);

let token: string;
let handle: string;

test.beforeAll(async () => {
  token = await tokenFor(AUTHOR);
  handle = (await api('/v1/me', 'GET', token)).body?.handle;
});

test.beforeEach(async ({ signIn }) => {
  await signIn(AUTHOR);
});


test('the profile plus opens the Post sheet, and A Diary reaches New Diary', async ({ page }) => {
  await page.goto('/profile');

  await page.getByRole('button', { name: POST_SHEET_TITLE, exact: true }).last().click();
  await expect(page.getByText(POST_SHEET_DIARY_TITLE).locator('visible=true').last()).toBeVisible();

  await labelled(page, POST_SHEET_DIARY_TITLE).click();
  await expect(page.getByText(NEW_DIARY_TITLE).locator('visible=true').last()).toBeVisible();
});


test('Next is refused until the title and the dates are both set', async ({ page }) => {
  await page.goto('/diaries/new');

  const next = labelled(page, DIARY_NEXT_CTA);
  await expect(next).toBeDisabled();

  await labelled(page, DIARY_TITLE_LABEL).fill(TITLE);
  await expect(next).toBeDisabled();
});


test('a memory is created, two days are filled, one is skipped, and Post lands on the profile', async ({
  page,
}) => {
  await page.goto('/diaries/new');

  await labelled(page, DIARY_TITLE_LABEL).fill(TITLE);
  await labelled(page, DIARY_DESTINATION_LABEL).fill(DESTINATION);
  await pickTheRange(page);

  await labelled(page, DIARY_NEXT_CTA).click();

  await expect(
    page.getByText(DIARY_DAYS_HINT).locator('visible=true').last(),
    'the server supplies the candidate days: five dates in, five cards out',
  ).toBeVisible();
  await expect(page.getByText(dayHeading(1, START)).locator('visible=true').last()).toBeVisible();
  await expect(page.getByText(dayHeading(5, END)).locator('visible=true').last()).toBeVisible();

  await fillDay(page, 1, 'Alfama, Lisbon', 'Climbed up before the tour groups.');
  await fillDay(page, 3, 'Sintra', 'Pena Palace appeared for four minutes.');

  await labelled(page, POST_CTA).click();
  await expect(page.getByText(DIARY_POSTED_TOAST).locator('visible=true').last()).toBeVisible();
  await expect(
    page.getByText(DIARY_POSTED_TOAST).locator('visible=true'),
    'the toast holds two seconds and leaves on its own (M2)',
  ).toHaveCount(0, { timeout: 4_000 });

  const sections = (await api(`/v1/travelers/${handle}/diaries`, 'GET', token)).body;
  const posted = sections.diaries.find((diary: any) => diary.title === TITLE);

  expect(posted, 'the memory reached the server').toBeDefined();
  expect(posted.destination).toBe(DESTINATION);
  expect(
    posted.days.map((day: any) => day.ordinal),
    'the two filled days are stored and the skipped one is not — a day with no photos is never sent',
  ).toEqual([1, 3]);
  expect(posted.postcardCount).toBe(2);
});


test('Back from the days screen discards the diary it created', async ({ page }) => {
  await page.goto('/profile');
  await page.getByRole('button', { name: POST_SHEET_TITLE, exact: true }).last().click();
  await labelled(page, POST_SHEET_DIARY_TITLE).click();
  await expect(labelled(page, DIARY_TITLE_LABEL)).toBeVisible();

  const discarded = `Discarded ${Date.now().toString(36)}`;
  await labelled(page, DIARY_TITLE_LABEL).fill(discarded);
  await pickTheRange(page);
  await labelled(page, DIARY_NEXT_CTA).click();
  await expect(page.getByText(DIARY_DAYS_HINT).locator('visible=true').last()).toBeVisible();

  const created = (await api(`/v1/travelers/${handle}/diaries`, 'GET', token)).body;
  expect(
    created.diaries.some((diary: any) => diary.title === discarded),
    'the diary exists on the server the moment Next is tapped — that is why Back must delete it',
  ).toBe(true);

  await labelled(page, BACK_LABEL).last().click();
  await labelled(page, 'Discard').click();

  await expect
    .poll(async () => {
      const after = (await api(`/v1/travelers/${handle}/diaries`, 'GET', token)).body;
      return after.diaries.some((diary: any) => diary.title === discarded);
    }, { timeout: 10_000 })
    .toBe(false);
});


async function pickTheRange(page: any): Promise<void> {
  await labelled(page, 'Start').click();

  const start = labelled(page, longDate(START));
  for (let step = 0; step < 6 && !(await start.isVisible()); step += 1) {
    await labelled(page, 'Previous month').click();
  }

  await start.click();
  await labelled(page, longDate(END)).click();
  await labelled(page, 'Done').click();
}


async function fillDay(
  page: any,
  ordinal: number,
  place: string,
  caption: string,
): Promise<void> {
  await labelled(page, `${DAY_PLACE_LABEL} ${ordinal}`).fill(place);

  const chooser = page.waitForEvent('filechooser');
  await labelled(page, `${DAY_ADD_PHOTO} ${ordinal}`).click();
  await (await chooser).setFiles([FIXTURE_PHOTO]);

  await labelled(page, `${DAY_CAPTION_LABEL} ${ordinal}`).fill(caption);
}


function dayOfAMonthWellBehind(day: number): string {
  const now = new Date();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, day));
  return month.toISOString().slice(0, 10);
}


function longDate(iso: string): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
}
