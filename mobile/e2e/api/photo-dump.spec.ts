import { test, expect } from '../support/fixtures';
import { api, address, tokenFor, profileFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP, STRANGER_TAG } from '../support/identities';
import { SeedFailure, stamp } from '../support/seed';
import { fetchBytes, jpegWithExif, solidJpeg, uploadBytes, wideJpeg } from '../support/bytes';

const OWNER = ownerTagFor('api/photo-dump');
const MEMBER = IDENTITY_MAP['api/photo-dump'].tags[1]!;
const STRANGER = STRANGER_TAG;

requireStack(OWNER);

test.describe.configure({ mode: 'serial' });

const GPS_SENTINEL = 'LARGATA-DUMP-COORDS';

let owner: string;
let member: string;
let stranger: string;
let trip: string;
let dump: string;
let memberPhoto: { id: string; url: string; thumbUrl: string };
let ownerPhoto: { id: string; url: string };
let afterPublish: { status: number; body: any };

test.beforeAll(async () => {
  owner = await tokenFor(OWNER);
  member = await tokenFor(MEMBER);
  stranger = await tokenFor(STRANGER);
  await profileFor(OWNER);
  await profileFor(MEMBER);
  await profileFor(STRANGER);

  const created = await api('/v1/itineraries', 'POST', owner, {
    title: stamp('Photo Dump Trip'),
    destination: 'Siargao',
    durationDays: 2,
  });
  if (created.status !== 201) throw new SeedFailure('the photo-dump trip', created.body);
  trip = created.body.id;
  dump = `/v1/itineraries/${trip}/photo-dump`;
});

test('a member joins the trip through the real invite then accept', async () => {
  const invited = await api(`/v1/itineraries/${trip}/invitations/by-handle`, 'POST', owner, {
    handle: (await profileFor(MEMBER)).handle,
  });
  const inbox = await api('/v1/invitations', 'GET', member);
  const card = (inbox.body?.items ?? []).find((row: { id: string }) => row.id === invited.body?.id);
  const accepted = await api(`/v1/invitations/${invited.body?.id}/accept`, 'POST', member, {});

  expect(invited.status).toBe(201);
  expect(card).toBeDefined();
  expect(accepted.status).toBe(200);
});

test('a fresh pool is empty and pages in the standard shape', async () => {
  const empty = await api(dump, 'GET', member);
  expect(empty.status).toBe(200);
  expect(Array.isArray(empty.body?.items)).toBe(true);
  expect(empty.body.items).toHaveLength(0);
  expect(empty.body.nextCursor ?? null).toBeNull();
});

test('a member uploads a photo into the pool, carrying backend media urls', async () => {
  const mine = await uploadBytes(dump, member, jpegWithExif(GPS_SENTINEL), 'dump.jpg');
  expect(mine.status).toBe(201);
  expect(mine.body?.url?.startsWith('/v1/media/')).toBe(true);
  expect(mine.body?.thumbUrl?.endsWith('/thumb')).toBe(true);
  memberPhoto = mine.body;
});

test('the owner uploads into the same shared pool', async () => {
  const theirs = await uploadBytes(dump, owner, solidJpeg(), 'dump.jpg');
  expect(theirs.status).toBe(201);
  ownerPhoto = theirs.body;
});

test('every member sees one pool, in upload order', async () => {
  const listed = await api(dump, 'GET', owner);
  const ids = (listed.body?.items ?? []).map((photo: { id: string }) => photo.id);
  expect(ids).toEqual([memberPhoto.id, ownerPhoto.id]);
});

test("a member reads another member's photo bytes, stripped of its GPS sentinel", async () => {
  const bytes = await fetchBytes(memberPhoto.url, owner);
  expect(bytes.status).toBe(200);
  expect(bytes.bytes.includes(Buffer.from(GPS_SENTINEL, 'ascii'))).toBe(false);
});

