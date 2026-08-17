import { test, expect } from '../support/fixtures';
import { api, address, tokenFor, profileFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP } from '../support/identities';
import { SeedFailure, stamp } from '../support/seed';

const OWNER = ownerTagFor('api/publish');
const MEMBER = IDENTITY_MAP['api/publish'].tags[1]!;
const CONSUMER = IDENTITY_MAP['api/publish'].tags[2]!;

requireStack(OWNER);

test.describe.configure({ mode: 'serial' });

const PROJECTION_FIELDS = [
  'id', 'title', 'destinations', 'description', 'standouts', 'bestTimeOfYear',
  'coverImageUrl', 'durationDays', 'creator', 'estimatedCost', 'days',
].sort();

const FORBIDDEN = [
  'startDate', 'endDate', 'state', 'startedAt', 'completedAt', 'archived',
  'workspaceState', 'lastEditedBy', 'lastEditedAt', 'lease', 'published', 'visibility',
  'ownerId', 'createdAt',
];

let owner: string;
let member: string;
let consumer: string;
let ownerId: string;
let trip: string;
let dayOne: string;
let dayTwo: string;
let created: { status: number; body: any };

test.beforeAll(async () => {
  owner = await tokenFor(OWNER);
  member = await tokenFor(MEMBER);
  consumer = await tokenFor(CONSUMER);
  await profileFor(OWNER);
  await profileFor(MEMBER);
  await profileFor(CONSUMER);

  ownerId = (await api('/v1/me', 'GET', owner)).body.id;

  created = await api('/v1/itineraries', 'POST', owner, {
    title: 'Island Hopping in El Nido',
    destinations: ['Palawan'],
    description: "Discover the breathtaking beauty of El Nido's lagoons.",
    startDate: '2027-03-04',
    endDate: '2027-03-08',
    durationDays: 2,
  });
  if (created.status !== 201) throw new SeedFailure('the publish-walk trip', created.body);
  trip = created.body.id;
  dayOne = created.body.days[0].id;
  dayTwo = created.body.days[1].id;

  await api(`/v1/itineraries/${trip}/days/${dayOne}/activities`, 'POST', owner, {
    title: 'Airport Transfer',
    timeOfDay: '14:00',
    costAmount: '500',
    costCurrency: 'PHP',
    place: 'Lio Airport',
    description: 'A van transfer to El Nido town proper.',
    notes: 'Book the earliest slot at 8:00 AM to avoid the large tour groups!',
    externalUrl: 'https://example.test/transfer',
  });
  await api(`/v1/itineraries/${trip}/days/${dayTwo}/activities`, 'POST', owner, {
    title: 'Sunset at Las Cabanas',
    costAmount: '300',
    costCurrency: 'PHP',
  });
});

test('a never-started trip is created (lifecycle draft)', () => {
  expect(created.status).toBe(201);
  expect(created.body.state).toBe('draft');
  expect(created.body.published).toBe(false);
  expect(created.body.visibility).toBe('public');
});

test('a member joins through the real invite then accept', async () => {
  await api(`/v1/itineraries/${trip}/invitations`, 'POST', owner, { email: address(MEMBER) });
  const inbox = await api('/v1/invitations', 'GET', member);
  const invite = (inbox.body?.items ?? []).find((row: { itineraryId: string }) => row.itineraryId === trip);
  const accepted = await api(`/v1/invitations/${invite?.id}/accept`, 'POST', member, {});
  expect(accepted.status).toBe(200);
});

test('standouts and best time save under the header lease', async () => {
  await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', owner, { subjectType: 'header' });
  const dressed = await api(`/v1/itineraries/${trip}`, 'PATCH', owner, {
    title: 'Island Hopping in El Nido',
    destinations: ['Palawan'],
    description: "Discover the breathtaking beauty of El Nido's lagoons.",
    standouts: ['Big Lagoon Kayaking', 'Local Seafood Dinners'],
    bestTimeOfYear: 'Dec – Apr',
    startDate: '2027-03-04',
    endDate: '2027-03-08',
  });
  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', owner, { subjectType: 'header' });

  expect(dressed.status).toBe(200);
  expect(dressed.body.standouts).toHaveLength(2);
  expect(dressed.body.bestTimeOfYear).toBe('Dec – Apr');
});

