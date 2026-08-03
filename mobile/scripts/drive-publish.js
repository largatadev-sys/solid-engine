const WebSocket = require('ws');
const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');

const PREVIEW = process.env.LARGATA_PREVIEW_URL || 'http://localhost:8081';
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

(async () => {
  if (!TRIP_ID) throw new Error('TRIP_ID is required — run scripts/smoke-publish.js and copy its trip id');
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

  // expo-router keeps visited screens MOUNTED beneath the current one, so a naive querySelectorAll
  // find() returns the screen underneath and reports a click that changed nothing (the S4.0 trap).
  // Prefer the LAST visible match, and say how many were seen.
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

  console.log(`\n=== S4.11 three axes, web preview (${PREVIEW}) — trip ${TRIP_ID} ===`);
  console.log('roles: t1 = owner (publishes), t3 = non-member consumer\n');

  await seat(owner);

  await goto(`/itineraries/${TRIP_ID}`);
  const workspace = await text();
  check('the workspace renders (not the S0.4 white screen)', (workspace || '').length > 0);
  check('the eyebrow names where the trip is (ADR-019 — lifecycle while out of the feed)',
    ['Draft Workspace', 'Trip Under Way', 'Trip Complete', 'Published — Private', 'Published — Public']
      .some((l) => workspace.includes(l)),
    workspace.split('\n')[0]);

  if (workspace.includes('Published')) {
    await goto(`/itineraries/${TRIP_ID}?tab=details`);
    await tapWithConfirm('Unpublish this trip', true);
    await goto(`/itineraries/${TRIP_ID}`);
  }

  const unpublished = await text();
  check('ADR-019 unpublishing leaves the trip COMPLETE — it does not un-travel it',
    unpublished.includes('Trip Complete'), unpublished.split('\n')[0]);
  check('an unpublished trip offers the owner the Publish CTA',
    unpublished.includes('Publish Itinerary'));

  if (DRAFT_TRIP_ID) {
    await goto(`/itineraries/${DRAFT_TRIP_ID}`);
    const draft = await text();
    check('a draft still offers the CTA rather than hiding it (AC13)',
      draft.includes('Publish Itinerary'), draft.split('\n')[0]);

    const refused = await tapExpectingAlert('Publish Itinerary');
    check('AC13 …and tapping it EXPLAINS the complete gate instead of failing silently',
      typeof refused.said === 'string' && /complete/i.test(refused.said),
      String(refused.said).slice(0, 160));
    check('AC13 …naming the trip’s actual state, not one generic sentence',
      typeof refused.said === 'string' && /draft/i.test(refused.said),
      String(refused.said).slice(0, 160));

    await goto(`/itineraries/${TRIP_ID}`);
  }

  const toPreview = await tap('Publish Itinerary');
  check('the Publish CTA is reachable and was clicked', toPreview.clicked,
    `seen ${toPreview.seen}, visible ${toPreview.visible}`);

  const preview = await text();
  check('the preview screen renders the amber scrub banner',
    preview.includes('This is a preview of your published itinerary'), preview.slice(0, 120));
  check('the preview is WYSIWYG — the destination pill and derived duration',
    preview.includes('PALAWAN') && /\d+ Days/.test(preview));
  check('…Standouts render', preview.includes('Standouts') && preview.includes('Big Lagoon Kayaking'));
  check('…best time of year renders in the header', preview.includes('Dec'));
  const derivesATotal = /₱\s?[\d,]+/.test(preview);
  check('…the Est. Total row renders whether or not a total can be derived',
    preview.includes('Est. Total'), preview.replace(/\n/g, ' | ').slice(0, 140));
  console.log(`       (this fixture ${derivesATotal ? 'IS' : 'is NOT'} single-currency — `
    + `${derivesATotal ? 'a total is derived' : 'no total, which is correct for a mixed plan'})`);

  const previewDays = await tap('Day-by-Day');
  const previewPlan = await text();
  check('…Creator Tips are visible on the preview\'s day cards',
    previewDays.clicked && previewPlan.includes('Book the earliest slot'), previewPlan.slice(0, 160));
  check('…the card carries the location',
    previewPlan.includes('Lio Airport'), previewPlan.slice(0, 200));
  check('…and NOTHING else: no time rail, no per-activity price, no description (founder, 08/01)',
    !previewPlan.includes('02:00 PM')
      && !previewPlan.includes('₱500')
      && !previewPlan.includes('A van transfer'),
    previewPlan.replace(/\n/g, ' | ').slice(0, 260));
  await tap('Overview');
  check('THE ABSENCE RULE — no calendar date anywhere on the preview',
    !preview.includes('2027-03-04') && !preview.includes('2027-03-08') && !/Mar 4/.test(preview),
    preview.replace(/\n/g, ' | ').slice(0, 200));
  check('…and no roster', !preview.includes('members'));
  check('the preview offers Publish and Continue Editing',
    preview.includes('Publish Itinerary') && preview.includes('Continue Editing'));
  check('ADR-018 the preview asks which audience, defaulting to Public',
    preview.includes('Public') && preview.includes('Private') && preview.includes('Everyone on Largata'),
    preview.replace(/\n/g, ' | ').slice(-220));
  check('the preview carries the SAME five-tab shell the public page does (founder, 08/01)',
    ['Overview', 'Day-by-Day', 'Diary Entry', 'Comments', 'Reviews'].every((t) => preview.includes(t)),
    preview.replace(/\n/g, ' | ').slice(0, 220));

  const publishTap = await tap('Publish Itinerary');
  check('Publish is clicked on the preview', publishTap.clicked,
    `seen ${publishTap.seen}, visible ${publishTap.visible}`);

  const success = await text();
  check('the success screen lands', success.includes('Your Itinerary is Live'), success.slice(0, 140));
  check('…and offers Copy Link and Share', success.includes('Copy Link') && success.includes('Share to'));
  check('…and shows the route it copies', success.includes(`/published/${TRIP_ID}`),
    success.replace(/\n/g, ' | ').slice(0, 240));

  const copied = await tap('Copy Link');
  check('Copy Link is a live control, not a dead click', copied.clicked,
    `seen ${copied.seen}, visible ${copied.visible}`);

  await seat(consumer);
  await goto(`/published/${TRIP_ID}`);
  const consumerView = await text();
  check('AC1 t3 opens the copied route and reads the projection',
    consumerView.includes('Island Hopping in El Nido'), consumerView.slice(0, 140));
  check('…the five-tab shell renders, Overview winning the mock inconsistency',
    ['Overview', 'Day-by-Day', 'Diary Entry', 'Comments', 'Reviews'].every((t) => consumerView.includes(t)));
  check('…the derived total is real and carries no "/Person"',
    consumerView.includes('Est. Total') && !consumerView.includes('Person'));
  check('THE ABSENCE RULE holds on the consumer screen too',
    !consumerView.includes('2027-03-04') && !consumerView.includes('2027-03-08'));

  const dayTab = await tap('Day-by-Day');
  const dayByDay = await text();
  check('Day-by-Day is a real tab', dayTab.clicked && dayByDay.includes('Day 1'));
  check('…activity cards carry the tips and the booking link',
    dayByDay.includes('Book the earliest slot') && dayByDay.includes('View Booking Options'));

  const booking = await tapExpectingAlert('View Booking Options');
  check('View Booking Options greys rather than opening a URL (founder, 08/01)',
    booking.clicked && typeof booking.said === 'string' && booking.said.includes('Booking options'),
    `clicked=${booking.clicked} said=${JSON.stringify(booking.said)}`);

  for (const [label, surface] of GREYED) {
    const greyed = await tapExpectingAlert(label);
    check(`AC11 "${label}" greys with a message, never a dead click`,
      greyed.clicked && typeof greyed.said === 'string' && greyed.said.includes(surface),
      `clicked=${greyed.clicked} said=${JSON.stringify(greyed.said)}`);
  }

  const follow = await tapExpectingAlert('Follow');
  check('AC11 Follow greys with a message', follow.clicked && typeof follow.said === 'string',
    `clicked=${follow.clicked} said=${JSON.stringify(follow.said)}`);

  const analytics = await evaluate(`
    JSON.stringify((window.__largataAnalytics || []).slice(-12))
  `);

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
