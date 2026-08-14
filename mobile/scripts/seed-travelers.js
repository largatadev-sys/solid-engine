const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { precompleteProfile } = require('./precomplete-profile');
const { TRAVELERS, DUMP_QUERIES } = require('./fixtures/travelers');
const { slug, photosFor: photosInPool, photoForSlot } = require('./photoPool');

const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;

const PHOTOS = path.join(__dirname, 'fixtures', 'photos');
const CREDITS = path.join(PHOTOS, 'CREDITS.json');
const DEPLOYED_OPT_IN = '--yes-seed-the-deployed-rung';

const address = (tag) => { const [local, domain] = BASE.split('@'); return `${local}+${tag}@${domain}`; };
const only = (arg) => process.argv.find((a) => a.startsWith(`--${arg}=`))?.split('=')[1];

// Against localhost every call succeeds; against a deployed rung one in a few hundred does not, and
// a seeding run is ~700 calls. A single transient 5xx killed a run 11 trips in — work that cannot be
// resumed, only redone. Retries 5xx and transport errors only: a 4xx is the seeder being wrong and
// must still fail loudly rather than being hammered.
const RETRIES = 3;

async function request(url, method, body, headers = {}) {
  let last;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    last = await attemptOnce(url, method, body, headers);
    if (last.status < 500 && last.status !== 0) return last;
    if (attempt < RETRIES) {
      console.log(`   retry  ${method} ${new URL(url).pathname} — ${last.status}, attempt ${attempt} of ${RETRIES}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  return last;
}

function attemptOnce(url, method, body, headers = {}) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const data = body === undefined ? undefined : (Buffer.isBuffer(body) ? body : JSON.stringify(body));
    const options = { method, headers: { ...headers } };
    if (data !== undefined) {
      if (!Buffer.isBuffer(body)) options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = lib.request(new URL(url), options, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => {
        let parsed;
        try { parsed = b ? JSON.parse(b) : undefined; } catch { parsed = b; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    if (data !== undefined) req.write(data);
    req.end();
  });
}

const api = (p, method = 'GET', token, body) =>
  request(API + p, method, body, token ? { Authorization: 'Bearer ' + token } : {});

function uploadPhoto(route, token, file) {
  const boundary = `----largata${Date.now()}${process.hrtime()[1]}`;
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="photo"; `
        + `filename="${path.basename(file)}"\r\nContent-Type: image/jpeg\r\n\r\n`,
    ),
    fs.readFileSync(file),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return request(API + route, 'POST', payload, {
    Authorization: 'Bearer ' + token,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });
}

function postDiaryEntry(token, itineraryId, entry, files) {
  const boundary = `----largatadiary${Date.now()}${process.hrtime()[1]}`;
  const parts = [
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="entry"\r\n\r\n${JSON.stringify(entry)}\r\n`,
    ),
  ];
  for (const file of files) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="photos"; `
          + `filename="${path.basename(file)}"\r\nContent-Type: image/jpeg\r\n\r\n`,
      ),
      fs.readFileSync(file),
      Buffer.from('\r\n'),
    );
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return request(`${API}/v1/itineraries/${itineraryId}/diary/entries`, 'POST', Buffer.concat(parts), {
    Authorization: 'Bearer ' + token,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });
}

async function poolToken(tag) {
  const res = await request(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,
    'POST',
    { email: address(tag), password: PASSWORD, returnSecureToken: true },
  );
  if (res.body?.idToken === undefined) {
    throw new Error(
      `sign-in failed for ${tag}: ${JSON.stringify(res.body).slice(0, 160)}\n`
        + `If the account does not exist yet: node scripts/test-pool.js create`,
    );
  }
  return res.body.idToken;
}

function must(res, what) {
  if (res.status >= 300) {
    throw new Error(`${what}: ${res.status} ${JSON.stringify(res.body).slice(0, 240)}`);
  }
  return res.body;
}

const photosFor = (query) => photosInPool(PHOTOS, query);

// A postcard leads with the photo of the activity it is about, then fills from the rest of that
// day's pool. Every entry the demo dataset had ever posted carried exactly one photo, so S4.21's
// photo strip — the dots, the counter, the drag-snap — rendered on nothing but walk fixtures.
function postcardFrames(activity, wanted) {
  const frames = [activity.file];
  for (const file of activity.pool) {
    if (frames.length >= wanted) break;
    if (!frames.includes(file)) frames.push(file);
  }
  return frames;
}

