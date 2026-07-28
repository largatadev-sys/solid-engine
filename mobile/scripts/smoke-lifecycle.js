/**
 * Drives S1.7's lifecycle arc against a running backend, with real verified accounts (S1.7, ticket 03).
 *
 * ## What it proves, and why it is a script rather than another IT
 *
 * The ITs prove the contract against Testcontainers. This proves the same arc against a **running
 * rung** — a real Firebase token from a real verified account, a real network, and the migrations as
 * they actually applied. That is what an IT structurally cannot do.
 *
 * Every step is discriminating: it states what it expects and fails loudly otherwise, so a green run
 * cannot mean "the probe never worked" (the repo's three-times-burned lesson). Two of them deserve
 * naming up front, because their failure modes are the ones worth designing for:
 *
 * - **The V12 probe is the write itself.** The entity maps `started_at`/`completed_at`, so a 200 from
 *   `/start` is an UPDATE that could not succeed against a database missing those columns — it would
 *   be a 500 naming the column. A separate "did the migration run" query is unnecessary: the write is
 *   the check (the S1.6 AC-14 lesson — when a fact has no read endpoint, look for the write that could
 *   not have succeeded without it).
 * - **The 403 and 409 are ordered checks, not just status assertions.** A member completing a DRAFT
 *   trip is *both* unauthorized and an illegal transition. It must answer 403, never 409 — were state
 *   checked first, the refusal would tell a member without standing where in its lifecycle the trip
 *   sits. This is the one step whose *code* matters more than its success.
 *
 * ## Usage
 *
 *   cd mobile && set -a && . ./.env && set +a
 *   node scripts/smoke-lifecycle.js                                  # local stack
 *   LARGATA_API_BASE_URL=https://api-dev.largata.com node scripts/smoke-lifecycle.js
 *
 * Tags are stated in the output on purpose (S1.5's rule: a test identity must identify itself) —
 * t1 = trip owner, t2 = an ordinary member who may never touch the lifecycle.
 */
const https = require('https');
const http = require('http');

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
const lib = API.startsWith('https') ? https : http;
const api = (path, method, token, body) =>
  request(lib, API + path, method, body, token ? { Authorization: 'Bearer ' + token } : {});

async function signIn(tag) {
  const email = address(tag);
  const res = await request(https,
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,
    'POST', { email, password: PASSWORD, returnSecureToken: true });
  if (res.status !== 200) throw new Error(`sign-in failed for ${email}: ${JSON.stringify(res.body.error?.message)}`);
  const claims = JSON.parse(Buffer.from(res.body.idToken.split('.')[1], 'base64').toString());
  if (!claims.email_verified) throw new Error(`${email} is NOT verified — see test-pool.js`);
  return { email, token: res.body.idToken };
}

