import { test, expect, lastOpenedUrl } from '../support/fixtures';
import { mapsUrl } from '../../src/places/mapsQuery';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, type PoolTag } from '../support/identities';
import {
  FIXTURE_PHOTO,
  climbTo,
  joinTrip,
  seedPlan,
  seedTrip,
  stamp,
  uploadPhoto,
  type SeededTrip,
} from '../support/seed';
import { labelled } from '../support/screen';
import {
  CAPTION_LABEL,
  COMPOSE_CTA,
  DIARY_PRIVACY_NOTE,
  DUMP_PICKER_TITLE,
  ENTRY_TITLE,
  PHOTOS_LABEL,
  ADD_FROM_CAMERA_ROLL,
  PICK_FROM_DUMP,
  POSTED_TITLE,
  SAVED_TITLE,
  SAVE_TO_DIARY_LABEL,
  DELETE_ENTRY_LABEL,
} from '../../src/diary/diaryCopy';

const AUTHOR = ownerTagFor('web/diary');
const CO_TRAVELER: PoolTag = 't2';

const ACTIVITY = 'Sunset at Las Cabanas';
const PLACE = 'Las Cabanas Beach';
const CAMERA_ROLL_TILE = 'Add a photo from your camera roll';
const DUMP_TILE = 'Add a photo from the Photo Dump';
const BACK_TO_PLAN = 'Back to Day-by-Day';
const captureLink = `Add to Diary: ${ACTIVITY}`;
const capturedLink = `Added ✓: ${ACTIVITY}`;

requireStack(AUTHOR);

test.describe.configure({ mode: 'serial' });

let token: string;
let trip: SeededTrip;
let activityId: string;
let dayId: string;

const entries = async (): Promise<any[]> =>
  (await api(`/v1/itineraries/${trip.id}/diary/entries`, 'GET', token)).body?.items ?? [];

const composerRoute = (): string =>
  `/itineraries/${trip.id}/diary/compose?activityId=${activityId}&dayId=${dayId}`;

const visibleActivityTitle = (page: any) =>
  page.getByText(ACTIVITY).locator('visible=true').last();

const photoTileCount = (page: any): Promise<number> =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('[aria-label]')).filter((node) => {
      const label = node.getAttribute('aria-label') ?? '';
      if (!/^(Selected photo|Selected Photo Dump photo|Diary photo)/.test(label)) return false;
      return (
        (node as HTMLElement).offsetParent !== null
        && node.querySelector(`[aria-label="${label}"]`) !== null
      );
    }).length,
  );

async function pickFromCameraRoll(page: any, files: string[]): Promise<void> {
  const before = await photoTileCount(page);
  const chooser = page.waitForEvent('filechooser');
  await labelled(page, CAMERA_ROLL_TILE).click();
  const chosen = await chooser;
  await chosen.setFiles(files);
  await expect
    .poll(async () => photoTileCount(page), { timeout: 20_000 })
    .toBeGreaterThan(before);
}

test.beforeAll(async () => {
  token = await tokenFor(AUTHOR);
  trip = await seedTrip({ ownerTag: AUTHOR, title: stamp('Diary web'), durationDays: 2 });
  activityId = (await seedPlan(trip, [{ title: ACTIVITY, timeOfDay: '17:30', place: PLACE }]))[0]!;
  dayId = trip.days[0]!.id;
});

test.beforeEach(async ({ signIn }) => {
  await signIn(AUTHOR);
});

test('a draft trip draws no capture link at all — the diary of a trip that has not happened is fiction', async ({
  page,
}) => {
  await page.goto(`/itineraries/${trip.id}`);
  await expect(page.getByText(ACTIVITY).first()).toBeVisible();
  await expect(page.getByText('Add to Diary')).toHaveCount(0);
});

test('an ongoing trip draws the capture link on the activity row', async ({ page }) => {
  await climbTo(trip, 'ongoing');
  await uploadPhoto(`/v1/itineraries/${trip.id}/photo-dump`, token);

  await page.goto(`/itineraries/${trip.id}`);
  await expect(labelled(page, captureLink)).toBeVisible();
});

