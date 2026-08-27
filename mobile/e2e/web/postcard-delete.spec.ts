import { test, expect } from '../support/fixtures';
import { API, api, request, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import {
  SeedFailure,
  climbTo,
  seedPlan,
  seedTrip,
  stamp,
  uploadPhoto,
  type SeededTrip,
} from '../support/seed';
import { labelStarting, labelled } from '../support/screen';
import { DIARY_TAB_LABEL } from '../../src/profile/profileCopy';
import { PROFILE_TAB_ROUTE } from '../../src/navigation/authRoutes';
import {
  DELETE_POSTCARD_LABEL,
  EDIT_POSTCARD_LABEL,
  POSTCARD_DELETED_TOAST,
  POSTCARD_RESTORED_TOAST,
  UNDO_LABEL,
  diaryMenuLabel,
  postcardMenuLabel,
} from '../../src/removal/removalCopy';

const AUTHOR = ownerTagFor('web/postcard-delete');

requireStack(AUTHOR);

test.describe.configure({ mode: 'serial' });

let token: string;
let trip: SeededTrip;
let tripTitle: string;

const FIRST = 'Sunrise over the caldera';
const SECOND = 'Night market noodles';

async function postEntry(activityId: string, caption: string): Promise<void> {
  const uploaded = await uploadPhoto(`/v1/itineraries/${trip.id}/photo-dump`, token);
  if (uploaded.status !== 201) throw new SeedFailure('a photo-dump photo', uploaded.body);

  const boundary = `----largatadelete${process.hrtime.bigint().toString(36)}`;
  const payload = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="entry"\r\n`
      + `Content-Type: application/json\r\n\r\n`
      + `${JSON.stringify({ activityId, caption, fromDump: [uploaded.body.id] })}\r\n`
      + `--${boundary}--\r\n`,
  );
  const posted = await request(
    `${API}/v1/itineraries/${trip.id}/diary/entries`,
    'POST',
    payload,
    {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
  );
  if (posted.status !== 201) throw new SeedFailure(`the postcard "${caption}"`, posted.body);
}

async function entryCount(): Promise<number> {
  const listed = await api(`/v1/itineraries/${trip.id}/diary/entries`, 'GET', token);
  return (listed.body?.items ?? []).length;
}

async function openDiaryTab(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(PROFILE_TAB_ROUTE);
  await page.getByText(DIARY_TAB_LABEL).first().click();
  const section = labelStarting(page, `Open the diary for ${tripTitle}`);
  await expect(section).toHaveCount(1, { timeout: 20_000 });
  await section.scrollIntoViewIfNeeded();
  const expander = labelStarting(page, `Expand entries for ${tripTitle}`);
  if ((await expander.count()) > 0) await expander.click();
}

function deleteCalls(signal: { apiRequests: Array<{ url: string }> }): number {
  return signal.apiRequests.filter((request) => /\/diary\/entries\/[0-9a-f-]{36}$/.test(request.url))
    .length;
}

test.beforeAll(async () => {
  token = await tokenFor(AUTHOR);
  tripTitle = stamp('Postcard delete');
  trip = await seedTrip({ ownerTag: AUTHOR, title: tripTitle, durationDays: 2 });
  const activities = await seedPlan(trip, [
    { title: FIRST, timeOfDay: '06:10' },
    { title: SECOND, timeOfDay: '20:40' },
  ]);
  await climbTo(trip, 'ongoing');
  await postEntry(activities[0]!, FIRST);
  await postEntry(activities[1]!, SECOND);
});

test.beforeEach(async ({ signIn, page }) => {
  await signIn(AUTHOR);
  await openDiaryTab(page);
});

test('the postcard carries a kebab, and it opens the house sheet with Edit and Delete', async ({
  page,
}) => {
  await labelled(page, postcardMenuLabel(FIRST)).click();

  await expect(labelled(page, EDIT_POSTCARD_LABEL)).toBeVisible();
  await expect(labelled(page, DELETE_POSTCARD_LABEL)).toBeVisible();
});

test('the diary card carries its own kebab, and its menu offers no delete at all', async ({
  page,
}) => {
  await labelled(page, diaryMenuLabel(tripTitle)).click();

  await expect(labelled(page, DELETE_POSTCARD_LABEL)).toHaveCount(0);
});

test('deleting collapses the postcard out of the list and offers Undo', async ({ page }) => {
  await labelled(page, postcardMenuLabel(SECOND)).click();
  await labelled(page, DELETE_POSTCARD_LABEL).click();

  await expect(page.getByText(POSTCARD_DELETED_TOAST)).toBeVisible();
  await expect(labelled(page, UNDO_LABEL)).toBeVisible();
  await expect(labelled(page, postcardMenuLabel(SECOND))).toHaveCount(0);
});

test('Undo restores the row in place and NO delete ever reaches the wire', async ({
  page,
  signal,
}) => {
  const before = await entryCount();

  await labelled(page, postcardMenuLabel(SECOND)).click();
  await labelled(page, DELETE_POSTCARD_LABEL).click();
  await expect(page.getByText(POSTCARD_DELETED_TOAST)).toBeVisible();
  await labelled(page, UNDO_LABEL).click();

  await expect(page.getByText(POSTCARD_RESTORED_TOAST)).toBeVisible();
  await expect(labelled(page, postcardMenuLabel(SECOND))).toBeVisible();
  expect(deleteCalls(signal)).toBe(0);
  expect(await entryCount()).toBe(before);
});

test('letting the toast expire sends exactly one delete, and the postcard is gone for good', async ({
  page,
  signal,
}) => {
  const before = await entryCount();

  await labelled(page, postcardMenuLabel(SECOND)).click();
  await labelled(page, DELETE_POSTCARD_LABEL).click();
  await expect(page.getByText(POSTCARD_DELETED_TOAST)).toBeVisible();

  await expect.poll(entryCount, { timeout: 20_000 }).toBe(before - 1);
  expect(deleteCalls(signal)).toBe(1);

  await openDiaryTab(page);
  await expect(labelled(page, postcardMenuLabel(SECOND))).toHaveCount(0);
});

test('deleting the last postcard collapses the diary card behind it, and undo restores both', async ({
  page,
}) => {
  await expect(labelled(page, diaryMenuLabel(tripTitle))).toBeVisible();

  await labelled(page, postcardMenuLabel(FIRST)).click();
  await labelled(page, DELETE_POSTCARD_LABEL).click();

  await expect(page.getByText(POSTCARD_DELETED_TOAST)).toBeVisible();
  await expect(labelled(page, diaryMenuLabel(tripTitle))).toHaveCount(0);

  await labelled(page, UNDO_LABEL).click();

  await expect(labelled(page, diaryMenuLabel(tripTitle))).toBeVisible();
  await expect(labelled(page, postcardMenuLabel(FIRST))).toBeVisible();
});
