import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor, type PoolTag } from '../support/identities';
import { SeedFailure, seedPlan, seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';

const OWNER = ownerTagFor('web/archive');
const MEMBER: PoolTag = IDENTITY_MAP['web/archive'].tags[1]!;

requireStack(OWNER);

const PLANNED_STOP = 'A stop that outlives the trip';

let ownerToken: string;
let memberToken: string;

async function tripFor(what: string): Promise<SeededTrip> {
  const seeded = await seedTrip({
    ownerTag: OWNER,
    title: stamp(`delete ${what}`),
    members: [MEMBER],
    durationDays: 2,
  });
  await seedPlan(seeded, [{ title: PLANNED_STOP }]);
  return seeded;
}

async function deleteTrip(id: string): Promise<void> {
  const gone = await api(`/v1/trips/${id}/archive`, 'POST', ownerToken, {});
  if (gone.status !== 200) throw new SeedFailure('the delete', gone.body);
}

async function undoDelete(id: string): Promise<void> {
  const back = await api(`/v1/trips/${id}/unarchive`, 'POST', ownerToken, {});
  if (back.status !== 200) throw new SeedFailure('the undo', back.body);
}

test.beforeAll(async () => {
  ownerToken = await tokenFor(OWNER);
  memberToken = await tokenFor(MEMBER);
});

test.describe('a deleted trip is deleted for everybody — its owner included (ADR-040)', () => {
  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await tripFor('for everyone');
    await deleteTrip(trip.id);
  });

  test('the owner reads it as not found, where S4.23 used to serve them a read-only page', async () => {
    const read = await api(`/v1/trips/${trip.id}`, 'GET', ownerToken);

    expect(read.status).toBe(404);
    expect(read.body?.code).toBe('ITINERARY_NOT_FOUND');
  });

  test('so does a member, exactly as before — the two answers are now one answer', async () => {
    const read = await api(`/v1/trips/${trip.id}`, 'GET', memberToken);

    expect(read.status).toBe(404);
    expect(read.body?.code).toBe('ITINERARY_NOT_FOUND');
  });

  test('an owner write answers the mask rather than a conflict', async () => {
    const write = await api(`/v1/trips/${trip.id}/days`, 'POST', ownerToken, { title: 'After' });

    expect(write.status).toBe(404);
    expect(write.body?.code).toBe('ITINERARY_NOT_FOUND');
  });

  test('a deep link into it lands the owner on the not-found screen', async ({ signIn, page }) => {
    await signIn(OWNER);
    await page.goto(`/itineraries/${trip.id}`);

    await expect(page.getByText(trip.title)).toHaveCount(0);
    await expect(page.getByText(PLANNED_STOP)).toHaveCount(0);
  });

  test('and Trips offers no archived list to find it in', async ({ signIn, page }) => {
    await signIn(OWNER);
    await page.goto('/trips');

    await expect(page.getByText('Archived trips')).toHaveCount(0);
    await expect(page.getByText(trip.title)).toHaveCount(0);
  });
});

test.describe('Undo puts the trip back exactly as it was', () => {
  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await tripFor('then undo');
    await deleteTrip(trip.id);
    await undoDelete(trip.id);
  });

  test('the owner reads the trip and its plan again', async () => {
    const read = await api(`/v1/trips/${trip.id}`, 'GET', ownerToken);

    expect(read.status).toBe(200);
    expect(read.body?.archived).toBe(false);
  });

  test('the member has it back too — undo restores the whole roster, not just the owner', async () => {
    expect((await api(`/v1/trips/${trip.id}`, 'GET', memberToken)).status).toBe(200);
  });

  test('and it is on the Trips list where it was', async ({ signIn, page }) => {
    await signIn(OWNER);
    await page.goto('/trips');

    await expect(page.getByText(trip.title).first()).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('the record survives the trip (TW-2 Q17)', () => {
  test('a published trip deleted takes its page down, and Undo puts the page back', async () => {
    const trip = await tripFor('published then deleted');
    await api(`/v1/trips/${trip.id}/start`, 'POST', ownerToken, {});
    await api(`/v1/trips/${trip.id}/complete`, 'POST', ownerToken, {});
    const published = await api(`/v1/trips/${trip.id}/publish`, 'POST', ownerToken, {});
    expect(published.status).toBe(200);
    const objectId = published.body.id as string;

    await deleteTrip(trip.id);
    expect((await api(`/v1/itineraries/${objectId}`, 'GET', memberToken)).status).toBe(404);
    expect((await api(`/v1/itineraries/${objectId}`, 'GET', ownerToken)).status)
      .toBe(404);

    await undoDelete(trip.id);
    expect((await api(`/v1/itineraries/${objectId}`, 'GET', memberToken)).status).toBe(200);
  });
});

test.describe('a published trip still refuses a plan write, whoever asks', () => {
  test('a member hears the freeze, not the mask — the negative control for the walk above', async () => {
    const trip = await tripFor('published and frozen');
    await api(`/v1/trips/${trip.id}/start`, 'POST', ownerToken, {});
    await api(`/v1/trips/${trip.id}/complete`, 'POST', ownerToken, {});
    expect((await api(`/v1/trips/${trip.id}/publish`, 'POST', ownerToken, {})).status).toBe(200);

    const write = await api(`/v1/trips/${trip.id}/edit-lock`, 'POST', memberToken, {});

    expect(write.status).toBe(409);
    expect(write.body?.code).toBe('ITINERARY_PUBLISHED');
  });
});