test('the link opens the composer, which draws the mock — eyebrow, both photo sources, the caption', async ({
  page,
}) => {
  await page.goto(`/itineraries/${trip.id}`);
  await labelled(page, captureLink).click();

  await expect(page).toHaveURL(/\/diary\/compose/);
  await expect(page.getByText('DAY 1 • 5:30 PM')).toBeVisible();
  await expect(visibleActivityTitle(page)).toBeVisible();
  await expect(page.getByText(PHOTOS_LABEL)).toBeVisible();
  await expect(page.getByText(ADD_FROM_CAMERA_ROLL)).toBeVisible();
  await expect(page.getByText(PICK_FROM_DUMP)).toBeVisible();
  await expect(labelled(page, CAPTION_LABEL)).toBeVisible();
});

test('the composer states the audience before the first postcard, and offers no toggle pretending it is a choice', async ({
  page,
}) => {
  await page.goto(composerRoute());

  await expect(page.getByText(DIARY_PRIVACY_NOTE)).toBeVisible();
  await expect(page.getByText('Only you can see your diary')).toHaveCount(0);
  await expect(page.getByText('Share to feed')).toHaveCount(0);
});

test('the camera roll takes MULTIPLE photos in one trip to the device', async ({ page }) => {
  await page.goto(composerRoute());

  const chooser = page.waitForEvent('filechooser');
  await labelled(page, CAMERA_ROLL_TILE).click();
  const chosen = await chooser;
  expect(chosen.isMultiple()).toBe(true);
  await chosen.setFiles([FIXTURE_PHOTO, FIXTURE_PHOTO]);

  await expect(labelled(page, 'Selected photo 1')).toBeVisible();
  await expect(labelled(page, 'Selected photo 2')).toBeVisible();
});

test('the Photo Dump tile opens its own picker, whose confirm counts the selection', async ({
  page,
}) => {
  await page.goto(composerRoute());
  await labelled(page, DUMP_TILE).click();

  await expect(page.getByText(DUMP_PICKER_TITLE)).toBeVisible();
  await expect(page.getByText('Select photos')).toBeVisible();

  await labelled(page, 'Photo Dump photo').click();
  await expect(labelled(page, 'Add 1 photo')).toBeVisible();
});

test('the one-act create posts both sources and the caption together', async ({ page }) => {
  await page.goto(composerRoute());
  await pickFromCameraRoll(page, [FIXTURE_PHOTO, FIXTURE_PHOTO]);

  await labelled(page, DUMP_TILE).click();
  await labelled(page, 'Photo Dump photo').click();
  await labelled(page, 'Add 1 photo').click();
  await expect(labelled(page, 'Selected Photo Dump photo')).toBeVisible();

  await labelled(page, CAPTION_LABEL).fill('Golden hour, no filter');
  await labelled(page, COMPOSE_CTA).click();

  await expect(page.getByText(POSTED_TITLE)).toBeVisible();
  await expect
    .poll(async () => (await entries())[0]?.photos?.length, { timeout: 15_000 })
    .toBe(3);
  expect((await entries())[0]?.caption).toBe('Golden hour, no filter');
});

test('the success screen is the mock frame, naming the activity', async ({ page }) => {
  await expect(page.getByText(POSTED_TITLE)).toHaveCount(0);

  await page.goto(`/itineraries/${trip.id}`);
  await expect(labelled(page, capturedLink)).toBeVisible();
});

test('the row now reads Added ✓, and the capture link is gone', async ({ page }) => {
  await page.goto(`/itineraries/${trip.id}`);

  await expect(labelled(page, capturedLink)).toBeVisible();
  await expect(page.getByText('Add to Diary')).toHaveCount(0);
});

test('Added ✓ opens the existing entry with its caption and snapshot intact', async ({ page }) => {
  await page.goto(`/itineraries/${trip.id}`);
  await labelled(page, capturedLink).click();

  await expect(page.getByText(ENTRY_TITLE)).toBeVisible();
  await expect(page.getByText('DAY 1 • 5:30 PM')).toBeVisible();
  await expect(visibleActivityTitle(page)).toBeVisible();
  await expect(labelled(page, CAPTION_LABEL)).toHaveValue('Golden hour, no filter');
});

test('a staged photo and caption reach the server only on Save, never on pick', async ({ page }) => {
  await page.goto(`/itineraries/${trip.id}`);
  await labelled(page, capturedLink).click();
  await expect(page.getByText(ENTRY_TITLE)).toBeVisible();

  const before = (await entries())[0]?.photos?.length;
  await pickFromCameraRoll(page, [FIXTURE_PHOTO]);
  await labelled(page, CAPTION_LABEL).fill('First edit');

  const staged = (await entries())[0];
  expect(staged?.photos?.length).toBe(before);
  expect(staged?.caption).not.toBe('First edit');

  await labelled(page, SAVE_TO_DIARY_LABEL).click();
  await expect(page.getByText(SAVED_TITLE)).toBeVisible();

  await expect
    .poll(async () => (await entries())[0]?.caption, { timeout: 15_000 })
    .toBe('First edit');
  expect((await entries())[0]?.photos?.length).toBe(before + 1);
});

