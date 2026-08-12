const WebSocket = require('ws');
const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

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
const PORT = Number(process.env.LARGATA_CDP_PORT || 9243);

// t1 authors, t2 reads. They share NO trip, which is the whole point of the fixture: the feed
// must reach a traveler the guard would refuse, so a walk where both are members proves nothing.
const AUTHOR = 't1';
const STRANGER = 't2';

// CDP Input.dispatchMouseEvent does NOT synthesize PointerEvents, so React onPointerDown never
// fires and a drag reads as dead against a working carousel (the S4.21 lesson). Dispatch real
// events in-page, and find the strip by walking up from the photo to the scroller.
const DRAG_IN_PAGE = (fraction) => `
  (() => {
    const img = Array.from(document.querySelectorAll('[aria-label]'))
      .filter((n) => /, photo 1$/.test(n.getAttribute('aria-label') || ''))
      .filter((n) => n.offsetParent !== null)[0];
    let s = img;
    while (s && !(s.scrollWidth > s.clientWidth && /auto|scroll/.test(getComputedStyle(s).overflowX))) s = s.parentElement;
    if (!s) return null;
    const r = s.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const travel = Math.round(s.clientWidth * ${fraction});
    const before = Math.round(s.scrollLeft);
    const snap = getComputedStyle(s).scrollSnapType;
    const mk = (t, x, b) => new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse", clientX: x, clientY: cy, button: 0, buttons: b });
    s.dispatchEvent(mk("pointerdown", cx, 1));
    for (const f of [0.25, 0.5, 0.75, 1]) s.dispatchEvent(mk("pointermove", cx - travel * f, 1));
    const dragged = Math.round(s.scrollLeft);
    s.dispatchEvent(mk("pointerup", cx - travel, 0));
    return { before, dragged, pitch: Math.round(s.clientWidth), snap };
  })()
`;

const HEART_STATE = `
  (() => {
    const hearts = Array.from(document.querySelectorAll('[aria-label]'))
      .filter((n) => /^(Like|Unlike) this postcard$/.test(n.getAttribute('aria-label') || ''))
      .filter((n) => n.offsetParent !== null);
    const heart = hearts[hearts.length - 1];
    return heart ? { label: heart.getAttribute('aria-label'), text: heart.innerText.trim() } : null;
  })()
`;

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

function postDiaryEntry(token, itineraryId, entry, photos) {
  return new Promise((resolve, reject) => {
    const boundary = `----largata${Date.now()}`;
    const parts = [
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="entry"\r\n` +
          `Content-Type: text/plain\r\n\r\n${JSON.stringify(entry)}\r\n`,
      ),
    ];
    for (const file of photos) {
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="photos"; filename="${path.basename(file)}"\r\n` +
            `Content-Type: image/jpeg\r\n\r\n`,
        ),
        fs.readFileSync(file),
        Buffer.from('\r\n'),
      );
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const payload = Buffer.concat(parts);
    const req = http.request(
      new URL(`${API}/v1/itineraries/${itineraryId}/diary/entries`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': payload.length,
        },
      },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve({ status: res.statusCode, body: b ? JSON.parse(b) : {} }));
      },
    );
    req.on('error', reject);
    req.end(payload);
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

// A REAL jpeg (the S4.21 lesson): a hand-assembled one passes ingest and then decodes to garbage,
// which reads as a layout defect in every screenshot and costs a session to disprove.
function writeFixture() {
  const file = path.join(os.tmpdir(), `largata-home-${Date.now()}.jpg`);
  fs.copyFileSync(path.join(__dirname, 'fixtures', 'photo.jpg'), file);
  return file;
}

async function startedTrip(token, title, days) {
  const created = await api('/v1/itineraries', 'POST', token, {
    title,
    destinations: ['Palawan'],
    durationDays: days,
  });
  const id = created.body.id;
  await api(`/v1/itineraries/${id}/finish-planning`, 'POST', token);
  await api(`/v1/itineraries/${id}/start`, 'POST', token);
  return id;
}

async function addActivity(token, itineraryId, dayOrdinal, title) {
  const plan = (await api(`/v1/itineraries/${itineraryId}`, 'GET', token)).body;
  const day = plan.days[dayOrdinal - 1];
  const made = await api(
    `/v1/itineraries/${itineraryId}/days/${day.id}/activities`,
    'POST',
    token,
    { title },
  );
  return made.body.id;
}

