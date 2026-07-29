const WebSocket = require('ws');
const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const os = require('os');
const path = require('path');

const PREVIEW = process.env.LARGATA_PREVIEW_URL || 'http://localhost:8081';
const TRIP_ID = process.env.TRIP_ID;
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;
const TAG = process.env.LARGATA_POOL_TAG || 't2';
const CHROME = process.env.LARGATA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.LARGATA_CDP_PORT || 9227);

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

function poolEmail(tag) {
  const [local, domain] = BASE.split('@');
  return `${local}+${tag}@${domain}`;
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      new URL(url),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve(JSON.parse(b)));
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function cdp(ws, method, params) {
  const id = Math.floor(Math.random() * 1e9);
  return new Promise((resolve) => {
    const onMsg = (raw) => {
      const m = JSON.parse(raw);
      if (m.id === id) {
        ws.off('message', onMsg);
        resolve(m.result);
      }
    };
    ws.on('message', onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  requireEnv();
  const email = poolEmail(TAG);
  const signin = await postJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,
    { email, password: PASSWORD, returnSecureToken: true },
  );
  if (!signin.idToken) {
    console.log('SIGN-IN FAILED for ' + email + ': ' + JSON.stringify(signin));
    process.exit(1);
  }
  const session = {
    idToken: signin.idToken,
    refreshToken: signin.refreshToken,
    uid: signin.localId,
    expiresAt: Date.now() + 3600e3,
  };
  console.log(`Signed in ${email} (uid ${session.uid.slice(0, 12)}…)`);

  const udd = path.join(os.tmpdir(), 'largata-edit-lock-' + Date.now());
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      '--no-sandbox',
      '--disable-gpu',
      '--user-data-dir=' + udd,
    ],
    { stdio: 'ignore' },
  );
  await sleep(2000);

  const targets = await new Promise((resolve, reject) =>
    http
      .get(`http://localhost:${PORT}/json`, (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve(JSON.parse(b)));
      })
      .on('error', reject),
  );
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.on('open', r));
  await cdp(ws, 'Page.enable', {});
  await cdp(ws, 'Runtime.enable', {});

  await cdp(ws, 'Page.navigate', { url: PREVIEW });
  await sleep(2500);
  await cdp(ws, 'Runtime.evaluate', {
    expression: `localStorage.setItem('largata.web.session', ${JSON.stringify(
      JSON.stringify(session),
    )}); window.__alerts=[]; window.alert=(m)=>window.__alerts.push(String(m)); 'ok';`,
  });

  await cdp(ws, 'Page.navigate', { url: `${PREVIEW}/itineraries/${TRIP_ID}/edit` });
  await sleep(4500);

  const alerts = await cdp(ws, 'Runtime.evaluate', {
    expression: 'JSON.stringify(window.__alerts||[])',
    returnByValue: true,
  });
  const body = await cdp(ws, 'Runtime.evaluate', {
    expression: 'document.body.innerText.slice(0,240)',
    returnByValue: true,
  });

  console.log('\n=== WINDOW.ALERT (the lock modal on web) ===');
  const parsed = JSON.parse(alerts.result.value || '[]');
  if (parsed.length === 0) {
    console.log('  (none — if this run expected a locked trip, that is the S1.3 dead-click bug)');
  } else {
    parsed.forEach((a) => console.log('  ALERT: ' + a.replace(/\n/g, ' | ')));
  }
  console.log('\n=== PAGE TEXT ===\n  ' + (body.result.value || '').replace(/\n/g, ' '));

  ws.close();
  chrome.kill();
  process.exit(0);
})().catch((e) => {
  console.log('DRIVER ERROR: ' + e.message);
  process.exit(1);
});