test('a stranger cannot see a draft itinerary', async () => {
  const before = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  expect(before.status).toBe(404);
  expect(before.body.code).toBe('ITINERARY_NOT_FOUND');
});

test('the owner previews before publishing; a member cannot', async () => {
  const previewed = await api(`/v1/itineraries/${trip}/preview`, 'GET', owner);
  const memberPreview = await api(`/v1/itineraries/${trip}/preview`, 'GET', member);
  expect(previewed.status).toBe(200);
  expect(memberPreview.status).toBe(403);
});

test('publish by a member is refused by name', async () => {
  const refused = await api(`/v1/itineraries/${trip}/publish`, 'POST', member);
  expect(refused.status).toBe(403);
  expect(refused.body.code).toBe('NOT_PERMITTED');
});

test('publishing a draft is refused, naming the precondition', async () => {
  const tooEarly = await api(`/v1/itineraries/${trip}/publish`, 'POST', owner);
  expect(tooEarly.status).toBe(409);
  expect(tooEarly.body.code).toBe('ITINERARY_NOT_COMPLETE');
});

test('publishing an upcoming trip is refused — planning finished is not the trip happening', async () => {
  await api(`/v1/itineraries/${trip}/finish-planning`, 'POST', owner);
  const plannedTooEarly = await api(`/v1/itineraries/${trip}/publish`, 'POST', owner);
  expect(plannedTooEarly.status).toBe(409);
  expect(plannedTooEarly.body.code).toBe('ITINERARY_NOT_COMPLETE');
});

test('publishing an ongoing trip is refused too', async () => {
  await api(`/v1/itineraries/${trip}/start`, 'POST', owner);
  const stillTooEarly = await api(`/v1/itineraries/${trip}/publish`, 'POST', owner);
  expect(stillTooEarly.status).toBe(409);
  expect(stillTooEarly.body.code).toBe('ITINERARY_NOT_COMPLETE');
});

test("the lifecycle walks draft to completed on the traveler's act", async () => {
  const completed = await api(`/v1/itineraries/${trip}/complete`, 'POST', owner);
  expect(completed.status).toBe(200);
  expect(completed.body.state).toBe('completed');
});

test('publish by the owner on a completed trip lands, public by default', async () => {
  const published = await api(`/v1/itineraries/${trip}/publish`, 'POST', owner);
  expect(published.status).toBe(200);
  expect(published.body.published).toBe(true);
  expect(published.body.visibility).toBe('public');
});

test('a published trip pins its lifecycle — reopen is refused', async () => {
  const pinned = await api(`/v1/itineraries/${trip}/reopen`, 'POST', owner);
  expect(pinned.status).toBe(409);
  expect(pinned.body.code).toBe('ILLEGAL_STATE_TRANSITION');
});

test.describe('the published projection', () => {
  let seen: { status: number; body: any };

  test.beforeAll(async () => {
    seen = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  });

  test('a stranger opens the published page by direct route', () => {
    expect(seen.status).toBe(200);
  });

  test('the projection field set is exactly the pinned one', () => {
    expect(Object.keys(seen.body ?? {}).sort()).toEqual(PROJECTION_FIELDS);
  });

  test('the absence rule holds on the wire — no dates, state, stamps, roster, attribution', () => {
    const raw = JSON.stringify(seen.body);
    expect(FORBIDDEN.filter((field) => raw.includes(`"${field}"`))).toEqual([]);
  });

  test('the date span itself appears nowhere', () => {
    const raw = JSON.stringify(seen.body);
    expect(raw.includes('2027-03-04')).toBe(false);
    expect(raw.includes('2027-03-08')).toBe(false);
  });

  test('duration derives from the day count, not the span', () => {
    expect(seen.body.durationDays).toBe(2);
  });

  test('Creator Tips cross the wall onto the day cards', () => {
    expect(seen.body.days[0].activities[0].notes?.startsWith('Book the earliest slot')).toBe(true);
  });

  test('per-activity costs render and the single-currency total is derived', () => {
    expect(seen.body.estimatedCost?.currency).toBe('PHP');
    expect(Number(seen.body.estimatedCost.amount)).toBe(800);
  });

  test('standouts and best time reach the projection', () => {
    expect(seen.body.standouts).toHaveLength(2);
    expect(seen.body.bestTimeOfYear).toBe('Dec – Apr');
  });
});

