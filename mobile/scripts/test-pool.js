const https = require('https');
const http = require('http');
const { precompleteProfile } = require('./precomplete-profile');

const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;
const MEMBERS = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10'];

const UNVERIFIED_MEMBERS = ['u1'];

function required(name, value) {
  if (!value) {
    console.error(
      `${name} is not set. Run from mobile/ with:  set -a && . ./.env && set +a && node scripts/test-pool.js …`,
    );
    process.exit(1);
  }
  return value;
}

function address(tag) {
  const [local, domain] = BASE.split('@');
  return `${local}+${tag}@${domain}`;
}

function identityToolkit(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      new URL(`https://identitytoolkit.googleapis.com/v1/accounts:${path}?key=${KEY}`),
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve({ status: res.statusCode, body: b ? JSON.parse(b) : {} }));
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const signIn = (email) => identityToolkit('signInWithPassword', { email, password: PASSWORD, returnSecureToken: true });
const signUp = (email) => identityToolkit('signUp', { email, password: PASSWORD, returnSecureToken: true });

function isVerified(idToken) {
  return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString()).email_verified === true;
}

async function list() {
  console.log(`\nPool base: ${BASE}\n`);
  let unverified = 0;
  for (const tag of MEMBERS) {
    const email = address(tag);
    const existing = await signIn(email);
    if (existing.status !== 200) {
      // Firebase deliberately merges "no such user" and "wrong password" into one error, so a failed
      // sign-in CANNOT distinguish them and this line must not claim it can. It used to read "does
      // not exist yet", which sent an hour into re-creating four accounts that already existed with
      // a different password — `create` said EMAIL_EXISTS while `list` said absent, and only the raw
      // error code settled it. `create` is the discriminating probe: it answers EMAIL_EXISTS or
      // succeeds.
      const why = existing.body?.error?.message ?? `HTTP ${existing.status}`;
      console.log(`  ${tag}  ${email}  —  cannot sign in (${why}) — absent, or a different password`);
      unverified++;
      continue;
    }
    const verified = isVerified(existing.body.idToken);
    if (!verified) unverified++;
    console.log(`  ${tag}  ${email}  —  ${verified ? 'VERIFIED' : 'not verified (click its link)'}`);
  }
  for (const tag of UNVERIFIED_MEMBERS) {
    const email = address(tag);
    const existing = await signIn(email);
    const state =
      existing.status !== 200
        ? 'does not exist yet'
        : isVerified(existing.body.idToken)
          ? 'WRONGLY VERIFIED — delete it in the console and re-create'
          : 'unverified, as intended';
    console.log(`  ${tag}  ${email}  —  ${state}   (the EMAIL_NOT_VERIFIED fixture)`);
  }
  console.log(
    unverified === 0
      ? '\nThe whole pool is verified — invite → accept works with any of these.\n'
      : `\n${unverified} of ${MEMBERS.length} are not usable for invite → accept yet.\n`
        + 'Only accepting an INVITATION needs verification — seeding a traveler\'s own trips does not.\n',
  );
}

async function create() {
  console.log(`\nPool base: ${BASE}\n`);
  for (const tag of MEMBERS) {
    const email = address(tag);
    let token;
    const created = await signUp(email);
    if (created.status === 200) {
      token = created.body.idToken;
      console.log(`  ${tag}  created  ${email}`);
    } else {
      const existing = await signIn(email);
      if (existing.status !== 200) {
        console.log(`  ${tag}  FAILED   ${email}  ${JSON.stringify(created.body.error?.message)}`);
        continue;
      }
      token = existing.body.idToken;
      if (isVerified(token)) {
        console.log(`  ${tag}  ok       ${email}  (already verified — no mail sent)`);
        continue;
      }
      console.log(`  ${tag}  exists   ${email}  (unverified)`);
    }
    const sent = await identityToolkit('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: token });
    console.log(`        ${sent.status === 200 ? '→ verification email sent' : '→ SEND FAILED ' + JSON.stringify(sent.body)}`);
  }
  for (const tag of UNVERIFIED_MEMBERS) {
    const email = address(tag);
    const created = await signUp(email);
    console.log(
      created.status === 200
        ? `  ${tag}  created  ${email}  (left UNVERIFIED on purpose — no mail sent)`
        : `  ${tag}  exists   ${email}  (the EMAIL_NOT_VERIFIED fixture)`,
    );
  }
  console.log(`\nNow open ${BASE} and click each link, then: node scripts/test-pool.js list\n`);
}

function apiRequest(path, method, bearer, body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const headers = bearer ? { Authorization: 'Bearer ' + bearer } : {};
    if (data !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    const lib = API.startsWith('https') ? https : http;
    const req = lib.request(new URL(API + path), { method, headers }, (res) => {
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

async function precomplete() {
  console.log(`\nAPI: ${API}\n`);
  for (const tag of MEMBERS) {
    const email = address(tag);
    const session = await signIn(email);
    if (session.status !== 200) {
      console.log(`  ${tag}  SKIPPED  ${email}  (no such account — run: create)`);
      continue;
    }
    if (!isVerified(session.body.idToken)) {
      console.log(`  ${tag}  SKIPPED  ${email}  (unverified — click its link first)`);
      continue;
    }
    const me = await apiRequest('/v1/me', 'GET', session.body.idToken);
    if (me.status !== 200) {
      console.log(`  ${tag}  FAILED   /v1/me -> ${me.status}  (is the backend up at ${API}?)`);
      continue;
    }
    const profile = await precompleteProfile(apiRequest, session.body.idToken, tag);
    console.log(`  ${tag}  ready    @${profile.handle}  onboarding complete`);
  }
  console.log('\nA device walk with these accounts now lands on My Trips, not on step 1.\n');
}

async function token(tag) {
  const result = await signIn(address(tag));
  if (result.status !== 200) {
    console.error(`No such pool member "${tag}" (or wrong password).`);
    process.exit(1);
  }
  console.log(result.body.idToken);
}

(async () => {
  required('EXPO_PUBLIC_FIREBASE_API_KEY', KEY);
  required('LARGATA_TEST_POOL_EMAIL_BASE', BASE);
  required('LARGATA_TEST_POOL_PASSWORD', PASSWORD);

  const [command, argument] = process.argv.slice(2);
  if (command === 'create') return create();
  if (command === 'precomplete') return precomplete();
  if (command === 'token') return token(argument || 't1');
  if (command === 'list' || command === undefined) return list();
  console.error(`Unknown command "${command}". Use: list | create | precomplete | token <tag>`);
  process.exit(1);
})().catch((e) => {
  console.error('POOL FAILED:', e.message);
  process.exit(1);
});
