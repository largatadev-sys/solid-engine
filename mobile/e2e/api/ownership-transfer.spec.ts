import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP, STRANGER_TAG } from '../support/identities';
import { seedTrip, stamp, joinTrip, type SeededTrip } from '../support/seed';

const FOUNDER = ownerTagFor('api/ownership-transfer');
const OFFEREE = IDENTITY_MAP['api/ownership-transfer'].tags[1]!;
const BYSTANDER = STRANGER_TAG;

requireStack(FOUNDER);

test.describe.configure({ mode: 'serial' });

interface Member {
  travelerId: string;
  role: string;
  ownershipOffered?: boolean;
}

let founder: string;
let offeree: string;
let bystander: string;

let founderId: string;
let offereeId: string;
let bystanderId: string;

let trip: SeededTrip;

const rosterSeenBy = async (token: string): Promise<Member[]> =>
  (await api(`/v1/itineraries/${trip.id}/members`, 'GET', token)).body.items;

const roleOf = (roster: Member[], travelerId: string): string | undefined =>
  roster.find((row) => row.travelerId === travelerId)?.role;

const offeredOn = (roster: Member[]): string | undefined =>
  roster.find((row) => row.ownershipOffered === true)?.travelerId;

const tripsOf = async (token: string): Promise<string[]> =>
  (await api('/v1/itineraries', 'GET', token)).body.items.map((row: { id: string }) => row.id);

const idOf = async (token: string): Promise<string> => (await api('/v1/me', 'GET', token)).body.id;

test.beforeAll(async () => {
  founder = await tokenFor(FOUNDER);
  offeree = await tokenFor(OFFEREE);
  bystander = await tokenFor(BYSTANDER);

  founderId = await idOf(founder);
  offereeId = await idOf(offeree);
  bystanderId = await idOf(bystander);

  trip = await seedTrip({
    ownerTag: FOUNDER,
    title: stamp('ownership transfer'),
    destination: 'Palawan',
    members: [OFFEREE],
  });
  await joinTrip(trip, BYSTANDER);
});

test('the offeree and the bystander joined through the real invite flow', async () => {
  const roster = await rosterSeenBy(founder);
  expect(roster.length).toBe(3);
  expect(roleOf(roster, founderId)).toBe('owner');
});

test('a joined member sees the trip in My Trips — the S1.5 bug, fixed', async () => {
  expect(await tripsOf(offeree)).toContain(trip.id);
});

test('the founder cannot leave while owner: 409 OWNER_CANNOT_LEAVE', async () => {
  const blocked = await api(`/v1/itineraries/${trip.id}/members/${founderId}`, 'DELETE', founder);
  expect(blocked.status).toBe(409);
  expect(blocked.body?.code).toBe('OWNER_CANNOT_LEAVE');
});

test('a member cannot offer ownership: 403', async () => {
  const byMember = await api(`/v1/itineraries/${trip.id}/ownership-offer`, 'POST', bystander, {
    travelerId: offereeId,
  });
  expect(byMember.status).toBe(403);
});

test('the founder offers ownership to the offeree: 201', async () => {
  const offered = await api(`/v1/itineraries/${trip.id}/ownership-offer`, 'POST', founder, {
    travelerId: offereeId,
  });
  expect(offered.status).toBe(201);
});

test("the bystander sees the offer on the offeree's row — governance state is workspace-walled, not private", async () => {
  expect(offeredOn(await rosterSeenBy(bystander))).toBe(offereeId);
});

test('a second offer is refused: 409 OFFER_ALREADY_PENDING', async () => {
  const second = await api(`/v1/itineraries/${trip.id}/ownership-offer`, 'POST', founder, {
    travelerId: bystanderId,
  });
  expect(second.status).toBe(409);
  expect(second.body?.code).toBe('OFFER_ALREADY_PENDING');
});

