const WebSocket = require('ws');
const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');

const PREVIEW = process.env.LARGATA_PREVIEW_URL || 'http://localhost:8081';
const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;
const TRIP_ID = process.env.TRIP_ID;

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const PORT = Number(process.env.LARGATA_CDP_PORT || 9224);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const address = (tag) => BASE.replace('@', `+${tag}@`);

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  — ' + detail : ''}`);
};

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const data = JSON.stringify(body);
    const req = lib.request(
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

async function signIn(tag) {
  const res = await postJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,
    { email: address(tag), password: PASSWORD, returnSecureToken: true },
  );
  if (!res.idToken) throw new Error(`sign-in failed for ${tag}: ${JSON.stringify(res)}`);
  return res;
}

function chromePath() {
  const found = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (found === undefined) throw new Error(`Chrome not found. Tried:\n  ${CHROME_CANDIDATES.join('\n  ')}`);
  return found;
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: PORT, path }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve(JSON.parse(body)));
      })
      .on('error', reject);
  });
}

(async () => {
  if (!TRIP_ID) throw new Error('TRIP_ID is required — run scripts/seed-trip.js first');
  const args = process.argv.slice(2);
  const shotIndex = args.indexOf('--shot');
  const screenshotPath = shotIndex === -1 ? null : args[shotIndex + 1];

  const owner = await signIn('t1');

  const chrome = spawn(
    chromePath(),
    [
      `--remote-debugging-port=${PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=${os.tmpdir()}/largata-archive-driver`,
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
      pending.set(msgId, resolve);
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

  await send('Page.navigate', { url: PREVIEW });
  await sleep(3000);
  await evaluate(`
    localStorage.setItem('largata.web.session', JSON.stringify({
      idToken: ${JSON.stringify(owner.idToken)},
      refreshToken: ${JSON.stringify(owner.refreshToken)},
      uid: ${JSON.stringify(owner.localId)},
      expiresAt: ${Date.now() + 3000 * 1000}
    }));
    true
  `);

  const goto = async (path) => {
    await send('Page.navigate', { url: `${PREVIEW}${path}` });
    await sleep(3500);
  };
  const text = () => evaluate('document.body.innerText');

  const tapWithConfirm = async (label, accept) => {
    await evaluate(`
      window.__confirmAsked = false;
      window.confirm = (msg) => { window.__confirmAsked = msg || true; return ${accept}; };
      true
    `);
    const tapped = await evaluate(`
      (() => {
        const el = Array.from(document.querySelectorAll('div[role="button"],button'))
          .find((n) => (n.innerText || '').trim() === ${JSON.stringify(label)});
        if (!el) return false;
        el.click();
        return true;
      })()
    `);
    await sleep(3000);
    const asked = await evaluate('window.__confirmAsked');
    return { tapped, asked };
  };

  console.log(`\n=== S1.9 archive, web preview (${PREVIEW}) — trip ${TRIP_ID} ===\n`);

  await goto(`/itineraries/${TRIP_ID}`);
  const liveText = await text();
  check('the trip screen renders (not the S0.4 white screen)', (liveText || '').length > 0);
  check('a live trip offers the owner a quiet Archive control', liveText.includes('Archive trip'));
  check('…and shows the plan’s editing affordances', liveText.includes('Edit'));

  const cancelled = await tapWithConfirm('Archive trip', false);
  check('the Archive button exists and was tapped', cancelled.tapped);
  check('it asked before acting (window.confirm fired)', cancelled.asked !== false);
  const afterCancel = await text();
  check('CANCEL leaves the trip live - still offering Archive', afterCancel.includes('Archive trip'));
  check('…and the plan is still editable', afterCancel.includes('Edit'));

  const accepted = await tapWithConfirm('Archive trip', true);
  check('the second tap asked too', accepted.asked !== false);
  const afterArchive = await text();
  check('CONFIRM archives — the notice names the state', afterArchive.includes('Archived'));
  check('…the frozen surface explains itself', afterArchive.includes('read-only'));
  check('…the owner is offered Unarchive', afterArchive.includes('Unarchive'));
  const liveControls = await evaluate(`
    JSON.stringify(Array.from(document.querySelectorAll('div[role="button"],button,a'))
      .map((n) => (n.innerText || '').trim()).filter(Boolean))
  `);
  check('…and the editing affordances are gone (hidden, not a dead control)',
    !liveControls.includes('Edit') && !liveControls.includes('Daily schedule'),
    'clickable: ' + liveControls);

  if (screenshotPath !== null) {
    const shot = await send('Page.captureScreenshot', {});
    fs.writeFileSync(screenshotPath, Buffer.from(shot.data, 'base64'));
  }

  await goto(`/members/${TRIP_ID}`);
  const membersFrozen = await text();
  check('the members screen still shows the roster on an archived trip', membersFrozen.includes('MEMBERS'));
  check('…but the invite field is gone', !membersFrozen.toLowerCase().includes('invite'));
  check('…and Remove is gone from every row', !membersFrozen.includes('Remove'));
  check('…and Make owner is gone', !membersFrozen.includes('Make owner'));

  await goto('/');
  const myTrips = await text();
  check('My Trips no longer lists the archived trip', !myTrips.includes('Archived trip smoke'));
  check('…and offers the way to the archived view', myTrips.includes('Archived trips'));

  await goto('/itineraries/archived');
  const archivedView = await text();
  check('the archived view lists it', archivedView.includes('Archived'));

  await goto(`/itineraries/${TRIP_ID}`);
  const unarchived = await tapWithConfirm('Unarchive', true);
  check('Unarchive asked before acting', unarchived.asked !== false);
  const afterUnarchive = await text();
  check('UNARCHIVE restores the trip - the quiet Archive control returns', afterUnarchive.includes('Archive trip'));
  check('…and the plan is editable again', afterUnarchive.includes('Daily schedule'));

  console.log('\nPAGE ERRORS:');
  console.log(pageErrors.length ? pageErrors.map((e) => `  ${e}`).join('\n') : '  (none)');
  if (screenshotPath !== null) console.log(`SCREENSHOT: ${screenshotPath}`);
  console.log(`\n──────── web rung: ${pass} passed, ${fail} failed ────────\n`);

  ws.close();
  chrome.kill();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('DRIVER FAILED:', e.message);
  process.exit(1);
});
