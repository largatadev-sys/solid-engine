const { spawn } = require('child_process');
const http = require('http');
const os = require('os');
const WebSocket = require('ws');
const { api, address, request, requirePoolEnv } = require('./poolApi');

const PREVIEW = process.env.LARGATA_PREVIEW_URL || 'http://localhost:8081';
const PORT = Number(process.env.LARGATA_CDP_PORT || 9251);

const chromePath = () =>
  process.env.LARGATA_CHROME
  || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = (path) =>
  new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve(JSON.parse(b)));
    }).on('error', reject);
  });

let pass = 0;
let fail = 0;
const check = (description, ok, detail) => {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${description}${detail ? `  — ${detail}` : ''}`);
};

(async () => {
  requirePoolEnv();
  const signedIn = await request(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.EXPO_PUBLIC_FIREBASE_API_KEY}`,
    'POST',
    { email: address('t1'), password: process.env.LARGATA_TEST_POOL_PASSWORD, returnSecureToken: true },
  );
  const owner = signedIn.body;
  if (owner?.idToken === undefined) {
    throw new Error(`sign-in failed: ${JSON.stringify(signedIn.body).slice(0, 200)}`);
  }

  const created = await api('/v1/itineraries', 'POST', owner.idToken, {
    title: 'Real mouse walk',
    destinations: ['El Nido'],
    durationDays: 1,
  });
  if (created.status !== 201 || created.body?.id === undefined) {
    throw new Error(
      `fixture not created (${created.status}) — the walk would have run signed out and blamed the screen: `
      + JSON.stringify(created.body).slice(0, 160),
    );
  }
  const trip = created.body;

  const chrome = spawn(chromePath(), [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    `--user-data-dir=${os.tmpdir()}/largata-real-mouse-driver`,
    '--window-size=1280,900',
    'about:blank',
  ], { stdio: 'ignore' });
  await sleep(2500);

  const page = (await getJson('/json/list')).find((t) => t.type === 'page');
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
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); return; }
    if (msg.method === 'Runtime.exceptionThrown') pageErrors.push(msg.params.exceptionDetails.text);
  });
  await send('Runtime.enable');
  await send('Page.enable');

  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }))?.result?.value;

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

  const boxOf = async (label) => {
    const raw = await evaluate(`
      (() => {
        const all = Array.from(document.querySelectorAll('[aria-label], [role="tab"]'))
          .filter((n) => (n.getAttribute('aria-label') || n.textContent || '').trim() === ${JSON.stringify(label)});
        const visible = all.filter((n) => n.offsetParent !== null);
        const target = visible[visible.length - 1];
        if (!target) return null;
        const r = target.getBoundingClientRect();
        return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width });
      })()
    `);
    return raw === null || raw === undefined ? null : JSON.parse(raw);
  };

  const realClick = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(x), y: Math.round(y) });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
    await sleep(1200);
  };

  const realDrag = async (from, to, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(from), y: Math.round(y) });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.round(from), y: Math.round(y), button: 'left', clickCount: 1 });
    for (let step = 1; step <= 6; step += 1) {
      const at = from + ((to - from) * step) / 6;
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(at), y: Math.round(y), button: 'left', buttons: 1 });
      await sleep(30);
    }
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(to), y: Math.round(y), button: 'left', clickCount: 1 });
    await sleep(900);
  };

  console.log(`\n=== real-mouse walk — a press must reach the control under it (${PREVIEW}) ===`);
  console.log('roles: t1 = the only traveler; the point is the MOUSE, not the account\n');

  await goto(`/itineraries/${trip.id}`);
  const opened = await text();
  check('the workspace opens on Day-by-Day', opened.includes('Day-by-Day'),
    opened.slice(0, 70).replace(/\n/g, ' | '));

  const travelersTab = await boxOf('Travelers');
  check('the Travelers tab is on screen and measurable', travelersTab !== null,
    travelersTab === null ? 'not found' : `x=${Math.round(travelersTab.x)} w=${Math.round(travelersTab.w)}`);

  if (travelersTab !== null) {
    await realClick(travelersTab.x, travelersTab.y);
    const afterTab = await text();
    check('A REAL MOUSE CLICK selects the Travelers tab — the regression this walk exists for',
      !afterTab.includes('Day 1'),
      afterTab.includes('Day 1')
        ? `still on Day-by-Day: ${afterTab.slice(0, 90).replace(/\n/g, ' | ')}`
        : afterTab.slice(0, 90).replace(/\n/g, ' | '));
  }

  const dayTab = await boxOf('Day-by-Day');
  if (dayTab !== null) {
    await realClick(dayTab.x, dayTab.y);
    const back = await text();
    check('…and a real click gets back to Day-by-Day, so the row is not one-way',
      back.includes('Day 1'), back.slice(0, 70).replace(/\n/g, ' | '));
  }

  const scrollOf = () => evaluate(`
    (() => {
      const rows = Array.from(document.querySelectorAll('div'))
        .filter((n) => n.scrollWidth > n.clientWidth + 8 && n.clientHeight > 20 && n.clientHeight < 90);
      return rows.length === 0 ? null : rows[0].scrollLeft;
    })()
  `);

  const before = await scrollOf();
  if (before !== null && dayTab !== null) {
    await realDrag(dayTab.x + 120, dayTab.x - 60, dayTab.y);
    const after = await scrollOf();
    check('a real mouse DRAG still scrolls the tab row — the capability 7a85fc8 added survives',
      after !== null && after > before, `scrollLeft ${before} -> ${after}`);
  } else {
    check('the tab row overflows, so a drag has somewhere to go', false, `scrollLeft=${before}`);
  }

  await goto(`/itineraries/${trip.id}/edit-plan`);
  await sleep(1500);
  const addActivity = await evaluate(`
    (() => {
      const found = Array.from(document.querySelectorAll('[aria-label^="Add an activity to "]'))
        .filter((n) => n.offsetParent !== null);
      if (found.length === 0) return null;
      const r = found[0].getBoundingClientRect();
      return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
    })()
  `);
  if (addActivity !== null && addActivity !== undefined) {
    const at = JSON.parse(addActivity);
    await realClick(at.x, at.y);
    const form = await text();
    check('a real click opens the activity form from the editor',
      /Activity Name/i.test(form), form.slice(0, 70).replace(/\n/g, ' | '));

    const currencyBoxes = await evaluate(`
      document.querySelectorAll('[aria-label="Currency"]').length
    `);
    check('the currency TEXT BOX is gone from the activity form',
      currencyBoxes === 0, `found ${currencyBoxes}`);

    const priceField = await evaluate(`
      (() => {
        const input = Array.from(document.querySelectorAll('[aria-label="Estimated price"]'))
          .filter((n) => n.offsetParent !== null).pop();
        if (!input) return null;
        const row = input.closest('div');
        return JSON.stringify({ placeholder: input.placeholder || '', row: (row ? row.innerText : '').trim() });
      })()
    `);
    const price = priceField === null || priceField === undefined ? null : JSON.parse(priceField);
    check('the price field renders the currency as a read-only sign beside the amount',
      price !== null && price.row.length > 0,
      price === null ? 'field not found' : `sign="${price.row}" placeholder="${price.placeholder}"`);
  } else {
    check('the editor offers an Add-activity affordance', false, 'not found');
  }

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

  console.log(`\n──────── real-mouse rung: ${pass} passed, ${fail} failed ────────\n`);
  ws.close();
  chrome.kill();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('\n' + e.message); process.exit(1); });
