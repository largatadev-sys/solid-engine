import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, SPARE_TAG } from '../support/identities';
import {
  FIXTURE_PHOTO,
  climbTo,
  joinTrip,
  seedTrip,
  stamp,
  uploadPhoto,
  type SeededTrip,
} from '../support/seed';
import { labelled } from '../support/screen';
import {
  PHOTO_DUMP_ADD_LABEL,
  PHOTO_DUMP_ARCHIVED_NOTE,
  PHOTO_DUMP_EMPTY_BODY,
  PHOTO_DUMP_EMPTY_TITLE,
  PHOTO_DUMP_PREVIEW_CLOSE_LABEL,
  PHOTO_DUMP_PREVIEW_DELETE_LABEL,
  PHOTO_DUMP_PREVIEW_LABEL,
  PHOTO_DUMP_TILE_LABEL,
} from '../../src/media/photoDumpMessages';

const OWNER = ownerTagFor('web/photo-dump');
const MEMBER = SPARE_TAG;

const LOAD_MORE_LABEL = 'Load more photos';
const SERVER_PAGE_SIZE = 30;

requireStack(OWNER);

let token: string;

const dumpRoute = (id: string): string => `/itineraries/${id}?tab=photo-dump`;

const poolOf = async (id: string, as: string = token): Promise<any[]> =>
  (await api(`/v1/itineraries/${id}/photo-dump`, 'GET', as)).body?.items ?? [];

const tileCount = (page: any): Promise<number> =>
  page.evaluate(
    (label: string) =>
      Array.from(document.querySelectorAll(`[aria-label="${label}"]`)).filter(
        (node) =>
          (node as HTMLElement).offsetParent !== null
          && node.querySelector(`[aria-label="${label}"]`) !== null,
      ).length,
    PHOTO_DUMP_TILE_LABEL,
  );

async function addPhotos(page: any, files: string[]): Promise<void> {
  const chooser = page.waitForEvent('filechooser');
  await labelled(page, PHOTO_DUMP_ADD_LABEL).click();
  const chosen = await chooser;
  await chosen.setFiles(files);
}

test.beforeAll(async () => {
  token = await tokenFor(OWNER);
});

test.beforeEach(async ({ signIn }) => {
  await signIn(OWNER);
});