test('saving confirms on the success screen, worded as an edit rather than a first post', async ({
  page,
}) => {
  await page.goto(`/itineraries/${trip.id}`);
  await labelled(page, capturedLink).click();
  await labelled(page, CAPTION_LABEL).fill('Reworded');
  await labelled(page, SAVE_TO_DIARY_LABEL).click();

  await expect(page.getByText(SAVED_TITLE)).toBeVisible();
  await expect(page.getByText(`Your entry for ${ACTIVITY} is up to date.`)).toBeVisible();
  await expect(page.getByText(POSTED_TITLE)).toHaveCount(0);
});

test('an entry can be edited AGAIN after a save — not just the first time', async ({ page }) => {
  await page.goto(`/itineraries/${trip.id}`);
  await labelled(page, capturedLink).click();
  await labelled(page, CAPTION_LABEL).fill('Second edit');
  await labelled(page, SAVE_TO_DIARY_LABEL).click();
  await expect(page.getByText(SAVED_TITLE)).toBeVisible();

  await expect
    .poll(async () => (await entries())[0]?.caption, { timeout: 15_000 })
    .toBe('Second edit');
});

test('swapping a photo on a FULL entry is not a sixth photo', async ({ page, signal }) => {
  await page.goto(`/itineraries/${trip.id}`);
  await labelled(page, capturedLink).click();
  await expect(page.getByText(ENTRY_TITLE)).toBeVisible();

  await pickFromCameraRoll(page, [FIXTURE_PHOTO]);
  await labelled(page, SAVE_TO_DIARY_LABEL).click();
  await expect(page.getByText(SAVED_TITLE)).toBeVisible();
  await expect.poll(async () => (await entries())[0]?.photos?.length, { timeout: 15_000 }).toBe(5);

  const full = (await entries())[0];
  await page.goto(`/itineraries/${trip.id}`);
  await labelled(page, capturedLink).click();
  await expect(page.getByText(ENTRY_TITLE)).toBeVisible();
  await expect.poll(async () => photoTileCount(page), { timeout: 20_000 }).toBe(5);

  await labelled(page, 'Remove Diary photo 1').click({ force: true });
  await pickFromCameraRoll(page, [FIXTURE_PHOTO]);
  await labelled(page, SAVE_TO_DIARY_LABEL).click();
  await expect(page.getByText(SAVED_TITLE)).toBeVisible();

  await expect.poll(async () => (await entries())[0]?.photos?.length, { timeout: 15_000 }).toBe(5);
  const swapped = (await entries())[0];
  expect(swapped.photos.some((photo: { id: string }) => photo.id === full.photos[0].id)).toBe(false);
  expect(signal.dialogs.join(' ')).not.toMatch(/TOO_MANY/);
});

test('KNOWN DEFECT: the remove control is a live button inside a tile marked aria-disabled', async ({
  page,
}) => {
  await page.goto(`/itineraries/${trip.id}`);
  await labelled(page, capturedLink).click();
  await expect(page.getByText(ENTRY_TITLE)).toBeVisible();
  await expect.poll(async () => photoTileCount(page), { timeout: 20_000 }).toBeGreaterThan(0);

  const state = await page.evaluate(() => {
    const remove = Array.from(document.querySelectorAll('[aria-label^="Remove Diary photo"]'))[0];
    return {
      removeDisabled: (remove as HTMLButtonElement)?.disabled ?? null,
      insideDisabledTile: remove?.closest('[aria-disabled="true"]') !== null,
    };
  });

  expect(state.removeDisabled).toBe(false);
  expect(state.insideDisabledTile).toBe(true);
});

test('deleting asks first in words, and reverts the row to Add to Diary', async ({
  page,
  signal,
}) => {
  await page.goto(`/itineraries/${trip.id}`);
  await labelled(page, capturedLink).click();
  await expect(page.getByText(ENTRY_TITLE)).toBeVisible();
  await labelled(page, DELETE_ENTRY_LABEL).click();

  await expect.poll(() => signal.dialogs.join(' '), { timeout: 15_000 }).toMatch(/diary entry/i);
  await expect.poll(async () => (await entries()).length, { timeout: 15_000 }).toBe(0);

  await page.goto(`/itineraries/${trip.id}`);
  await expect(labelled(page, captureLink)).toBeVisible();
  await expect(page.getByText('Added ✓')).toHaveCount(0);
});

