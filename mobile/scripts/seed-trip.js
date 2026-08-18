const https = require('https');
const http = require('http');
const { precompleteProfile } = require('./precomplete-profile');

const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;
const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';

function request(lib, url, method, body, headers = {}) {
  return new Promise((resolve, reject) => {
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
    req.on('error', reject);
    if (data !== undefined) req.write(data);
    req.end();
  });
}

const address = (tag) => { const [l, d] = BASE.split('@'); return `${l}+${tag}@${d}`; };
const apiLib = API.startsWith('https') ? https : http;
const api = (path, method, token, body) =>
  request(apiLib, API + path, method, body, token ? { Authorization: 'Bearer ' + token } : {});

async function signIn(tag) {
  const email = address(tag);
  const res = await request(https,
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,
    'POST', { email, password: PASSWORD, returnSecureToken: true });
  if (res.status !== 200) throw new Error(`sign-in failed for ${email}: ${JSON.stringify(res.body.error?.message)}`);
  const claims = JSON.parse(Buffer.from(res.body.idToken.split('.')[1], 'base64').toString());
  if (!claims.email_verified) {
    throw new Error(
      `${email} is NOT verified. Run: node scripts/test-pool.js create, then click its link in ${BASE}.`);
  }
  return { email, token: res.body.idToken };
}

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i === -1 ? fallback : process.argv[i + 1];
}

(async () => {
  for (const [name, value] of [['EXPO_PUBLIC_FIREBASE_API_KEY', KEY], ['LARGATA_TEST_POOL_EMAIL_BASE', BASE],
    ['LARGATA_TEST_POOL_PASSWORD', PASSWORD]]) {
    if (!value) { console.error(`${name} is not set — run with: set -a && . ./.env && set +a`); process.exit(1); }
  }

  const ownerTag = arg('owner', 't1');
  const memberTags = arg('members', 't2').split(',').filter(Boolean);

  const owner = await signIn(ownerTag);
  const ownerMe = await api('/v1/me', 'GET', owner.token);
  if (ownerMe.status !== 200) throw new Error(`backend unreachable or rejecting: /v1/me → ${ownerMe.status}`);
  const ownerProfile = await precompleteProfile(api, owner.token, ownerTag);

  const trip = await api('/v1/itineraries', 'POST', owner.token,
    { title: arg('title', 'Seeded trip'), destination: 'Palawan' });
  if (trip.status !== 201) throw new Error(`create failed: ${trip.status} ${JSON.stringify(trip.body)}`);

  const joined = [];
  for (const tag of memberTags) {
    const member = await signIn(tag);
    await api('/v1/me', 'GET', member.token);
    const memberProfile = await precompleteProfile(api, member.token, tag);

    const invite = await api(`/v1/itineraries/${trip.body.id}/invitations/by-handle`, 'POST', owner.token,
      { handle: memberProfile.handle });
    if (invite.status !== 201) throw new Error(`invite failed for ${tag}: ${JSON.stringify(invite.body)}`);

    const inbox = await api('/v1/invitations', 'GET', member.token);
    const card = inbox.body?.items?.find((i) => i.id === invite.body.id);
    if (!card) throw new Error(`${tag}'s inbox does not show the invitation by handle`);

    const accept = await api(`/v1/invitations/${invite.body.id}/accept`, 'POST', member.token, {});
    if (accept.status !== 200) throw new Error(`accept failed for ${tag}: ${accept.status} ${JSON.stringify(accept.body)}`);
    joined.push({ tag, email: member.email, handle: memberProfile.handle });
  }

  const roster = await api(`/v1/itineraries/${trip.body.id}/members`, 'GET', owner.token);
  console.log(JSON.stringify({
    tripId: trip.body.id,
    api: API,
    owner: { tag: ownerTag, email: owner.email, handle: ownerProfile.handle },
    members: joined,
    onboarding: 'pre-completed over the API, so a device walk lands on My Trips (S4.0)',
    password: '(LARGATA_TEST_POOL_PASSWORD in mobile/.env)',
    roster: roster.body?.items?.map((m) => `${m.displayName} [${m.role}]`),
    webPreview: `http://localhost:8081/members/${trip.body.id}`,
    deepLink: `largata://members/${trip.body.id}`,
  }, null, 2));
})().catch((e) => { console.error('SEED FAILED:', e.message); process.exit(1); });
