import { test, expect } from '../support/fixtures';
import { api, address, tokenFor, profileFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP } from '../support/identities';
import { seedTrip, stamp, type SeededTrip } from '../support/seed';

const OWNER = ownerTagFor('api/lifecycle');
const MEMBER = IDENTITY_MAP['api/lifecycle'].tags[1]!;

requireStack(OWNER);

test.describe.configure({ mode: 'serial' });

let owner: string;
let member: string;
let trip: SeededTrip;

const stateOf = async (token: string, id: string): Promise<string> =>
  (await api(`/v1/itineraries/${id}`, 'GET', token)).body.state;

test.beforeAll(async () => {
  owner = await tokenFor(OWNER);
  member = await tokenFor(MEMBER);
  trip = await seedTrip({
    ownerTag: OWNER,
    title: stamp('lifecycle'),
    destinations: ['Palawan'],
    members: [MEMBER],
  });
});

test('every trip is born a draft', async () => {
  expect(await stateOf(owner, trip.id)).toBe('draft');
});

test('a member completing a draft gets 403, not 409 — authority is checked before state', async () => {
  const refused = await api(`/v1/itineraries/${trip.id}/complete`, 'POST', member);
  expect(refused.status).toBe(403);
  expect(refused.body?.code).toBe('NOT_PERMITTED');
});

test('a member cannot start the trip, and nothing moves', async () => {
  const refused = await api(`/v1/itineraries/${trip.id}/start`, 'POST', member);
  expect(refused.status).toBe(403);
  expect(refused.body?.code).toBe('NOT_PERMITTED');
  expect(await stateOf(owner, trip.id)).toBe('draft');
});

test('even the owner cannot complete a draft — there is no skip edge', async () => {
  const refused = await api(`/v1/itineraries/${trip.id}/complete`, 'POST', owner);
  expect(refused.status).toBe(409);
  expect(refused.body?.code).toBe('ILLEGAL_STATE_TRANSITION');
});

test('an unauthenticated visitor is refused', async () => {
  const refused = await api(`/v1/itineraries/${trip.id}/start`, 'POST', undefined);
  expect(refused.status).toBe(401);
});

test('a non-member is masked with 404, never 403', async () => {
  const theirs = await api('/v1/itineraries', 'POST', member, {
    title: stamp('not the owner'),
    destinations: ['Cebu'],
  });
  const masked = await api(`/v1/itineraries/${theirs.body.id}/start`, 'POST', owner);
  expect(masked.status).toBe(404);
});

test('a draft cannot set off — planning must finish first', async () => {
  const refused = await api(`/v1/itineraries/${trip.id}/start`, 'POST', owner);
  expect(refused.status).toBe(409);
  expect(refused.body?.code).toBe('ILLEGAL_STATE_TRANSITION');
});

test('the owner finishes planning, and the response says upcoming', async () => {
  const planned = await api(`/v1/itineraries/${trip.id}/finish-planning`, 'POST', owner);
  expect(planned.status).toBe(200);
  expect(planned.body?.state).toBe('upcoming');
});

test('finishing planning twice is refused', async () => {
  const again = await api(`/v1/itineraries/${trip.id}/finish-planning`, 'POST', owner);
  expect(again.status).toBe(409);
});

test('the owner starts the trip, and the response carries the whole resource', async () => {
  const started = await api(`/v1/itineraries/${trip.id}/start`, 'POST', owner);
  expect(started.status).toBe(200);
  expect(started.body?.state).toBe('ongoing');
  expect(typeof started.body?.title).toBe('string');
});

test('startedAt and completedAt are deliberately not on the wire — no reader exists yet', async () => {
  const read = await api(`/v1/itineraries/${trip.id}`, 'GET', owner);
  expect(read.body?.startedAt).toBeUndefined();
  expect(read.body?.completedAt).toBeUndefined();
});

test('starting an already-ongoing trip is refused', async () => {
  const again = await api(`/v1/itineraries/${trip.id}/start`, 'POST', owner);
  expect(again.status).toBe(409);
});

test('a member sees the new state — it is a workspace-visible fact', async () => {
  expect(await stateOf(member, trip.id)).toBe('ongoing');
});

test('the owner completes the trip', async () => {
  const done = await api(`/v1/itineraries/${trip.id}/complete`, 'POST', owner);
  expect(done.status).toBe(200);
  expect(done.body?.state).toBe('completed');
});

test('the machine is forward-only — no re-complete, no way back by starting', async () => {
  const recomplete = await api(`/v1/itineraries/${trip.id}/complete`, 'POST', owner);
  expect(recomplete.status).toBe(409);
  const backwards = await api(`/v1/itineraries/${trip.id}/start`, 'POST', owner);
  expect(backwards.status).toBe(409);
});

