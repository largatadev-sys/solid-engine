const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { precompleteProfile } = require('./precomplete-profile');
const { TRIP, DUMP_QUERIES, POSTCARDS } = require('./fixtures/australia-trip');

const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;

const PHOTOS = path.join(__dirname, 'fixtures', 'australia');
const DEPLOYED_OPT_IN = '--yes-seed-the-deployed-rung';

const slug = (query) => query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const address = (tag) => { const [l, d] = BASE.split('@'); return `${l}+${tag}@${d}`; };

function request(url, method, body, headers = {}) {
  return new Promise((resolve, reject) => {
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
    req.on('error', reject);
    if (data !== undefined) req.write(data);
    req.end();
  });
}

const api = (p, method = 'GET', token, body) =>
  request(API + p, method, body, token ? { Authorization: 'Bearer ' + token } : {});

function multipart(fieldName, file) {
  const boundary = `----largata${Date.now()}${Math.floor(process.hrtime()[1] / 1000)}`;
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; ` +
        `filename="${path.basename(file)}"\r\nContent-Type: image/jpeg\r\n\r\n`,
    ),
    fs.readFileSync(file),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { boundary, payload };
}

function uploadPhoto(route, token, file) {
  const { boundary, payload } = multipart('photo', file);
  return request(API + route, 'POST', payload, {
    Authorization: 'Bearer ' + token,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });
}

function postDiaryEntry(token, itineraryId, entry, files) {
  const boundary = `----largatadiary${Date.now()}`;
  const parts = [
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="entry"\r\n\r\n${JSON.stringify(entry)}\r\n`,
    ),
  ];
  for (const file of files) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="photos"; ` +
          `filename="${path.basename(file)}"\r\nContent-Type: image/jpeg\r\n\r\n`,
      ),
      fs.readFileSync(file),
      Buffer.from('\r\n'),
    );
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  const payload = Buffer.concat(parts);
  return request(`${API}/v1/itineraries/${itineraryId}/diary/entries`, 'POST', payload, {
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
    throw new Error(`sign-in failed for ${tag}: ${JSON.stringify(res.body).slice(0, 200)}`);
  }
  return res.body.idToken;
}

function must(res, what) {
  if (res.status >= 300) {
    throw new Error(`${what} failed: ${res.status} ${JSON.stringify(res.body).slice(0, 300)}`);
  }
  return res.body;
}

function photoFor(query) {
  if (query === undefined) return null;
  const file = path.join(PHOTOS, `${slug(query)}.jpg`);
  return fs.existsSync(file) ? file : null;
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
    console.error('This writes a trip, photos and public postcards that CANNOT be undone by any');
    console.error('endpoint this app has — on an environment other people read. Pass the flag only');
    console.error('if you mean it.');
    process.exit(2);
  }

  if (!fs.existsSync(PHOTOS)) {
    console.error(`No photos at ${PHOTOS}.\n`);
    console.error('Run scripts/fetch-fixtures.js first, or the trip seeds with no images at all —');
    console.error('which is the thing this seeder exists to avoid. Refusing rather than seeding blanks.');
    process.exit(2);
  }

  const owner = await poolToken('t1');
  const member = await poolToken('t2');
  await precompleteProfile(api, owner, 't1');
  await precompleteProfile(api, member, 't2');

  console.log(`seeding ${API}${deployed ? '  (DEPLOYED RUNG)' : ''}`);
  console.log('t1 = the author, t2 = a co-traveler who contributes to the dump\n');

  const trip = must(
    await api('/v1/itineraries', 'POST', owner, {
      title: TRIP.title,
      destinations: TRIP.destinations,
      description: TRIP.description,
      durationDays: TRIP.days.length,
    }),
    'create the trip',
  );
  console.log(`  trip     ${trip.id}  ${TRIP.title}`);

  must(await api(`/v1/itineraries/${trip.id}/edit-lock`, 'POST', owner, { subjectType: 'header' }), 'header lease');
  must(
    await api(`/v1/itineraries/${trip.id}`, 'PATCH', owner, {
      title: TRIP.title,
      destinations: TRIP.destinations,
      description: TRIP.description,
      standouts: TRIP.standouts,
      bestTimeOfYear: TRIP.bestTimeOfYear,
    }),
    'dress the header',
  );
  await api(`/v1/itineraries/${trip.id}/edit-lock`, 'DELETE', owner, { subjectType: 'header' });

  const cover = photoFor(TRIP.days[0].activities[0].photoQuery);
  if (cover !== null) {
    must(await uploadPhoto(`/v1/itineraries/${trip.id}/cover`, owner, cover), 'cover');
    console.log(`  cover    ${path.basename(cover)}`);
  }

  const created = [];
  let photoCount = 0;
  for (const [index, day] of TRIP.days.entries()) {
    const dayId = trip.days[index]?.id;
    if (dayId === undefined) continue;
    for (const spec of day.activities) {
      const { photoQuery, ...fields } = spec;
      const activity = must(
        await api(`/v1/itineraries/${trip.id}/days/${dayId}/activities`, 'POST', owner, fields),
        `activity ${spec.title}`,
      );
      const file = photoFor(photoQuery);
      if (file !== null) {
        must(
          await uploadPhoto(
            `/v1/itineraries/${trip.id}/days/${dayId}/activities/${activity.id}/photos`,
            owner,
            file,
          ),
          `photo for ${spec.title}`,
        );
        photoCount += 1;
      }
      created.push({ day: index + 1, title: spec.title, id: activity.id, dayId });
    }
    console.log(`  day ${index + 1}    ${day.activities.length} activities  ${day.title}`);
  }
  console.log(`  photos   ${photoCount} on activities`);

  must(await api(`/v1/itineraries/${trip.id}/invitations`, 'POST', owner, { email: address('t2') }), 'invite t2');
  const inbox = must(await api('/v1/invitations', 'GET', member), 'inbox');
  const invite = (inbox.items ?? []).find((i) => i.itineraryId === trip.id);
  if (invite === undefined) throw new Error('the invitation never reached t2 inbox');
  must(await api(`/v1/invitations/${invite.id}/accept`, 'POST', member, {}), 'accept');
  console.log('  member   t2 joined through the real invite → accept');

  must(await api(`/v1/itineraries/${trip.id}/finish-planning`, 'POST', owner), 'finish-planning');
  must(await api(`/v1/itineraries/${trip.id}/start`, 'POST', owner), 'start');
  console.log('  state    ongoing — the trip is being lived, which is what the feed wants');

  let dumped = 0;
  for (const query of DUMP_QUERIES) {
    const file = photoFor(query);
    if (file === null) continue;
    must(await uploadPhoto(`/v1/itineraries/${trip.id}/photo-dump`, member, file), `dump ${query}`);
    dumped += 1;
  }
  console.log(`  dump     ${dumped} photos, contributed by t2`);

  let posted = 0;
  for (const card of POSTCARDS) {
    const activity = created.find((a) => a.day === card.day && a.title === card.activity);
    if (activity === undefined) {
      console.log(` MISS     no activity "${card.activity}" on day ${card.day}`);
      continue;
    }
    const query = TRIP.days[card.day - 1].activities.find((a) => a.title === card.activity)?.photoQuery;
    const file = photoFor(query);
    if (file === null) continue;
    must(
      await postDiaryEntry(owner, trip.id, { activityId: activity.id, caption: card.caption, fromDump: [] }, [file]),
      `postcard for ${card.activity}`,
    );
    posted += 1;
  }
  console.log(`  postcards ${posted} — public, so they are on the Home feed now`);

  console.log(`\nweb preview:  http://localhost:8081/itineraries/${trip.id}`);
  console.log(`deep link:    largata://itineraries/${trip.id}`);
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