(async () => {
  for (const [name, value] of [
    ['EXPO_PUBLIC_FIREBASE_API_KEY', KEY],
    ['LARGATA_TEST_POOL_EMAIL_BASE', BASE],
    ['LARGATA_TEST_POOL_PASSWORD', PASSWORD],
  ]) {
    if (!value) throw new Error(`${name} is unset — source mobile/.env first`);
  }

  const author = await signIn(AUTHOR);
  const stranger = await signIn(STRANGER);
  const fixture = writeFixture();
  const stamp = Date.now().toString().slice(-6);

  console.log(`\nS4.22 home feed — ${AUTHOR} = author, ${STRANGER} = stranger (no shared trip)\n`);

  // --- the fixture: one live trip, one shared postcard, one private sibling -----------------
  const liveTrip = await startedTrip(author.idToken, `Feed walk ${stamp}`, 3);
  const first = await addActivity(author.idToken, liveTrip, 1, `Lempuyang Gate ${stamp}`);
  const second = await addActivity(author.idToken, liveTrip, 2, `Rice terraces ${stamp}`);

  const sharedCaption = `Shared to the feed ${stamp}`;
  const privateCaption = `Kept private ${stamp}`;

  const shared = await postDiaryEntry(
    author.idToken,
    liveTrip,
    { activityId: first, caption: sharedCaption, fromDump: [], shareToFeed: true },
    [fixture, fixture, fixture],
  );
  const kept = await postDiaryEntry(
    author.idToken,
    liveTrip,
    { activityId: second, caption: privateCaption, fromDump: [], shareToFeed: false },
    [fixture],
  );

  check('the composer posted a shared postcard with three photos',
    shared.status === 201 && shared.body.sharedAt !== null && shared.body.photos.length === 3,
    `status=${shared.status} sharedAt=${shared.body.sharedAt}`);
  check('and a private sibling that stays private',
    kept.status === 201 && kept.body.sharedAt === null, `sharedAt=${kept.body.sharedAt}`);

  // --- the wire, read as the stranger (AC 1, AC 6) -------------------------------------------
  const feed = (await api('/v1/feed/postcards?limit=50', 'GET', stranger.idToken)).body;
  const mine = (feed.items ?? []).filter((c) => c.caption === sharedCaption);

  check('AC 1: a traveler who shares no trip with the author reads the shared postcard',
    mine.length === 1, `found=${mine.length}`);
  check('AC 1: the private sibling never crosses',
    !(feed.items ?? []).some((c) => c.caption === privateCaption));
  check('AC 5: the trip line carries name and day but no link while the trip is unpublished',
    mine[0] && mine[0].tripTitle === `Feed walk ${stamp}` && mine[0].dayLabel === 'Day 1' &&
      mine[0].publishedItineraryId === null,
    mine[0] ? `trip=${mine[0].tripTitle} link=${mine[0].publishedItineraryId}` : 'no card');

  const profileDir = `${os.tmpdir()}/largata-publish-driver`;
  fs.rmSync(profileDir, { recursive: true, force: true });

  const chrome = spawn(
    chromePath(),
    [
      `--remote-debugging-port=${PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=${profileDir}`,
      '--window-size=430,900',
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
  const requests = [];
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
    if (msg.method === 'Runtime.exceptionThrown') pageErrors.push((msg.params.exceptionDetails.exception && msg.params.exceptionDetails.exception.description) || msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push((msg.params.args || []).map((a) => a.value ?? a.description).join(' '));
    }
    if (msg.method === 'Network.requestWillBeSent') {
      const url = msg.params.request.url;
      // A CORS preflight carries no Authorization by definition, so counting it as an anonymous
      // read turns the S3.3 tell into a false alarm. The tell is a real GET without a bearer.
      if (url.includes('/v1/media/') && msg.params.request.method === 'GET') {
        requests.push({
          url,
          auth: msg.params.request.headers.Authorization ? 'bearer' : 'ANON',
        });
      }
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__largataAlerts = [];
      window.alert = (m) => { window.__largataAlerts.push(String(m)); };
      window.__largataConfirms = [];
      window.confirm = (m) => { window.__largataConfirms.push(String(m)); return true; };
    `,
  });

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

  const goto = async (to) => {
    await send('Page.navigate', { url: `${PREVIEW}${to}` });
    await sleep(4500);
  };
  const url = () => evaluate('location.pathname');
  const text = () => evaluate('document.body.innerText');
  const alerts = () => evaluate('JSON.stringify(window.__largataAlerts || [])');

  const shotsDir = (() => {
    const at = process.argv.indexOf('--shots');
    return at === -1 ? null : process.argv[at + 1];
  })();
  const shoot = async (name) => {
    if (shotsDir === null) return;
    fs.mkdirSync(shotsDir, { recursive: true });
    const shot = await send('Page.captureScreenshot', {});
    fs.writeFileSync(`${shotsDir}/${name}.png`, Buffer.from(shot.data, 'base64'));
  };

  const tapLabel = async (label, wait = 3000) => {
    const result = await evaluate(`
      (() => {
        const all = Array.from(document.querySelectorAll('[aria-label],[role="tab"],[role="switch"],[role="link"],button,a'))
          .filter((n) => ((n.getAttribute('aria-label') || n.innerText || '').trim()) === ${JSON.stringify(label)});
        const visible = all.filter((n) => n.offsetParent !== null && n.closest('[aria-hidden="true"]') === null);
        const target = visible[visible.length - 1];
        if (!target) return { clicked: false, seen: all.length, visible: visible.length };
        target.click();
        return { clicked: true, seen: all.length, visible: visible.length };
      })()
    `);
    await sleep(wait);
    return result;
  };

  // --- the stranger cold-starts onto the feed (AC 1, AC 11's landing half) -------------------
  await seat(stranger);
  await goto('/');

  const landed = await url();
  const feedText = (await text()) || '';

  check('AC 11: the root path lands on the feed, not on Trips',
    landed === '/' && feedText.includes('Largata'), `path=${landed} chars=${feedText.length}`);
  check('AC 1: the stranger sees the shared postcard on Home',
    feedText.includes(sharedCaption.slice(0, 24)), feedText.replace(/\n/g, ' | ').slice(0, 200));
  check('AC 1: and never the private one',
    !feedText.includes(privateCaption), privateCaption);
  check('AC 5: the card shows the trip line with its day label',
    feedText.includes(`Feed walk ${stamp}`) && feedText.includes('Day 1'),
    feedText.replace(/\n/g, ' | ').slice(0, 200));

  await shoot('web-feed');

  // --- the media tell: every photo must arrive bearer-authenticated (S3.3) -------------------
  const anon = requests.filter((r) => r.auth === 'ANON');
  check('AC 1: every feed photo arrives bearer-authenticated — no ANON GETs',
    requests.length > 0 && anon.length === 0,
    `media GETs=${requests.length} anon=${anon.length}`);

  // --- the carousel drags on the web rung (AC 8's web half) ----------------------------------
  const dragged = await evaluate(DRAG_IN_PAGE(0.7));
  check('AC 8: the photo strip drags — real PointerEvents move it',
    dragged !== null && dragged.dragged > dragged.before,
    dragged ? `before=${dragged.before} dragged=${dragged.dragged} snap=${dragged.snap}` : 'no strip found');
  // The strip DOES rest on `x mandatory` — that is where its web paging comes from. The S4.21 trap
  // is snap being live DURING the drag, which silently eats every scrollLeft write; dragToScroll
  // disables it on pointerdown and restores it on release. So the discriminating pair is: the drag
  // moved (snap was off while it ran) and the snap is back afterwards (paging still works).
  const snapAfter = await evaluate(`
    (() => {
      const img = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((n) => /, photo 1$/.test(n.getAttribute('aria-label') || ''))
        .filter((n) => n.offsetParent !== null)[0];
      let s = img;
      while (s && !(s.scrollWidth > s.clientWidth && /auto|scroll/.test(getComputedStyle(s).overflowX))) s = s.parentElement;
      return s ? getComputedStyle(s).scrollSnapType : null;
    })()
  `);
  check('AC 8: snap is restored after the drag, so paging still works (S4.21)',
    snapAfter === 'x mandatory', String(snapAfter));

  await sleep(1200);
  const afterSettle = (await text()) || '';
  check('AC 8: the counter tracks the page the strip settled on',
    /\b[1-3]\/3\b/.test(afterSettle), (afterSettle.match(/\b\d\/\d\b/g) || []).join(' '));

  // The lock's observable claim is that a diagonal drag moves the strip and NOT the feed under
  // it. Asserting setPointerCapture instead would prove nothing here: a synthetic PointerEvent
  // has no real pointer behind it, so the browser refuses the capture and the probe would report
  // a broken lock against a product whose native path takes a different route entirely.
  const locked = await evaluate(`
    (() => {
      const img = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((n) => /, photo 1$/.test(n.getAttribute('aria-label') || ''))
        .filter((n) => n.offsetParent !== null)[0];
      let s = img;
      while (s && !(s.scrollWidth > s.clientWidth && /auto|scroll/.test(getComputedStyle(s).overflowX))) s = s.parentElement;
      if (!s) return null;
      let feed = s.parentElement;
      while (feed && !(feed.scrollHeight > feed.clientHeight && /auto|scroll/.test(getComputedStyle(feed).overflowY))) feed = feed.parentElement;
      feed = feed || document.scrollingElement;
      const beforeDown = feed.scrollTop;
      const beforeAcross = s.scrollLeft;
      const r = s.getBoundingClientRect();
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      const mk = (t, x, y, b) => new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 7, pointerType: "mouse", clientX: x, clientY: y, button: 0, buttons: b });
      s.dispatchEvent(mk("pointerdown", cx, cy, 1));
      for (const f of [0.3, 0.6, 1]) s.dispatchEvent(mk("pointermove", cx - 120 * f, cy - 140 * f, 1));
      const across = s.scrollLeft - beforeAcross;
      const down = feed.scrollTop - beforeDown;
      s.dispatchEvent(mk("pointerup", cx - 120, cy - 140, 0));
      return { across, down };
    })()
  `);
  check('AC 8: a diagonal drag moves the strip and never the feed beneath it — the axis locks',
    locked !== null && locked.across > 0 && locked.down === 0,
    locked ? `across=${locked.across} down=${locked.down}` : 'no strip');

  // --- the heart toggles optimistically over the stubbed base (AC 9) -------------------------
  // Read the LAST visible heart, matching tapLabel's own rule — the feed holds several cards and
  // measuring the first while clicking the last reports a dead control against a working one.
  const before = await evaluate(HEART_STATE);
  const heartTap = await tapLabel(
    before && before.label === 'Like this postcard' ? 'Like this postcard' : 'Unlike this postcard',
    1200,
  );
  const afterLike = await evaluate(HEART_STATE);
  // The count moves by one, but a compacted count ("1.3k") swallows a ±1 by design, so asserting
  // the rendered digits changed would fail against a working heart above 999. The label flip is
  // the state, and the second tap returning the exact original text is the count's round trip.
  const backAgain = await tapLabel(
    afterLike && afterLike.label === 'Unlike this postcard' ? 'Unlike this postcard' : 'Like this postcard',
    1200,
  );
  const afterUnlike = await evaluate(HEART_STATE);

  check('AC 9: the heart toggles instantly, and toggling back restores the count exactly',
    heartTap.clicked === true && backAgain.clicked === true &&
      before !== null && afterLike !== null && afterUnlike !== null &&
      before.label !== afterLike.label && afterUnlike.label === before.label &&
      afterUnlike.text === before.text,
    `${before ? before.label + ' ' + before.text : 'none'} -> ${afterLike ? afterLike.label + ' ' + afterLike.text : 'none'} -> ${afterUnlike ? afterUnlike.label + ' ' + afterUnlike.text : 'none'}`);

  // --- double-tap likes and is idempotent (AC 9, behavior card 2) ----------------------------
  // Two taps in the same spot inside the double-tap window, dispatched as real events so React's
  // Pressable sees them the way a finger produces them.
  const DOUBLE_TAP = `
    (() => {
      const photo = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((n) => /, photo 1$/.test(n.getAttribute('aria-label') || ''))
        .filter((n) => n.offsetParent !== null);
      const target = photo[photo.length - 1];
      if (!target) return null;
      const r = target.getBoundingClientRect();
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      const fire = (t, b) => target.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 3, pointerType: "mouse", clientX: x, clientY: y, button: 0, buttons: b }));
      const mouse = (t, b) => target.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: b }));
      for (const _ of [0, 1]) {
        fire("pointerdown", 1);
        mouse("mousedown", 1);
        fire("pointerup", 0);
        mouse("mouseup", 0);
        mouse("click", 0);
      }
      return true;
    })()
  `;
  const beforeBurst = await evaluate(HEART_STATE);
  await evaluate(DOUBLE_TAP);
  await sleep(1200);
  const afterBurst = await evaluate(HEART_STATE);
  await evaluate(DOUBLE_TAP);
  await sleep(1200);
  const afterSecondBurst = await evaluate(HEART_STATE);

  check('AC 9: double-tapping the photo likes it, and doing it again never unlikes',
    beforeBurst !== null && afterBurst !== null && afterSecondBurst !== null &&
      beforeBurst.label === 'Like this postcard' &&
      afterBurst.label === 'Unlike this postcard' &&
      afterSecondBurst.label === 'Unlike this postcard',
    `${beforeBurst ? beforeBurst.label : '?'} -> ${afterBurst ? afterBurst.label : '?'} -> ${afterSecondBurst ? afterSecondBurst.label : '?'}`);

  // --- the stubbed controls refuse out loud on the web (AC 10) -------------------------------
  await evaluate('window.__largataAlerts = []; true');
  for (const label of [
    'Comment on this postcard',
    'Share this postcard',
    'Save this postcard',
    'Search',
    'Notifications',
  ]) {
    await tapLabel(label, 900);
  }
  const spoken = JSON.parse((await alerts()) || '[]');
  check('AC 10: every backendless control refuses visibly on the web',
    spoken.length >= 5, `${spoken.length} alerts`);
  for (const wording of spoken) console.log(`        alert: ${wording.replace(/\n/g, ' — ')}`);

  // --- the trip line self-heals at publish (AC 5) --------------------------------------------
  await api(`/v1/itineraries/${liveTrip}/complete`, 'POST', author.idToken);
  const published = await api(`/v1/itineraries/${liveTrip}/publish`, 'POST', author.idToken, {
    visibility: 'public',
  });
  const afterPublish = (await api('/v1/feed/postcards?limit=50', 'GET', stranger.idToken)).body;
  const healed = (afterPublish.items ?? []).find((c) => c.caption === sharedCaption);

  check('AC 5: the trip line gains its link the moment the trip publishes',
    published.status === 200 && healed && healed.publishedItineraryId === liveTrip,
    `publish=${published.status} link=${healed ? healed.publishedItineraryId : 'none'}`);

  await goto('/');
  const tripLineTap = await tapLabel(`Feed walk ${stamp} · Day 1, open the published trip`, 4500);
  const wentToTrip = await url();
  check('AC 5: tapping the trip line lands on the published itinerary',
    tripLineTap.clicked === true && wentToTrip.includes('/feed/published/'),
    `clicked=${tripLineTap.clicked} path=${wentToTrip}`);

  const back = await tapLabel('Go back', 4000);
  const backHome = await url();
  check('AC 18: back from the itinerary returns to the feed, not to Trips',
    backHome === '/', `clicked=${back.clicked} path=${backHome}`);

  // --- unshare pulls it back out (AC 4's screen half) ----------------------------------------
  await api(`/v1/itineraries/${liveTrip}/diary/entries/${shared.body.id}/share`, 'DELETE', author.idToken);
  await goto('/');
  const afterUnshare = (await text()) || '';
  check('AC 4: unsharing removes the postcard from the feed on the next fetch',
    !afterUnshare.includes(sharedCaption.slice(0, 24)),
    afterUnshare.replace(/\n/g, ' | ').slice(0, 160));

  const strangerSees = (await api('/v1/feed/postcards?limit=50', 'GET', stranger.idToken)).body;
  check('AC 4: and the wire agrees — no public read path serves it',
    !(strangerSees.items ?? []).some((c) => c.caption === sharedCaption));

  // --- Trips is still reachable from its own tab (ticket 04) ---------------------------------
  await goto('/trips');
  const trips = (await text()) || '';
  check('ticket 04: Trips keeps its surface at its own path',
    trips.length > 0 && !trips.includes('Largata\nSIGNED IN'), `chars=${trips.length}`);

  check('no page errors during the walk', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 400));
  check('no console errors during the walk', consoleErrors.length === 0,
    consoleErrors.join(' | ').slice(0, 200));

  fs.rmSync(fixture, { force: true });
  ws.close();
  chrome.kill();
  console.log(`\n──────── S4.22 web rung: ${pass} passed, ${fail} failed ────────`);
  process.exit(fail === 0 ? 0 : 1);
})();