let step = 0;
const checks = [];
function check(description, condition, detail) {
  step += 1;
  const ok = Boolean(condition);
  checks.push({ ok, description });
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${String(step).padStart(2)}. ${description}${detail ? `  — ${detail}` : ''}`);
  if (!ok) throw new Error(`step ${step} failed: ${description}${detail ? ` (${detail})` : ''}`);
}

const stateOf = async (token, trip) => (await api(`/v1/itineraries/${trip}`, 'GET', token)).body.state;

(async () => {
  for (const [name, value] of [['EXPO_PUBLIC_FIREBASE_API_KEY', KEY], ['LARGATA_TEST_POOL_EMAIL_BASE', BASE],
    ['LARGATA_TEST_POOL_PASSWORD', PASSWORD]]) {
    if (!value) { console.error(`${name} is not set — run with: set -a && . ./.env && set +a`); process.exit(1); }
  }
  console.log(`S1.7 itinerary-lifecycle smoke against ${API}`);
  console.log('t1 = trip owner, t2 = ordinary member\n');

  const t1 = await signIn('t1');
  const t2 = await signIn('t2');
  const id = async (t) => (await api('/v1/me', 'GET', t.token)).body.id;
  const [, id2] = [await id(t1), await id(t2)];

  // --- a trip with two travelers, joined for real (invite → inbox → accept) ----------------------
  const trip = (await api('/v1/itineraries', 'POST', t1.token,
    { title: 'S1.7 lifecycle smoke', destinations: ['Palawan'], startDate: '2027-03-01', endDate: '2027-03-10' })).body.id;
  const invite = await api(`/v1/itineraries/${trip}/invitations`, 'POST', t1.token, { email: t2.email });
  if (invite.status !== 201) throw new Error(`invite t2 failed: ${JSON.stringify(invite.body)}`);
  const accept = await api(`/v1/invitations/${invite.body.id}/accept`, 'POST', t2.token, {});
  if (accept.status !== 200) throw new Error(`accept t2 failed: ${JSON.stringify(accept.body)}`);
  check('trip created and t2 joined through the real invite flow', true, `trip ${trip}`);

  check('every trip is born a draft', (await stateOf(t1.token, trip)) === 'draft');

  // --- authority BEFORE state: the ordering check (spec decision 7) ------------------------------
  // t2 completing a DRAFT is both unauthorized AND an illegal transition. 403 must win: a 409 here
  // would tell a member without standing exactly where in its lifecycle the trip sits.
  const memberCompletesDraft = await api(`/v1/itineraries/${trip}/complete`, 'POST', t2.token);
  check('a member completing a draft gets 403, NOT 409 — authority is checked before state',
    memberCompletesDraft.status === 403 && memberCompletesDraft.body?.code === 'NOT_PERMITTED',
    `${memberCompletesDraft.status} ${memberCompletesDraft.body?.code}`);

  const memberStarts = await api(`/v1/itineraries/${trip}/start`, 'POST', t2.token);
  check('a member cannot start the trip: 403 NOT_PERMITTED',
    memberStarts.status === 403 && memberStarts.body?.code === 'NOT_PERMITTED',
    `${memberStarts.status} ${memberStarts.body?.code}`);
  check('...and nothing moved: the trip is still a draft', (await stateOf(t1.token, trip)) === 'draft');

  // --- no skip edge (spec decision 9) -----------------------------------------------------------
  const ownerSkips = await api(`/v1/itineraries/${trip}/complete`, 'POST', t1.token);
  check('even the owner cannot complete a draft: 409 ILLEGAL_STATE_TRANSITION — there is no skip edge',
    ownerSkips.status === 409 && ownerSkips.body?.code === 'ILLEGAL_STATE_TRANSITION',
    `${ownerSkips.status} ${ownerSkips.body?.code}`);

  // --- the visitor (default-deny, regression-checklist line 1) -----------------------------------
  const visitor = await api(`/v1/itineraries/${trip}/start`, 'POST', undefined);
  check('an unauthenticated visitor is refused: 401', visitor.status === 401, String(visitor.status));

  // --- the guard masks a non-member --------------------------------------------------------------
  // A fresh trip owned by t2 that t1 is not on: t1's transition must 404, not 403 — masking, so a
  // probe cannot learn the id is real.
  const t2Trip = (await api('/v1/itineraries', 'POST', t2.token,
    { title: 'not t1\'s trip', destinations: ['Cebu'] })).body.id;
  const masked = await api(`/v1/itineraries/${t2Trip}/start`, 'POST', t1.token);
  check('a non-member is masked with 404, never 403', masked.status === 404, String(masked.status));

  // --- start: the transition, and the V12 probe --------------------------------------------------
  // THIS IS THE MIGRATION CHECK. The entity maps started_at, so this UPDATE cannot succeed against a
  // database without the column — it would be a 500 naming it.
  const started = await api(`/v1/itineraries/${trip}/start`, 'POST', t1.token);
  check('t1 starts the trip: 200, and the response says active',
    started.status === 200 && started.body?.state === 'active', `${started.status} state=${started.body?.state}`);
  check('the write proves V12 applied — started_at is mapped, so this UPDATE could not have succeeded without it',
    started.status === 200);
  check('the response carries the whole resource, not just a status', typeof started.body?.title === 'string'
    && Array.isArray(started.body?.days), `title=${started.body?.title} days=${started.body?.days?.length}`);

  // --- the lifecycle stamps stay OFF the wire (spec decision 6) ----------------------------------
  check('startedAt/completedAt are deliberately not on the wire — no reader exists yet',
    started.body?.startedAt === undefined && started.body?.completedAt === undefined,
    `startedAt=${started.body?.startedAt} completedAt=${started.body?.completedAt}`);

  // --- forward-only (spec decision 3) ------------------------------------------------------------
  const restart = await api(`/v1/itineraries/${trip}/start`, 'POST', t1.token);
  check('starting an already-active trip is refused: 409',
    restart.status === 409 && restart.body?.code === 'ILLEGAL_STATE_TRANSITION',
    `${restart.status} ${restart.body?.code}`);

  // --- members still see the state, and can still edit the plan (spec decision 2) ----------------
  check('t2 (a member) sees the new state — it is a workspace-visible fact',
    (await stateOf(t2.token, trip)) === 'active');

  // --- complete ----------------------------------------------------------------------------------
  const completed = await api(`/v1/itineraries/${trip}/complete`, 'POST', t1.token);
  check('t1 completes the trip: 200, state completed',
    completed.status === 200 && completed.body?.state === 'completed',
    `${completed.status} state=${completed.body?.state}`);

  const recomplete = await api(`/v1/itineraries/${trip}/complete`, 'POST', t1.token);
  check('completing an already-completed trip is refused: 409 — the machine is forward-only',
    recomplete.status === 409, `${recomplete.status} ${recomplete.body?.code}`);
  const backwards = await api(`/v1/itineraries/${trip}/start`, 'POST', t1.token);
  check('and there is no way back to active: 409', backwards.status === 409, String(backwards.status));

  // --- completed gates NOTHING (spec decision 2) — the working afterlife -------------------------
  // The claim the spec makes loudest, and the one a "freeze on completion" implementation would fail.
  const lock = await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', t2.token);
  check('a member can still take the edit lock on a completed trip', lock.status === 200, String(lock.status));
  const editAfter = await api(`/v1/itineraries/${trip}`, 'PATCH', t2.token,
    { title: 'edited after completion', destinations: ['Palawan'] });
  check('...and still edit the plan — `completed` is a working afterlife, not a freeze',
    editAfter.status === 200, String(editAfter.status));
  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', t2.token);

  const inviteAfter = await api(`/v1/itineraries/${trip}/invitations`, 'POST', t1.token,
    { email: address('t3') });
  check('...and the owner can still invite — membership ops are not frozen either',
    inviteAfter.status === 201, String(inviteAfter.status));

  // --- the PATCH pin, over the wire (spec AC 3) -------------------------------------------------
  // The IT asserts this structurally (UpdateItineraryRequest has no state component). This is the
  // behavioural companion: a client that tries anyway must not move the state.
  const before = await stateOf(t1.token, trip);
  await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', t1.token);
  const patchState = await api(`/v1/itineraries/${trip}`, 'PATCH', t1.token,
    { title: 'edited after completion', destinations: ['Palawan'], state: 'draft' });
  check('PATCH cannot move lifecycle state — the field-edit door and the lifecycle door stay separate',
    patchState.status === 200 && (await stateOf(t1.token, trip)) === before,
    `sent state=draft, still ${await stateOf(t1.token, trip)}`);
  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', t1.token);

  // --- My Trips carries the badge's data (ticket 02) --------------------------------------------
  const mine = (await api('/v1/itineraries', 'GET', t1.token)).body.items;
  const row = mine.find((i) => i.id === trip);
  check('the trip appears in My Trips carrying its state — what the row badge renders',
    row?.state === 'completed', `state=${row?.state}`);

  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks passed against ${API}`);
  console.log(`trip: ${trip}`);
})().catch((e) => { console.error('\n' + e.message); process.exit(1); });