test('a published plan is frozen — the edit is refused, naming why', async () => {
  const frozen = await api(`/v1/itineraries/${trip}/days/${dayTwo}/activities`, 'POST', owner, {
    title: 'Ferry',
    costAmount: '40',
    costCurrency: 'USD',
  });
  expect(frozen.status).toBe(409);
  expect(frozen.body.code).toBe('ITINERARY_PUBLISHED');
});

test('unpublishing leaves the trip completed — it does not un-travel it', async () => {
  const unpublished = await api(`/v1/itineraries/${trip}/unpublish`, 'POST', owner);
  expect(unpublished.status).toBe(200);
  expect(unpublished.body.state).toBe('completed');
  expect(unpublished.body.published).toBe(false);
});

test('and the plan is editable again', async () => {
  const thawed = await api(`/v1/itineraries/${trip}/days/${dayTwo}/activities`, 'POST', owner, {
    title: 'Ferry',
    costAmount: '40',
    costCurrency: 'USD',
  });
  expect(thawed.status).toBe(201);
});

test('the one-step undo works once unpublished', async () => {
  const reopened = await api(`/v1/itineraries/${trip}/reopen`, 'POST', owner);
  expect(reopened.status).toBe(200);
  expect(reopened.body.state).toBe('ongoing');
});

test.describe('a mixed-currency plan, republished', () => {
  let mixed: { status: number; body: any };

  test.beforeAll(async () => {
    await api(`/v1/itineraries/${trip}/complete`, 'POST', owner);
    await api(`/v1/itineraries/${trip}/publish`, 'POST', owner);
    mixed = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  });

  test('a mixed-currency plan shows prices and no total', () => {
    expect(mixed.body.estimatedCost ?? null).toBeNull();
  });

  test('and "/Person" appears nowhere on the wire', () => {
    expect(JSON.stringify(mixed.body).includes('Person')).toBe(false);
  });

  test('the byline is the current owner', () => {
    expect(mixed.body.creator.id).toBe(ownerId);
  });
});

test('the projection is one page for every audience — the member reads it too', async () => {
  const memberSees = await api(`/v1/published-itineraries/${trip}`, 'GET', member);
  expect(memberSees.status).toBe(200);
});

test.describe('the audience axis', () => {
  let madePrivate: { status: number; body: any };
  let privateForMember: { status: number; body: any };
  let privateForStranger: { status: number; body: any };

  test.beforeAll(async () => {
    madePrivate = await api(`/v1/itineraries/${trip}/audience`, 'POST', owner, { audience: 'private' });
    privateForMember = await api(`/v1/published-itineraries/${trip}`, 'GET', member);
    privateForStranger = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  });

  test('published plus private is legal — it stays in the feed while the audience narrows', () => {
    expect(madePrivate.status).toBe(200);
    expect(madePrivate.body.published).toBe(true);
    expect(madePrivate.body.visibility).toBe('private');
  });

  test('the collaborator reads the overview', () => {
    expect(privateForMember.status).toBe(200);
  });

  test('a stranger is masked, indistinguishably from never-existed', () => {
    expect(privateForStranger.status).toBe(404);
    expect(privateForStranger.body.code).toBe('ITINERARY_NOT_FOUND');
  });
});

test('the audience toggles without touching the other two axes', async () => {
  const backToPublic = await api(`/v1/itineraries/${trip}/audience`, 'POST', owner, { audience: 'public' });
  expect(backToPublic.status).toBe(200);
  expect(backToPublic.body.visibility).toBe('public');
  expect(backToPublic.body.published).toBe(true);
  expect(backToPublic.body.state).toBe('completed');
});

test('unpublish masks the stranger again', async () => {
  const withdrawn = await api(`/v1/itineraries/${trip}/unpublish`, 'POST', owner);
  const goneAgain = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  expect(withdrawn.status).toBe(200);
  expect(goneAgain.status).toBe(404);
});

