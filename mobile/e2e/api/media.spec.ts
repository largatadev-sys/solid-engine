import { test, expect } from '../support/fixtures';
import { api, tokenFor, profileFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP } from '../support/identities';
import { SeedFailure, stamp } from '../support/seed';
import {
  EXIF_MARKER,
  fetchBytes,
  jpegDimensions,
  jpegWithExif,
  solidJpeg,
  uploadBytes,
  wideJpeg,
  type RawResponse,
} from '../support/bytes';

const OWNER = ownerTagFor('api/media');
const STRANGER = IDENTITY_MAP['api/media'].tags[1]!;

requireStack(OWNER);

test.describe.configure({ mode: 'serial' });

const GPS_SENTINEL = 'LARGATA-HOME-COORDS';

let owner: string;
let stranger: string;

test.beforeAll(async () => {
  owner = await tokenFor(OWNER);
  stranger = await tokenFor(STRANGER);
  await profileFor(OWNER);
  await profileFor(STRANGER);
});

test.describe('the avatar', () => {
  let firstUpload: { status: number; body: any };
  let firstUrl: string;
  let served: RawResponse;
  let bigUrl: string;
  let bigDisplay: RawResponse;
  let thumb: RawResponse;

  test.beforeAll(async () => {
    firstUpload = await uploadBytes('/v1/me/avatar', owner, jpegWithExif(GPS_SENTINEL));
    if (firstUpload.status !== 200) throw new SeedFailure('the first avatar', firstUpload.body);
    firstUrl = firstUpload.body.avatarUrl;
    served = await fetchBytes(firstUrl, owner);

    const bigUpload = await uploadBytes('/v1/me/avatar', owner, wideJpeg());
    if (bigUpload.status !== 200) throw new SeedFailure('the wide avatar', bigUpload.body);
    bigUrl = bigUpload.body.avatarUrl;
    bigDisplay = await fetchBytes(bigUrl, owner);
    thumb = await fetchBytes(`${bigUrl}/thumb`, owner);
  });

  test('an avatar uploads and lands on the profile', () => {
    expect(firstUpload.status).toBe(200);
    expect(typeof firstUpload.body.avatarUrl).toBe('string');
  });

  test('the stored url is our url, never a provider hostname', () => {
    expect(firstUrl.startsWith('/v1/media/')).toBe(true);
  });

  test('the avatar serves back as a jpeg', () => {
    expect(served.status).toBe(200);
    expect(String(served.headers['content-type'])).toContain('image/jpeg');
  });

  test('the served bytes really are a JPEG', () => {
    expect(served.bytes[0]).toBe(0xff);
    expect(served.bytes[1]).toBe(0xd8);
  });

  test('the GPS sentinel does not survive ingest', () => {
    expect(served.bytes.includes(Buffer.from(GPS_SENTINEL, 'ascii'))).toBe(false);
  });

  test('no EXIF marker survives at all', () => {
    expect(served.bytes.includes(EXIF_MARKER)).toBe(false);
  });

  test('the thumbnail serves and is genuinely smaller than the display variant', () => {
    expect(thumb.status).toBe(200);
    expect(thumb.bytes.length).toBeLessThan(bigDisplay.bytes.length);
  });

  test('an avatar replaced by a later upload is gone immediately', async () => {
    const superseded = await fetchBytes(firstUrl, owner);
    expect(superseded.status).toBe(404);
  });

  test('any authenticated traveler may read an avatar', async () => {
    const byStranger = await fetchBytes(bigUrl, stranger);
    expect(byStranger.status).toBe(200);
  });

  test('a visitor with no token is refused', async () => {
    const byVisitor = await fetchBytes(bigUrl, undefined);
    expect(byVisitor.status).toBe(401);
  });

  test('non-image bytes are refused, named, in the envelope', async () => {
    const notImage = await uploadBytes(
      '/v1/me/avatar',
      owner,
      Buffer.from('<html>not a photo</html>', 'utf8'),
    );
    expect(notImage.status).toBe(400);
    expect(notImage.body?.code).toBe('NOT_AN_IMAGE');
  });

  test('replacing mints a new url, and the replaced photo is gone, bytes and all', async () => {
    const replaced = await uploadBytes('/v1/me/avatar', owner, solidJpeg());
    expect(replaced.status).toBe(200);
    expect(replaced.body.avatarUrl).not.toBe(bigUrl);

    const oldOne = await fetchBytes(bigUrl, owner);
    expect(oldOne.status).toBe(404);
  });

  test('a wide avatar comes back square, so the circle crops nothing', async () => {
    const wide = await uploadBytes('/v1/me/avatar', owner, wideJpeg());
    const wideBytes = await fetchBytes(wide.body.avatarUrl, owner);
    const dimensions = jpegDimensions(wideBytes.bytes);
    expect(dimensions.width).toBe(dimensions.height);
  });

  test('removing answers 204 and clears the profile back to initials', async () => {
    const removed = await api('/v1/me/avatar', 'DELETE', owner);
    const afterRemoval = await api('/v1/me', 'GET', owner);
    expect(removed.status).toBe(204);
    expect(afterRemoval.body?.avatarUrl ?? null).toBeNull();
  });
});

