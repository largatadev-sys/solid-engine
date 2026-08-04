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
const DRAFT_TRIP_ID = process.env.DRAFT_TRIP_ID;

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const PORT = Number(process.env.LARGATA_CDP_PORT || 9228);

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

const GREYED = [
  ['Diary Entry', 'Diary entries'],
  ['Comments', 'Comments'],
  ['Reviews', 'Reviews'],
];

function api(path, method, token, body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (data !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = http.request(new URL(API + path), { method, headers }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve(b ? JSON.parse(b) : {}));
    });
    req.on('error', reject);
    if (data !== undefined) req.write(data);
    req.end();
  });
}

(async () => {
  const args = process.argv.slice(2);
  const shotIndex = args.indexOf('--shot');
  const screenshotPath = shotIndex === -1 ? null : args[shotIndex + 1];

  const owner = await signIn('t1');
  const consumer = await signIn('t3');

  const chrome = spawn(
    chromePath(),
    [
      `--remote-debugging-port=${PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=${os.tmpdir()}/largata-publish-driver`,
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
  const consoleErrors = [];
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
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push((msg.params.args || []).map((a) => a.value ?? a.description).join(' '));
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return r?.result?.value;
  };

  const seat = async (session) => {
    await send('Page.navigate', { url: PREVIEW });
    await sleep(3000);
    await evaluate(`
      localStorage.setItem('largata.web.session', JSON.stringify({
        idToken: ${JSON.stringify(session.idToken)},
        refreshToken: ${JSON.stringify(session.refreshToken)},
        uid: ${JSON.stringify(session.localId)},
        expiresAt: ${Date.now() + 3000 * 1000}
      }));
      true
    `);
  };

  const goto = async (path) => {
    await send('Page.navigate', { url: `${PREVIEW}${path}` });
    await sleep(3500);
  };
  const text = () => evaluate('document.body.innerText');

  const tap = async (label) => {
    const result = await evaluate(`
      (() => {
        const all = Array.from(document.querySelectorAll('div[role="button"],button,a'))
          .filter((n) => (n.innerText || '').trim() === ${JSON.stringify(label)});
        const visible = all.filter((n) => n.offsetParent !== null);
        const target = visible[visible.length - 1];
        if (!target) return { clicked: false, seen: all.length, visible: visible.length };
        target.click();
        return { clicked: true, seen: all.length, visible: visible.length };
      })()
    `);
    await sleep(3500);
    return result;
  };

  const tapExpectingAlert = async (label) => {
    await evaluate('window.__alertSaid = null; window.alert = (m) => { window.__alertSaid = m; }; true');
    const tapped = await tap(label);
    const said = await evaluate('window.__alertSaid');
    return { ...tapped, said };
  };

  const tapWithConfirm = async (label, accept) => {
    await evaluate(`window.confirm = () => ${accept}; true`);
    return tap(label);
  };


  console.log(`\n=== S4.13 create flow + four-state lifecycle, web preview (${PREVIEW}) ===`);
  console.log('roles: t1 = owner walking the whole creation flow\n');

  await seat(owner);

  await goto('/');
  const trips = await text();
  check('the Trips screen renders (not the S0.4 white screen)', (trips || '').length > 0,
    `${(trips || '').length} chars`);
  check('it is headed Trips and offers Create Itinerary', trips.includes('Trips')
    && trips.includes('Create Itinerary'));
  check('Add a Past Trip is drawn beside it', trips.includes('Add a Past Trip'));

  const pastTrip = await tapExpectingAlert('Add a Past Trip');
  check('…and greys with a message rather than a dead click (the S1.3 Alert lesson)',
    pastTrip.clicked && typeof pastTrip.said === 'string' && pastTrip.said.includes('past trip'),
    `clicked=${pastTrip.clicked} said=${JSON.stringify(pastTrip.said)}`);

  check('the tab bar is four tabs with Discover, and no centre +',
    trips.includes('Discover') && trips.includes('Profile') && !trips.includes('Search'),
    trips.split('\n').slice(-6).join(' / '));

  const sectionsSeen = ['Ongoing Trips', 'Upcoming Trips', 'Draft Trips', 'Completed Trips']
    .filter((s) => trips.includes(s));
  check('the lifecycle renders as sections, not chips (ADR-020)', sectionsSeen.length > 0,
    `seen: ${sectionsSeen.join(', ')}`);
  check('no publication badge rides the cards — that placement is deferred',
    !/^\s*(Published|Private)\s*$/m.test(trips));

  const toCreate = await tap('Create Itinerary');
  check('Create Itinerary opens the flow', toCreate.clicked, JSON.stringify(toCreate));
  const createEntry = await text();
  check('create-entry draws the mock fields', ['Trip Title', 'Destination', 'Duration',
    'Best Time of Year', 'Trip Description', 'Standouts'].every((l) => createEntry.includes(l)),
    createEntry.split('\n').slice(0, 12).join(' / '));
  check('it says Standouts, never Highlights — the glossary reserved that word',
    createEntry.includes('Standouts') && !/Highlight/i.test(createEntry));
  check('Add Standout is the row control', createEntry.includes('Add Standout'));
  check('the terminal CTA continues to the day schedules',
    createEntry.includes('Continue to Daily Schedules'));

  const cover = await tapExpectingAlert('Upload cover photo');
  if (cover.clicked) {
    check('the cover tile greys rather than dead-clicking', typeof cover.said === 'string',
      JSON.stringify(cover.said));
  }

  const trip = (await api('/v1/itineraries', 'POST', owner.idToken, {
    title: 'Driven by S4.13', destinations: ['Palawan'], durationDays: 2,
    bestTimeOfYear: 'Dec - Apr', standouts: ['Big Lagoon Kayaking'],
  })).id;

  await goto(`/itineraries/${trip}/days?day=1`);
  const days = await text();
  check('the day schedule renders with its day tabs', /Day 1/.test(days), days.split('\n').slice(0, 8).join(' / '));
  check('the mock’s CTA walks on to the preview', days.includes('Preview Itinerary'),
    days.split('\n').slice(-4).join(' / '));

  const toPreview = await tap('Preview Itinerary');
  check('Preview Itinerary opens the reader’s view', toPreview.clicked, JSON.stringify(toPreview));
  const previewScreen = await text();
  check('the banner speaks the honest tense — nothing is published yet',
    previewScreen.includes('what other travelers will see if you publish'),
    previewScreen.split('\n').slice(0, 4).join(' / '));
  check('Finish Itinerary is the terminal act on a draft’s preview',
    previewScreen.includes('Finish Itinerary'), previewScreen.split('\n').slice(-4).join(' / '));
  check('and it is NOT called Complete — one word must not name two facts (ADR-018/020)',
    !/Complete Itinerary/i.test(previewScreen));
  check('a draft’s preview offers no publish controls — the gate is upstream of the screen',
    !previewScreen.includes('Publish Itinerary'), previewScreen.split('\n').slice(-6).join(' / '));

  const finished = await tap('Finish Itinerary');
  check('tapping it moves the trip on', finished.clicked, JSON.stringify(finished));
  const stateAfter = (await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken)).state;
  check('…to upcoming, on the server — not just on the screen', stateAfter === 'upcoming',
    `state=${stateAfter}`);

  const afterFinish = await text();
  check('it lands on the workspace, with no celebration screen',
    !/is Live|discover and fork|Back to Feed/i.test(afterFinish),
    afterFinish.split('\n').slice(0, 6).join(' / '));

  await goto('/');
  const withUpcoming = await text();
  check('the trip now sits under Upcoming Trips', withUpcoming.includes('Upcoming Trips'));

  const cardHref = await evaluate(`
    (() => {
      const card = Array.from(document.querySelectorAll('a'))
        .find((n) => (n.innerText || '').includes('Driven by S4.13') && n.offsetParent !== null);
      return card ? card.getAttribute('href') : null;
    })()
  `);
  check('a trip card links to its PREVIEW, not the old workspace (founder, 2026-08-04)',
    typeof cardHref === 'string' && cardHref.endsWith('/preview'), `href=${cardHref}`);

  await goto(`/itineraries/${trip}/preview`);
  const fromTrips = await text();
  check('…and that preview is the itinerary view, banner and all',
    fromTrips.includes('what other travelers will see if you publish'),
    fromTrips.split('\n').slice(0, 3).join(' / '));
  check('…offering an upcoming trip no publish button the gate would refuse',
    !fromTrips.includes('Publish Itinerary'), fromTrips.split('\n').slice(-6).join(' / '));

  await goto(`/itineraries/${trip}`);
  const workspace = await text();
  check('the workspace eyebrow names the new rung', workspace.includes('Planning Finished'),
    workspace.split('\n').slice(0, 5).join(' / '));
  await goto(`/itineraries/${trip}?tab=details`);
  const details = await text();
  check('the Details tab names where the trip is, in the new vocabulary',
    details.includes('Upcoming — planning is finished'), details.split('\n').slice(0, 8).join(' / '));
  check('…and offers the next act, Start trip', details.includes('Start trip'));
  check('…with a one-step undo back to planning', details.includes('Step back'),
    details.split('\n').filter((l) => /Step back|Start trip/.test(l)).join(' / '));

  const steppedBack = await tap('Step back');
  const backTo = (await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken)).state;
  check('the undo walks upcoming → draft, which is reopening planning itself',
    steppedBack.clicked && backTo === 'draft', `clicked=${steppedBack.clicked} state=${backTo}`);

  const publishTooEarly = await tapExpectingAlert('Publish Itinerary');
  if (publishTooEarly.clicked) {
    check('publishing an upcoming trip explains the precondition rather than hiding',
      typeof publishTooEarly.said === 'string' && /complete/i.test(publishTooEarly.said),
      JSON.stringify(publishTooEarly.said));
  }

  if (screenshotPath !== null) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(screenshotPath, Buffer.from(shot.data, 'base64'));
    console.log(`\n  screenshot: ${screenshotPath}`);
  }

  check('no page errors', pageErrors.length === 0, pageErrors.join(' | '));
  check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  console.log(`\n${pass} passed, ${fail} failed`);
  ws.close();
  chrome.kill();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