// The photo's own alt-text, which describes the IMAGE rather than the place. Used as the activity's
// description because it is the one string here that is literally true of what you are looking at —
// everything else in the fixture is composed. Pexels returns no location field, so the place comes
// from the day's search term and the description comes from the photo.
function altFor(file, credits) {
  const alt = credits[path.basename(file)]?.alt;
  if (alt === undefined || alt.trim() === '') return null;
  return alt.trim();
}

// There is no trip-delete endpoint, so a re-run cannot remove what a previous one made — and a run
// that dies partway (a missing lease, a dropped connection) leaves a half-built trip behind that
// looks exactly like a real one in the Trips list. Archiving every fixture-titled trip first makes
// the seeder safe to run repeatedly: the debris drops out of the list rather than accumulating.
async function archivePreviousRuns(traveler, token) {
  const titles = new Set(traveler.trips.map((t) => t.title));
  const mine = await api('/v1/itineraries', 'GET', token);
  const stale = (mine.body?.items ?? mine.body ?? []).filter(
    (trip) => titles.has(trip.title) && trip.archived !== true,
  );
  for (const trip of stale) {
    await api(`/v1/itineraries/${trip.id}/archive`, 'POST', token);
  }
  return stale.length;
}


async function seedTraveler(traveler, credits, collaborator) {
  const token = await poolToken(traveler.tag);
  await precompleteProfile(api, token, traveler.tag);

  // Overrides precomplete-profile's deliberate no-display-name (founder ruling 2026-07-27, that a
  // test identity must identify itself) because the founder asked for clean names in this dataset
  // on 2026-08-13. The tag is still recoverable from the email and the seeder prints it per line.
  must(
    await api('/v1/me', 'PATCH', token, {
      displayName: traveler.name,
      handle: traveler.handle,
      bio: traveler.bio,
      homeCity: traveler.homeCity,
    }),
    `${traveler.tag} profile`,
  );

  const bird = photosFor(traveler.bird)[0];
  if (bird !== undefined) must(await uploadPhoto('/v1/me/avatar', token, bird), `${traveler.tag} avatar`);

  console.log(`\n${traveler.name}  (${traveler.tag}, @${traveler.handle})  ${traveler.region}`);
  console.log(`  avatar   ${bird === undefined ? 'MISSING' : path.basename(bird)}`);

  const archived = await archivePreviousRuns(traveler, token);
  if (archived > 0) console.log(`  cleaned  ${archived} trip(s) from a previous run, archived`);

  const seeded = [];
  for (const trip of traveler.trips) {
    const created = must(
      await api('/v1/itineraries', 'POST', token, {
        title: trip.title,
        destinations: trip.destinations,
        ...(trip.description === null ? {} : { description: trip.description }),
        durationDays: trip.days.length,
      }),
      `create "${trip.title}"`,
    );

    if (trip.standouts.length > 0 || trip.bestTimeOfYear !== null || trip.description !== null) {
      must(await api(`/v1/itineraries/${created.id}/edit-lock`, 'POST', token, { subjectType: 'header' }), 'header lease');
      must(
        await api(`/v1/itineraries/${created.id}`, 'PATCH', token, {
          title: trip.title,
          destinations: trip.destinations,
          ...(trip.description === null ? {} : { description: trip.description }),
          standouts: trip.standouts,
          bestTimeOfYear: trip.bestTimeOfYear ?? '',
        }),
        'dress the header',
      );
      await api(`/v1/itineraries/${created.id}/edit-lock`, 'DELETE', token, { subjectType: 'header' });
    }

    const activities = [];
    let attached = 0;
    for (const [index, day] of trip.days.entries()) {
      const dayId = created.days[index]?.id;
      if (dayId === undefined) continue;
      if (day.title !== undefined && day.title !== null) {
        const lease = { subjectType: 'day', subjectId: dayId };
        must(await api(`/v1/itineraries/${created.id}/edit-lock`, 'POST', token, lease), 'day lease');
        must(await api(`/v1/itineraries/${created.id}/days/${dayId}`, 'PATCH', token, { title: day.title }), 'day title');
        await api(`/v1/itineraries/${created.id}/edit-lock`, 'DELETE', token, lease);
      }
      const pool = photosFor(day.at);
      for (const [slot, spec] of day.activities.entries()) {
        const file = photoForSlot(PHOTOS, day.at, slot);
        const description = file === undefined ? null : altFor(file, credits);
        const activity = must(
          await api(`/v1/itineraries/${created.id}/days/${dayId}/activities`, 'POST', token, {
            title: spec.title,
            ...(spec.timeOfDay === undefined ? {} : { timeOfDay: spec.timeOfDay }),
            ...(spec.place === undefined || spec.place === null ? {} : { place: spec.place }),
            ...(spec.notes === undefined || spec.notes === null ? {} : { notes: spec.notes }),
            ...(description === null ? {} : { description }),
            ...(spec.costAmount === undefined ? {} : { costAmount: spec.costAmount, costCurrency: spec.costCurrency }),
          }),
          `activity "${spec.title}"`,
        );
        if (file !== undefined) {
          // An activity photo is plan data, so it is fenced by the ACTIVITY lease the same way a
          // header edit is fenced by the header lease (ADR-021). Without this the upload is a 409
          // EDIT_LOCKED that reads as another member editing, when in fact nobody holds anything.
          const lease = { subjectType: 'activity', subjectId: activity.id };
          must(await api(`/v1/itineraries/${created.id}/edit-lock`, 'POST', token, lease), 'activity lease');
          must(
            await uploadPhoto(
              `/v1/itineraries/${created.id}/days/${dayId}/activities/${activity.id}/photos`,
              token,
              file,
            ),
            `photo for "${spec.title}"`,
          );
          await api(`/v1/itineraries/${created.id}/edit-lock`, 'DELETE', token, lease);
          attached += 1;
        }
        activities.push({ id: activity.id, title: spec.title, file, pool, post: spec.post });
      }
    }

    const cover = photosFor(trip.days[0].at)[0];
    if (cover !== undefined) {
      const header = { subjectType: 'header' };
      must(await api(`/v1/itineraries/${created.id}/edit-lock`, 'POST', token, header), 'header lease for cover');
      must(await uploadPhoto(`/v1/itineraries/${created.id}/cover`, token, cover), 'cover');
      await api(`/v1/itineraries/${created.id}/edit-lock`, 'DELETE', token, header);
    }

    let withMember = false;
    if (collaborator !== null && trip.days.length >= 4) {
      must(await api(`/v1/itineraries/${created.id}/invitations`, 'POST', token, { email: address(collaborator.tag) }), 'invite');
      const inbox = must(await api('/v1/invitations', 'GET', collaborator.token), 'inbox');
      const invite = (inbox.items ?? []).find((i) => i.itineraryId === created.id);
      if (invite !== undefined) {
        must(await api(`/v1/invitations/${invite.id}/accept`, 'POST', collaborator.token, {}), 'accept');
        withMember = true;
      }
    }

    if (trip.lifecycle !== 'draft') {
      must(await api(`/v1/itineraries/${created.id}/finish-planning`, 'POST', token), 'finish-planning');
    }
    if (trip.lifecycle === 'ongoing' || trip.lifecycle === 'completed') {
      must(await api(`/v1/itineraries/${created.id}/start`, 'POST', token), 'start');
    }
    if (trip.lifecycle === 'completed') {
      must(await api(`/v1/itineraries/${created.id}/complete`, 'POST', token), 'complete');
    }

    if (withMember) {
      for (const query of DUMP_QUERIES) {
        const file = photosFor(query)[0];
        if (file === undefined) continue;
        must(await uploadPhoto(`/v1/itineraries/${created.id}/photo-dump`, collaborator.token, file), 'dump');
      }
    }

    // Postcards live ON the activity that carries them, so there is no title to match and no way
    // for a caption to reference an activity that does not exist — the shape the earlier lookup
    // array allowed, which failed silently as a skipped postcard.
    let posted = 0;
    let frameCount = 0;
    for (const activity of activities.filter((a) => a.post !== undefined)) {
      if (activity.file === undefined) continue;
      const post = typeof activity.post === 'string' ? { caption: activity.post, photos: 1 } : activity.post;
      const frames = postcardFrames(activity, post.photos ?? 1);
      must(
        await postDiaryEntry(
          token,
          created.id,
          { activityId: activity.id, caption: post.caption, fromDump: [] },
          frames,
        ),
        `postcard "${activity.title}"`,
      );
      posted += 1;
      frameCount += frames.length;
    }

    if (trip.publish !== null) {
      must(await api(`/v1/itineraries/${created.id}/publish`, 'POST', token, { audience: trip.publish }), 'publish');
    }

    console.log(
      `  ${trip.lifecycle.padEnd(9)} ${(trip.publish ?? '—').padEnd(7)} `
        + `${String(trip.days.length).padStart(2)}d ${String(activities.length).padStart(2)}a `
        + `${String(attached).padStart(2)}ph ${posted > 0 ? `${posted} postcard(s)/${frameCount}f ` : '              '}`
        + `${withMember ? 'with ' + collaborator.tag + ' ' : ''}${trip.title}`,
    );
    seeded.push(created.id);
  }
  return seeded;
}

