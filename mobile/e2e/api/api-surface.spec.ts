import { test, expect } from '../support/fixtures';
import { api, address, request, tokenFor, API } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP, STRANGER_TAG } from '../support/identities';
import { SeedFailure } from '../support/seed';

const UNVERIFIED = 'u1';

const OWNER = ownerTagFor('api/api-surface');
const MEMBER = IDENTITY_MAP['api/api-surface'].tags[1]!;
const STRANGER = STRANGER_TAG;

requireStack(OWNER);

test.describe.configure({ mode: 'serial' });

const header = () => ({ subjectType: 'header' });
const onDay = (dayId: string) => ({ subjectType: 'day', subjectId: dayId });
const onActivity = (activityId: string) => ({ subjectType: 'activity', subjectId: activityId });

let owner: string;
let member: string;
let stranger: string;
let unverified: string;

let ownerId: string;
let memberId: string;
let strangerId: string;
let ownerHandle: string;
let strangerHandle: string;

let trip: string;
let dayId: string;
let activities: string;
let lease: string;

let mineActivity: string;
let theirsActivity: string;

async function unverifiedToken(): Promise<string> {
  const signedIn = await request(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.EXPO_PUBLIC_FIREBASE_API_KEY}`,
    'POST',
    {
      email: address(UNVERIFIED),
      password: process.env.LARGATA_TEST_POOL_PASSWORD,
      returnSecureToken: true,
    },
  );
  if (signedIn.body?.idToken === undefined) {
    throw new SeedFailure(`a token for the unverified ${UNVERIFIED}`, signedIn.body);
  }
  return signedIn.body.idToken;
}

test.beforeAll(async () => {
  owner = await tokenFor(OWNER);
  member = await tokenFor(MEMBER);
  stranger = await tokenFor(STRANGER);
  unverified = await unverifiedToken();
});

test('health is ok', async () => {
  const health = await api('/v1/health');
  expect(health.status).toBe(200);
  expect(health.body.status).toBe('ok');
});

test('S0.2 traveler provisioned on first contact', async () => {
  const meOwner = await api('/v1/me', 'GET', owner);
  const meMember = await api('/v1/me', 'GET', member);
  const meStranger = await api('/v1/me', 'GET', stranger);
  await api('/v1/me', 'GET', unverified);

  expect(meOwner.status).toBe(200);
  expect(meOwner.body.id).toBeTruthy();

  ownerId = meOwner.body.id;
  memberId = meMember.body.id;
  strangerId = meStranger.body.id;
  ownerHandle = meOwner.body.handle ?? (await claimHandle(owner, OWNER));
  strangerHandle = meStranger.body.handle ?? (await claimHandle(stranger, STRANGER));
});

async function claimHandle(token: string, tag: string): Promise<string> {
  const handle = `pool_${tag}`;
  const patched = await api('/v1/me', 'PATCH', token, { handle });
  if (patched.status !== 200) throw new SeedFailure(`a handle for ${tag}`, patched.body);
  return patched.body.handle;
}

test('checklist #1: an anonymous request is 401, not 404', async () => {
  const anon = await api('/v1/itineraries');
  expect(anon.status).toBe(401);
});

test('checklist #2: the 401 carries a non-null traceId', async () => {
  const anon = await api('/v1/itineraries');
  expect(anon.body?.traceId).toBeTruthy();
});

test('checklist #3: a malformed token gets the same envelope', async () => {
  const bad = await request(`${API}/v1/me`, 'GET', undefined, { Authorization: 'Bearer not-a-jwt' });
  expect(bad.status).toBe(401);
  expect(bad.body?.code).toBeTruthy();
  expect(bad.body?.traceId).toBeTruthy();
});

test('checklist #1: an authenticated unknown route is 404 + envelope', async () => {
  const unknown = await api('/v1/no-such-route', 'GET', owner);
  expect(unknown.status).toBe(404);
  expect(unknown.body?.code).toBeTruthy();
});

test('S0.3 create an itinerary', async () => {
  const created = await api('/v1/itineraries', 'POST', owner, {
    title: 'Smoke trip',
    destinations: ['Palawan'],
    startDate: '2027-03-01',
    endDate: '2027-03-04',
  });
  expect(created.status).toBe(201);
  trip = created.body.id;
  activities = '';
  lease = `/v1/itineraries/${trip}/edit-lock`;
});

test('S0.3 My Trips lists it', async () => {
  const list = await api('/v1/itineraries', 'GET', owner);
  expect(list.status).toBe(200);
  expect(list.body.items.some((row: { id: string }) => row.id === trip)).toBe(true);
});

test('S0.3 read one itinerary', async () => {
  const one = await api(`/v1/itineraries/${trip}`, 'GET', owner);
  expect(one.status).toBe(200);
  expect(one.body.title).toBe('Smoke trip');
});

test('checklist #6: an unset optional field is null, not absent', async () => {
  const one = await api(`/v1/itineraries/${trip}`, 'GET', owner);
  expect(one.body.description).toBeNull();
});

test('S4.9 acquire the HEADER lease, and the lease names its subject back', async () => {
  const lock = await api(lease, 'POST', owner, header());
  expect(lock.status).toBe(200);
  expect(lock.body?.subjectType).toBe('header');
});

test('S1.3 edit itinerary fields', async () => {
  const edited = await api(`/v1/itineraries/${trip}`, 'PATCH', owner, {
    title: 'Smoke trip (edited)',
    destinations: ['Palawan', 'Coron'],
  });
  expect(edited.status).toBe(200);
  expect(edited.body.title).toBe('Smoke trip (edited)');
});

test('S1.3 append a day', async () => {
  const day = await api(`/v1/itineraries/${trip}/days`, 'POST', owner, { title: 'Arrival' });
  expect(day.status).toBe(201);
  dayId = day.body.id;
  activities = `/v1/itineraries/${trip}/days/${dayId}/activities`;
});

test('S1.3 add an activity', async () => {
  const activity = await api(activities, 'POST', owner, {
    title: 'Airport transfer',
    place: 'PPS',
  });
  expect(activity.status).toBe(201);
});

test('S1.3 the plan is embedded on the itinerary', async () => {
  const planned = await api(`/v1/itineraries/${trip}`, 'GET', owner);
  expect(planned.body.days?.length).toBe(1);
  expect(planned.body.days[0].activities?.length).toBe(1);
});

test('S1.3 last-edited attribution is written', async () => {
  const planned = await api(`/v1/itineraries/${trip}`, 'GET', owner);
  expect(planned.body.lastEditedBy).toBe(ownerId);
});

test('S0.3 guard: a non-member write is 404-masked', async () => {
  const strangerWrite = await api(`/v1/itineraries/${trip}`, 'PATCH', member, {
    title: 'hijack',
    destinations: ['X'],
  });
  expect(strangerWrite.status).toBe(404);
});

test.describe('S1.2 the verification gate sits at accept, not at invite', () => {
  let inviteId: string;

  test('S1.2 invite an unverified address (allowed — the gate is at accept)', async () => {
    const inviteUnverified = await api(`/v1/itineraries/${trip}/invitations`, 'POST', owner, {
      email: address('u1'),
    });
    expect(inviteUnverified.status).toBe(201);
    inviteId = inviteUnverified.body.id;
  });

  test('S1.2 gate: an UNVERIFIED caller sees an empty inbox', async () => {
    const emptyInbox = await api('/v1/invitations', 'GET', unverified);
    expect(emptyInbox.status).toBe(200);
    expect(emptyInbox.body.items.length).toBe(0);
  });

  test('S1.2 gate: an UNVERIFIED caller cannot accept (403 EMAIL_NOT_VERIFIED)', async () => {
    const refused = await api(`/v1/invitations/${inviteId}/accept`, 'POST', unverified, {});
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('EMAIL_NOT_VERIFIED');
  });
});

test.describe('S1.2 the real invite to accept path', () => {
  let inviteId: string;

  test('S1.2 owner invites a verified address', async () => {
    const invite = await api(`/v1/itineraries/${trip}/invitations`, 'POST', owner, {
      email: address(MEMBER),
    });
    expect(invite.status).toBe(201);
    inviteId = invite.body.id;
  });

  test('S1.2 the invitation reaches the invitee inbox', async () => {
    const inbox = await api('/v1/invitations', 'GET', member);
    expect(inbox.status).toBe(200);
    expect(inbox.body.items.some((row: { id: string }) => row.id === inviteId)).toBe(true);
  });

  test('S1.2 accept joins the trip (the REAL flow, not a planted row)', async () => {
    const accepted = await api(`/v1/invitations/${inviteId}/accept`, 'POST', member, {});
    expect(accepted.status).toBe(200);
  });

  test('S1.2 the walls open for the new member', async () => {
    const memberReads = await api(`/v1/itineraries/${trip}`, 'GET', member);
    expect(memberReads.status).toBe(200);
  });

  test('S1.2 roster is owner then member', async () => {
    const roster = await api(`/v1/itineraries/${trip}/members`, 'GET', owner);
    expect(roster.body.items.length).toBe(2);
    expect(roster.body.items[0].role).toBe('owner');
    expect(roster.body.items[1].role).toBe('member');
  });

  test('S1.2 accepting twice is a conflict (terminal statuses)', async () => {
    const twice = await api(`/v1/invitations/${inviteId}/accept`, 'POST', member, {});
    expect(twice.status).toBe(409);
  });
});

test('S4.9 the member is refused the HEADER lease the owner holds', async () => {
  const memberLocked = await api(lease, 'POST', member, header());
  expect(memberLocked.status).toBe(409);
  expect(memberLocked.body.code).toBe('EDIT_LOCKED');
});

test.describe('S4.9 per-subject leases', () => {
  test('S4.9 adds are unguarded — a member adds while the owner holds the header lease', async () => {
    const mine = await api(activities, 'POST', owner, { title: 'Sunset cruise' });
    const theirs = await api(activities, 'POST', member, { title: 'Dive shop' });
    expect(mine.status).toBe(201);
    expect(theirs.status).toBe(201);
    mineActivity = mine.body.id;
    theirsActivity = theirs.body.id;
  });

  test("S4.9 an activity edit without that activity's lease is refused", async () => {
    const unleased = await api(`${activities}/${mineActivity}`, 'PATCH', owner, { title: 'no lease' });
    expect(unleased.status).toBe(409);
    expect(unleased.body.code).toBe('EDIT_LOCKED');
  });

  test('S4.9 two members hold leases on two activities of ONE day at the same time', async () => {
    const ownerHolds = await api(lease, 'POST', owner, onActivity(mineActivity));
    const memberHolds = await api(lease, 'POST', member, onActivity(theirsActivity));
    expect(ownerHolds.status).toBe(200);
    expect(memberHolds.status).toBe(200);
  });

  test('S4.9 AC1 both concurrent saves land', async () => {
    const bothSave = await Promise.all([
      api(`${activities}/${mineActivity}`, 'PATCH', owner, { title: 'Sunset cruise, 6pm' }),
      api(`${activities}/${theirsActivity}`, 'PATCH', member, { title: 'Dive shop, booked' }),
    ]);
    expect(bothSave.map((response) => response.status)).toEqual([200, 200]);
  });

  test('S4.9 holding one activity authorizes nothing about the one beside it, and the 409 names the holder by @handle', async () => {
    const poach = await api(`${activities}/${theirsActivity}`, 'PATCH', owner, { title: 'poached' });
    expect(poach.status).toBe(409);
    expect(poach.body.code).toBe('EDIT_LOCKED');
    expect(typeof poach.body?.message).toBe('string');
    expect(poach.body.message).toContain('@');
  });

  test('S4.9 AC8 the plan read carries the holder per subject, with their handle', async () => {
    const read = await api(`/v1/itineraries/${trip}`, 'GET', owner);
    const readDay = read.body.days.find((day: { id: string }) => day.id === dayId);
    const heldCard = readDay?.activities.find((row: { id: string }) => row.id === theirsActivity);
    expect(Boolean(heldCard?.lease?.handle)).toBe(true);
  });

  test("S4.9 AC14 the plan read carries the last editor's handle for the attribution chip", async () => {
    const read = await api(`/v1/itineraries/${trip}`, 'GET', owner);
    const readDay = read.body.days.find((day: { id: string }) => day.id === dayId);
    const heldCard = readDay?.activities.find((row: { id: string }) => row.id === theirsActivity);
    expect(Boolean(heldCard?.lastEditedByHandle)).toBe(true);
  });

  test('S4.9 the workspace state is on the payload (the chip reads it, not archived)', async () => {
    const read = await api(`/v1/itineraries/${trip}`, 'GET', owner);
    expect(read.body.workspaceState).toBe('active');
  });

  test('S4.9 AC7 a reorder carrying the order it believes current is applied, and the replay on a stale ordering is refused', async () => {
    const read = await api(`/v1/itineraries/${trip}`, 'GET', owner);
    const readDay = read.body.days.find((day: { id: string }) => day.id === dayId);
    const asFetched = readDay.activities.map((row: { id: string }) => row.id);
    const swapped = [...asFetched].reverse();

    const fresh = await api(`${activities}/order`, 'PUT', owner, {
      expectedActivityIds: asFetched,
      activityIds: swapped,
    });
    expect(fresh.status).toBe(200);

    const stale = await api(`${activities}/order`, 'PUT', owner, {
      expectedActivityIds: asFetched,
      activityIds: asFetched,
    });
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe('STALE_REORDER');
  });

  test('S4.9 AC5 a member cannot add a day (403, interim ruling)', async () => {
    const memberAddsDay = await api(`/v1/itineraries/${trip}/days`, 'POST', member, { title: 'Nope' });
    expect(memberAddsDay.status).toBe(403);
    expect(memberAddsDay.body.code).toBe('NOT_PERMITTED');
  });

  test('S4.9 AC4 a day cannot be deleted while a member edits an activity inside it', async () => {
    await api(lease, 'POST', owner, onDay(dayId));
    const yanked = await api(`/v1/itineraries/${trip}/days/${dayId}`, 'DELETE', owner);
    expect(yanked.status).toBe(409);
    expect(yanked.body.code).toBe('DAY_HAS_LEASED_ACTIVITY');
  });

  test("S4.9 AC3 deleting an activity needs that activity's lease", async () => {
    const unleasedDelete = await api(`${activities}/${theirsActivity}`, 'DELETE', owner);
    expect(unleasedDelete.status).toBe(409);
    expect(unleasedDelete.body.code).toBe('EDIT_LOCKED');
  });

  test('S4.9 deleting an activity succeeds once held', async () => {
    await api(lease, 'DELETE', member, onActivity(theirsActivity));
    await api(lease, 'POST', owner, onActivity(theirsActivity));
    const gone = await api(`${activities}/${theirsActivity}`, 'DELETE', owner);
    expect(gone.status).toBe(204);
  });

  test('S4.9 the guard still masks a non-member on the lease endpoint (404)', async () => {
    const strangerLease = await api(lease, 'POST', stranger, onActivity(mineActivity));
    expect(strangerLease.status).toBe(404);
  });
});

test.describe('S4.9 AC13 handle lookup and invitation by handle', () => {
  let byHandleId: string;

  test('S4.9 AC13 an unknown handle finds nothing', async () => {
    const noHandle = await api('/v1/handles/nobody-goes-by-this', 'GET', owner);
    expect(noHandle.status).toBe(404);
  });

  test('S4.9 AC13 an exact handle returns the display card, and it carries no email (P3)', async () => {
    const found = await api(`/v1/handles/${ownerHandle}`, 'GET', member);
    expect(found.status).toBe(200);
    expect(found.body.id).toBe(ownerId);
    expect(found.body?.email).toBeUndefined();
  });

  test('S4.9 AC13 a PARTIAL handle finds nothing — no fuzzy search, no enumeration', async () => {
    const partial = await api(`/v1/handles/${ownerHandle.slice(0, -1)}`, 'GET', member);
    expect(partial.status).toBe(404);
  });

  test('S4.9 AC13 the owner invites by handle, and an id-addressed invitation carries no email', async () => {
    const byHandle = await api(`/v1/itineraries/${trip}/invitations/by-handle`, 'POST', owner, {
      handle: strangerHandle,
    });
    expect(byHandle.status).toBe(201);
    expect(byHandle.body?.email).toBeNull();
    byHandleId = byHandle.body.id;
  });

  test("S4.9 AC13 it reaches the invitee's inbox with no email match at all", async () => {
    const inbox = await api('/v1/invitations', 'GET', stranger);
    expect(inbox.body.items.some((row: { id: string }) => row.id === byHandleId)).toBe(true);
  });

  test('S4.9 AC13 accepting joins the trip', async () => {
    const joined = await api(`/v1/invitations/${byHandleId}/accept`, 'POST', stranger, {});
    expect(joined.status).toBe(200);
  });

  test('S4.9 a second accept is a clean conflict, never a 500', async () => {
    const rejoin = await api(`/v1/invitations/${byHandleId}/accept`, 'POST', stranger, {});
    expect(rejoin.status).toBe(409);
  });

  test('the by-handle invitee is removed and every lease released', async () => {
    const removed = await api(`/v1/itineraries/${trip}/members/${strangerId}`, 'DELETE', owner);
    expect(removed.status).toBe(204);
    await api(lease, 'DELETE', owner, onDay(dayId));
    await api(lease, 'DELETE', owner, onActivity(mineActivity));
  });
});

test('S1.5 a member cannot remove the owner (403)', async () => {
  const memberRemovesOwner = await api(`/v1/itineraries/${trip}/members/${ownerId}`, 'DELETE', member);
  expect(memberRemovesOwner.status).toBe(403);
  expect(memberRemovesOwner.body.code).toBe('NOT_PERMITTED');
});

test('S1.5 the owner cannot leave (409 OWNER_CANNOT_LEAVE) — INV-4', async () => {
  const ownerLeaves = await api(`/v1/itineraries/${trip}/members/${ownerId}`, 'DELETE', owner);
  expect(ownerLeaves.status).toBe(409);
  expect(ownerLeaves.body.code).toBe('OWNER_CANNOT_LEAVE');
});

test('S1.5 the owner removes the member (204)', async () => {
  const removed = await api(`/v1/itineraries/${trip}/members/${memberId}`, 'DELETE', owner);
  expect(removed.status).toBe(204);
});

test('S1.5 the removed member is evicted (404)', async () => {
  const evicted = await api(`/v1/itineraries/${trip}`, 'GET', member);
  expect(evicted.status).toBe(404);
});

test('S1.5 removing the already-removed is idempotent (204)', async () => {
  const again = await api(`/v1/itineraries/${trip}/members/${memberId}`, 'DELETE', owner);
  expect(again.status).toBe(204);
});

test('S1.5 a removed member can be re-invited (no ALREADY_A_MEMBER), and rejoins for real', async () => {
  const reinvite = await api(`/v1/itineraries/${trip}/invitations`, 'POST', owner, {
    email: address(MEMBER),
  });
  expect(reinvite.status).toBe(201);

  const rejoin = await api(`/v1/invitations/${reinvite.body.id}/accept`, 'POST', member, {});
  expect(rejoin.status).toBe(200);
});

test('the plan survived every membership change', async () => {
  const intact = await api(`/v1/itineraries/${trip}`, 'GET', owner);
  expect(intact.status).toBe(200);
  expect(
    intact.body.days[0].activities.some((row: { title: string }) => row.title === 'Airport transfer'),
  ).toBe(true);
});

test('S1.4 release the lock', async () => {
  const release = await api(lease, 'DELETE', owner);
  expect(release.status).toBe(204);
});

test('S1.9 a member cannot archive (403 NOT_PERMITTED)', async () => {
  const memberArchives = await api(`/v1/itineraries/${trip}/archive`, 'POST', member);
  expect(memberArchives.status).toBe(403);
  expect(memberArchives.body.code).toBe('NOT_PERMITTED');
});

test('S1.9 a pending invitation exists before the archive', async () => {
  const pendingInvite = await api(`/v1/itineraries/${trip}/invitations`, 'POST', owner, {
    email: address(STRANGER),
  });
  expect(pendingInvite.status).toBe(201);
});

test('S1.9 the owner archives (200, archived=true)', async () => {
  const archived = await api(`/v1/itineraries/${trip}/archive`, 'POST', owner);
  expect(archived.status).toBe(200);
  expect(archived.body.archived).toBe(true);
});

test('S4.23 a member writing an archived trip gets the MASK, not the freeze (404 ITINERARY_NOT_FOUND)', async () => {
  const memberWrites = await api(`/v1/itineraries/${trip}/days`, 'POST', member, { title: 'While frozen' });
  expect(memberWrites.status).toBe(404);
  expect(memberWrites.body.code).toBe('ITINERARY_NOT_FOUND');
});

test('S1.9 even the owner cannot move the lifecycle (409 TRIP_ARCHIVED)', async () => {
  const ownerStarts = await api(`/v1/itineraries/${trip}/start`, 'POST', owner);
  expect(ownerStarts.status).toBe(409);
  expect(ownerStarts.body.code).toBe('TRIP_ARCHIVED');
});

test('S1.9 the archived trip leaves the default list', async () => {
  const liveList = await api('/v1/itineraries', 'GET', owner);
  expect(liveList.status).toBe(200);
  expect(liveList.body.items.some((row: { id: string }) => row.id === trip)).toBe(false);
});

test('S1.9 the archived trip appears in the archived view', async () => {
  const archivedList = await api('/v1/itineraries?archived=true', 'GET', owner);
  expect(archivedList.status).toBe(200);
  expect(archivedList.body.items.some((row: { id: string }) => row.id === trip)).toBe(true);
});

test('S1.9 a member can still leave an archived trip (204)', async () => {
  const leaves = await api(`/v1/itineraries/${trip}/members/${memberId}`, 'DELETE', member);
  expect(leaves.status).toBe(204);
});

test('S1.9 the owner unarchives (200, archived=false)', async () => {
  const unarchived = await api(`/v1/itineraries/${trip}/unarchive`, 'POST', owner);
  expect(unarchived.status).toBe(200);
  expect(unarchived.body.archived).toBe(false);
});

test('S1.9 writes work again after unarchive', async () => {
  const writableAgain = await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', owner);
  expect(writableAgain.status).toBe(200);
  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', owner);
});
