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
const PORT = Number(process.env.LARGATA_CDP_PORT || 9233);

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
  const other = await signIn('t2');

  const created = await api('/v1/itineraries', 'POST', owner.idToken, {
    title: 'S4.18 buffered editing',
    destinations: ['El Nido'],
    durationDays: 2,
  });
  const trip = created.body.id;

  const invite = await api(`/v1/itineraries/${trip}/invitations`, 'POST', owner.idToken, {
    email: address('t2'),
  });
  await api(`/v1/invitations/${invite.body.id}/accept`, 'POST', other.idToken);

  const seeded = await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken);
  const dayOne = seeded.body.days[0].id;
  for (const title of ['Alpha', 'Bravo']) {
    await api(`/v1/itineraries/${trip}/days/${dayOne}/activities`, 'POST', owner.idToken, { title });
  }

  const chrome = spawn(
    chromePath(),
    [
      `--remote-debugging-port=${PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=${os.tmpdir()}/largata-buffered-driver`,
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
  let apiCalls = [];
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
      const { url, method: verb } = msg.params.request;
      if (url.startsWith(`${API}/v1/`) && verb !== 'OPTIONS') apiCalls.push({ url, verb });
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

  const stubDialogs = () =>
    evaluate(`
      window.__confirmsAsked = [];
      window.__confirmAnswers = window.__confirmAnswers || [];
      window.confirm = (m) => {
        window.__confirmsAsked.push(m);
        const answer = window.__confirmAnswers.shift();
        return answer === undefined ? true : answer;
      };
      window.__alertSaid = null;
      window.alert = (m) => { window.__alertSaid = m; };
      true
    `);

  const answerConfirmsWith = (answers) =>
    evaluate(`window.__confirmAnswers = ${JSON.stringify(answers)}; window.__confirmsAsked = []; true`);
  const confirmsAsked = () => evaluate('window.__confirmsAsked || []');

  const tapLabel = async (label, settle = 2500) => {
    const result = await evaluate(`
      (() => {
        const all = Array.from(document.querySelectorAll('[aria-label]'))
          .filter((n) => (n.getAttribute('aria-label') || '').trim() === ${JSON.stringify(label)});
        const visible = all.filter((n) => n.offsetParent !== null && n.closest('[aria-hidden="true"]') === null);
        const target = visible[visible.length - 1];
        if (!target) return { clicked: false, seen: all.length };
        target.click();
        return { clicked: true, seen: all.length };
      })()
    `);
    await sleep(settle);
    return result;
  };

  const typeInto = async (label, value) =>
    evaluate(`
      (() => {
        const all = Array.from(document.querySelectorAll('[aria-label]'))
          .filter((n) => (n.getAttribute('aria-label') || '').trim() === ${JSON.stringify(label)});
        const input = all.filter((n) => n.offsetParent !== null).pop();
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, ${JSON.stringify(value)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()
    `);

  const planWrites = () => apiCalls.filter((c) => c.verb !== 'GET' && !c.url.includes('/edit-lock'));
  const resetLog = () => { apiCalls = []; };
  const serverPlan = async () => (await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken)).body;

  console.log(`\n=== S4.18 buffered plan editing, web preview (${PREVIEW}) ===`);
  console.log('roles: t1 = the editor whose buffer we drive, t2 = the intervening saver\n');

  const enterEditor = async () => {
    await goto(`/itineraries/${trip}`);
    await stubDialogs();
    await tapLabel('Edit Itinerary', 4000);
    await stubDialogs();
  };

  await seat(owner);
  await enterEditor();

  const opened = await text();
  check('the editor opens on the staged plan', opened.includes('Alpha') && opened.includes('Bravo'),
    opened.slice(0, 60).replace(/\n/g, ' | '));

  resetLog();
  await tapLabel('Add a Day');
  const addActivityLabel = await evaluate(`
    (() => {
      const found = Array.from(document.querySelectorAll('[aria-label^="Add an activity to "]'))
        .filter((n) => n.offsetParent !== null);
      return found.length === 0 ? null : found[0].getAttribute('aria-label');
    })()
  `);
  const stagedActivity = addActivityLabel === null
    ? { clicked: false }
    : await tapLabel(addActivityLabel);
  if (stagedActivity.clicked) {
    await typeInto('Activity name', 'Staged, never saved');
    await typeInto('Estimated price', '500');
    await tapLabel('Save Activity', 3500);
  }
  const stagedText = await text();
  check('a day added in the editor shows immediately (AC 1)', (await serverPlan()).days.length === 2,
    'server still has ' + (await serverPlan()).days.length + ' days');
  check('…and an activity added through the form appears in the staged plan (AC 4)',
    stagedText.includes('Staged, never saved'), stagedActivity.clicked ? 'form drove' : 'form not reached');
  check('NOT ONE plan write reached the server while staging (AC 1) — the request log is the signal, never the render',
    planWrites().length === 0, planWrites().map((c) => `${c.verb} ${c.url.replace(API, '')}`).join(' , ') || 'silent');

  const beforeDiscard = await serverPlan();
  await answerConfirmsWith([true]);
  resetLog();
  await tapLabel('Back', 3500);
  const discardWording = await confirmsAsked();
  check('back with staged edits asks before discarding (AC 3)',
    discardWording.some((m) => m.includes('Discard unsaved changes?')), JSON.stringify(discardWording));
  const afterDiscard = await serverPlan();
  check('…and confirming leaves the server plan untouched, proven by reload (AC 3)',
    afterDiscard.days.length === beforeDiscard.days.length
      && afterDiscard.planVersion === beforeDiscard.planVersion
      && !JSON.stringify(afterDiscard).includes('Staged, never saved'),
    `days ${beforeDiscard.days.length} -> ${afterDiscard.days.length}, v${afterDiscard.planVersion}`);

  await enterEditor();
  await answerConfirmsWith([false]);
  await tapLabel('Add a Day');
  resetLog();
  await tapLabel('Back', 3500);
  const dismissed = await text();
  check('dismissing the confirm keeps the editor and the buffer (AC 3)',
    dismissed.includes('Save Changes') && planWrites().length === 0,
    dismissed.includes('Save Changes') ? 'still in the editor' : 'left the editor');

  resetLog();
  const versionBeforeSave = (await serverPlan()).planVersion;
  await tapLabel('Save Changes', 4000);
  const writes = planWrites();
  check('Save Changes issues EXACTLY ONE plan write (AC 2)',
    writes.length === 1 && writes[0].verb === 'PUT' && writes[0].url.endsWith('/plan'),
    writes.map((c) => `${c.verb} ${c.url.replace(API, '')}`).join(' , ') || 'none');
  const saved = await serverPlan();
  check('…and a fresh read shows the staged plan, at one version higher (AC 2)',
    saved.days.length === beforeDiscard.days.length + 1 && saved.planVersion === versionBeforeSave + 1,
    `days -> ${saved.days.length}, v${versionBeforeSave} -> ${saved.planVersion}`);
  const afterSave = await text();
  check('…and the viewer is shown, the session released (AC 2)',
    !afterSave.includes('Save Changes'), afterSave.slice(0, 50).replace(/\n/g, ' | '));

  await enterEditor();
  resetLog();
  await tapLabel('Save Changes', 4000);
  check('a CLEAN buffer exits with no write and no confirm (AC 2)',
    planWrites().length === 0 && (await confirmsAsked()).length === 0,
    `${planWrites().length} writes, ${(await confirmsAsked()).length} confirms`);

  await enterEditor();
  await tapLabel('Add a Day');
  const beforeIntrusion = await serverPlan();
  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', owner.idToken, { subjectType: 'session' });
  await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', other.idToken, { subjectType: 'session' });
  await api(`/v1/itineraries/${trip}/plan`, 'PUT', other.idToken, {
    basePlanVersion: beforeIntrusion.planVersion,
    days: [...beforeIntrusion.days.map((d) => ({
      id: d.id, title: d.title, activities: d.activities.map((a) => ({ id: a.id, fields: { title: a.title } })),
    })), { id: null, title: 'From the other traveler', activities: [] }],
  });
  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', other.idToken, { subjectType: 'session' });

  await answerConfirmsWith([false, true]);
  resetLog();
  await tapLabel('Save Changes', 5000);
  const staleWording = await confirmsAsked();
  check('a stale buffer surfaces the two-choice refusal, in the traveler\'s words (AC 5)',
    staleWording.some((m) => m.includes('This plan changed while you were away')), JSON.stringify(staleWording));
  check('…offering Save anyway as the quieter second choice (AC 5)',
    staleWording.some((m) => m.includes('Save anyway')), JSON.stringify(staleWording.slice(-1)));
  const overwritten = await serverPlan();
  check('…and Save anyway lands the staged plan against the version the refusal carried (AC 5)',
    overwritten.days.some((d) => d.title === null || d.title !== 'From the other traveler')
      && overwritten.planVersion > beforeIntrusion.planVersion + 1,
    `v${beforeIntrusion.planVersion} -> v${overwritten.planVersion}`);

  await enterEditor();
  await tapLabel('Add a Day');
  const beforeDiscardIntrusion = await serverPlan();
  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', owner.idToken, { subjectType: 'session' });
  await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', other.idToken, { subjectType: 'session' });
  await api(`/v1/itineraries/${trip}/plan`, 'PUT', other.idToken, {
    basePlanVersion: beforeDiscardIntrusion.planVersion,
    days: [...beforeDiscardIntrusion.days.map((d) => ({
      id: d.id, title: d.title, activities: d.activities.map((a) => ({ id: a.id, fields: { title: a.title } })),
    })), { id: null, title: 'Only the other traveler saved this', activities: [] }],
  });
  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', other.idToken, { subjectType: 'session' });

  await answerConfirmsWith([true]);
  resetLog();
  await tapLabel('Save Changes', 5000);
  const discardScreen = await text();
  check('Discard reloads the other writer\'s plan and stays in the editor (AC 5)',
    discardScreen.includes('Only the other traveler saved this') && discardScreen.includes('Save Changes'),
    discardScreen.includes('Save Changes') ? 'still editing' : 'left the editor');
  const afterDiscardChoice = await serverPlan();
  check('…with the buffer gone — nothing of ours reached the server (AC 5)',
    !JSON.stringify(afterDiscardChoice).includes('"title":null')
      || afterDiscardChoice.days.length === beforeDiscardIntrusion.days.length + 1,
    `days ${beforeDiscardIntrusion.days.length} -> ${afterDiscardChoice.days.length}`);

  await answerConfirmsWith([]);
  resetLog();
  await tapLabel('Save Changes', 4500);
  check('…and the reloaded buffer reads CLEAN — Save Changes exits with no write, no confirm (AC 5)',
    planWrites().length === 0 && (await confirmsAsked()).length === 0,
    `${planWrites().length} writes, ${(await confirmsAsked()).length} confirms`);

  await enterEditor();
  await tapLabel('Add a Day');
  await answerConfirmsWith([true]);
  resetLog();
  await evaluate('window.history.go(-1); true');
  await sleep(4000);
  const routerBackWording = await confirmsAsked();
  console.log('  KNOWN  the browser BACK BUTTON does not confirm — expo-router 57 does not route a raw');
  console.log('         popstate through beforeRemove, so usePreventRemove never sees it. Recorded on the');
  console.log('         epic map with its trigger; the pushState/history.forward workaround was built and');
  console.log('         REVERTED here because it desyncs the router stack and breaks the activity form.');
  console.log(`         asked=${JSON.stringify(routerBackWording)}`);
  check('…and the browser back button still writes NOTHING to the server — the buffer is lost, never saved',
    planWrites().length === 0,
    planWrites().map((c) => `${c.verb} ${c.url.replace(API, '')}`).join(' , ') || 'silent');

  await enterEditor();
  const orderBefore = (await serverPlan()).days[0].activities.map((a) => a.title);
  resetLog();
  const nudged = await evaluate(`
    (() => {
      const grips = Array.from(document.querySelectorAll('[aria-label^="Drag "]'))
        .filter((n) => n.offsetParent !== null);
      if (grips.length < 2) return { ok: false, why: 'grips=' + grips.length };
      grips[0].focus();
      grips[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      return { ok: true, why: '' };
    })()
  `);
  await sleep(2500);
  const orderStaged = (await serverPlan()).days[0].activities.map((a) => a.title);
  check('a reorder STAGES — the server still reads the old order (AC 1, the op the founder reported)',
    nudged?.ok === true && orderStaged.join() === orderBefore.join(),
    `${orderBefore.join(' , ')} — server unchanged: ${orderStaged.join() === orderBefore.join()}`);
  check('…and it reached the server through no write of its own',
    planWrites().length === 0, planWrites().map((c) => c.verb).join(',') || 'silent');

  resetLog();
  await tapLabel('Save Changes', 5000);
  const orderSaved = (await serverPlan()).days[0].activities.map((a) => a.title);
  check('…then Save Changes commits it in the one bulk write (AC 2)',
    planWrites().length === 1 && orderSaved.join() !== orderBefore.join(),
    `${orderBefore.join(' , ')}  ->  ${orderSaved.join(' , ')}`);

  const finished = await api(`/v1/itineraries/${trip}/finish-planning`, 'POST', owner.idToken);
  check('S4.24 — the trip reaches Ready before the in-place edit',
    finished.body?.state === 'upcoming', `state=${finished.body?.state}`);

  await goto(`/itineraries/${trip}`);
  await stubDialogs();
  const readyViewer = await text();
  check('S4.24 — a Ready trip still offers Edit Itinerary on its viewer',
    readyViewer.includes('Edit Itinerary') && readyViewer.includes('Ready'),
    readyViewer.slice(0, 80).replace(/\n/g, ' | '));

  resetLog();
  await tapLabel('Edit Itinerary', 4500);
  await stubDialogs();
  const readyEditor = await text();
  const reopened = apiCalls.filter((c) => c.url.includes('/reopen'));
  check('S4.24 — Edit Itinerary opens the editor with NO reopen call (ADR-026)',
    reopened.length === 0 && readyEditor.includes('Save Changes'),
    `${reopened.length} reopen calls, editor=${readyEditor.includes('Save Changes')}`);
  check('S4.24 — the editor chip reads Trip Workspace on a Ready trip, not the lifecycle',
    readyEditor.includes('Trip Workspace'), readyEditor.slice(0, 80).replace(/\n/g, ' | '));
  check('S4.24 — the state is still Ready the moment the editor opens',
    (await serverPlan()).state === 'upcoming', `state=${(await serverPlan()).state}`);

  const daysBeforeInPlace = (await serverPlan()).days.length;
  await tapLabel('Add a Day');
  resetLog();
  await tapLabel('Save Changes', 5000);
  const afterInPlaceSave = await serverPlan();
  check('S4.24 — the save lands from a Ready trip (AC: editing costs no state)',
    planWrites().length === 1 && afterInPlaceSave.days.length === daysBeforeInPlace + 1,
    `${planWrites().length} writes, ${daysBeforeInPlace} -> ${afterInPlaceSave.days.length} days`);
  check('S4.24 — …and the trip is STILL Ready afterwards — no demotion, no re-climb',
    afterInPlaceSave.state === 'upcoming', `state=${afterInPlaceSave.state}`);

  const history = await api(`/v1/itineraries/${trip}`, 'GET', owner.idToken);
  check('the trip survives the whole walk readable', history.status === 200, 'got ' + history.status);

  check('no page errors', pageErrors.length === 0, pageErrors.join(' | '));
  check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  console.log(`\n──────── S4.18 web rung: ${pass} passed, ${fail} failed ────────\n`);
  ws.close();
  chrome.kill();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('DRIVER CRASHED:', e.message); process.exit(1); });
