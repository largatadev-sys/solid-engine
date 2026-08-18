import { readFileSync } from 'node:fs';
import { test, expect } from '../support/fixtures';
import { api, address, request, tokenFor, API, profileFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP } from '../support/identities';
import { FIXTURE_PHOTO, SeedFailure, stamp } from '../support/seed';

const OWNER = ownerTagFor('api/archive-posture');
const MEMBER = IDENTITY_MAP['api/archive-posture'].tags[1]!;

requireStack(OWNER);

test.describe.configure({ mode: 'serial' });

let owner: string;
let member: string;
let memberId: string;
let trip: string;
let dayId: string;
let activityId: string;
let memberCardId: string;

async function postcard(token: string, caption: string): Promise<{ status: number; body: any }> {
  const boundary = `----largataarchive${process.hrtime.bigint().toString(36)}`;
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="entry"\r\n`
        + `Content-Type: application/json\r\n\r\n`
        + `${JSON.stringify({ activityId, caption, fromDump: [] })}\r\n`,
    ),
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="photos"; filename="photo.jpg"\r\n`
        + `Content-Type: image/jpeg\r\n\r\n`,
    ),
    readFileSync(FIXTURE_PHOTO),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return request(`${API}/v1/itineraries/${trip}/diary/entries`, 'POST', payload, {
    Authorization: `Bearer ${token}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });
}

async function listsTrip(token: string): Promise<boolean> {
  const page = await api('/v1/me/diary/trips?limit=50', 'GET', token);
  return (page.body?.items ?? []).some((row: { itineraryId: string }) => row.itineraryId === trip);
}

const masked = (response: { status: number; body: any }): void => {
  expect(response.status).toBe(404);
  expect(response.body?.code).toBe('ITINERARY_NOT_FOUND');
};

const archivedRefusal = (response: { status: number; body: any }): void => {
  expect(response.status).toBe(409);
  expect(response.body?.code).toBe('TRIP_ARCHIVED');
};

test.beforeAll(async () => {
  owner = await tokenFor(OWNER);
  member = await tokenFor(MEMBER);
  memberId = (await api('/v1/me', 'GET', member)).body.id;

  const created = await api('/v1/itineraries', 'POST', owner, {
    title: stamp('Archive walk'),
    destination: 'Cebu',
    durationDays: 2,
  });
  if (created.status !== 201) throw new SeedFailure('the archive-posture trip', created.body);
  trip = created.body.id;
});

test('the member is invited', async () => {
  const invited = await api(`/v1/itineraries/${trip}/invitations/by-handle`, 'POST', owner, {
    handle: (await profileFor(MEMBER)).handle,
  });
  expect(invited.status).toBe(201);

  const accepted = await api(`/v1/invitations/${invited.body.id}/accept`, 'POST', member, {});
  expect([200, 204]).toContain(accepted.status);
});

test('the roster genuinely holds two travelers — the probes below run as a MEMBER, not a stranger', async () => {
  const roster = await api(`/v1/itineraries/${trip}/members`, 'GET', owner);
  expect((roster.body?.items ?? []).length).toBe(2);
});

test('both travelers hold a postcard on the trip', async () => {
  await api(`/v1/itineraries/${trip}/finish-planning`, 'POST', owner);
  await api(`/v1/itineraries/${trip}/start`, 'POST', owner);

  const plan = await api(`/v1/itineraries/${trip}`, 'GET', owner);
  dayId = plan.body.days[0].id;

  await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', owner);
  const activity = await api(`/v1/itineraries/${trip}/days/${dayId}/activities`, 'POST', owner, {
    title: stamp('Sunset'),
  });
  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', owner);
  activityId = activity.body.id;

  const ownerCard = await postcard(owner, stamp('owner memory'));
  const memberCard = await postcard(member, stamp('member memory'));
  expect(ownerCard.status).toBe(201);
  expect(memberCard.status).toBe(201);
  memberCardId = memberCard.body.id;
});

test('before the archive, BOTH see the trip in their diary list', async () => {
  expect(await listsTrip(owner)).toBe(true);
  expect(await listsTrip(member)).toBe(true);
});

test('the owner archives the trip', async () => {
  const archived = await api(`/v1/itineraries/${trip}/archive`, 'POST', owner);
  expect(archived.status).toBe(200);
});

test('AC 5: the member diary list no longer offers the archived trip — the dead card is gone', async () => {
  expect(await listsTrip(member)).toBe(false);
});

test('AC 5: the owner diary list still holds it — they legitimately still see it', async () => {
  expect(await listsTrip(owner)).toBe(true);
});

test('AC 1/2: a day write answers the member with the not-found mask', async () => {
  masked(await api(`/v1/itineraries/${trip}/days`, 'POST', member, { title: 'While frozen' }));
});

test('AC 1/2: an activity write answers the member with the not-found mask', async () => {
  masked(await api(`/v1/itineraries/${trip}/days/${dayId}/activities`, 'POST', member, { title: 'x' }));
});

test('AC 1/2: acquiring the editing session answers the member with the not-found mask', async () => {
  masked(await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', member));
});

test('AC 1/2: recaptioning their own postcard answers the member with the not-found mask', async () => {
  masked(
    await api(`/v1/itineraries/${trip}/diary/entries/${memberCardId}`, 'PATCH', member, {
      caption: 'after the fence',
    }),
  );
});

test('AC 1/2: deleting their own postcard answers the member with the not-found mask', async () => {
  masked(await api(`/v1/itineraries/${trip}/diary/entries/${memberCardId}`, 'DELETE', member));
});

test('AC 1/2: issuing an invitation — a PERMISSION refusal on a live trip — is masked here', async () => {
  masked(
    await api(`/v1/itineraries/${trip}/invitations`, 'POST', member, { email: 'x@example.com' }),
  );
});

test('AC 1/2: offering ownership — likewise a 403 on a live trip — is masked here', async () => {
  masked(
    await api(`/v1/itineraries/${trip}/ownership-offer`, 'POST', member, { travelerId: memberId }),
  );
});

test('AC 3: a day write still answers 409 TRIP_ARCHIVED for the owner', async () => {
  archivedRefusal(
    await api(`/v1/itineraries/${trip}/days`, 'POST', owner, { title: 'While frozen' }),
  );
});

test('AC 3: acquiring the editing session still answers 409 TRIP_ARCHIVED for the owner', async () => {
  archivedRefusal(await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', owner));
});

test('AC 3: issuing an invitation still answers 409 TRIP_ARCHIVED for the owner', async () => {
  archivedRefusal(
    await api(`/v1/itineraries/${trip}/invitations`, 'POST', owner, { email: 'x@example.com' }),
  );
});

test('AC 4: the member can still leave a trip archived under them', async () => {
  const left = await api(`/v1/itineraries/${trip}/members/${memberId}`, 'DELETE', member);
  expect(left.status).toBe(204);
});

test('AC 4: and the trip stays masked from them afterwards', async () => {
  expect((await api(`/v1/itineraries/${trip}`, 'GET', member)).status).toBe(404);
});