test('the one-step undo walks the ladder down a rung at a time, and stops at draft', async () => {
  expect((await api(`/v1/itineraries/${trip.id}/reopen`, 'POST', owner)).body?.state).toBe('ongoing');
  expect((await api(`/v1/itineraries/${trip.id}/reopen`, 'POST', owner)).body?.state).toBe('upcoming');
  expect((await api(`/v1/itineraries/${trip.id}/reopen`, 'POST', owner)).body?.state).toBe('draft');

  const nothingBelow = await api(`/v1/itineraries/${trip.id}/reopen`, 'POST', owner);
  expect(nothingBelow.status).toBe(409);
});

test('the trip walks the whole ladder again after the undo', async () => {
  await api(`/v1/itineraries/${trip.id}/finish-planning`, 'POST', owner);
  await api(`/v1/itineraries/${trip.id}/start`, 'POST', owner);
  await api(`/v1/itineraries/${trip.id}/complete`, 'POST', owner);
  expect(await stateOf(owner, trip.id)).toBe('completed');
});

test('completed is a working afterlife, not a freeze — a member still edits the plan', async () => {
  const lock = await api(`/v1/itineraries/${trip.id}/edit-lock`, 'POST', member);
  expect(lock.status).toBe(200);

  const edited = await api(`/v1/itineraries/${trip.id}`, 'PATCH', member, {
    title: 'edited after completion',
    destinations: ['Palawan'],
  });
  expect(edited.status).toBe(200);

  await api(`/v1/itineraries/${trip.id}/edit-lock`, 'DELETE', member);
});

test('membership ops are not frozen either — the owner can still invite', async () => {
  const invited = await api(`/v1/itineraries/${trip.id}/invitations/by-handle`, 'POST', owner, {
    handle: (await profileFor('t3')).handle,
  });
  expect(invited.status).toBe(201);
});

test('PATCH cannot move lifecycle state — the two doors stay separate', async () => {
  const before = await stateOf(owner, trip.id);
  await api(`/v1/itineraries/${trip.id}/edit-lock`, 'POST', owner);
  await api(`/v1/itineraries/${trip.id}`, 'PATCH', owner, {
    title: 'state must not move through this door',
    destinations: ['Palawan'],
    state: 'draft',
  });
  await api(`/v1/itineraries/${trip.id}/edit-lock`, 'DELETE', owner);

  expect(await stateOf(owner, trip.id)).toBe(before);
});

test('the trip appears in My Trips carrying its state — what the row badge renders', async () => {
  const mine = await api('/v1/itineraries', 'GET', owner);
  expect(mine.body.items.find((row: { id: string }) => row.id === trip.id)?.state).toBe('completed');
});

test.describe('S4.24 — the editor opens in every unpublished state, and the state survives the save', () => {
  let inPlace: string;
  let inPlaceDay: string;

  test.beforeAll(async () => {
    const created = await api('/v1/itineraries', 'POST', owner, {
      title: stamp('edit in place'),
      destinations: ['Palawan'],
      durationDays: 1,
    });
    inPlace = created.body.id;
    inPlaceDay = created.body.days[0].id;
  });

  const editsInPlaceAt = async (expected: string) => {
    const held = await api(`/v1/itineraries/${inPlace}/edit-lock`, 'POST', owner, {
      subjectType: 'session',
    });
    expect(held.status, `the Editing Session must open on a ${expected} trip`).toBe(200);

    const base = (await api(`/v1/itineraries/${inPlace}`, 'GET', owner)).body.planVersion;
    const saved = await api(`/v1/itineraries/${inPlace}/plan`, 'PUT', owner, {
      basePlanVersion: base,
      days: [{ id: inPlaceDay, title: `Edited while ${expected}`, activities: [] }],
    });
    expect(saved.status).toBe(200);

    await api(`/v1/itineraries/${inPlace}/edit-lock`, 'DELETE', owner, { subjectType: 'session' });
    expect(await stateOf(owner, inPlace), `${expected} must survive the save`).toBe(expected);
  };

  test('a draft edits in place', async () => {
    await editsInPlaceAt('draft');
  });

  test('a Ready trip edits in place', async () => {
    await api(`/v1/itineraries/${inPlace}/finish-planning`, 'POST', owner);
    await editsInPlaceAt('upcoming');
  });

  test('an Active trip edits in place, and the diary blackout is gone', async () => {
    await api(`/v1/itineraries/${inPlace}/start`, 'POST', owner);
    await editsInPlaceAt('ongoing');

    const stillCapturing = await api(`/v1/itineraries/${inPlace}`, 'GET', owner);
    expect(
      stillCapturing.body?.state,
      'the capture gate reads this exact state — anything else is TRIP_NOT_STARTED',
    ).toBe('ongoing');
  });

  test('an unpublished Completed trip edits in place', async () => {
    await api(`/v1/itineraries/${inPlace}/complete`, 'POST', owner);
    await editsInPlaceAt('completed');
  });
});
