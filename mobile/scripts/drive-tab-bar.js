// The tab bar, walked on the WEB rung with touch emulation — the founder reported the Profile
// tab doing nothing when viewing a trip, on a mobile browser. Two things this walk exists to get
// right, both of which made earlier attempts lie:
//   1. It ENTERS A TRIP first. A walk that taps Profile from the Trips root proves nothing:
//      canDismiss() is false there, so even the old code fell through to navigate().
//   2. It asserts by VISIBILITY of a profile-only control, never by body.innerText order —
//      expo-router keeps the trip scene mounted beneath, so the text carries both screens (S4.0)
//      and "shows Trips" is compatible with a perfectly working app.
// Standing result (2026-08-12): 5/5 with the fix AND with it reverted, so the founder-s report
// does not reproduce here. Kept as the regression check this surface otherwise lacks.
const WebSocket = require('ws');
const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PREVIEW = 'http://localhost:8081';
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;
const PORT = 9271;

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => fs.existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  — ' + detail : ''}`);
};

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      new URL(url),
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve(b ? JSON.parse(b) : {}));
      },
    );
    req.on('error', reject);
    req.end(data);
  });
}

function api(p, token) {
  return new Promise((resolve, reject) => {
    http.get({ host: 'localhost', port: 8080, path: p, headers: { Authorization: `Bearer ${token}` } }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve(b ? JSON.parse(b) : null));
    }).on('error', reject);
  });
}

function getJson(p) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path: p }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve(JSON.parse(b)));
    }).on('error', reject);
  });
}

(async () => {
  const profileDir = path.join(os.tmpdir(), 'largata-webtab');
  fs.rmSync(profileDir, { recursive: true, force: true });

  const chrome = spawn(
    CHROME,
    [
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profileDir}`,
      '--headless=new',
      '--no-first-run',
      '--window-size=412,915',
      PREVIEW,
    ],
    { stdio: 'ignore' },
  );

  await sleep(3500);
  const page = (await getJson('/json/list')).find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const msgId = ++id;
      pending.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

  await new Promise((r) => ws.on('open', r));
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result);
      pending.delete(m.id);
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 3, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r?.result?.value;
  };
  const url = () => evaluate('location.pathname');

  const auth = await postJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,
    { email: BASE.replace('@', '+t1@'), password: PASSWORD, returnSecureToken: true },
  );

  await send('Page.navigate', { url: PREVIEW });
  await sleep(3000);
  await evaluate(`
    localStorage.setItem('largata.web.session', JSON.stringify({
      idToken: ${JSON.stringify(auth.idToken)},
      refreshToken: ${JSON.stringify(auth.refreshToken)},
      uid: ${JSON.stringify(auth.localId)},
      expiresAt: ${Date.now() + 3000 * 1000}
    })); true
  `);

  const trip = (await api('/v1/me/diary/trips?limit=1', auth.idToken)).items[0];

  // Enter a TRIP first — the founder's stated condition, and the state my earlier repro never
  // reached. The path taken does not matter; being deep in the (trips) stack does.
  await send('Page.navigate', { url: `${PREVIEW}/itineraries/${trip.itineraryId}` });
  await sleep(6000);
  check('the walk is inside a trip, which is the founder-s stated condition', (await url()).includes('/itineraries/'), await url());

  // Assert by VISIBILITY of a profile-only control, never innerText order: expo-router keeps the
  // trip scene mounted beneath, so body text carries both screens (S4.0).
  const profileVisible = () =>
    evaluate(`
      (() => {
        const n = Array.from(document.querySelectorAll('[aria-label],[role="button"]'))
          .filter((e) => (e.getAttribute('aria-label') || e.innerText || '').trim() === 'Edit Profile');
        return n.some((e) => e.offsetParent !== null);
      })()
    `);

  check('the profile is NOT showing while the trip is', (await profileVisible()) === false, '');

  const tapped = await evaluate(`
    (() => {
      const tab = Array.from(document.querySelectorAll('[role="tab"],[aria-label]'))
        .filter((e) => e.offsetParent !== null)
        .filter((e) => (e.getAttribute('aria-label') || e.innerText || '').trim() === 'Profile')
        .pop();
      if (!tab) return 'NOT FOUND';
      const r = tab.getBoundingClientRect();
      const opts = { bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 };
      tab.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1, pointerType: 'touch', buttons: 1 }));
      tab.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1, pointerType: 'touch', buttons: 0 }));
      tab.dispatchEvent(new MouseEvent('click', opts));
      return 'tapped';
    })()
  `);
  await sleep(4000);

  check('the Profile tab is reachable in the tab bar', tapped === 'tapped', String(tapped));
  check('tapping Profile from inside a trip SHOWS the profile (founder, 08/12)', await profileVisible(), `url=${await url()}`);
  check('…and the route followed it', (await url()).includes('/profile'), await url());

  console.log(`\n──────── web tab walk: ${pass} passed, ${fail} failed ────────`);

  ws.close();
  chrome.kill();
  process.exit(fail === 0 ? 0 : 1);
})();
