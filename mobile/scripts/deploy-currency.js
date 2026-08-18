const https = require('https');
const http = require('http');

const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;
const API = process.env.LARGATA_API_BASE_URL || 'https://api-dev.largata.com';
const TAG = process.env.LARGATA_POOL_TAG || 't1';

const OLD = 'This trip is archived. Unarchive it to make changes.';
const NEW = 'This trip is archived and is read-only.';

function request(lib, url, method, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const options = {
      method,
      headers: {
        ...headers,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = lib.request(new URL(url), options, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = b ? JSON.parse(b) : null;
        } catch (e) {
          parsed = null;
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const lib = API.startsWith('https') ? https : http;
const api = (path, method = 'GET', token, body) =>
  request(lib, API + path, method, body, token ? { Authorization: 'Bearer ' + token } : {});

async function poolToken(tag) {
  const [local, domain] = BASE.split('@');
  const res = await request(https, `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`, 'POST', {
    email: `${local}+${tag}@${domain}`,
    password: PASSWORD,
    returnSecureToken: true,
  });
  if (res.status !== 200) throw new Error(`pool member ${tag} unavailable`);
  return res.body.idToken;
}

(async () => {
  for (const [name, value] of [
    ['EXPO_PUBLIC_FIREBASE_API_KEY', KEY],
    ['LARGATA_TEST_POOL_EMAIL_BASE', BASE],
    ['LARGATA_TEST_POOL_PASSWORD', PASSWORD],
  ]) {
    if (!value) {
      console.log(`MISSING ENV: ${name} - run: cd mobile && set -a && . ./.env && set +a`);
      process.exit(2);
    }
  }

  const token = await poolToken(TAG);
  const created = await api('/v1/itineraries', 'POST', token, {
    title: 'deploy currency probe',
    destination: 'Probe',
  });
  if (created.status !== 201) {
    console.log(`UNKNOWN: could not create a probe trip (${created.status})`);
    process.exit(2);
  }
  const id = created.body.id;

  const archived = await api(`/v1/itineraries/${id}/archive`, 'POST', token);
  if (archived.status !== 200) {
    console.log(`STALE: /archive answered ${archived.status} - S1.9 is not deployed at all`);
    process.exit(1);
  }

  const refused = await api(`/v1/itineraries/${id}`, 'PATCH', token, {
    title: 'nope',
    destination: 'Probe',
  });
  const message = refused.body?.message ?? '';

  console.log(`rung        : ${API}`);
  console.log(`refusal     : ${refused.status} ${refused.body?.code}`);
  console.log(`message     : ${message}`);

  if (message === NEW) {
    console.log('VERDICT: CURRENT - the deployed build carries the E1 gate');
    process.exit(0);
  }
  if (message === OLD) {
    console.log('VERDICT: STALE - still the pre-gate build');
    process.exit(1);
  }
  console.log('VERDICT: UNKNOWN - the message matches neither build; do not act on this run');
  process.exit(2);
})().catch((e) => {
  console.log('PROBE ERROR: ' + e.message);
  process.exit(2);
});
