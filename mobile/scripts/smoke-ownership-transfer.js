/**
 * Drives S1.6's whole arc against a running backend, with real verified accounts (S1.6, ticket 05).
 *
 * ## What it proves, and why it is a script rather than another IT
 *
 * The ITs prove the contract against Testcontainers. This proves the same arc against a **deployed
 * rung** — a real Firebase token from a real verified account, a real network, the migrations as they
 * actually applied. That is the only thing an IT structurally cannot do, and it is what spec AC 14
 * asks for.
 *
 * Every step is a discriminating check: each one states what it expects and fails loudly otherwise, so
 * a green run cannot mean "the probe never worked" (the repo's three-times-burned lesson). The final
 * SQL-shaped assertions are done through the API where the API exposes the fact, and reported for the
 * operator to confirm in the database where it does not.
 *
 * ## Usage
 *
 *   cd mobile && set -a && . ./.env && set +a
 *   node scripts/smoke-ownership-transfer.js                        # local stack
 *   LARGATA_API_BASE_URL=https://api-dev.largata.com node scripts/smoke-ownership-transfer.js
 *
 * Tags are stated in the output on purpose (S1.5's rule: a test identity must identify itself) —
 * t1 = original owner, t2 = the traveler offered the crown, t3 = a bystander who must see the
 * governance state but never be able to act on it.
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

const roleOf = (roster, travelerId) => roster.find((m) => m.travelerId === travelerId)?.role;
const offeredOn = (roster) => roster.find((m) => m.ownershipOffered === true)?.travelerId;

(async () => {
  for (const [name, value] of [['EXPO_PUBLIC_FIREBASE_API_KEY', KEY], ['LARGATA_TEST_POOL_EMAIL_BASE', BASE],
    ['LARGATA_TEST_POOL_PASSWORD', PASSWORD]]) {
    if (!value) { console.error(`${name} is not set — run with: set -a && . ./.env && set +a`); process.exit(1); }
  }
  console.log(`S1.6 ownership-transfer smoke against ${API}`);
  console.log('t1 = original owner, t2 = offeree/new owner, t3 = bystander\n');

  const t1 = await signIn('t1');
  const t2 = await signIn('t2');
  const t3 = await signIn('t3');
  const id = async (t) => (await api('/v1/me', 'GET', t.token)).body.id;
  const [id1, id2, id3] = [await id(t1), await id(t2), await id(t3)];

  // --- a trip with three travelers, joined for real (invite → inbox → accept) --------------------
  const trip = (await api('/v1/itineraries', 'POST', t1.token,
    { title: 'S1.6 transfer smoke', destinations: ['Palawan'] })).body.id;
  for (const [tag, who] of [['t2', t2], ['t3', t3]]) {
    const invite = await api(`/v1/itineraries/${trip}/invitations`, 'POST', t1.token, { email: who.email });
    if (invite.status !== 201) throw new Error(`invite ${tag} failed: ${JSON.stringify(invite.body)}`);
    const accept = await api(`/v1/invitations/${invite.body.id}/accept`, 'POST', who.token, {});
    if (accept.status !== 200) throw new Error(`accept ${tag} failed: ${JSON.stringify(accept.body)}`);
  }
  check('trip created and t2 + t3 joined through the real invite flow', true, `trip ${trip}`);

  // --- My Trips is membership-scoped (AC 8) -----------------------------------------------------
  const listOf = async (t) => (await api('/v1/itineraries', 'GET', t.token)).body.items.map((i) => i.id);
  check('t2 (a joined member) sees the trip in My Trips — the S1.5 bug, fixed',
    (await listOf(t2)).includes(trip));

  // --- the owner's exit is still shut before the transfer (the control) -------------------------
  const blocked = await api(`/v1/itineraries/${trip}/members/${id1}`, 'DELETE', t1.token);
  check('t1 cannot leave while owner: 409 OWNER_CANNOT_LEAVE', blocked.status === 409 && blocked.body?.code === 'OWNER_CANNOT_LEAVE',
    `${blocked.status} ${blocked.body?.code}`);

  // --- authority on the offer route -------------------------------------------------------------
  const byMember = await api(`/v1/itineraries/${trip}/ownership-offer`, 'POST', t3.token, { travelerId: id2 });
  check('a member cannot offer ownership: 403', byMember.status === 403, String(byMember.status));

  // --- offer, and everyone can see it (AC 1) ----------------------------------------------------
  const offered = await api(`/v1/itineraries/${trip}/ownership-offer`, 'POST', t1.token, { travelerId: id2 });
  check('t1 offers ownership to t2: 201', offered.status === 201, String(offered.status));
  const rosterAfterOffer = (await api(`/v1/itineraries/${trip}/members`, 'GET', t3.token)).body.items;
  check('the bystander t3 sees the offer on t2\'s row — governance state is workspace-walled, not private',
    offeredOn(rosterAfterOffer) === id2);

  // --- one crown, one hand (AC 1) ---------------------------------------------------------------
  const second = await api(`/v1/itineraries/${trip}/ownership-offer`, 'POST', t1.token, { travelerId: id3 });
  check('a second offer is refused: 409 OFFER_ALREADY_PENDING',
    second.status === 409 && second.body?.code === 'OFFER_ALREADY_PENDING', `${second.status} ${second.body?.code}`);

  // --- the stale-accept race, safe by construction (AC 5) ---------------------------------------
  await api(`/v1/itineraries/${trip}/ownership-offer`, 'DELETE', t1.token);
  await api(`/v1/itineraries/${trip}/ownership-offer`, 'POST', t1.token, { travelerId: id3 });
  const staleAccept = await api(`/v1/itineraries/${trip}/ownership-offer/accept`, 'POST', t2.token);
  check('t2\'s stale accept after revoke-and-reoffer-to-t3 is refused: 403 NOT_OFFER_TARGET',
    staleAccept.status === 403 && staleAccept.body?.code === 'NOT_OFFER_TARGET',
    `${staleAccept.status} ${staleAccept.body?.code}`);
  const stillOwner = (await api(`/v1/itineraries/${trip}/members`, 'GET', t1.token)).body.items;
  check('...and nothing moved: t1 is still the owner', roleOf(stillOwner, id1) === 'owner');

  // --- back to t2, and accept: the transfer (AC 4) ----------------------------------------------
  await api(`/v1/itineraries/${trip}/ownership-offer`, 'DELETE', t1.token);
  await api(`/v1/itineraries/${trip}/ownership-offer`, 'POST', t1.token, { travelerId: id2 });
  const accepted = await api(`/v1/itineraries/${trip}/ownership-offer/accept`, 'POST', t2.token);
  check('t2 accepts: 204', accepted.status === 204, String(accepted.status));

  const after = (await api(`/v1/itineraries/${trip}/members`, 'GET', t2.token)).body.items;
  check('the crown moved: t2 is owner, t1 is member', roleOf(after, id2) === 'owner' && roleOf(after, id1) === 'member',
    `t1=${roleOf(after, id1)} t2=${roleOf(after, id2)}`);
  check('exactly one owner on the roster — INV-4', after.filter((m) => m.role === 'owner').length === 1);
  check('the offer is resolved: no pending flag left on the roster', offeredOn(after) === undefined);

  // --- authority actually moved with the role ---------------------------------------------------
  const exOwnerOffers = await api(`/v1/itineraries/${trip}/ownership-offer`, 'POST', t1.token, { travelerId: id3 });
  check('the former owner can no longer offer ownership: 403', exOwnerOffers.status === 403, String(exOwnerOffers.status));
  const newOwnerOffers = await api(`/v1/itineraries/${trip}/ownership-offer`, 'POST', t2.token, { travelerId: id3 });
  check('the new owner can: 201', newOwnerOffers.status === 201, String(newOwnerOffers.status));
  await api(`/v1/itineraries/${trip}/ownership-offer`, 'DELETE', t2.token);

  // --- both parties keep the trip in My Trips (AC 8, the acute case) ----------------------------
  check('the former owner t1 still has the trip in My Trips — they are still on it',
    (await listOf(t1)).includes(trip));
  check('the new owner t2 has it too', (await listOf(t2)).includes(trip));

  // --- the point of the whole story: the dead end opens (AC 12's API half) ----------------------
  const left = await api(`/v1/itineraries/${trip}/members/${id1}`, 'DELETE', t1.token);
  check('t1 can now leave — the S1.5 dead end is open', left.status === 204, String(left.status));
  check('...and the trip drops off their My Trips', !(await listOf(t1)).includes(trip));
  const evicted = await api(`/v1/itineraries/${trip}`, 'GET', t1.token);
  check('...and the walls close behind them: 404', evicted.status === 404, String(evicted.status));

  // --- departure voids a pending offer (AC 6) ---------------------------------------------------
  await api(`/v1/itineraries/${trip}/ownership-offer`, 'POST', t2.token, { travelerId: id3 });
  await api(`/v1/itineraries/${trip}/members/${id3}`, 'DELETE', t3.token); // t3 leaves holding the offer
  const rosterAfterVoid = (await api(`/v1/itineraries/${trip}/members`, 'GET', t2.token)).body.items;
  check('t3 leaving voided their pending offer — no ghost flag on the roster', offeredOn(rosterAfterVoid) === undefined);
  check('...and the trip is down to its one owner', rosterAfterVoid.length === 1 && roleOf(rosterAfterVoid, id2) === 'owner');

  console.log(`\n${checks.length}/${checks.length} checks passed against ${API}`);
  console.log(`trip id: ${trip}`);
  console.log('\nTo confirm the durable record in the database (the one fact no endpoint exposes):');
  console.log(`  SELECT t.from_traveler_id, t.to_traveler_id, t.transferred_at`);
  console.log(`    FROM ownership_transfer t JOIN workspace w ON t.workspace_id = w.id`);
  console.log(`   WHERE w.itinerary_id = '${trip}';   -- expect ONE row: t1 -> t2`);
  console.log(`  SELECT status, target_traveler_id FROM ownership_offer o`);
  console.log(`    JOIN workspace w ON o.workspace_id = w.id WHERE w.itinerary_id = '${trip}';`);
  console.log(`   -- expect ACCEPTED (t2), REVOKED x3, VOIDED (t3)`);
  console.log(`  SELECT owner_id FROM itinerary WHERE id = '${trip}';   -- expect t2 = ${id2}`);
})().catch((e) => { console.error('\nSMOKE FAILED:', e.message); process.exit(1); });