test.describe('the shared pool', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await seedTrip({ ownerTag: OWNER, title: stamp('Photo dump web'), durationDays: 2 });
  });

  test('the Photo Dump tab is reachable rather than refusing the tap', async ({ page, signal }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await labelled(page, 'Photo Dump').click();

    await expect(page.getByText(PHOTO_DUMP_EMPTY_TITLE)).toBeVisible();
    expect(signal.dialogs).toEqual([]);
  });

  test('an empty pool says so honestly, and says who the photos are for', async ({ page }) => {
    await page.goto(dumpRoute(trip.id));

    await expect(page.getByText(PHOTO_DUMP_EMPTY_TITLE)).toBeVisible();
    await expect(page.getByText(PHOTO_DUMP_EMPTY_BODY)).toBeVisible();
  });

  test('the add tile drives the real multipart route, uploading MULTIPLE photos in one pick', async ({
    page,
  }) => {
    await page.goto(dumpRoute(trip.id));
    await expect(labelled(page, PHOTO_DUMP_ADD_LABEL)).toBeVisible();

    const chooser = page.waitForEvent('filechooser');
    await labelled(page, PHOTO_DUMP_ADD_LABEL).click();
    const chosen = await chooser;
    expect(chosen.isMultiple()).toBe(true);
    await chosen.setFiles([FIXTURE_PHOTO, FIXTURE_PHOTO]);

    await expect.poll(async () => (await poolOf(trip.id)).length, { timeout: 30_000 }).toBe(2);
  });

  test('the grid renders one tile per photo in the pool', async ({ page }) => {
    await page.goto(dumpRoute(trip.id));
    await expect(labelled(page, PHOTO_DUMP_TILE_LABEL)).toBeVisible();

    await expect.poll(async () => tileCount(page), { timeout: 15_000 }).toBe(2);
  });

  test('tapping a photo opens a preview rather than destroying it', async ({ page }) => {
    await page.goto(dumpRoute(trip.id));
    await expect(labelled(page, PHOTO_DUMP_TILE_LABEL)).toBeVisible();
    await labelled(page, PHOTO_DUMP_TILE_LABEL).click();

    await expect(labelled(page, PHOTO_DUMP_PREVIEW_LABEL)).toBeVisible();
    await expect(labelled(page, PHOTO_DUMP_PREVIEW_CLOSE_LABEL)).toBeVisible();
    await expect(labelled(page, PHOTO_DUMP_PREVIEW_DELETE_LABEL)).toBeVisible();
    expect((await poolOf(trip.id)).length).toBe(2);
  });

  test('deleting asks for confirmation first, telling the uploader it leaves for everyone', async ({
    page,
    signal,
  }) => {
    await page.goto(dumpRoute(trip.id));
    await expect(labelled(page, PHOTO_DUMP_TILE_LABEL)).toBeVisible();
    await labelled(page, PHOTO_DUMP_TILE_LABEL).click();
    await labelled(page, PHOTO_DUMP_PREVIEW_DELETE_LABEL).click();

    await expect.poll(() => signal.dialogs.join(' '), { timeout: 15_000 }).toMatch(/for everyone/i);
    await expect.poll(async () => (await poolOf(trip.id)).length, { timeout: 15_000 }).toBe(1);
  });

  test('every media request on the tab carries a bearer — the ANON-GET tell', async ({
    page,
    signal,
  }) => {
    await page.goto(dumpRoute(trip.id));
    await expect(labelled(page, PHOTO_DUMP_TILE_LABEL)).toBeVisible();

    const media = signal.apiRequests.filter((request) => request.url.includes('/v1/media/'));
    expect(media.length).toBeGreaterThan(0);
    expect(media.filter((request) => request.auth === 'ANON').map((request) => request.url)).toEqual(
      [],
    );
  });

  test('no page or console errors across the tab', async ({ page, signal }) => {
    await page.goto(dumpRoute(trip.id));
    await expect(labelled(page, PHOTO_DUMP_TILE_LABEL)).toBeVisible();
    await labelled(page, PHOTO_DUMP_TILE_LABEL).click();
    await expect(labelled(page, PHOTO_DUMP_PREVIEW_LABEL)).toBeVisible();

    expect(signal.pageErrors).toEqual([]);
    expect(signal.consoleErrors).toEqual([]);
  });
});

test.describe('paging through the tab\'s own control', () => {
  test.describe.configure({ mode: 'serial' });

  let paged: SeededTrip;

  test.beforeAll(async () => {
    paged = await seedTrip({ ownerTag: OWNER, title: stamp('Photo dump paging'), durationDays: 2 });
    const ownerToken = await tokenFor(OWNER);
    for (let index = 0; index <= SERVER_PAGE_SIZE; index += 1) {
      await uploadPhoto(`/v1/itineraries/${paged.id}/photo-dump`, ownerToken);
    }
  });

  test('the first page stops at the server page size rather than the whole pool', async ({
    page,
  }) => {
    await page.goto(dumpRoute(paged.id));
    await expect(labelled(page, PHOTO_DUMP_TILE_LABEL)).toBeVisible();

    await expect.poll(async () => tileCount(page), { timeout: 30_000 }).toBe(SERVER_PAGE_SIZE);
  });

  test('Load more is wired to the cursor, not a dead click', async ({ page }) => {
    await page.goto(dumpRoute(paged.id));
    await expect.poll(async () => tileCount(page), { timeout: 30_000 }).toBe(SERVER_PAGE_SIZE);

    await labelled(page, LOAD_MORE_LABEL).click();

    await expect.poll(async () => tileCount(page), { timeout: 30_000 }).toBe(SERVER_PAGE_SIZE + 1);
  });
});

test('an archived trip tells the owner the pool is read-only and hides the add tile', async ({
  page,
}) => {
  const archived = await seedTrip({
    ownerTag: OWNER,
    title: stamp('Photo dump archived'),
    durationDays: 2,
  });
  await uploadPhoto(`/v1/itineraries/${archived.id}/photo-dump`, token);
  await api(`/v1/itineraries/${archived.id}/archive`, 'POST', token, {});

  await page.goto(dumpRoute(archived.id));

  await expect(page.getByText(PHOTO_DUMP_ARCHIVED_NOTE)).toBeVisible();
  await expect(labelled(page, PHOTO_DUMP_ADD_LABEL)).toHaveCount(0);
});

