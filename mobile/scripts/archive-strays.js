const http = require('http');
const https = require('https');
const { TRAVELERS } = require('./fixtures/travelers');

// Archives every trip a pool account can see that is NOT in the current fixture — the walk debris
// ("Kyoto temples 881845", "Feed walk 057804") that drive scripts leave behind. Locally the DB wipe
// makes this pointless; it exists for the deployed rung, where archive is the only cleanup there is
// and stray published trips would otherwise sit inside Discovery next to the curated dataset.
//
// Scope is structural, not judgemental: it signs in as the ten pool travelers and archives what
// THEY own, so nothing belonging to a real account can be touched — a trip the pool account merely
// belongs to answers 4xx to the archive call, which is counted as refused and moved past. The one
// category it cannot reach is the orphans: trips owned by deleted-and-recreated Firebase accounts
// (the S4.22 finding) have no owner who can sign in, and stay until the product grows a deletion
// story. Titles are matched against the GLOBAL fixture set, so one traveler's membership on
// another's fixture trip is never treated as a stray.

const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;

const DEPLOYED_OPT_IN = '--yes-archive-strays-on-the-deployed-rung';

const address = (tag) => { const [local, domain] = BASE.split('@'); return `${local}+${tag}@${domain}`; };

function request(url, method, body, headers = {}) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const data = body === undefined ? undefined : JSON.stringify(body);
    const options = { method, headers: { ...headers } };
    if (data !== undefined) {
      options.headers['Content-Type'] = 'application/json';
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

async function poolToken(tag) {
  const res = await request(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,
    'POST',
    { email: address(tag), password: PASSWORD, returnSecureToken: true },
  );
  return res.body?.idToken;
}

async function allMyTrips(token) {
  const rows = [];
  let cursor;
  let previous = null;
  for (;;) {
    const page = await api(
      `/v1/itineraries?limit=100${cursor === undefined ? '' : `&cursor=${encodeURIComponent(cursor)}`}`,
      'GET', token,
    );
    rows.push(...(page.body?.items ?? []));
    cursor = page.body?.nextCursor ?? undefined;
    if (cursor === undefined || cursor === previous) return rows;
    previous = cursor;
  }
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
    console.error(`Refusing to archive on ${API} without ${DEPLOYED_OPT_IN}.`);
    console.error('Archiving is the only cleanup the deployed rung has, and it is not reversible');
    console.error('by any endpoint this app ships. Pass the flag only if you mean it.');
    process.exit(2);
  }

  const fixture = new Set(TRAVELERS.flatMap((t) => t.trips.map((trip) => trip.title)));
  console.log(`archiving strays on ${API}${deployed ? '  (DEPLOYED RUNG)' : ''}`);
  console.log(`${fixture.size} fixture titles are protected\n`);

  let archived = 0;
  let refused = 0;
  for (const traveler of TRAVELERS) {
    const token = await poolToken(traveler.tag);
    if (token === undefined) {
      console.log(`  ${traveler.tag}  SKIPPED — cannot sign in`);
      continue;
    }
    const mine = await allMyTrips(token);
    const strays = mine.filter((trip) => !fixture.has(trip.title) && trip.archived !== true);
    let ok = 0;
    for (const trip of strays) {
      const res = await api(`/v1/itineraries/${trip.id}/archive`, 'POST', token);
      if (res.status < 300) {
        ok += 1;
        console.log(`  ${traveler.tag}  archived  ${trip.title}`);
      } else {
        refused += 1;
      }
    }
    archived += ok;
    const kept = strays.length - ok;
    console.log(`  ${traveler.tag}  ${mine.length} visible, ${strays.length} strays, ${ok} archived${kept > 0 ? `, ${kept} refused (not the owner)` : ''}`);
  }

  console.log(`\n${archived} stray trip(s) archived, ${refused} refused as memberships.`);
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