test.describe('the cover, and the audience ladder that governs it', () => {
  let trip: string;
  let coverUrl: string;

  test.beforeAll(async () => {
    const created = await api('/v1/itineraries', 'POST', owner, {
      title: stamp('Cover Trip'),
      destination: 'Palawan',
      durationDays: 2,
    });
    if (created.status !== 201) throw new SeedFailure('the cover trip', created.body);
    trip = created.body.id;
  });

  test('a cover upload without the header lease is refused', async () => {
    const noLease = await uploadBytes(`/v1/itineraries/${trip}/cover`, owner, solidJpeg());
    expect(noLease.status).toBe(409);
  });

  test('the owner sets a cover under the header lease, and the url is ours', async () => {
    await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', owner, { subjectType: 'header' });
    const cover = await uploadBytes(`/v1/itineraries/${trip}/cover`, owner, jpegWithExif(GPS_SENTINEL));
    expect(cover.status).toBe(200);
    expect(typeof cover.body.coverImageUrl).toBe('string');
    expect(cover.body.coverImageUrl.startsWith('/v1/media/')).toBe(true);
    coverUrl = cover.body.coverImageUrl;
  });

  test('the cover strips its EXIF too', async () => {
    const coverBytes = await fetchBytes(coverUrl, owner);
    expect(coverBytes.bytes.includes(EXIF_MARKER)).toBe(false);
  });

  test('a stranger cannot read an unpublished trip cover', async () => {
    const strangerOnPrivate = await fetchBytes(coverUrl, stranger);
    expect(strangerOnPrivate.status).toBe(404);
  });

  test('publishing opens the cover to every traveler', async () => {
    for (const step of ['start', 'complete', 'publish']) {
      await api(`/v1/itineraries/${trip}/${step}`, 'POST', owner);
    }
    const strangerOnPublished = await fetchBytes(coverUrl, stranger);
    expect(strangerOnPublished.status).toBe(200);
  });

  test('a published trip refuses a cover change — the freeze covers media', async () => {
    const frozen = await uploadBytes(`/v1/itineraries/${trip}/cover`, owner, solidJpeg());
    expect(frozen.status).toBe(409);
  });

  test('unpublishing closes the cover again', async () => {
    await api(`/v1/itineraries/${trip}/unpublish`, 'POST', owner);
    const strangerAfterUnpublish = await fetchBytes(coverUrl, stranger);
    expect(strangerAfterUnpublish.status).toBe(404);
  });

  test('the published projection carries the cover', async () => {
    const projection = await api(`/v1/itineraries/${trip}/preview`, 'GET', owner);
    expect(projection.body?.coverImageUrl).toBe(coverUrl);
  });
});