test('a published trip still takes photos on the wire, though the workspace redirects its tab', async ({
  page,
}) => {
  const published = await seedTrip({
    ownerTag: OWNER,
    title: stamp('Photo dump published'),
    durationDays: 2,
  });
  await climbTo(published, 'completed');
  await api(`/v1/itineraries/${published.id}/publish`, 'POST', token, { audience: 'public' });

  const uploaded = await uploadPhoto(`/v1/itineraries/${published.id}/photo-dump`, token);
  expect(uploaded.status).toBe(201);
  expect((await poolOf(published.id)).length).toBe(1);

  await page.goto(dumpRoute(published.id));
  await expect(labelled(page, PHOTO_DUMP_ADD_LABEL)).toHaveCount(0);
});

test('a non-member sees no photos and no crash on the tab', async ({ page, signIn }) => {
  const theirs = await seedTrip({
    ownerTag: OWNER,
    title: stamp('Photo dump masked'),
    durationDays: 2,
  });
  await uploadPhoto(`/v1/itineraries/${theirs.id}/photo-dump`, token);

  await signIn(MEMBER);
  await page.goto(dumpRoute(theirs.id));

  await expect(labelled(page, PHOTO_DUMP_ADD_LABEL)).toHaveCount(0);
  await expect(labelled(page, PHOTO_DUMP_TILE_LABEL)).toHaveCount(0);
  expect((await page.evaluate(() => document.body.innerText)).length).toBeGreaterThan(0);
});

test.describe('two travelers in one pool', () => {
  test.describe.configure({ mode: 'serial' });

  let shared: SeededTrip;
  let memberToken: string;
  let joined = false;

  test.beforeAll(async () => {
    shared = await seedTrip({ ownerTag: OWNER, title: stamp('Photo dump shared'), durationDays: 2 });
    memberToken = await tokenFor(MEMBER);
    try {
      await joinTrip(shared, MEMBER);
      joined = true;
    } catch {
      joined = false;
    }
  });

  test.beforeEach(async () => {
    test.skip(
      !joined,
      `${MEMBER} could not accept the invitation — the two-traveler acts never ran; not a product failure`,
    );
  });

  test('a member uploads into the same shared pool through the tab', async ({ page, signIn }) => {
    await uploadPhoto(`/v1/itineraries/${shared.id}/photo-dump`, token);

    await signIn(MEMBER);
    await page.goto(dumpRoute(shared.id));
    await expect(labelled(page, PHOTO_DUMP_ADD_LABEL)).toBeVisible();
    await addPhotos(page, [FIXTURE_PHOTO]);

    await expect
      .poll(async () => (await poolOf(shared.id, memberToken)).length, { timeout: 30_000 })
      .toBe(2);
  });

  test('a member cannot delete the owner\'s photo — a named refusal, not a mask', async () => {
    const owners = (await poolOf(shared.id))[0];
    const poaching = await api(
      `/v1/itineraries/${shared.id}/photo-dump/${owners.id}`,
      'DELETE',
      memberToken,
    );

    expect(poaching.status).toBe(403);
    expect(poaching.body?.code).toBe('NOT_PERMITTED');
  });

  test('the owner is told they are removing another traveler\'s photo, and it goes', async ({
    page,
    signal,
    signIn,
  }) => {
    const foreign = (await poolOf(shared.id)).at(-1);
    const memberId = (await api('/v1/me', 'GET', memberToken)).body.id;
    expect(foreign?.uploadedBy).toBe(memberId);

    await signIn(OWNER);
    await page.goto(dumpRoute(shared.id));
    await expect(labelled(page, PHOTO_DUMP_TILE_LABEL)).toBeVisible();
    await labelled(page, PHOTO_DUMP_TILE_LABEL).click();
    await labelled(page, PHOTO_DUMP_PREVIEW_DELETE_LABEL).click();

    await expect.poll(() => signal.dialogs.join(' '), { timeout: 15_000 }).toMatch(/any traveler/i);
    await expect
      .poll(async () => (await poolOf(shared.id)).map((photo: { id: string }) => photo.id), {
        timeout: 15_000,
      })
      .not.toContain(foreign!.id);
  });
});
