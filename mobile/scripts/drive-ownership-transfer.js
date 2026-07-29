const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const PREVIEW = process.env.LARGATA_PREVIEW_URL || 'http://localhost:8081';
const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;
const PORT = Number(process.env.LARGATA_CDP_PORT || 9225);

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

  console.log(`Seeding a trip via ${API} …`);
  const t1 = await signIn('t1');
  const t2 = await signIn('t2');
  const id = async (t) => (await api('/v1/me', 'GET', t.tokens.idToken)).body.id;
  const id2 = await id(t2);
  const trip = (await api('/v1/itineraries', 'POST', t1.tokens.idToken,
    { title: 'S1.6 preview drive', destinations: ['Palawan'] })).body.id;
  const invite = await api(`/v1/itineraries/${trip}/invitations`, 'POST', t1.tokens.idToken, { email: t2.email });
  await api(`/v1/invitations/${invite.body.id}/accept`, 'POST', t2.tokens.idToken, {});
  console.log(`  trip ${trip}\n`);

  const chrome = spawn(chromePath(), [
    `--remote-debugging-port=${PORT}`, '--headless=new', '--disable-gpu', '--no-first-run',
    `--user-data-dir=${require('os').tmpdir()}/largata-s16-driver`, '--window-size=1280,900', 'about:blank',
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

  const enterAs = async (traveler, answer) => {
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
    await send('Page.navigate', { url: `${PREVIEW}/members/${trip}` });
    await sleep(3500);
    await evaluate(`(() => {
      window.__confirms = [];
      window.confirm = (message) => { window.__confirms.push(String(message)); return ${answer}; };
    })()`);
  };

  const clickText = async (text) => evaluate(`(() => {
    const wanted = ${JSON.stringify(text)}.toLowerCase();
    const nodes = [...document.querySelectorAll('div[role="button"],button,[tabindex]')];
    const hit = nodes.find((n) => (n.innerText || '').trim().toLowerCase().includes(wanted));
    if (!hit) return false;
    hit.click();
    return true;
  })()`);

  const rosterFlag = async () =>
    (await api(`/v1/itineraries/${trip}/members`, 'GET', t1.tokens.idToken))
      .body.items.find((m) => m.ownershipOffered === true)?.travelerId;
  const ownerId = async () =>
    (await api(`/v1/itineraries/${trip}/members`, 'GET', t2.tokens.idToken))
      .body.items.find((m) => m.role === 'owner')?.travelerId;

  console.log('As t1 (owner), on /members:');
  await enterAs(t1, 'false');
  const ownerScreen = await evaluate('document.body.innerText');
  check('the members screen rendered (not the S0.4 white screen)', (ownerScreen || '').length > 0,
    `${(ownerScreen || '').length} chars`);
  check('the owner sees a "Make owner" control', /make owner/i.test(ownerScreen || ''));

  const clickedCancel = await clickText('Make owner');
  await sleep(1500);
  const cancelMessages = await evaluate('JSON.stringify(window.__confirms || [])');
  check('clicking it fires a real confirm dialog (not the S1.3 Alert no-op)',
    clickedCancel && JSON.parse(cancelMessages || '[]').length > 0, cancelMessages);
  check('the dialog names the consequence, from the shared wording module',
    /become the owner|become a member/i.test(cancelMessages || ''));
  check('CANCEL made no offer — the server state is untouched', (await rosterFlag()) === undefined);

  await evaluate(`window.confirm = (m) => { window.__confirms.push(String(m)); return true; };`);
  await clickText('Make owner');
  await sleep(2500);
  check('CONFIRM made the offer — the roster flag is on t2', (await rosterFlag()) === id2,
    `flag=${await rosterFlag()}`);

  console.log('\nAs t2 (offeree):');
  await enterAs(t2, 'false');
  const offereeMembers = await evaluate('document.body.innerText');
  check('the offeree sees the offer and an Accept control on the members screen',
    /offered ownership|accept ownership/i.test(offereeMembers || ''));

  await send('Page.navigate', { url: `${PREVIEW}/itineraries/${trip}` });
  await sleep(3000);
  const tripScreen = await evaluate('document.body.innerText');
  check('the trip screen shows the discovery banner — the reversal\'s justification, on web',
    /offered ownership/i.test(tripScreen || ''));

  await send('Page.navigate', { url: `${PREVIEW}/members/${trip}` });
  await sleep(3000);
  await evaluate(`(() => { window.__confirms = []; window.confirm = (m) => { window.__confirms.push(String(m)); return false; }; })()`);
  await clickText('Accept ownership');
  await sleep(1500);
  const acceptCancelled = await evaluate('JSON.stringify(window.__confirms || [])');
  check('accept confirms before acting', JSON.parse(acceptCancelled || '[]').length > 0, acceptCancelled);
  check('CANCEL on accept left ownership where it was',
    (await ownerId()) !== id2, `owner=${await ownerId()}`);

  await evaluate(`window.confirm = (m) => { window.__confirms.push(String(m)); return true; };`);
  await clickText('Accept ownership');
  await sleep(3000);
  check('CONFIRM transferred ownership to t2 — driven entirely through the browser',
    (await ownerId()) === id2, `owner=${await ownerId()}`);

  check('no uncaught page errors during the whole drive', pageErrors.length === 0, pageErrors.join(' | '));

  ws.close();
  chrome.kill();
  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed in the preview container`);
  console.log(`trip: ${trip}`);
  if (failed.length) process.exit(1);
})().catch((e) => { console.error('\nDRIVE FAILED:', e.message); process.exit(1); });
