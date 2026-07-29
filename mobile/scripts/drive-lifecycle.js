const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const PREVIEW = process.env.LARGATA_PREVIEW_URL || 'http://localhost:8081';
const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;
const PORT = Number(process.env.LARGATA_CDP_PORT || 9226);

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function chromePath() {
  const fs = require('fs');
  const found = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Chrome not found — set one of: ' + CHROME_CANDIDATES.join(', '));
  return found;
}

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
  if (res.status !== 200) throw new Error(`sign-in failed for ${email}`);
  return { email, tokens: res.body };
}

const checks = [];
function check(description, ok, detail) {
  checks.push({ ok: Boolean(ok), description });
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${description}${detail ? `  — ${detail}` : ''}`);
}

(async () => {
  for (const [n, v] of [['EXPO_PUBLIC_FIREBASE_API_KEY', KEY], ['LARGATA_TEST_POOL_EMAIL_BASE', BASE],
    ['LARGATA_TEST_POOL_PASSWORD', PASSWORD]]) {
    if (!v) { console.error(`${n} is not set — run with: set -a && . ./.env && set +a`); process.exit(1); }
  }

  console.log(`Seeding trips via ${API} …`);
  const t1 = await signIn('t1');
  const t2 = await signIn('t2');

  const makeTrip = async (title, startDate, endDate) => {
    const trip = (await api('/v1/itineraries', 'POST', t1.tokens.idToken,
      { title, destinations: ['Palawan'], startDate, endDate })).body.id;
    const invite = await api(`/v1/itineraries/${trip}/invitations`, 'POST', t1.tokens.idToken, { email: t2.email });
    await api(`/v1/invitations/${invite.body.id}/accept`, 'POST', t2.tokens.idToken, {});
    return trip;
  };
  const trip = await makeTrip('S1.7 preview drive', '2027-03-01', '2027-03-10');
  const overdue = await makeTrip('S1.7 overdue draft', '2020-01-01', '2020-01-10');
  console.log(`  trip ${trip}\n  overdue ${overdue}\n`);

  const chrome = spawn(chromePath(), [
    `--remote-debugging-port=${PORT}`, '--headless=new', '--disable-gpu', '--no-first-run',
    `--user-data-dir=${require('os').tmpdir()}/largata-s17-driver`, '--window-size=1280,900', 'about:blank',
  ], { stdio: 'ignore' });
  await sleep(2500);

  const targets = await new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path: '/json/list' }, (res) => {
      let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => resolve(JSON.parse(b)));
    }).on('error', reject);
  });
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl, { perMessageDeflate: false });
  let msgId = 0;
  const pending = new Map();
  const pageErrors = [];
  const send = (method, params = {}) => new Promise((resolve) => {
    const i = ++msgId; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params }));
  });
  await new Promise((r) => ws.on('open', r));
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') pageErrors.push(m.params.exceptionDetails.text);
  });
  await send('Runtime.enable');
  await send('Page.enable');
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true }))?.result?.value;

  const enterAs = async (traveler, where, answer) => {
    await send('Page.navigate', { url: PREVIEW });
    await sleep(2500);
    await evaluate(`(() => {
      localStorage.setItem('largata.web.session', JSON.stringify({
        idToken: ${JSON.stringify(traveler.tokens.idToken)},
        refreshToken: ${JSON.stringify(traveler.tokens.refreshToken)},
        uid: ${JSON.stringify(traveler.tokens.localId)},
        expiresAt: Date.now() + 3300000,
      }));
    })()`);
    await send('Page.navigate', { url: where });
    await sleep(3500);
    await evaluate(`(() => {
      window.__confirms = [];
      window.confirm = (message) => { window.__confirms.push(String(message)); return ${answer}; };
    })()`);
  };

  const clickText = async (text) => evaluate(`(() => {
    const wanted = ${JSON.stringify(text)}.toLowerCase();
    const nodes = [...document.querySelectorAll('div[role="button"],button,[tabindex]')];
    const hit = nodes.find((n) => (n.innerText || '').trim().toLowerCase() === wanted);
    if (!hit) return false;
    hit.click();
    return true;
  })()`);

  const serverState = async (id) => (await api(`/v1/itineraries/${id}`, 'GET', t1.tokens.idToken)).body.state;

  console.log('As t1 (owner), on the trip screen:');
  await enterAs(t1, `${PREVIEW}/itineraries/${trip}`, 'false');
  const ownerScreen = await evaluate('document.body.innerText');
  check('the trip screen rendered (not the S0.4 white screen)', (ownerScreen || '').length > 0,
    `${(ownerScreen || '').length} chars`);
  check('the state badge shows Draft', /draft/i.test(ownerScreen || ''));
  check('the owner sees the lifecycle banner with a Start control',
    /not started yet/i.test(ownerScreen || '') && /start/i.test(ownerScreen || ''));

  const clickedCancel = await clickText('Start');
  await sleep(1500);
  const cancelMessages = await evaluate('JSON.stringify(window.__confirms || [])');
  check('clicking Start fires a real confirm (not the S1.3 Alert no-op)',
    clickedCancel && JSON.parse(cancelMessages || '[]').length > 0, cancelMessages);
  check('the dialog names the forward-only cost, from the shared wording module',
    /can't go back to draft|cannot go back to draft/i.test(cancelMessages || ''));
  check('CANCEL did not start the trip — server state untouched', (await serverState(trip)) === 'draft',
    `state=${await serverState(trip)}`);

  await evaluate(`window.confirm = (m) => { window.__confirms.push(String(m)); return true; };`);
  await clickText('Start');
  await sleep(2500);
  check('CONFIRM started the trip', (await serverState(trip)) === 'active', `state=${await serverState(trip)}`);
  const afterStart = await evaluate('document.body.innerText');
  check('the screen now shows Active and offers Complete',
    /active/i.test(afterStart || '') && /trip in progress/i.test(afterStart || ''));

  await evaluate(`(() => { window.__confirms = []; window.confirm = (m) => { window.__confirms.push(String(m)); return false; }; })()`);
  await clickText('Complete');
  await sleep(1500);
  const completeCancel = await evaluate('JSON.stringify(window.__confirms || [])');
  check('Complete confirms before acting', JSON.parse(completeCancel || '[]').length > 0, completeCancel);
  check("...and its wording says what completion does NOT do — the working afterlife",
    /stay as they are/i.test(completeCancel || ''));
  check('CANCEL left it active', (await serverState(trip)) === 'active');

  await evaluate(`window.confirm = (m) => { window.__confirms.push(String(m)); return true; };`);
  await clickText('Complete');
  await sleep(2500);
  check('CONFIRM completed the trip', (await serverState(trip)) === 'completed',
    `state=${await serverState(trip)}`);
  const afterComplete = await evaluate('document.body.innerText');
  check('the banner is gone once completed — the machine is forward-only, so there is no lever left',
    !/trip in progress|not started yet/i.test(afterComplete || ''));

  console.log('\nOn the overdue draft (both dates in the past):');
  await send('Page.navigate', { url: `${PREVIEW}/itineraries/${overdue}` });
  await sleep(3000);
  const overdueScreen = await evaluate('document.body.innerText');
  check('the nudge fires, naming the date the owner set', /start date was/i.test(overdueScreen || ''));
  check('it asks whether the trip is underway', /is this trip underway/i.test(overdueScreen || ''));
  check('it offers Start and NOT Complete — the strict two-tap path, rendered',
    /start/i.test(overdueScreen || '') && !/mark it complete when|trip in progress/i.test(overdueScreen || ''));

  console.log('\nAs t2 (ordinary member), same trip:');
  await enterAs(t2, `${PREVIEW}/itineraries/${trip}`, 'false');
  const memberScreen = await evaluate('document.body.innerText');
  check('the member sees the state badge — it is a workspace-visible fact',
    /completed/i.test(memberScreen || ''));
  check('the member sees NO lifecycle banner — the lever is the owner\'s',
    !/not started yet|trip in progress|is this trip underway/i.test(memberScreen || ''));

  await send('Page.navigate', { url: PREVIEW });
  await sleep(3000);
  const myTrips = await evaluate('document.body.innerText');
  check('My Trips renders the state badge on the row', /completed/i.test(myTrips || ''),
    /completed/i.test(myTrips || '') ? 'badge present' : 'no badge');

  check('no page errors anywhere in the run', pageErrors.length === 0, pageErrors.join(' | ') || 'none');

  ws.close();
  chrome.kill();
  const passed = checks.filter((c) => c.ok).length;
  console.log(`\n${passed}/${checks.length} checks passed against ${PREVIEW}`);
  if (passed !== checks.length) process.exit(1);
})().catch((e) => { console.error('\n' + e.message); process.exit(1); });