async function main() {
  for (const [name, value] of Object.entries({
    EXPO_PUBLIC_FIREBASE_API_KEY: KEY,
    LARGATA_TEST_POOL_EMAIL_BASE: BASE,
    LARGATA_TEST_POOL_PASSWORD: PASSWORD,
  })) {
    if (value === undefined || value === '') {
      console.error(`${name} is not set — run: cd mobile && set -a && . ./.env && set +a`);
      process.exit(2);
    }
  }

  const deployed = !API.startsWith('http://localhost');
  if (deployed && !process.argv.includes(DEPLOYED_OPT_IN)) {
    console.error(`Refusing to seed ${API} without ${DEPLOYED_OPT_IN}.\n`);
    console.error('This writes trips, photos and PUBLIC postcards that no endpoint this app has can');
    console.error('undo, on an environment other people read. Pass the flag only if you mean it.');
    process.exit(2);
  }

  if (!fs.existsSync(CREDITS)) {
    console.error(`No photos at ${PHOTOS}.\n`);
    console.error('Run scripts/fetch-fixtures.js first. Refusing rather than seeding a trip with no');
    console.error('images, which is the thing this seeder exists to avoid.');
    process.exit(2);
  }

  const credits = JSON.parse(fs.readFileSync(CREDITS, 'utf8'));
  const wanted = only('tag');
  const chosen = wanted === undefined ? TRAVELERS : TRAVELERS.filter((t) => t.tag === wanted);
  if (chosen.length === 0) throw new Error(`no traveler tagged "${wanted}"`);

  console.log(`seeding ${API}${deployed ? '  (DEPLOYED RUNG)' : ''}`);
  console.log(`${chosen.length} traveler(s), ${chosen.reduce((n, t) => n + t.trips.length, 0)} trips`);

  // t2 collaborates on whichever long trips it does not own. Only verified accounts can accept an
  // invitation (EMAIL_NOT_VERIFIED gates it), and t1-t5 are the verified half of the pool.
  const collaborator = { tag: 't2', token: await poolToken('t2') };
  await precompleteProfile(api, collaborator.token, 't2');

  let trips = 0;
  const skipped = [];
  for (const traveler of chosen) {
    // Skips rather than dying, because an unusable account is a pool problem and not a reason to
    // abandon the nine that work. Firebase cannot tell "absent" from "wrong password" (see
    // test-pool.js list), so the reason is reported verbatim and the run continues.
    try {
      const seeded = await seedTraveler(traveler, credits, traveler.tag === 't2' ? null : collaborator);
      trips += seeded.length;
    } catch (e) {
      if (!e.message.startsWith('sign-in failed')) throw e;
      skipped.push(traveler);
      console.log(`\n${traveler.name}  (${traveler.tag})  SKIPPED — cannot sign in`);
    }
  }

  console.log(`\n${trips} trips seeded for ${chosen.length - skipped.length} traveler(s).`);
  if (skipped.length > 0) {
    console.log(
      `${skipped.length} skipped: ${skipped.map((t) => t.tag).join(', ')} — `
        + 'reset their passwords in the Firebase console, then re-run with --tag=<tag>.',
    );
  }
  console.log('Home feed: http://localhost:8081/');
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