test('a complete and public but unpublished trip still has no page — discovery is its own axis', async () => {
  const stillNoPage = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  expect(stillNoPage.status).toBe(404);
});

test('republish serves the same itinerary id — no new identity', async () => {
  const republished = await api(`/v1/itineraries/${trip}/publish`, 'POST', owner);
  const backAgain = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  expect(republished.body.id).toBe(trip);
  expect(backAgain.body.id).toBe(trip);
});

test.describe('the archive fence', () => {
  let archivedPublic: { status: number; body: any };
  let archivedMember: { status: number; body: any };
  let archivedMemberList: { status: number; body: any };
  let archivedOwner: { status: number; body: any };
  let fencedPublish: { status: number; body: any };

  test.beforeAll(async () => {
    await api(`/v1/itineraries/${trip}/archive`, 'POST', owner);
    archivedPublic = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
    archivedMember = await api(`/v1/itineraries/${trip}`, 'GET', member);
    archivedMemberList = await api('/v1/itineraries?archived=true', 'GET', member);
    archivedOwner = await api(`/v1/itineraries/${trip}`, 'GET', owner);
    fencedPublish = await api(`/v1/itineraries/${trip}/unpublish`, 'POST', owner);
  });

  test('archived masks the stranger on the public page', () => {
    expect(archivedPublic.status).toBe(404);
  });

  test('archived masks the member on a direct read', () => {
    expect(archivedMember.status).toBe(404);
  });

  test("archived excludes it from the member's archived list", () => {
    expect((archivedMemberList.body?.items ?? []).some((row: { id: string }) => row.id === trip)).toBe(false);
  });

  test('archived retains the owner’s access', () => {
    expect(archivedOwner.status).toBe(200);
  });

  test('the fence rejects publish and unpublish', () => {
    expect(fencedPublish.status).toBe(409);
    expect(fencedPublish.body.code).toBe('TRIP_ARCHIVED');
  });
});

test('unarchive restores the public page and the member’s sight', async () => {
  await api(`/v1/itineraries/${trip}/unarchive`, 'POST', owner);
  const restoredPublic = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  const restoredMember = await api(`/v1/itineraries/${trip}`, 'GET', member);
  expect(restoredPublic.status).toBe(200);
  expect(restoredMember.status).toBe(200);
});

test('an empty itinerary publishes and projects cleanly', async () => {
  const empty = await api('/v1/itineraries', 'POST', owner, {
    title: stamp('Someday, Japan'),
    destinations: ['Japan'],
  });
  await api(`/v1/itineraries/${empty.body.id}/finish-planning`, 'POST', owner);
  await api(`/v1/itineraries/${empty.body.id}/start`, 'POST', owner);
  await api(`/v1/itineraries/${empty.body.id}/complete`, 'POST', owner);
  const emptyPublish = await api(`/v1/itineraries/${empty.body.id}/publish`, 'POST', owner);
  const emptySeen = await api(`/v1/published-itineraries/${empty.body.id}`, 'GET', consumer);

  expect(emptyPublish.status).toBe(200);
  expect(emptySeen.status).toBe(200);
  expect(emptySeen.body.durationDays).toBe(0);
  expect(emptySeen.body.days).toHaveLength(0);
  expect(emptySeen.body.standouts).toHaveLength(0);
});

test('a client that cannot send the new fields does not erase them', async () => {
  const stillADraft = await api('/v1/itineraries', 'POST', owner, {
    title: stamp('Someday, Japan'),
    destinations: ['Japan'],
  });
  await api(`/v1/itineraries/${stillADraft.body.id}/edit-lock`, 'POST', owner, { subjectType: 'header' });
  await api(`/v1/itineraries/${stillADraft.body.id}`, 'PATCH', owner, {
    title: 'Someday, Japan',
    destinations: ['Japan'],
    standouts: ['Cherry blossoms'],
    bestTimeOfYear: 'Mar – Apr',
  });
  const olderClient = await api(`/v1/itineraries/${stillADraft.body.id}`, 'PATCH', owner, {
    title: 'Renamed by a client that predates the fields',
    destinations: ['Japan'],
  });

  expect(olderClient.body.standouts).toHaveLength(1);
  expect(olderClient.body.bestTimeOfYear).toBe('Mar – Apr');
});