test.describe('the create-flow cover, which takes a different path', () => {
  let fresh: string;
  let landedUrl: string;

  test.beforeAll(async () => {
    const created = await api('/v1/itineraries', 'POST', owner, {
      title: stamp('Created With Cover'),
      destination: 'Palawan',
      durationDays: 2,
    });
    if (created.status !== 201) throw new SeedFailure('the create-flow cover trip', created.body);
    fresh = created.body.id;
  });

  test('a cover straight after create is refused without the lease', async () => {
    const noLeaseYet = await uploadBytes(`/v1/itineraries/${fresh}/cover`, owner, solidJpeg());
    expect(noLeaseYet.status).toBe(409);
  });

  test('taking the header lease first makes the create-flow cover land', async () => {
    await api(`/v1/itineraries/${fresh}/edit-lock`, 'POST', owner, { subjectType: 'header' });
    const withLease = await uploadBytes(`/v1/itineraries/${fresh}/cover`, owner, solidJpeg());
    expect(withLease.status).toBe(200);
    expect(typeof withLease.body.coverImageUrl).toBe('string');
    landedUrl = withLease.body.coverImageUrl;
  });

  test('and the preview carries it', async () => {
    const previewed = await api(`/v1/itineraries/${fresh}/preview`, 'GET', owner);
    expect(previewed.body?.coverImageUrl).toBe(landedUrl);
  });
});

test.describe('activity photos and the derived gallery', () => {
  let trip: string;
  let photosUri: string;
  let added: { status: number; body: any };
  let activityPhotoUrl: string;
  let unleased: { status: number; body: any };

  test.beforeAll(async () => {
    const created = await api('/v1/itineraries', 'POST', owner, {
      title: stamp('Photo Trip'),
      destination: 'Palawan',
      durationDays: 2,
    });
    if (created.status !== 201) throw new SeedFailure('the activity-photo trip', created.body);
    trip = created.body.id;
    const dayOne = created.body.days[0].id;
    const activity = await api(`/v1/itineraries/${trip}/days/${dayOne}/activities`, 'POST', owner, {
      title: 'Kayaking',
    });
    if (activity.status !== 201) throw new SeedFailure('the kayaking activity', activity.body);
    photosUri = `/v1/itineraries/${trip}/days/${dayOne}/activities/${activity.body.id}/photos`;

    const noActivityLease = await uploadBytes(photosUri, owner, solidJpeg());
    await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', owner, {
      subjectType: 'activity',
      subjectId: activity.body.id,
    });
    added = await uploadBytes(photosUri, owner, jpegWithExif(GPS_SENTINEL));
    activityPhotoUrl = added.body?.photos?.[0]?.url;

    unleased = noActivityLease;
  });

  test('an activity photo without the activity lease is refused', () => {
    expect(unleased.status).toBe(409);
  });

  test('an activity photo uploads and lands on the activity', () => {
    expect(added.status).toBe(201);
    expect(added.body.photos).toHaveLength(1);
  });

  test('the activity photo carries a thumb url too', () => {
    expect(typeof added.body.photos?.[0]?.thumbUrl).toBe('string');
  });

  test('the sixth photo is refused, naming the cap', async () => {
    for (let index = 1; index < 5; index += 1) await uploadBytes(photosUri, owner, solidJpeg());
    const sixth = await uploadBytes(photosUri, owner, solidJpeg());
    expect(sixth.status).toBe(400);
    expect(sixth.body?.code).toBe('TOO_MANY_ACTIVITY_PHOTOS');
  });

  test('a stranger cannot read an unpublished activity photo', async () => {
    const strangerOnActivityPhoto = await fetchBytes(activityPhotoUrl, stranger);
    expect(strangerOnActivityPhoto.status).toBe(404);
  });

  test('activity photos cross to the published projection — the gallery source', async () => {
    await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', owner);
    for (const step of ['start', 'complete', 'publish']) {
      await api(`/v1/itineraries/${trip}/${step}`, 'POST', owner);
    }
    const publicView = await api(`/v1/published-itineraries/${trip}`, 'GET', stranger);
    expect(publicView.body?.days?.[0]?.activities?.[0]?.photos ?? []).toHaveLength(5);
  });

  test('publishing opens activity photos to every traveler', async () => {
    const strangerAfterPublish = await fetchBytes(activityPhotoUrl, stranger);
    expect(strangerAfterPublish.status).toBe(200);
  });
});