test('a stale accept after revoke-and-reoffer is refused: 403 NOT_OFFER_TARGET, and nothing moves', async () => {
  await api(`/v1/itineraries/${trip.id}/ownership-offer`, 'DELETE', founder);
  await api(`/v1/itineraries/${trip.id}/ownership-offer`, 'POST', founder, {
    travelerId: bystanderId,
  });

  const staleAccept = await api(`/v1/itineraries/${trip.id}/ownership-offer/accept`, 'POST', offeree);
  expect(staleAccept.status).toBe(403);
  expect(staleAccept.body?.code).toBe('NOT_OFFER_TARGET');

  expect(roleOf(await rosterSeenBy(founder), founderId)).toBe('owner');
});

test('the offeree accepts: 204', async () => {
  await api(`/v1/itineraries/${trip.id}/ownership-offer`, 'DELETE', founder);
  await api(`/v1/itineraries/${trip.id}/ownership-offer`, 'POST', founder, { travelerId: offereeId });

  const accepted = await api(`/v1/itineraries/${trip.id}/ownership-offer/accept`, 'POST', offeree);
  expect(accepted.status).toBe(204);
});

test('the crown moved: the offeree is owner, the founder is member', async () => {
  const after = await rosterSeenBy(offeree);
  expect(roleOf(after, offereeId)).toBe('owner');
  expect(roleOf(after, founderId)).toBe('member');
});

test('exactly one owner on the roster — INV-4', async () => {
  const after = await rosterSeenBy(offeree);
  expect(after.filter((row) => row.role === 'owner').length).toBe(1);
});

test('the offer is resolved: no pending flag left on the roster', async () => {
  expect(offeredOn(await rosterSeenBy(offeree))).toBeUndefined();
});

test('the former owner can no longer offer ownership: 403', async () => {
  const exOwnerOffers = await api(`/v1/itineraries/${trip.id}/ownership-offer`, 'POST', founder, {
    travelerId: bystanderId,
  });
  expect(exOwnerOffers.status).toBe(403);
});

test('the new owner can: 201', async () => {
  const newOwnerOffers = await api(`/v1/itineraries/${trip.id}/ownership-offer`, 'POST', offeree, {
    travelerId: bystanderId,
  });
  expect(newOwnerOffers.status).toBe(201);
  await api(`/v1/itineraries/${trip.id}/ownership-offer`, 'DELETE', offeree);
});

test('the former owner still has the trip in My Trips — they are still on it', async () => {
  expect(await tripsOf(founder)).toContain(trip.id);
});

test('the new owner has it too', async () => {
  expect(await tripsOf(offeree)).toContain(trip.id);
});

test('the former owner can now leave — the S1.5 dead end is open', async () => {
  const left = await api(`/v1/itineraries/${trip.id}/members/${founderId}`, 'DELETE', founder);
  expect(left.status).toBe(204);
});

test('the trip drops off the former owner\'s My Trips', async () => {
  expect(await tripsOf(founder)).not.toContain(trip.id);
});

test('the walls close behind the former owner: 404', async () => {
  const evicted = await api(`/v1/itineraries/${trip.id}`, 'GET', founder);
  expect(evicted.status).toBe(404);
});

test('a leaving member voids their pending offer — no ghost flag on the roster', async () => {
  await api(`/v1/itineraries/${trip.id}/ownership-offer`, 'POST', offeree, {
    travelerId: bystanderId,
  });
  await api(`/v1/itineraries/${trip.id}/members/${bystanderId}`, 'DELETE', bystander);

  expect(offeredOn(await rosterSeenBy(offeree))).toBeUndefined();
});

test('the trip is down to its one owner', async () => {
  const roster = await rosterSeenBy(offeree);
  expect(roster.length).toBe(1);
  expect(roleOf(roster, offereeId)).toBe('owner');
});

test('the pool converges: the founder tag owns a fresh trip again, so repeated runs never drift', async () => {
  const fresh = await api('/v1/itineraries', 'POST', founder, {
    title: stamp('ownership transfer convergence'),
    destination: 'Palawan',
  });
  expect(fresh.status).toBe(201);

  const roster = await api(`/v1/itineraries/${fresh.body.id}/members`, 'GET', founder);
  expect(roleOf(roster.body.items, founderId)).toBe('owner');
});
