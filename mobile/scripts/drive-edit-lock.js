const WebSocket = require('ws');
const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const os = require('os');
const fs = require('fs');

const PREVIEW = process.env.LARGATA_PREVIEW_URL || 'http://localhost:8081';
const TRIP_ID = process.env.TRIP_ID;
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;
const TAG = process.env.LARGATA_POOL_TAG || 't2';
const PORT = Number(process.env.LARGATA_CDP_PORT || 9227);
const DEADLINE_MS = Number(process.env.LARGATA_DRIVER_TIMEOUT_MS || 90000);

const CHROME_CANDIDATES = [
  process.env.LARGATA_CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

function chromePath() {
  const found = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Chrome not found - set LARGATA_CHROME');
  return found;
}

function requireEnv() {
  const missing = [
    ['EXPO_PUBLIC_FIREBASE_API_KEY', KEY],
    ['LARGATA_TEST_POOL_EMAIL_BASE', BASE],
    ['LARGATA_TEST_POOL_PASSWORD', PASSWORD],
    ['TRIP_ID', TRIP_ID],
  ].filter(([, value]) => !value);
  if (missing.length > 0) {
    console.log('MISSING ENV: ' + missing.map(([name]) => name).join(', '));
    console.log('Source them first:  cd mobile && set -a && . ./.env && set +a');
    process.exit(1);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function poolEmail(tag) {
  const [local, domain] = BASE.split('@');
  return `${local}+${tag}@${domain}`;
}

function signIn(tag) {
  const body = JSON.stringify({ email: poolEmail(tag), password: PASSWORD, returnSecureToken: true });
  return new Promise((resolve, reject) => {
    const req = https.request(
      new URL(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve(JSON.parse(b)));
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://localhost:${PORT}${path}`, (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve(JSON.parse(b)));
      })
      .on('error', reject);
  });
}

(async () => {
  requireEnv();

  const watchdog = setTimeout(() => {
    console.log(`DRIVER TIMEOUT after ${DEADLINE_MS}ms - it did not hang silently, it gave up`);
    process.exit(1);
  }, DEADLINE_MS);
  watchdog.unref();

  const session = await signIn(TAG);
  if (!session.idToken) {
    console.log(`SIGN-IN FAILED for ${poolEmail(TAG)}: ${JSON.stringify(session)}`);
    process.exit(1);
  }
  console.log(`Signed in ${poolEmail(TAG)} (tag ${TAG}, uid ${session.localId.slice(0, 12)})`);

  const chrome = spawn(
    chromePath(),
    [
      `--remote-debugging-port=${PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=${os.tmpdir()}/largata-edit-lock-driver`,
      '--window-size=1280,900',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  await sleep(2500);

  const targets = await getJson('/json/list');
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });

  let id = 0;
  const pending = new Map();
  const pageErrors = [];
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const msgId = ++id;
      const giveUp = setTimeout(() => {
        pending.delete(msgId);
        resolve(undefined);
      }, 10000);
      pending.set(msgId, (result) => {
        clearTimeout(giveUp);
        resolve(result);
      });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

  await new Promise((r) => ws.on('open', r));
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') pageErrors.push(msg.params.exceptionDetails.text);
  });

  await send('Runtime.enable');
  await send('Page.enable');

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return r?.result?.value;
  };

  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      (function () {
        var KEY = 'largata.driver.alerts';
        window.alert = function (m) {
          try {
            var seen = JSON.parse(localStorage.getItem(KEY) || '[]');
            seen.push(String(m));
            localStorage.setItem(KEY, JSON.stringify(seen));
          } catch (e) {}
        };
      })();
    `,
  });

  await send('Page.navigate', { url: PREVIEW });
  await sleep(3000);
  await evaluate(`
    localStorage.setItem('largata.web.session', JSON.stringify({
      idToken: ${JSON.stringify(session.idToken)},
      refreshToken: ${JSON.stringify(session.refreshToken)},
      uid: ${JSON.stringify(session.localId)},
      expiresAt: Date.now() + 3600000
    }));
    localStorage.removeItem('largata.driver.alerts');
    'ok';
  `);

  const stage = (s) => console.log(`  [stage] ${s}`);

  stage('navigating to the edit route');
  await send('Page.navigate', { url: `${PREVIEW}/itineraries/${TRIP_ID}/edit` });
  await sleep(5000);

  stage('typing a title change (entering the screen takes no lease since S4.9)');
  const typed = await evaluate(`
    (function () {
      var field = document.querySelector('input[aria-label="Trip title"], textarea[aria-label="Trip title"]');
      if (!field) return 'field not found';
      var setter = Object.getOwnPropertyDescriptor(field.constructor.prototype, 'value').set;
      setter.call(field, 'Lock probe ' + ${JSON.stringify(TAG)});
      field.dispatchEvent(new Event('input', { bubbles: true }));
      return 'typed';
    })();
  `);
  stage(`title field: ${typed}`);

  stage('clicking Save — THIS is what acquires the header lease');
  const clicked = await evaluate(`
    (function () {
      var hits = Array.prototype.slice
        .call(document.querySelectorAll('[role="button"]'))
        .filter(function (n) { return /Save changes/i.test(n.innerText || ''); })
        .filter(function (n) { return n.getClientRects().length > 0; });
      if (hits.length === 0) return 'Save not found';
      hits[hits.length - 1].click();
      return 'clicked (' + hits.length + ' visible match(es))';
    })();
  `);
  stage(`save: ${clicked}`);
  await sleep(5000);

  stage('reading alerts (they live in localStorage, so a redirect cannot wipe them)');
  const alerts = (await evaluate(`localStorage.getItem('largata.driver.alerts') || '[]'`)) || '[]';
  stage('reading page text');
  const text = (await evaluate('document.body.innerText.slice(0, 400)')) || '';
  stage('done');

  console.log(`\n=== ${PREVIEW}/itineraries/${TRIP_ID}/edit  (as ${TAG}) ===`);
  console.log('\nWINDOW.ALERT (the modal Alert.alert cannot show on web):');
  const parsed = JSON.parse(alerts);
  if (parsed.length === 0) {
    console.log('  (none fired)');
  } else {
    parsed.forEach((a) => console.log('  ALERT: ' + a.replace(/\n/g, ' | ')));
  }
  console.log('\nPAGE TEXT:\n  ' + text.replace(/\n/g, ' | '));
  console.log('\nPAGE ERRORS:\n  ' + (pageErrors.length ? pageErrors.join('\n  ') : '(none)'));

  ws.close();
  chrome.kill();
  clearTimeout(watchdog);
  process.exit(0);
})().catch((e) => {
  console.log('DRIVER ERROR: ' + e.message);
  process.exit(1);
});
