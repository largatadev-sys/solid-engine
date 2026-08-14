const http = require('http');
const https = require('https');


const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';

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
