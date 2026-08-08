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

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const PORT = Number(process.env.LARGATA_CDP_PORT || 9231);

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
      res.on('end', () => resolve({ status: res.statusCode, body: b ? JSON.parse(b) : {} }));
    });
    req.on('error', reject);
    if (data !== undefined) req.write(data);
    req.end();
  });
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
  const owner = await signIn('t1');
  const member = await signIn('t2');

  const created = await api('/v1/itineraries', 'POST', owner.idToken, {
    title: 'S4.17 workspace smoke',
    destinations: ['El Nido'],
    durationDays: 2,
  });
  const trip = created.body.id;

  const invite = await api(`/v1/itineraries/${trip}/invitations`, 'POST', owner.idToken, {
    email: address('t2'),
  });
  await api(`/v1/invitations/${invite.body.id}/accept`, 'POST', member.idToken);

  const plan = await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken);
  const dayOne = plan.body.days[0].id;
  for (const title of ['Alpha', 'Bravo', 'Charlie']) {
    await api(`/v1/itineraries/${trip}/days/${dayOne}/activities`, 'POST', owner.idToken, { title });
  }

  const chrome = spawn(
    chromePath(),
    [
      `--remote-debugging-port=${PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=${os.tmpdir()}/largata-workspace-driver`,
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
  const apiCalls = [];
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
    if (msg.method === 'Network.requestWillBeSent') {
      const { url, method: verb, headers } = msg.params.request;
      if (url.startsWith(`${API}/v1/`) && verb !== 'OPTIONS') {
        apiCalls.push({ url, verb, bearer: Boolean(headers.Authorization || headers.authorization) });
      }
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');

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

  const tapLabel = async (label) => {
    const result = await evaluate(`
      (() => {
        const all = Array.from(document.querySelectorAll('[aria-label]'))
          .filter((n) => (n.getAttribute('aria-label') || '').trim() === ${JSON.stringify(label)});
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
    const tapped = await tapLabel(label);
    const said = await evaluate('window.__alertSaid');
    return { ...tapped, said };
  };

  console.log(`\n=== S4.17 Trip Workspace + Draft Workspace, web preview (${PREVIEW}) ===`);
  console.log('roles: t1 = owner, t2 = member/session holder\n');

  await seat(owner);

  await goto(`/itineraries/${trip}`);
  const viewer = await text();
  check('the viewer renders (not the S0.4 white screen)', (viewer || '').length > 0, `${(viewer || '').length} chars`);
  check('a draft opens the workspace carrying the Draft badge (decision 1, 2)', viewer.includes('DRAFT'));
  check('the header offers Edit Itinerary', viewer.includes('Edit Itinerary'));

  const TABS = ['Day-by-Day', 'Polls', 'Travelers', 'Photo Dump', 'Chat', 'Details'];
  check('the six-tab row is present, in mock order (decision 5)',
    TABS.every((t) => viewer.includes(t)), TABS.filter((t) => viewer.includes(t)).join(' · '));
  check('Notes was cut, never drawn (digest ruling)', !viewer.includes('Notes'));

  check('a draft shows NO ladder CTA — Edit Itinerary is the act (decision 2)',
    !viewer.includes('Start Trip') && !viewer.includes('Complete Trip') && !viewer.includes('Publish Itinerary'));
  check('…and no Step back on a draft, which has nothing to step back to',
    !viewer.includes('Step back'));

  check('the day list renders as stubs with the activities readable', viewer.includes('Day 1'));
  check('the viewer is READ-ONLY: no Add Activity, no Add a Day, no Finalize (decision 6)',
    !viewer.includes('Add Activity') && !viewer.includes('Add a Day') && !viewer.includes('Finalize'));

  for (const [label, said] of [['Polls', 'poll'], ['Photo Dump', 'photo dump'], ['Chat', 'chat']]) {
    const greyed = await tapExpectingAlert(`${label}, coming soon`);
    check(`${label} greys with a message rather than a dead click (the S1.3 Alert lesson)`,
      greyed.clicked && typeof greyed.said === 'string' && greyed.said.toLowerCase().includes(said),
      `said=${JSON.stringify(greyed.said)}`);
  }

  const travelers = await tapLabel('Travelers');
  const roster = await text();
  check('the Travelers tab lists the roster (decision 9)',
    travelers.clicked && (roster.includes('pool_t1') || roster.includes('largata.dev')),
    roster.split('\n').slice(0, 12).join(' / '));

  await tapLabel('Details');
  const details = await text();
  check('the Details tab carries the plan fields (decision 10)',
    /DESTINATIONS/i.test(details) && /DATES/i.test(details) && details.includes('Trip details'),
    details.split('\n').slice(9, 16).join(' / '));
  check('…and NO lifecycle control — the badge and rail own lifecycle now (decision 10)',
    !details.includes('Where this trip is'));

  await goto(`/itineraries/${trip}`);
  const intoEditor = await tapLabel('Edit Itinerary');
  const editor = await text();
  check('Edit Itinerary opens the Draft Workspace (decision 4)',
    intoEditor.clicked && editor.includes('DRAFT TRIP WORKSPACE'), `clicked=${intoEditor.clicked}`);
  check('the editor offers Invite Traveler on the header (decision 9)', editor.includes('Invite Traveler'));
  check('the accordion opens Day 1 by default with its activities (decision 6)',
    editor.includes('Alpha') && editor.includes('Bravo') && editor.includes('Charlie'));
  check('…and the editing affordances appear: Add Activity, Add a Day',
    editor.includes('Add Activity') && editor.includes('Add a Day'));
  check('the CTA rail is Finalize ABOVE Save Changes (frame 1 wins the flip)',
    editor.includes('Finalize Itinerary') && editor.includes('Save Changes')
      && editor.indexOf('Finalize Itinerary') < editor.indexOf('Save Changes'));

  const held = await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken);
  check('entering the editor ACQUIRED the Editing Session server-side (ticket 01)',
    held.body.editingSession !== null && held.body.editingSession !== undefined,
    held.body.editingSession ? '@' + held.body.editingSession.handle : 'NO SESSION');

  const memberBlocked = await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', member.idToken, {
    subjectType: 'session',
  });
  check('…and t2 is refused the session while t1 holds it', memberBlocked.status === 409,
    `${memberBlocked.status} ${memberBlocked.body.code || ''}`);

  const sheet = await tapLabel('Finalize Itinerary');
  const sheetText = await text();
  check('Finalize opens the confirmation sheet with the mock copy verbatim (decision 3)',
    sheet.clicked && sheetText.includes('Ready to go?')
      && sheetText.includes('You can always switch back to editing later'));
  check('…offering Finalize and Keep Editing',
    sheetText.includes('Finalize') && sheetText.includes('Keep Editing'));

  await tapLabel('Keep Editing');
  const afterDismiss = await text();
  check('Keep Editing dismisses and leaves the plan a draft',
    !afterDismiss.includes('Ready to go?') && afterDismiss.includes('DRAFT TRIP WORKSPACE'));

  await tapLabel('Finalize Itinerary');
  await tapLabel('Finalize');
  await sleep(2500);
  const finalized = await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken);
  check('Finalize fires finish-planning — the trip is Ready (decision 3)',
    finalized.body.state === 'upcoming', `state=${finalized.body.state}`);
  check('…and releases the Editing Session on the way out',
    finalized.body.editingSession === null || finalized.body.editingSession === undefined,
    finalized.body.editingSession ? 'STILL HELD' : 'released');

  await goto(`/itineraries/${trip}`);
  const ready = await text();
  check('the viewer now shows Ready (green badge) with Start Trip (decision 2)',
    ready.includes('READY') && ready.includes('Start Trip'));
  check('…and Ready is read-only — no editing affordance renders',
    !ready.includes('Add Activity') && !ready.includes('Add a Day'));

  await tapLabel('Start Trip');
  const ongoing = await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken);
  check('Start Trip walks the ladder to ongoing', ongoing.body.state === 'ongoing', `state=${ongoing.body.state}`);

  const ongoingView = await text();
  check('…the viewer shows Ongoing with Complete Trip and a Step back link (named deviation)',
    ongoingView.includes('ONGOING') && ongoingView.includes('Complete Trip') && ongoingView.includes('Step back'));

  await tapLabel('Step back');
  const steppedBack = await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken);
  check('Step back walks down exactly one rung, never two',
    steppedBack.body.state === 'upcoming', `state=${steppedBack.body.state}`);

  await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', member.idToken, { subjectType: 'session' });
  await goto(`/itineraries/${trip}`);
  const blocked = await text();
  check('while t2 holds the session, the viewer says who is editing (ticket 01, AC 4)',
    blocked.includes('being edited by'), blocked.split('\n').find((l) => l.includes('being edited')) || 'ABSENT');
  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', member.idToken, { subjectType: 'session' });

  await goto(`/itineraries/${trip}/days?day=2`);
  const redirected = await text();
  check('a retired ?day= deep link redirects into the workspace, never dead-ends (ticket 07)',
    !redirected.includes('Unmatched Route') && redirected.includes('Day-by-Day'),
    redirected.includes('Unmatched Route') ? 'DEAD END' : 'redirected');

  await goto(`/itineraries/${trip}/days/anything`);
  const dayViewGone = await text();
  check('…and so does the retired day view',
    !dayViewGone.includes('Unmatched Route') && dayViewGone.includes('Day-by-Day'));

  await goto(`/itineraries/${trip}`);
  const editorAgain = await tapLabel('Edit Itinerary');
  const rows = await text();
  check('the editor reaches the activity form from a row (ticket 05)', editorAgain.clicked);

  const intoForm = await evaluate(`
    (() => {
      const all = Array.from(document.querySelectorAll('div[role="button"],button,a'))
        .filter((n) => (n.getAttribute('aria-label') || '') === 'Edit Alpha');
      const visible = all.filter((n) => n.offsetParent !== null);
      const target = visible[visible.length - 1];
      if (!target) return { clicked: false, seen: all.length };
      target.click();
      return { clicked: true, seen: all.length };
    })()
  `);
  await sleep(3500);
  const form = await text();
  check('the activity form opens on Edit Activity', intoForm.clicked && form.includes('Edit Activity'),
    `clicked=${intoForm.clicked}`);

  const FIELDS = ['Activity Name', 'Time', 'Location / Venue', 'Estimated Price', 'Booking Link'];
  check('it shows EXACTLY the mock five fields (decision 8)',
    FIELDS.every((f) => form.includes(f)), FIELDS.filter((f) => form.includes(f)).join(' · '));
  check('…and the four culled fields are absent (decision 8)',
    !form.includes('Description') && !form.includes('Notes & Creator Tips')
      && !form.includes('Photos') && !form.includes('Move to another day'));
  check('Edit offers Save Activity and Discard Changes (corrected slip)',
    form.includes('Save Activity') && form.includes('Discard Changes'));
  const bookingPlaceholder = await evaluate(
    `Array.from(document.querySelectorAll('input')).some((i) => (i.placeholder || '').includes('Paste booking URL'))`,
  );
  check('…and Booking Link takes a pasted URL, not the provider card (E6 input)',
    bookingPlaceholder === true && !form.includes('Booking Purpose') && !form.includes('Target URL'),
    `placeholder=${bookingPlaceholder}`);

  await goto(`/itineraries/${trip}/edit-plan`);

  const beforeDrag = await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken);
  const orderBefore = beforeDrag.body.days[0].activities.map((a) => a.title);

  const dragged = await evaluate(`
    (async () => {
      const grip = Array.from(document.querySelectorAll('[aria-label^="Drag "]'))
        .filter((n) => n.offsetParent !== null)[0];
      if (!grip) return { ok: false, why: 'no grip handle rendered' };

      const box = grip.getBoundingClientRect();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const pitch = 68;
      const fire = (type, clientY) => grip.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 1, clientX: x, clientY,
      }));

      fire('pointerdown', y);
      for (const step of [0.3, 0.6, 0.9, 1.1]) {
        fire('pointermove', y + pitch * step);
        await new Promise((r) => setTimeout(r, 40));
      }
      fire('pointerup', y + pitch * 1.1);
      return { ok: true };
    })()
  `);
  await sleep(2500);

  const afterDrag = await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken);
  const orderAfter = afterDrag.body.days[0].activities.map((a) => a.title);

  check('the grip is draggable on the web, not arrows-only (founder, 2026-08-09)',
    dragged?.ok === true, dragged?.why ?? '');
  check('…and a web drag reorders through the same version-checked PUT',
    orderBefore.join() !== orderAfter.join(),
    `${orderBefore.join(' , ')}  ->  ${orderAfter.join(' , ')}`);

  const beforeUp = await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken);
  const upOrderBefore = beforeUp.body.days[0].activities.map((a) => a.title);

  const upDrag = await evaluate(`
    (async () => {
      const grips = Array.from(document.querySelectorAll('[aria-label^="Drag "]'))
        .filter((n) => n.offsetParent !== null);
      if (grips.length < 2) return { ok: false, why: 'need two rows to drag up' };

      const grip = grips[grips.length - 1];
      const pitchPx = grips[1].getBoundingClientRect().top - grips[0].getBoundingClientRect().top;
      const startTop = grip.getBoundingClientRect().top;
      const box = grip.getBoundingClientRect();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const fire = (type, clientY) => grip.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 1, clientX: x, clientY,
      }));
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));

      fire('pointerdown', y);
      for (const step of [0.4, 0.8, 1.2, 1.4]) {
        fire('pointermove', y - pitchPx * step);
        await wait(40);
      }
      const preTop = grip.getBoundingClientRect().top;
      fire('pointerup', y - pitchPx * 1.4);
      await wait(60);
      const midTop = grip.getBoundingClientRect().top;
      await wait(300);
      const finalTop = grip.getBoundingClientRect().top;

      return { ok: true, pitchPx, startTop, preTop, midTop, finalTop, slotTop: startTop - pitchPx };
    })()
  `);
  await sleep(2000);

  const upEased =
    upDrag?.ok === true &&
    Math.abs(upDrag.finalTop - upDrag.slotTop) <= 2 &&
    upDrag.midTop > Math.min(upDrag.preTop, upDrag.slotTop) - 1 &&
    upDrag.midTop < Math.max(upDrag.preTop, upDrag.slotTop) + 1;
  check('an UPWARD drag settles by easing to its slot — no jerk when React moves the node (founder, 2026-08-09)',
    upEased,
    upDrag?.ok === true
      ? `pre=${Math.round(upDrag.preTop)} mid=${Math.round(upDrag.midTop)} final=${Math.round(upDrag.finalTop)} slot=${Math.round(upDrag.slotTop)}`
      : upDrag?.why ?? '');

  const afterUp = await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken);
  const upOrderAfter = afterUp.body.days[0].activities.map((a) => a.title);
  check('…and the upward drop persists through the version-checked PUT',
    upOrderBefore.join() !== upOrderAfter.join(),
    `${upOrderBefore.join(' , ')}  ->  ${upOrderAfter.join(' , ')}`);

  const beforeKey = await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken);
  const keyOrderBefore = beforeKey.body.days[0].activities.map((a) => a.title);

  const keyNudge = await evaluate(`
    (() => {
      const grips = Array.from(document.querySelectorAll('[aria-label^="Drag "]'))
        .filter((n) => n.offsetParent !== null);
      const grip = grips[grips.length - 1];
      if (!grip) return { ok: false, why: 'no grip' };
      grip.focus();
      grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
      return { ok: true, focused: document.activeElement === grip };
    })()
  `);
  await sleep(2500);

  const afterKey = await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken);
  const keyOrderAfter = afterKey.body.days[0].activities.map((a) => a.title);
  check('the grip is keyboard-operable — ArrowUp on a focused grip reorders (no visible arrows needed)',
    keyNudge?.ok === true && keyOrderBefore.join() !== keyOrderAfter.join(),
    `focused=${keyNudge?.focused} ${keyOrderBefore.join(' , ')}  ->  ${keyOrderAfter.join(' , ')}`);

  const arrowButtons = await evaluate(
    `document.querySelectorAll('[aria-label^="Move "]').length`,
  );
  check('…and the arrow buttons are gone from the rows', arrowButtons === 0, `${arrowButtons} arrow buttons`);

  const anonymous = apiCalls.filter((c) => !c.bearer);
  check('every /v1 call from the workspace carried a bearer token (S3.3 media trap)',
    anonymous.length === 0, `${anonymous.length} anonymous: ${anonymous.map((a) => a.verb + ' ' + a.url).join(', ')}`);

  check('no page errors', pageErrors.length === 0, pageErrors.join(' | '));
  check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  console.log(`\n${pass} passed, ${fail} failed`);

  ws.close();
  chrome.kill();
  process.exit(fail === 0 ? 0 : 1);
})();
