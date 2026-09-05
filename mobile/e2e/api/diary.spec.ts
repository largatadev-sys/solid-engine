import { test, expect } from '../support/fixtures';
import { api, address, tokenFor, profileFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP, STRANGER_TAG } from '../support/identities';
import { SeedFailure, stamp } from '../support/seed';
import { fetchBytes, postDiaryEntry, solidJpeg, uploadBytes } from '../support/bytes';

const AUTHOR = ownerTagFor('api/diary');
const CO_TRAVELER = IDENTITY_MAP['api/diary'].tags[1]!;
const STRANGER = STRANGER_TAG;

requireStack(AUTHOR);

test.describe.configure({ mode: 'serial' });

const TITLE = stamp('Diary Trip');

let author: string;
let coTraveler: string;
let stranger: string;
let trip: string;
let diary: string;
let dayOneId: string;
let dayTwoId: string;
let activityId: string;
let poolPhoto: { id: string; url: string };
let entry: any;
let retroActivityId: string;
let retro: { status: number; body: any };

const entriesOf = async (token: string): Promise<any[]> =>
  (await api(diary, 'GET', token)).body?.items ?? [];

const postDiary = (
  token: string,
  payload: { activityId: string; caption: string | null; fromDump: string[] },
  photoCount: number,
): Promise<{ status: number; body: any }> => postDiaryEntry(trip, token, payload, photoCount);

test.beforeAll(async () => {
  author = await tokenFor(AUTHOR);
  coTraveler = await tokenFor(CO_TRAVELER);
  stranger = await tokenFor(STRANGER);
  await profileFor(AUTHOR);
  await profileFor(CO_TRAVELER);
  await profileFor(STRANGER);

  const created = await api('/v1/itineraries', 'POST', author, {
    title: TITLE,
    destination: 'El Nido',
    durationDays: 2,
  });
  if (created.status !== 201) throw new SeedFailure('the diary trip', created.body);
  trip = created.body.id;
  diary = `/v1/itineraries/${trip}/diary/entries`;
});

test('a co-traveler joins the trip through the real invite then accept', async () => {
  const invited = await api(`/v1/itineraries/${trip}/invitations/by-handle`, 'POST', author, {
    handle: (await profileFor(CO_TRAVELER)).handle,
  });
  const accepted = await api(`/v1/invitations/${invited.body?.id}/accept`, 'POST', coTraveler, {});
  expect(invited.status).toBe(201);
  expect(accepted.status).toBe(200);
});

test('a draft trip refuses the whole act with the named code', async () => {
  const plan = (await api(`/v1/itineraries/${trip}`, 'GET', author)).body;
  dayOneId = plan.days[0].id;
  dayTwoId = plan.days[1].id;

  const activity = await api(`/v1/itineraries/${trip}/days/${dayOneId}/activities`, 'POST', author, {
    title: 'Sunset at Las Cabanas',
    timeOfDay: '17:30',
  });
  if (activity.status !== 201) throw new SeedFailure('the sunset activity', activity.body);
  activityId = activity.body.id;

  const draftPost = await postDiary(author, { activityId, caption: null, fromDump: [] }, 1);
  expect(draftPost.status).toBe(400);
  expect(draftPost.body?.code).toBe('TRIP_NOT_STARTED');
});

test('an upcoming trip refuses too — a diary of a trip that has not happened is fiction', async () => {
  const upcomingPost = await postDiary(author, { activityId, caption: null, fromDump: [] }, 1);
  expect(upcomingPost.status).toBe(400);
  expect(upcomingPost.body?.code).toBe('TRIP_NOT_STARTED');
});

test('a co-traveler puts a photo in the trip pool for the author to draw from', async () => {
  await api(`/v1/itineraries/${trip}/start`, 'POST', author);
  const uploaded = await uploadBytes(
    `/v1/itineraries/${trip}/photo-dump`,
    coTraveler,
    solidJpeg(),
    'pool.jpg',
  );
  poolPhoto = uploaded.body;
  expect(poolPhoto?.id).toBeDefined();
});

test('the floor and the cap both refuse the whole act', async () => {
  const zero = await postDiary(author, { activityId, caption: null, fromDump: [] }, 0);
  const six = await postDiary(author, { activityId, caption: null, fromDump: [] }, 6);
  expect(zero.status).toBe(400);
  expect(zero.body?.code).toBe('DIARY_ENTRY_NEEDS_A_PHOTO');
  expect(six.status).toBe(400);
  expect(six.body?.code).toBe('TOO_MANY_DIARY_PHOTOS');
});

test('two device photos plus one dump photo plus a caption make one postcard', async () => {
  const posted = await postDiary(
    author,
    { activityId, caption: 'Best evening of the trip', fromDump: [poolPhoto.id] },
    2,
  );
  expect(posted.status).toBe(201);
  expect(posted.body?.photos).toHaveLength(3);
  expect(posted.body?.caption).toBe('Best evening of the trip');
  entry = posted.body;
});