test('the composer reopens after a delete, and the repost lands', async ({ page }) => {
  await page.goto(`/itineraries/${trip.id}`);
  await labelled(page, captureLink).click();
  await expect(page).toHaveURL(/\/diary\/compose/);

  await pickFromCameraRoll(page, [FIXTURE_PHOTO]);
  await labelled(page, CAPTION_LABEL).fill('Second time around');
  await labelled(page, COMPOSE_CTA).click();

  await expect(page.getByText(POSTED_TITLE)).toBeVisible();
  await expect.poll(async () => (await entries()).length, { timeout: 15_000 }).toBe(1);
});

test('Back to Day-by-Day returns to the plan through the affordance', async ({ page }) => {
  await page.goto(`/itineraries/${trip.id}`);
  await labelled(page, capturedLink).click();
  await labelled(page, CAPTION_LABEL).fill('Back through the door');
  await labelled(page, SAVE_TO_DIARY_LABEL).click();
  await expect(page.getByText(SAVED_TITLE)).toBeVisible();

  await labelled(page, BACK_TO_PLAN).click();
  await expect(labelled(page, capturedLink)).toBeVisible();
});

test('the diary shows on the profile, grouped by trip and counted', async ({ page }) => {
  await page.goto('/profile');

  await expect(page.getByText(trip.title)).toBeVisible();
  await expect(labelled(page, `Open the diary for ${trip.title}, 1 entry`)).toBeVisible();
});

test('the per-trip stream renders the postcard with its snapshot header', async ({ page }) => {
  await page.goto(`/itineraries/${trip.id}/diary`);

  const postcard = labelled(page, `Open your entry for ${ACTIVITY}`);
  await expect(postcard).toBeVisible();
  await expect(page.getByText('DAY 1 • 5:30 PM')).toBeVisible();
  await expect(visibleActivityTitle(page)).toBeVisible();
});

test('the stream postcard carries a place tag that opens Maps, leaving the card tap alone (PL-1)', async ({
  page,
}) => {
  await page.goto(`/itineraries/${trip.id}/diary`);
  await expect(labelled(page, `Open your entry for ${ACTIVITY}`)).toBeVisible();

  await labelled(page, `${PLACE}, open in Google Maps`).first().click();

  await expect
    .poll(() => lastOpenedUrl(page), { timeout: 15_000 })
    .toBe(mapsUrl(PLACE, 'Palawan'));
  await expect(page).toHaveURL(new RegExp(`/itineraries/${trip.id}/diary$`));
});

test('every media read across the diary carries a bearer, with no page or console errors', async ({
  page,
  signal,
}) => {
  await page.goto(`/itineraries/${trip.id}/diary`);
  await expect(labelled(page, `Open your entry for ${ACTIVITY}`)).toBeVisible();
  await page.goto(`/itineraries/${trip.id}`);
  await expect(labelled(page, capturedLink)).toBeVisible();

  const media = signal.apiRequests.filter((request) => request.url.includes('/v1/media/'));
  expect(media.length).toBeGreaterThan(0);
  expect(media.filter((request) => request.auth === 'ANON').map((request) => request.url)).toEqual(
    [],
  );
  expect(signal.pageErrors).toEqual([]);
  expect(signal.consoleErrors).toEqual([]);
});

test.describe('a co-traveler on the same trip sees none of the author\'s diary', () => {
  test.beforeAll(async () => {
    await joinTrip(trip, CO_TRAVELER);
  });

  test.beforeEach(async ({ signIn }) => {
    await signIn(CO_TRAVELER);
  });

  test('their own profile carries no diary of the author\'s', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText(trip.title)).toHaveCount(0);
  });

  test('on the SAME trip they see their own state — Add to Diary, never Added ✓', async ({
    page,
  }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await expect(labelled(page, captureLink)).toBeVisible();
    await expect(page.getByText('Added ✓')).toHaveCount(0);
  });

  test('the postcard photo serves any signed-in traveler, since the diary posts to the feed', async () => {
    const coToken = await tokenFor(CO_TRAVELER);
    const photo = (await entries())[0]?.photos?.[0];

    const theirs = await api(photo.url, 'GET', coToken);
    const anonymous = await api(photo.url, 'GET');

    expect(theirs.status).toBe(200);
    expect(anonymous.status).toBe(401);
  });
});
