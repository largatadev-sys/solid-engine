const https = require('https');
const http = require('http');

const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  — ' + detail : ''}`);
};

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

const apiLib = API.startsWith('https') ? https : http;
const api = (path, method = 'GET', token, body) =>
  request(apiLib, API + path, method, body, token ? { Authorization: 'Bearer ' + token } : {});
const address = (tag) => { const [l, d] = BASE.split('@'); return `${l}+${tag}@${d}`; };

async function poolToken(tag) {
  const res = await request(https,
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,
    'POST', { email: address(tag), password: PASSWORD, returnSecureToken: true });
  if (res.status !== 200) throw new Error(`pool member ${tag} unavailable — run scripts/test-pool.js create`);
  return res.body.idToken;
}

(async () => {
  for (const [n, v] of [['EXPO_PUBLIC_FIREBASE_API_KEY', KEY], ['LARGATA_TEST_POOL_EMAIL_BASE', BASE],
    ['LARGATA_TEST_POOL_PASSWORD', PASSWORD]]) {
    if (!v) { console.error(`${n} is not set — run with: set -a && . ./.env && set +a`); process.exit(1); }
  }
  console.log(`\n──────── SMOKE: API rung (${API}) ────────`);

  const health = await api('/v1/health');
  check('health is ok', health.status === 200 && health.body.status === 'ok');

  const owner = await poolToken('t1');
  const member = await poolToken('t2');
  const unverified = await poolToken('u1');
  const meOwner = await api('/v1/me', 'GET', owner);
  const meMember = await api('/v1/me', 'GET', member);
  await api('/v1/me', 'GET', unverified);
  check('S0.2 traveler provisioned on first contact', meOwner.status === 200 && Boolean(meOwner.body.id));

  const anon = await api('/v1/itineraries');
  check('checklist #1: an anonymous request is 401, not 404', anon.status === 401, 'got ' + anon.status);
  check('checklist #2: the 401 carries a non-null traceId', Boolean(anon.body?.traceId));
  const bad = await request(http, API + '/v1/me', 'GET', undefined, { Authorization: 'Bearer not-a-jwt' });
  check('checklist #3: a malformed token gets the same envelope',
    bad.status === 401 && Boolean(bad.body?.code) && Boolean(bad.body?.traceId));
  const unknown = await api('/v1/no-such-route', 'GET', owner);
  check('checklist #1: an authenticated unknown route is 404 + envelope',
    unknown.status === 404 && Boolean(unknown.body?.code), 'got ' + unknown.status);

  const created = await api('/v1/itineraries', 'POST', owner,
    { title: 'Smoke trip', destinations: ['Palawan'], startDate: '2027-03-01', endDate: '2027-03-04' });
  check('S0.3 create an itinerary', created.status === 201, 'got ' + created.status);
  const trip = created.body.id;

  const list = await api('/v1/itineraries', 'GET', owner);
  check('S0.3 My Trips lists it', list.status === 200 && list.body.items.some((i) => i.id === trip));
  const one = await api(`/v1/itineraries/${trip}`, 'GET', owner);
  check('S0.3 read one itinerary', one.status === 200 && one.body.title === 'Smoke trip');
  check('checklist #6: an unset optional field is null, not absent', one.body.description === null);

  const lock = await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', owner);
  check('S1.4 acquire the edit lock', lock.status === 200, 'got ' + lock.status);
  const edited = await api(`/v1/itineraries/${trip}`, 'PATCH', owner,
    { title: 'Smoke trip (edited)', destinations: ['Palawan', 'Coron'] });
  check('S1.3 edit itinerary fields', edited.status === 200 && edited.body.title === 'Smoke trip (edited)');
  const day = await api(`/v1/itineraries/${trip}/days`, 'POST', owner, { title: 'Arrival' });
  check('S1.3 append a day', day.status === 201, 'got ' + day.status);
  const activity = await api(`/v1/itineraries/${trip}/days/${day.body.id}/activities`, 'POST', owner,
    { title: 'Airport transfer', place: 'PPS' });
  check('S1.3 add an activity', activity.status === 201, 'got ' + activity.status);
  const planned = await api(`/v1/itineraries/${trip}`, 'GET', owner);
  check('S1.3 the plan is embedded on the itinerary',
    planned.body.days?.length === 1 && planned.body.days[0].activities?.length === 1);
  check('S1.3 last-edited attribution is written', planned.body.lastEditedBy === meOwner.body.id);

  const strangerWrite = await api(`/v1/itineraries/${trip}`, 'PATCH', member,
    { title: 'hijack', destinations: ['X'] });
  check('S0.3 guard: a non-member write is 404-masked', strangerWrite.status === 404, 'got ' + strangerWrite.status);

  const inviteUnverified = await api(`/v1/itineraries/${trip}/invitations`, 'POST', owner,
    { email: address('u1') });
  check('S1.2 invite an unverified address (allowed — the gate is at accept)', inviteUnverified.status === 201);
  const emptyInbox = await api('/v1/invitations', 'GET', unverified);
  check('S1.2 gate: an UNVERIFIED caller sees an empty inbox',
    emptyInbox.status === 200 && emptyInbox.body.items.length === 0, 'items=' + emptyInbox.body?.items?.length);
  const refused = await api(`/v1/invitations/${inviteUnverified.body.id}/accept`, 'POST', unverified, {});
  check('S1.2 gate: an UNVERIFIED caller cannot accept (403 EMAIL_NOT_VERIFIED)',
    refused.status === 403 && refused.body.code === 'EMAIL_NOT_VERIFIED', 'got ' + refused.status);

  const invite = await api(`/v1/itineraries/${trip}/invitations`, 'POST', owner, { email: address('t2') });
  check('S1.2 owner invites a verified address', invite.status === 201, 'got ' + invite.status);
  const inbox = await api('/v1/invitations', 'GET', member);
  check('S1.2 the invitation reaches the invitee inbox',
    inbox.status === 200 && inbox.body.items.some((i) => i.id === invite.body.id));
  const accepted = await api(`/v1/invitations/${invite.body.id}/accept`, 'POST', member, {});
  check('S1.2 accept joins the trip (the REAL flow, not a planted row)',
    accepted.status === 200, 'got ' + accepted.status);
  const memberReads = await api(`/v1/itineraries/${trip}`, 'GET', member);
  check('S1.2 the walls open for the new member', memberReads.status === 200);
  const roster = await api(`/v1/itineraries/${trip}/members`, 'GET', owner);
  check('S1.2 roster is owner then member',
    roster.body.items.length === 2 && roster.body.items[0].role === 'owner' && roster.body.items[1].role === 'member');
  const twice = await api(`/v1/invitations/${invite.body.id}/accept`, 'POST', member, {});
  check('S1.2 accepting twice is a conflict (terminal statuses)', twice.status === 409, 'got ' + twice.status);

  const memberLocked = await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', member);
  check('S1.4 the member is refused the lock the owner holds',
    memberLocked.status === 409 && memberLocked.body.code === 'EDIT_LOCKED', 'got ' + memberLocked.status);

  const memberRemovesOwner = await api(`/v1/itineraries/${trip}/members/${meOwner.body.id}`, 'DELETE', member);
  check('S1.5 a member cannot remove the owner (403)',
    memberRemovesOwner.status === 403 && memberRemovesOwner.body.code === 'NOT_PERMITTED');
  const ownerLeaves = await api(`/v1/itineraries/${trip}/members/${meOwner.body.id}`, 'DELETE', owner);
  check('S1.5 the owner cannot leave (409 OWNER_CANNOT_LEAVE) — INV-4',
    ownerLeaves.status === 409 && ownerLeaves.body.code === 'OWNER_CANNOT_LEAVE');
  const removed = await api(`/v1/itineraries/${trip}/members/${meMember.body.id}`, 'DELETE', owner);
  check('S1.5 the owner removes the member (204)', removed.status === 204, 'got ' + removed.status);
  const evicted = await api(`/v1/itineraries/${trip}`, 'GET', member);
  check('S1.5 the removed member is evicted (404)', evicted.status === 404, 'got ' + evicted.status);
  const again = await api(`/v1/itineraries/${trip}/members/${meMember.body.id}`, 'DELETE', owner);
  check('S1.5 removing the already-removed is idempotent (204)', again.status === 204, 'got ' + again.status);

  const reinvite = await api(`/v1/itineraries/${trip}/invitations`, 'POST', owner, { email: address('t2') });
  check('S1.5 a removed member can be re-invited (no ALREADY_A_MEMBER)', reinvite.status === 201,
    'got ' + reinvite.status + ' ' + JSON.stringify(reinvite.body?.code));
  const rejoin = await api(`/v1/invitations/${reinvite.body.id}/accept`, 'POST', member, {});
  check('S1.5 and rejoins for real', rejoin.status === 200, 'got ' + rejoin.status);

  const intact = await api(`/v1/itineraries/${trip}`, 'GET', owner);
  check('the plan survived every membership change',
    intact.status === 200 && intact.body.days[0].activities[0].title === 'Airport transfer');
  const release = await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', owner);
  check('S1.4 release the lock', release.status === 204, 'got ' + release.status);

  const memberArchives = await api(`/v1/itineraries/${trip}/archive`, 'POST', member);
  check('S1.9 a member cannot archive (403 NOT_PERMITTED)',
    memberArchives.status === 403 && memberArchives.body.code === 'NOT_PERMITTED',
    'got ' + memberArchives.status);

  const pendingInvite = await api(`/v1/itineraries/${trip}/invitations`, 'POST', owner, { email: address('t3') });
  check('S1.9 a pending invitation exists before the archive', pendingInvite.status === 201);

  const archived = await api(`/v1/itineraries/${trip}/archive`, 'POST', owner);
  check('S1.9 the owner archives (200, archived=true)',
    archived.status === 200 && archived.body.archived === true, 'got ' + archived.status);

  const memberWrites = await api(`/v1/itineraries/${trip}/days`, 'POST', member, { title: 'While frozen' });
  check('S1.9 a member cannot write the plan (409 TRIP_ARCHIVED)',
    memberWrites.status === 409 && memberWrites.body.code === 'TRIP_ARCHIVED',
    'got ' + memberWrites.status + ' ' + JSON.stringify(memberWrites.body?.code));
  const ownerStarts = await api(`/v1/itineraries/${trip}/start`, 'POST', owner);
  check('S1.9 even the owner cannot move the lifecycle (409 TRIP_ARCHIVED)',
    ownerStarts.status === 409 && ownerStarts.body.code === 'TRIP_ARCHIVED',
    'got ' + ownerStarts.status + ' ' + JSON.stringify(ownerStarts.body?.code));

  const liveList = await api('/v1/itineraries', 'GET', owner);
  const archivedList = await api('/v1/itineraries?archived=true', 'GET', owner);
  check('S1.9 the archived trip leaves the default list',
    liveList.status === 200 && !liveList.body.items.some((i) => i.id === trip));
  check('S1.9 …and appears in the archived view',
    archivedList.status === 200 && archivedList.body.items.some((i) => i.id === trip));

  const leaves = await api(`/v1/itineraries/${trip}/members/${meMember.body.id}`, 'DELETE', member);
  check('S1.9 a member can still leave an archived trip (204)', leaves.status === 204, 'got ' + leaves.status);

  const unarchived = await api(`/v1/itineraries/${trip}/unarchive`, 'POST', owner);
  check('S1.9 the owner unarchives (200, archived=false)',
    unarchived.status === 200 && unarchived.body.archived === false, 'got ' + unarchived.status);
  const writableAgain = await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', owner);
  check('S1.9 writes work again after unarchive', writableAgain.status === 200, 'got ' + writableAgain.status);
  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', owner);

  console.log(`\n──────── API rung: ${pass} passed, ${fail} failed ────────\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SMOKE CRASHED:', e.message); process.exit(1); });
