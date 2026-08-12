const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;

const address = (tag) => BASE.replace('@', `+${tag}@`);

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const data = JSON.stringify(body);
    const req = lib.request(
      new URL(url),
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve(b ? JSON.parse(b) : {}));
      },
    );
    req.on('error', reject);
    req.end(data);
  });
}

async function signIn(tag) {
  const res = await postJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,
    { email: address(tag), password: PASSWORD, returnSecureToken: true },
  );
  if (!res.idToken) throw new Error(`sign-in failed for ${tag}`);
  return res;
}

function api(uri, method, token, body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (data !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = http.request(new URL(API + uri), { method, headers }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve({ status: res.statusCode, body: b ? JSON.parse(b) : {} }));
    });
    req.on('error', reject);
    if (data !== undefined) req.write(data);
    req.end();
  });
}

function postDiaryEntry(token, itineraryId, entry, photos) {
  return new Promise((resolve, reject) => {
    const boundary = `----largata${Date.now()}`;
    const parts = [
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="entry"\r\n` +
          `Content-Type: text/plain\r\n\r\n${JSON.stringify(entry)}\r\n`,
      ),
    ];
    for (const file of photos) {
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="photos"; filename="${path.basename(file)}"\r\n` +
            `Content-Type: image/jpeg\r\n\r\n`,
        ),
        fs.readFileSync(file),
        Buffer.from('\r\n'),
      );
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const payload = Buffer.concat(parts);
    const req = http.request(
      new URL(`${API}/v1/itineraries/${itineraryId}/diary/entries`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': payload.length,
        },
      },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve({ status: res.statusCode, body: b ? JSON.parse(b) : {} }));
      },
    );
    req.on('error', reject);
    req.end(payload);
  });
}

(async () => {
  const author = await signIn('t1');
  const stranger = await signIn('t2');
  const stamp = Date.now().toString().slice(-6);
  const photo = path.join(__dirname, 'fixtures', 'photo.jpg');

  const created = await api('/v1/itineraries', 'POST', author.idToken, {
    title: `Device walk ${stamp}`,
    destinations: ['Palawan'],
    durationDays: 3,
  });
  const trip = created.body.id;
  await api(`/v1/itineraries/${trip}/finish-planning`, 'POST', author.idToken);
  await api(`/v1/itineraries/${trip}/start`, 'POST', author.idToken);

  const plan = (await api(`/v1/itineraries/${trip}`, 'GET', author.idToken)).body;
  const made = await api(
    `/v1/itineraries/${trip}/days/${plan.days[0].id}/activities`,
    'POST',
    author.idToken,
    { title: `Sunrise gate photo ${stamp}`, place: `Pura Lempuyang Gate ${stamp}` },
  );

  const entry = await postDiaryEntry(
    author.idToken,
    trip,
    {
      activityId: made.body.id,
      caption: `Stood in line for two hours but the reflection photo was worth every second. The queue starts before sunrise. ${stamp}`,
      fromDump: [],
      shareToFeed: true,
    },
    [photo, photo, photo],
  );

  // The second postcard names no place on purpose: the pin must vanish rather than render a bare
  // glyph or fall back to the activity title (founder, 2026-08-12).
  // Also the SHORT-caption case: "more" must not appear on a caption that already fits, which is
  // only observable beside a long one on the same screen.
  const placeless = await api(
    `/v1/itineraries/${trip}/days/${plan.days[1].id}/activities`,
    'POST',
    author.idToken,
    { title: `Nowhere in particular ${stamp}` },
  );
  const withoutPlace = await postDiaryEntry(
    author.idToken,
    trip,
    {
      activityId: placeless.body.id,
      caption: `Short one ${stamp}`,
      fromDump: [],
      shareToFeed: true,
    },
    [photo],
  );

  console.log(JSON.stringify({
    stamp,
    trip,
    entry: entry.body.id,
    photos: entry.body.photos.length,
    sharedAt: entry.body.sharedAt,
    place: entry.body.place,
    placelessEntry: withoutPlace.body.id,
    placelessPlace: withoutPlace.body.place,
    strangerToken: stranger.idToken,
    strangerRefresh: stranger.refreshToken,
    strangerUid: stranger.localId,
  }));
})();