test('the snapshot records the activity as it was at post time', () => {
  expect(entry.activityTitle).toBe('Sunset at Las Cabanas');
  expect(entry.dayLabel).toBe('Day 1');
  expect(entry.timeOfDay.startsWith('17:30')).toBe(true);
});

test('the dump photo was copied, never referenced', () => {
  expect(entry.photos.some((photo: { id: string }) => photo.id === poolPhoto.id)).toBe(false);
});

test('the plan is corrected mid-trip and the trip never leaves ongoing', async () => {
  const held = await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', author, {
    subjectType: 'session',
  });
  const basePlan = (await api(`/v1/itineraries/${trip}`, 'GET', author)).body;
  const midTripSave = await api(`/v1/itineraries/${trip}/plan`, 'PUT', author, {
    basePlanVersion: basePlan.planVersion,
    days: basePlan.days.map((day: any) => ({
      id: day.id,
      title: day.id === dayOneId ? 'Plans changed on the road' : day.title,
      activities: day.activities.map((activity: any) => ({
        id: activity.id,
        fields: { title: activity.title },
      })),
    })),
  });
  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', author, { subjectType: 'session' });

  expect(held.status).toBe(200);
  expect(midTripSave.status).toBe(200);
  expect((await api(`/v1/itineraries/${trip}`, 'GET', author)).body?.state).toBe('ongoing');
});

test('a postcard posts immediately after a mid-trip plan edit — the blackout is gone', async () => {
  const afterEditActivity = await api(
    `/v1/itineraries/${trip}/days/${dayOneId}/activities`,
    'POST',
    author,
    { title: 'Late dinner, decided on the road' },
  );
  const afterEdit = await postDiary(
    author,
    { activityId: afterEditActivity.body.id, caption: 'Posted right after the plan changed', fromDump: [] },
    1,
  );
  expect(afterEdit.status).toBe(201);
  await api(`${diary}/${afterEdit.body?.id}`, 'DELETE', author);
});

test('the photo of a public postcard serves any signed-in traveler, and nobody else', async () => {
  const authorReads = await fetchBytes(entry.photos[0].url, author);
  const coTravelerReads = await fetchBytes(entry.photos[0].url, coTraveler);
  const strangerReads = await fetchBytes(entry.photos[0].url, stranger);
  const anonReads = await fetchBytes(entry.photos[0].url, undefined);

  expect(authorReads.status).toBe(200);
  expect(authorReads.bytes.length).toBeGreaterThan(0);
  expect(coTravelerReads.status).toBe(200);
  expect(strangerReads.status).toBe(200);
  expect(anonReads.status).toBe(401);
});

test("a private author's postcard bytes answer nothing to anyone who does not follow", async () => {
  await api('/v1/me', 'PATCH', author, { profileVisibility: 'private' });
  try {
    const coTravelerReads = await fetchBytes(entry.photos[0].url, coTraveler);
    const strangerReads = await fetchBytes(entry.photos[0].url, stranger);
    const authorReads = await fetchBytes(entry.photos[0].url, author);

    expect(
      coTravelerReads.status,
      'the twin of the public case above: membership is not the key, follow is',
    ).toBe(404);
    expect(strangerReads.status).toBe(404);
    expect(authorReads.status, 'the author always reads their own').toBe(200);
  } finally {
    await api('/v1/me', 'PATCH', author, { profileVisibility: 'public' });
  }
});

test('the mine-list serves each traveler only their own', async () => {
  const coTravelerSees = await api(diary, 'GET', coTraveler);
  expect(coTravelerSees.status).toBe(200);
  expect(coTravelerSees.body.items).toHaveLength(0);
});

test('a non-member is masked on read and on write', async () => {
  const strangerList = await api(diary, 'GET', stranger);
  const strangerPost = await postDiary(stranger, { activityId, caption: null, fromDump: [] }, 1);
  expect(strangerList.status).toBe(404);
  expect(strangerPost.status).toBe(404);
});

test('a second postcard for the same activity refuses', async () => {
  const second = await postDiary(author, { activityId, caption: null, fromDump: [] }, 1);
  expect(second.status).toBe(409);
  expect(second.body?.code).toBe('ACTIVITY_ALREADY_IN_DIARY');
});

test('every traveler owns their own diary — a co-traveler posts from the same activity', async () => {
  const theirOwn = await postDiary(
    coTraveler,
    { activityId, caption: "mine, not the author's", fromDump: [] },
    1,
  );
  expect(theirOwn.status).toBe(201);
});

test('the plan edits below actually ran — a 409 here would make every snapshot check pass vacuously', async () => {
  const lock = await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', author, {
    subjectType: 'activity',
    subjectId: activityId,
  });
  const renamed = await api(
    `/v1/itineraries/${trip}/days/${dayOneId}/activities/${activityId}`,
    'PATCH',
    author,
    { title: 'Renamed after the fact' },
  );
  expect(lock.status).toBe(200);
  expect(renamed.status).toBe(200);
});

test('renaming the activity never rewrites a memory already posted', async () => {
  const afterRename = (await entriesOf(author))[0];
  expect(afterRename.activityTitle).toBe('Sunset at Las Cabanas');
});

