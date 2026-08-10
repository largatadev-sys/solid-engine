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
const session = () => ({ subjectType: 'session' });

async function poolToken(tag) {
  const res = await request(https,
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,
    'POST', { email: address(tag), password: PASSWORD, returnSecureToken: true });
  if (res.status !== 200) throw new Error(`pool member ${tag} unavailable — run scripts/test-pool.js create`);
  return res.body.idToken;
}

const stagedFrom = (trip, mutate) => {
  const days = trip.days.map((d) => ({
    id: d.id,
    title: d.title,
    activities: d.activities.map((a) => ({ id: a.id, fields: { title: a.title } })),
  }));
  mutate(days);
  return { basePlanVersion: trip.planVersion, days };
};

(async () => {
  console.log('\nS4.18 — buffered plan editing, against ' + API);
  console.log('t1 = the holder whose buffer goes stale · t2 = the intervening saver\n');

  const t1 = await poolToken('t1');
  const t2 = await poolToken('t2');

  const created = await api('/v1/itineraries', 'POST', t1,
    { title: 'S4.18 buffered editing', destinations: ['Palawan'], durationDays: 2 });
  if (created.status !== 201) throw new Error('could not create a trip: ' + JSON.stringify(created.body));
  const trip = created.body.id;

  const invited = await api(`/v1/itineraries/${trip}/invitations`, 'POST', t1, { email: address('t2') });
  if (invited.status !== 201) throw new Error('could not invite t2: ' + JSON.stringify(invited.body));
  await api(`/v1/invitations/${invited.body.id}/accept`, 'POST', t2);

  const fresh = await api(`/v1/itineraries/${trip}`, 'GET', t1);
  check('a fresh trip reports a plan version (AC 7 / ticket 01)',
    typeof fresh.body.planVersion === 'number', 'planVersion=' + fresh.body.planVersion);

  const perAction = await api(`/v1/itineraries/${trip}/days`, 'POST', t1, {});
  const afterPerAction = await api(`/v1/itineraries/${trip}`, 'GET', t1);
  check('a per-action write still answers and bumps the version — old clients coexist (AC 7)',
    perAction.status === 201 && afterPerAction.body.planVersion === fresh.body.planVersion + 1,
    `${fresh.body.planVersion} -> ${afterPerAction.body.planVersion}`);

  const noSession = await api(`/v1/itineraries/${trip}/plan`, 'PUT', t1,
    stagedFrom(afterPerAction.body, (days) => days.push({ id: null, title: 'No session', activities: [] })));
  check('the bulk save is holder-only — no session held is refused EDIT_LOCKED (AC 2)',
    noSession.status === 409 && noSession.body.code === 'EDIT_LOCKED',
    'got ' + noSession.status + ' ' + JSON.stringify(noSession.body?.code));

  const held = await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', t1, session());
  check('t1 opens the Editing Session', held.status === 200, 'got ' + held.status);

  const beforeStaging = await api(`/v1/itineraries/${trip}`, 'GET', t1);
  const staleBase = beforeStaging.body.planVersion;

  const intruder = await api(`/v1/itineraries/${trip}/plan`, 'PUT', t2,
    stagedFrom(beforeStaging.body, (days) => days.push({ id: null, title: 'From t2', activities: [] })));
  check('a member who does not hold the session cannot save into it (AC 2)',
    intruder.status === 409 && intruder.body.code === 'EDIT_LOCKED', 'got ' + intruder.status);
  check('…and the refusal names the holder', String(intruder.body?.message ?? '').includes('@'),
    intruder.body?.message);

  const mixed = await api(`/v1/itineraries/${trip}/plan`, 'PUT', t1,
    stagedFrom(beforeStaging.body, (days) => {
      days[0].title = 'Renamed in the buffer';
      days[0].activities.push({ id: null, fields: { title: 'Staged activity A' } });
      days[0].activities.push({ id: null, fields: { title: 'Staged activity B' } });
      days.push({ id: null, title: 'Appended in the buffer', activities: [] });
    }));
  check('one bulk save lands a mixed session of edits (AC 2)', mixed.status === 200, 'got ' + mixed.status);

  const afterMixed = await api(`/v1/itineraries/${trip}`, 'GET', t1);
  const titles = afterMixed.body.days.flatMap((d) => d.activities.map((a) => a.title));
  check('…and a fresh read shows exactly the staged plan',
    afterMixed.body.days[0].title === 'Renamed in the buffer'
      && titles.includes('Staged activity A') && titles.includes('Staged activity B')
      && afterMixed.body.days.some((d) => d.title === 'Appended in the buffer'),
    afterMixed.body.days.map((d) => d.title).join(' | '));
  check('…for exactly one version bump, however many ops the buffer held (AC 2)',
    afterMixed.body.planVersion === staleBase + 1,
    `${staleBase} -> ${afterMixed.body.planVersion}`);

  const stale = await api(`/v1/itineraries/${trip}/plan`, 'PUT', t1,
    stagedFrom({ ...afterMixed.body, planVersion: staleBase },
      (days) => days.push({ id: null, title: 'Saved from a stale buffer', activities: [] })));
  check('a stale base is refused by name rather than overwriting (AC 5)',
    stale.status === 409 && stale.body.code === 'STALE_PLAN',
    'got ' + stale.status + ' ' + JSON.stringify(stale.body?.code));
  check('…and the refusal carries the version to re-base on — no force flag needed (AC 5)',
    stale.body?.details?.currentPlanVersion === afterMixed.body.planVersion,
    JSON.stringify(stale.body?.details));

  const rebased = await api(`/v1/itineraries/${trip}/plan`, 'PUT', t1,
    stagedFrom(afterMixed.body, (days) => days.push({ id: null, title: 'Saved anyway', activities: [] })));
  const afterRebase = await api(`/v1/itineraries/${trip}`, 'GET', t1);
  check('…and re-submitting against that version is the whole Save-anyway path (AC 5)',
    rebased.status === 200 && afterRebase.body.days.some((d) => d.title === 'Saved anyway'),
    'got ' + rebased.status);

  const emptied = await api(`/v1/itineraries/${trip}/plan`, 'PUT', t1,
    { basePlanVersion: afterRebase.body.planVersion, days: afterRebase.body.days.map((d) => ({
      id: d.id, title: d.title, activities: [],
    })) });
  const afterEmptied = await api(`/v1/itineraries/${trip}`, 'GET', t1);
  check('an activity absent from the submitted plan is deleted, days and all (AC 2)',
    emptied.status === 200 && afterEmptied.body.days.every((d) => d.activities.length === 0),
    afterEmptied.body.days.map((d) => d.activities.length).join(','));

  const noOp = await api(`/v1/itineraries/${trip}/plan`, 'PUT', t1,
    stagedFrom(afterEmptied.body, () => {}));
  const afterNoOp = await api(`/v1/itineraries/${trip}`, 'GET', t1);
  check('a save is still one write even when the plan did not change',
    noOp.status === 200 && afterNoOp.body.planVersion === afterEmptied.body.planVersion + 1,
    `${afterEmptied.body.planVersion} -> ${afterNoOp.body.planVersion}`);

  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', t1, session());
  const released = await api(`/v1/itineraries/${trip}`, 'GET', t1);
  check('Save Changes ends by releasing the session (AC 2)',
    released.body.editingSession === null || released.body.editingSession === undefined,
    JSON.stringify(released.body.editingSession));

  console.log(`\n──────── S4.18 API rung: ${pass} passed, ${fail} failed ────────\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SMOKE CRASHED:', e.message); process.exit(1); });
