const http = require('http');
const https = require('https');

// The HTTP layer every pool-account script shares. It was copied byte-for-byte between
// seed-travelers and archive-strays, which put the S3.1 nextCursor trap in two places at once —
// the exact drift photoPool.js was extracted to stop, repeated in the same change that extracted
// it. One definition, so a fix reaches both.

const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';

// Against localhost every call succeeds; against a deployed rung one in a few hundred does not, and
// a seeding run is thousands of calls. A single transient 5xx killed a run 11 trips in — work that
// cannot be resumed, only redone. Retries 5xx and transport errors only: a 4xx is the caller being
// wrong and must still fail loudly rather than being hammered.
const RETRIES = 3;

const address = (tag) => {
  const base = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
  const [local, domain] = base.split('@');
  return `${local}+${tag}@${domain}`;
};

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

async function poolToken(tag) {
  const res = await request(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.EXPO_PUBLIC_FIREBASE_API_KEY}`,
    'POST',
    { email: address(tag), password: process.env.LARGATA_TEST_POOL_PASSWORD, returnSecureToken: true },
  );
  if (res.body?.idToken === undefined) {
    throw new Error(
      `sign-in failed for ${tag}: ${JSON.stringify(res.body).slice(0, 160)}\n`
        + `If the account does not exist yet: node scripts/test-pool.js create`,
    );
  }
  return res.body.idToken;
}

// GET /v1/itineraries pages at 20 by default. A caller that reads it bare sees one page and cannot
// tell a complete list from a truncated one — which is how an archive sweep reports "cleaned N"
// having seen a fraction of what it should. Compare the cursor with ?? — nextCursor is null on the
// wire and undefined in the types (S3.1) — and guard against a repeated cursor so a server bug
// degrades instead of spinning.
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

function requirePoolEnv() {
  for (const name of [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'LARGATA_TEST_POOL_EMAIL_BASE',
    'LARGATA_TEST_POOL_PASSWORD',
  ]) {
    const value = process.env[name];
    if (value === undefined || value === '') {
      console.error(`${name} is not set — run: cd mobile && set -a && . ./.env && set +a`);
      process.exit(2);
    }
  }
}

module.exports = { API, request, api, address, poolToken, allMyTrips, requirePoolEnv };
