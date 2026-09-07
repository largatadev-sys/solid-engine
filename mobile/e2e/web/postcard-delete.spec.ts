import { test, expect } from '../support/fixtures';
import { API, api, request, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import {
  SeedFailure,
  climbTo,
  postPostcard,
  seedPlan,
  seedTrip,
  stamp,
  uploadPhoto,
  type SeededTrip,
} from '../support/seed';
import { labelled } from '../support/screen';
import { DIARY_TAB_LABEL } from '../../src/profile/profileCopy';
import { PROFILE_TAB_ROUTE } from '../../src/navigation/authRoutes';
import {
  ADD_TO_DIARY_ACTION,
  CANCEL_ACTION,
  DELETE_ACTION,
  DELETE_DIARY_ACTION,
  EDIT_POSTCARD_ACTION,
  POSTCARD_DELETED_TOAST,
  deletePostcardTitle,
} from '../../src/diary/memoryCopy';

const AUTHOR = ownerTagFor('web/postcard-delete');

requireStack(AUTHOR);

test.describe.configure({ mode: 'serial' });

let token: string;
let handle: string;
let trip: SeededTrip;
let tripTitle: string;

const FIRST = 'Sunrise over the caldera';
const SECOND = 'Night market noodles';
const LOOSE = 'Posted from nowhere at all';

const LOOSE_MENU = 'Postcard menu';

async function postEntry(activityId: string, caption: string): Promise<void> {
  const uploaded = await uploadPhoto(`/v1/trips/${trip.id}/photo-dump`, token);
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

async function looseCount(): Promise<number> {
  const sections = await api(`/v1/travelers/${handle}/diaries`, 'GET', token);
  return (sections.body?.loosePostcards ?? []).length;
}

async function openDiaryTab(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(PROFILE_TAB_ROUTE);
  await labelled(page, DIARY_TAB_LABEL).click();
  await expect(page.getByRole('button', { name: tripTitle }).last()).toBeVisible({
    timeout: 20_000,
  });
}

function deleteCalls(signal: { apiRequests: Array<{ url: string }> }): number {
  return signal.apiRequests.filter((sent) => /\/v1\/postcards\/[0-9a-f-]{36}$/.test(sent.url))
    .length;
}

test.beforeAll(async () => {
  token = await tokenFor(AUTHOR);
  handle = (await api('/v1/me', 'GET', token)).body.handle;
  tripTitle = stamp('Postcard delete');
  trip = await seedTrip({ ownerTag: AUTHOR, title: tripTitle, durationDays: 2 });
  const activities = await seedPlan(trip, [
    { title: FIRST, timeOfDay: '06:10' },
    { title: SECOND, timeOfDay: '20:40' },
  ]);
  await climbTo(trip, 'ongoing');
  await postEntry(activities[0]!, FIRST);
  await postEntry(activities[1]!, SECOND);

  const loose = await postPostcard('/v1/postcards', token, { caption: LOOSE });
  if (loose.status !== 201) throw new SeedFailure(`the loose postcard "${LOOSE}"`, loose.body);
});

test.beforeEach(async ({ signIn, page }) => {
  await signIn(AUTHOR);
  await openDiaryTab(page);
});

test('a loose postcard carries the kebab, and its menu offers Edit, Add to diary and Delete', async ({
  page,
}) => {
  await labelled(page, LOOSE_MENU).click();

  await expect(labelled(page, EDIT_POSTCARD_ACTION)).toBeVisible();
  await expect(labelled(page, ADD_TO_DIARY_ACTION)).toBeVisible();
  await expect(labelled(page, DELETE_ACTION)).toBeVisible();
});

test('a diary section carries its own kebab, whose delete is the diary and never a postcard', async ({
  page,
}) => {
  await labelled(page, `${tripTitle} menu`).click();

  await expect(labelled(page, DELETE_DIARY_ACTION)).toBeVisible();
  await expect(
    labelled(page, ADD_TO_DIARY_ACTION),
    'a diary is not something that gets filed into a diary',
  ).toHaveCount(0);
});

test('deleting a postcard asks first, and Cancel sends nothing at all', async ({ page, signal }) => {
  const before = await looseCount();

  await labelled(page, LOOSE_MENU).click();
  await labelled(page, DELETE_ACTION).click();
  await expect(page.getByText(deletePostcardTitle()).last()).toBeVisible();
  await labelled(page, CANCEL_ACTION).click();

  expect(deleteCalls(signal), 'Cancel reaches no wire').toBe(0);
  expect(await looseCount()).toBe(before);
  await expect(labelled(page, LOOSE_MENU)).toBeVisible();
});

test('confirming takes the postcard off the tab and off the server, for good', async ({
  page,
  signal,
}) => {
  const before = await looseCount();

  await labelled(page, LOOSE_MENU).click();
  await labelled(page, DELETE_ACTION).click();
  await expect(page.getByText(deletePostcardTitle()).last()).toBeVisible();
  await labelled(page, DELETE_ACTION).click();

  await expect(page.getByText(POSTCARD_DELETED_TOAST).locator('visible=true').last()).toBeVisible();
  await expect.poll(looseCount, { timeout: 20_000 }).toBe(before - 1);
  expect(deleteCalls(signal), 'exactly one delete leaves the client').toBe(1);

  await openDiaryTab(page);
  await expect(page.getByText(LOOSE)).toHaveCount(0);
});