test('a photo larger than the thumb bound serves two genuinely different variants', async () => {
  const big = await uploadBytes(dump, member, wideJpeg(), 'dump.jpg');
  const bigDisplay = await fetchBytes(big.body?.url, owner);
  const bigThumb = await fetchBytes(big.body?.thumbUrl, owner);

  expect(bigDisplay.status).toBe(200);
  expect(bigThumb.status).toBe(200);
  expect(bigThumb.bytes.length).toBeLessThan(bigDisplay.bytes.length);

  await api(`${dump}/${big.body?.id}`, 'DELETE', member);
});

test('an unauthenticated media GET is refused — the ANON-GET tell', async () => {
  const anon = await fetchBytes(memberPhoto.url, undefined);
  expect(anon.status).toBe(401);
});

test('a non-member is masked on list, media, upload and delete', async () => {
  const strangerList = await api(dump, 'GET', stranger);
  const strangerRead = await fetchBytes(memberPhoto.url, stranger);
  const strangerUp = await uploadBytes(dump, stranger, solidJpeg(), 'dump.jpg');
  const strangerDelete = await api(`${dump}/${memberPhoto.id}`, 'DELETE', stranger);

  expect(strangerList.status).toBe(404);
  expect(strangerRead.status).toBe(404);
  expect(strangerUp.status).toBe(404);
  expect(strangerDelete.status).toBe(404);
});

test("a member deleting another member's photo is refused by name, not masked", async () => {
  const poaching = await api(`${dump}/${ownerPhoto.id}`, 'DELETE', member);
  expect(poaching.status).toBe(403);
  expect(poaching.body?.code).toBe('NOT_PERMITTED');
});

test('the uploader takes their own photo out, and both stored variants go with it', async () => {
  const ownDelete = await api(`${dump}/${memberPhoto.id}`, 'DELETE', member);
  expect(ownDelete.status).toBe(204);

  const goneBytes = await fetchBytes(memberPhoto.url, owner);
  const goneThumb = await fetchBytes(memberPhoto.thumbUrl, owner);
  expect(goneBytes.status).toBe(404);
  expect(goneThumb.status).toBe(404);
});

test('the owner takes out their own photo', async () => {
  const ownersOwn = await api(`${dump}/${ownerPhoto.id}`, 'DELETE', owner);
  expect(ownersOwn.status).toBe(204);
});

test("the owner takes out another member's photo — owner authority, not uploader authority", async () => {
  const membersPhoto = await uploadBytes(dump, member, solidJpeg(), 'dump.jpg');
  const ownerDeletesTheirs = await api(`${dump}/${membersPhoto.body?.id}`, 'DELETE', owner);
  expect(membersPhoto.status).toBe(201);
  expect(ownerDeletesTheirs.status).toBe(204);
});

test('a published trip still takes photos — the freeze is the plan, not the pool', async () => {
  for (const step of ['start', 'complete', 'publish']) {
    await api(`/v1/itineraries/${trip}/${step}`, 'POST', owner);
  }
  afterPublish = await uploadBytes(dump, member, solidJpeg(), 'dump.jpg');
  expect(afterPublish.status).toBe(201);
});

test('publishing never opens the pool to travelers outside the trip', async () => {
  const strangerAfterPublish = await fetchBytes(afterPublish.body.url, stranger);
  expect(strangerAfterPublish.status).toBe(404);
});

test('an archived trip refuses upload and delete — the fence', async () => {
  await api(`/v1/itineraries/${trip}/archive`, 'POST', owner);
  const archivedUpload = await uploadBytes(dump, owner, solidJpeg(), 'dump.jpg');
  const archivedDelete = await api(`${dump}/${afterPublish.body.id}`, 'DELETE', owner);
  expect(archivedUpload.status).toBe(409);
  expect(archivedDelete.status).toBe(409);
});

test('the archived pool stays readable to the owner and masks the member', async () => {
  const ownerStillReads = await api(dump, 'GET', owner);
  const memberMasked = await api(dump, 'GET', member);
  expect(ownerStillReads.status).toBe(200);
  expect(ownerStillReads.body.items).toHaveLength(1);
  expect(memberMasked.status).toBe(404);
});