test('moving it to another day does not move the postcard', async () => {
  const moved = await api(
    `/v1/itineraries/${trip}/days/${dayOneId}/activities/${activityId}/move`,
    'POST',
    author,
    { targetDayId: dayTwoId },
  );
  const afterMove = (await entriesOf(author))[0];
  expect(moved.status).toBe(200);
  expect(afterMove.dayLabel).toBe('Day 1');
});

test('the activity really was deleted', async () => {
  const killed = await api(
    `/v1/itineraries/${trip}/days/${dayTwoId}/activities/${activityId}`,
    'DELETE',
    author,
  );
  expect(killed.status).toBe(204);
});

test('deleting the activity leaves the provenance pointer dangling and the postcard whole', async () => {
  const afterDelete = (await entriesOf(author))[0];
  expect(afterDelete.activityId).toBe(activityId);
  expect(afterDelete.activityTitle).toBe('Sunset at Las Cabanas');
  expect(afterDelete.photos).toHaveLength(3);
});

test('deleting the pool photo never reaches the diary that copied it', async () => {
  const afterDelete = (await entriesOf(author))[0];
  const copied = afterDelete.photos.find((photo: { id?: string }) => photo.id !== undefined);
  await api(`/v1/itineraries/${trip}/photo-dump/${poolPhoto.id}`, 'DELETE', coTraveler);

  const stillServes = await fetchBytes(copied.url, author);
  const poolGone = await fetchBytes(poolPhoto.url, author);
  expect(stillServes.status).toBe(200);
  expect(poolGone.status).toBe(404);
});

test('a caption-only edit lands and leaves the photos alone', async () => {
  const recaptioned = await api(`${diary}/${entry.id}`, 'PATCH', author, {
    caption: 'Second thoughts',
  });
  expect(recaptioned.status).toBe(200);
  expect(recaptioned.body.caption).toBe('Second thoughts');
  expect(recaptioned.body.photos).toHaveLength(3);
});

test('only the author may touch a postcard — a co-traveler is masked, not forbidden', async () => {
  const theirEdit = await api(`${diary}/${entry.id}`, 'PATCH', coTraveler, {
    caption: 'not yours to write',
  });
  const theirDelete = await api(`${diary}/${entry.id}`, 'DELETE', coTraveler);
  expect(theirEdit.status).toBe(404);
  expect(theirDelete.status).toBe(404);
});

test("My Diary groups the author's entries by trip, with a count", async () => {
  const trips = await api('/v1/me/diary/trips', 'GET', author);
  const thisTrip = (trips.body?.items ?? []).find(
    (row: { itineraryId: string }) => row.itineraryId === trip,
  );
  expect(trips.status).toBe(200);
  expect(thisTrip?.entryCount).toBe(1);
  expect(thisTrip?.title).toBe(TITLE);
});

test("each traveler's My Diary counts only their own entries on the shared trip", async () => {
  const theirTrip = ((await api('/v1/me/diary/trips', 'GET', coTraveler)).body?.items ?? []).find(
    (row: { itineraryId: string }) => row.itineraryId === trip,
  );
  expect(theirTrip?.entryCount).toBe(1);
});

test('a completed trip accepts a retrospective postcard', async () => {
  const retroActivity = await api(
    `/v1/itineraries/${trip}/days/${dayTwoId}/activities`,
    'POST',
    author,
    { title: 'Looking back' },
  );
  retroActivityId = retroActivity.body.id;
  await api(`/v1/itineraries/${trip}/complete`, 'POST', author);
  retro = await postDiary(
    author,
    { activityId: retroActivityId, caption: 'Posted after the fact', fromDump: [] },
    1,
  );
  expect(retro.status).toBe(201);
});

test('deleting an entry removes its bytes and frees the activity', async () => {
  const deletedPhotos = retro.body.photos.map((photo: { url: string }) => photo.url);
  const removed = await api(`${diary}/${retro.body.id}`, 'DELETE', author);
  const bytesGone = await fetchBytes(deletedPhotos[0], author);
  const repost = await postDiary(
    author,
    { activityId: retroActivityId, caption: 'Second time', fromDump: [] },
    1,
  );
  expect(removed.status).toBe(204);
  expect(bytesGone.status).toBe(404);
  expect(repost.status).toBe(201);
});

test('an archived trip refuses new writes while its entries stay readable', async () => {
  await api(`/v1/itineraries/${trip}/archive`, 'POST', author);
  const archivedEdit = await api(`${diary}/${entry.id}`, 'PATCH', author, {
    caption: 'after the fence',
  });
  const archivedRead = await api(diary, 'GET', author);
  const archivedTrips = await api('/v1/me/diary/trips', 'GET', author);

  expect(archivedEdit.status).toBe(409);
  expect(archivedRead.status).toBe(200);
  expect(
    archivedRead.body.items.some((row: { caption: string }) => row.caption === 'Second thoughts'),
  ).toBe(true);
  expect(
    (archivedTrips.body?.items ?? []).some((row: { itineraryId: string }) => row.itineraryId === trip),
  ).toBe(true);
});
