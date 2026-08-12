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
const PORT = Number(process.env.LARGATA_CDP_PORT || 9241);

// CDP Input.dispatchMouseEvent does NOT synthesize PointerEvents, so React onPointerDown never
// fires and a drag reads as dead — the product is fine, the probe is not. Dispatch the real
// events in-page instead, which is what a traveler-s finger produces.
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
    const mk = (t, x, b) => new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse", clientX: x, clientY: cy, button: 0, buttons: b });
    s.dispatchEvent(mk("pointerdown", cx, 1));
    for (const f of [0.25, 0.5, 0.75, 1]) s.dispatchEvent(mk("pointermove", cx - travel * f, 1));
    const dragged = Math.round(s.scrollLeft);
    s.dispatchEvent(mk("pointerup", cx - travel, 0));
    return { before, dragged, pitch: Math.round(s.clientWidth) };
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

function postPhoto(url, token, file, field) {
  return new Promise((resolve, reject) => {
    const boundary = `----largata${Date.now()}`;
    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${path.basename(file)}"\r\n` +
        `Content-Type: image/jpeg\r\n\r\n`,
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    const payload = Buffer.concat([head, fs.readFileSync(file), tail]);
    const req = http.request(
      new URL(API + url),
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

// The diary POST is multipart even when every photo comes from the dump: `entry` is a PART, not
// a JSON body. Sending JSON gets a 500 that names MultipartException in the backend log and
// nothing at all in the response, which reads as a broken endpoint rather than a wrong caller.
function postDiaryEntry(itineraryId, token, entry) {
  return new Promise((resolve, reject) => {
    const boundary = `----largata${Date.now()}`;
    const payload = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="entry"\r\n` +
        `Content-Type: application/json\r\n\r\n${JSON.stringify(entry)}\r\n--${boundary}--\r\n`,
    );
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

// A REAL jpeg, committed rather than assembled byte-by-byte. The hand-built version passed ingest
// (valid markers) but its scan data was filler, so every device screenshot this walk produced was
// decode garbage — a black band, square-looking corners — indistinguishable from a layout defect.
// S4.21 spent a session proving the component was innocent. A fixture must render something a
// screenshot can vouch for.
function writeFixture() {
  const file = path.join(os.tmpdir(), `largata-profile-${Date.now()}.jpg`);
  fs.copyFileSync(path.join(__dirname, 'fixtures', 'photo.jpg'), file);
  return file;
}

// The pool account has outgrown a single page on every list this walk reads (MAX_PAGE_SIZE is
// 100 and t1 holds more), so counting from page one silently under-reports. The repeat-cursor
// guard is the S3.1 lesson: a server bug should degrade here, not spin forever.
async function everyItem(token, path) {
  const items = [];
  const followed = new Set();
  let cursor;
  for (;;) {
    const query = `${path}${path.includes('?') ? '&' : '?'}limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const page = (await api(query, 'GET', token)).body;
    items.push(...(page.items ?? []));
    cursor = page.nextCursor ?? undefined;
    if (cursor === undefined || followed.has(cursor)) return items;
    followed.add(cursor);
  }
}

async function publishedTrip(token, title, destinations, days) {
  const created = await api('/v1/itineraries', 'POST', token, {
    title,
    destinations,
    durationDays: days,
  });
  const id = created.body.id;
  await api(`/v1/itineraries/${id}/finish-planning`, 'POST', token);
  await api(`/v1/itineraries/${id}/start`, 'POST', token);
  await api(`/v1/itineraries/${id}/complete`, 'POST', token);
  await api(`/v1/itineraries/${id}/publish`, 'POST', token);
  return id;
}

(async () => {
  // t1 = the traveler whose profile this is. t2 hosts a published trip t1 merely joins — the
  // discriminating fixture: it must appear in Trips and never in the showcase.
  const me = await signIn('t1');
  const host = await signIn('t2');
  const fixture = writeFixture();

  // The pool account accumulates every run's fixtures, so titles carry a run stamp: two cards
  // sharing a title means a tap-by-label hits whichever the list happens to hold first, which
  // reads as a broken card while the app is perfectly correct.
  const run = String(Date.now()).slice(-6);
  const showcaseTitle = `S4.21 showcase ${run}`;
  const draftTitle = `S4.21 draft ${run}`;
  const hostedTitle = `S4.21 hosted ${run}`;
  const diaryTitle = `S4.21 diary ${run}`;

  const showcased = await publishedTrip(me.idToken, showcaseTitle, ['El Nido, Palawan'], 5);
  const draft = (
    await api('/v1/itineraries', 'POST', me.idToken, {
      title: draftTitle,
      destinations: ['Cebu'],
      durationDays: 2,
    })
  ).body.id;

  const hosted = await publishedTrip(host.idToken, hostedTitle, ['Tokyo, Japan'], 4);
  const invite = await api(`/v1/itineraries/${hosted}/invitations`, 'POST', host.idToken, {
    email: address('t1'),
  });
  await api(`/v1/invitations/${invite.body.id}/accept`, 'POST', me.idToken);

  // A diary entry on a trip of t1's own, so the Diary tab has a section to expand.
  const diaryTrip = (
    await api('/v1/itineraries', 'POST', me.idToken, {
      title: diaryTitle,
      destinations: ['Palawan'],
      durationDays: 2,
    })
  ).body.id;
  const plan = (await api(`/v1/itineraries/${diaryTrip}`, 'GET', me.idToken)).body;
  const activity = (
    await api(`/v1/itineraries/${diaryTrip}/days/${plan.days[0].id}/activities`, 'POST', me.idToken, {
      title: 'Sunset at Las Cabanas',
      timeOfDay: '18:12',
    })
  ).body;
  await api(`/v1/itineraries/${diaryTrip}/finish-planning`, 'POST', me.idToken);
  await api(`/v1/itineraries/${diaryTrip}/start`, 'POST', me.idToken);
  // Three photos, not one: the mock's defining postcard is a CAROUSEL, and its counter pill,
  // dots and peek only render above one photo — so a single-photo fixture can never show them.
  const dumped = [];
  for (let i = 0; i < 3; i += 1) {
    dumped.push(
      await postPhoto(`/v1/itineraries/${diaryTrip}/photo-dump`, me.idToken, fixture, 'photo'),
    );
  }
  const entry = await postDiaryEntry(diaryTrip, me.idToken, {
    activityId: activity.id,
    caption: 'The most magical sunset we have ever seen',
    fromDump: dumped.map((photo) => photo.body.id),
  });
  if (entry.status !== 201 || entry.body.photos?.length !== 3) {
    throw new Error(
      `fixture failed: the diary entry did not post three photos (${entry.status}) — ` +
        `${JSON.stringify(entry.body).slice(0, 200)}. dumps=${dumped.map((d) => d.status).join(',')}`,
    );
  }

  const profileDir = `${os.tmpdir()}/largata-profile-driver`;
  fs.rmSync(profileDir, { recursive: true, force: true });

  const chrome = spawn(
    chromePath(),
    [
      `--remote-debugging-port=${PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=${profileDir}`,
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

  const goto = async (path) => {
    await send('Page.navigate', { url: `${PREVIEW}${path}` });
    await sleep(4000);
  };
  const url = () => evaluate('location.pathname');
  const text = () => evaluate('document.body.innerText');

  // The fidelity verdict needs pixels, not assertions: --shots <dir> writes the two tabs so they
  // can be held beside mock frames 2a and 2b.
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

  const tapLabel = async (label, wait = 4000) => {
    const result = await evaluate(`
      (() => {
        const all = Array.from(document.querySelectorAll('[aria-label],[role="tab"],[role="checkbox"],button,a'))
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

  // The header renders from the traveler's own record, so the surface is read on its own terms
  // rather than against literals the pool accounts do not carry.
  const mine = (await api('/v1/me', 'GET', me.idToken)).body;

  // --- the tab lands on the showcase, not the old utility card (AC 1) -----------------------
  await seat(me);
  await goto('/profile');
  const profile = (await text()) || '';

  check('AC 1: the profile tab renders the traveler, not a settings page',
    profile.includes(mine.displayName) && !profile.includes('SIGNED IN'),
    profile.replace(/\n/g, ' | ').slice(0, 160));

  check('AC 1: the wordmark header is gone from the profile tab (ticket 01)',
    !profile.includes('Largata\nSIGNED IN'), profile.slice(0, 80));

  const metaLine = mine.handle === null ? null : `@${mine.handle}`;
  check('AC 1: the handle and vanity number render on one line, prefixed',
    metaLine === null || profile.includes(metaLine),
    `handle=${mine.handle} vanity=${mine.vanityNumber}`);

  await shoot('web-2a-diary');

  check('AC 1/4: the stats row draws all four cells',
    ['Published', 'Trips', 'Followers', 'Following'].every((cell) => profile.includes(cell)),
    profile.replace(/\n/g, ' | ').slice(0, 200));

  // The pool account carries trips from every story that ever ran against this rung, so the
  // counts are asserted against the SET they are meant to describe rather than a literal: the
  // showcase listing itself, and the trips list the Trips tab renders.
  const showcaseList = await everyItem(me.idToken, '/v1/me/profile/published');
  const tripsList = await everyItem(me.idToken, '/v1/itineraries');
  const stats = (await api('/v1/me/profile/stats', 'GET', me.idToken)).body;

  check('AC 4: Published counts exactly the showcase it sits above — it cannot contradict the list',
    stats.publishedCount === showcaseList.length,
    `count=${stats.publishedCount} listed=${showcaseList.length}`);
  check('AC 4: Trips counts every trip the traveler belongs to, the hosted one included',
    stats.tripCount === tripsList.length && tripsList.some((t) => t.id === hosted),
    `count=${stats.tripCount} listed=${tripsList.length}`);
  check('AC 4: the counts move with the fixture this walk planted',
    showcaseList.some((c) => c.id === showcased) &&
      !showcaseList.some((c) => c.id === draft || c.id === hosted),
    `showcased=${showcaseList.some((c) => c.id === showcased)}`);

  const shown = (await evaluate(`
    (() => {
      const body = document.body.innerText;
      const at = body.indexOf('Published');
      return body.slice(Math.max(at - 40, 0), at + 60).replace(/\\n/g, ' | ');
    })()
  `)) || '';
  check('AC 4: the row renders the true counts, not placeholders',
    shown.includes(String(stats.publishedCount)) && !shown.includes('—'), shown);

  // --- the Diary tab: sections, expansion, and the postcard (AC 2) --------------------------
  // The listing is newest-entry-first and the pool account carries trips from every prior story,
  // so the walk reads the section the SERVER puts first rather than assuming its own is there.
  const diaryTrips = await everyItem(me.idToken, '/v1/me/diary/trips');
  const firstSection = diaryTrips[0];
  const firstLabel = `${firstSection.title}, ${firstSection.entryCount === 1 ? '1 entry' : `${firstSection.entryCount} entries`}`;

  check('AC 2: the Diary tab opens selected, newest-first, listing the trips that have entries',
    profile.includes(firstSection.title) && firstSection.itineraryId === diaryTrip,
    `first=${firstSection.title} planted=${diaryTitle}`);

  check('a section is subtitled with its trip-s location and length, not an entry count (founder, 08/11)',
    profile.includes('Palawan · 2 days') && firstSection.destinations?.includes('Palawan') === true,
    `destinations=${JSON.stringify(firstSection.destinations)} days=${firstSection.dayCount}`);

  const postcard = await evaluate(`
    (() => {
      const header = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((n) => /^Open the diary for /.test(n.getAttribute('aria-label') || ''))
        .filter((n) => n.offsetParent !== null)
        .map((n) => n.parentElement)[0];
      const card = Array.from((header ? header.parentElement : document).querySelectorAll('[aria-label]'))
        .filter((n) => (n.getAttribute('aria-label') || '').startsWith('Open your entry for'))
        .filter((n) => n.offsetParent !== null)[0];
      return card ? card.innerText.replace(/\\n/g, ' | ') : '(no postcard)';
    })()
  `);
  check('AC 2: the newest section is already expanded, rendering its postcard with the mock-s anatomy',
    /Day \d+ · \d+:\d\d [AP]M/.test(postcard) && /\d+ likes?/.test(postcard) &&
      postcard !== '(no postcard)',
    postcard.slice(0, 200));

  // 31 of this account's sections share the label "S3.1 diary smoke, 1 entry", so tapping BY
  // LABEL hits an arbitrary one and the count that follows reads a different section entirely —
  // which reads as a broken accordion. Address the FIRST section positionally instead.
  const tapFirstSection = async (wait) => {
    const result = await evaluate(`
      (() => {
        const chevron = Array.from(document.querySelectorAll('[aria-label]'))
          .filter((n) => /^(Expand|Collapse) entries for /.test(n.getAttribute('aria-label') || ''))
          .filter((n) => n.offsetParent !== null)[0];
        if (!chevron) return { clicked: false };
        chevron.click();
        return { clicked: true };
      })()
    `);
    await sleep(wait);
    return result;
  };

  // The pill sits on the STAGE, which is a sibling of the tappable body (the photos have to be
  // draggable, so the Pressable no longer wraps them) — so read the whole section, not the card.
  const sectionText = await evaluate(`
    (() => {
      const header = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((n) => /^Open the diary for /.test(n.getAttribute('aria-label') || ''))
        .filter((n) => n.offsetParent !== null)
        .map((n) => n.parentElement)[0];
      return header ? header.parentElement.innerText.replace(/\\n/g, ' | ') : '(no section)';
    })()
  `);
  check('AC 2: a multi-photo postcard wears the mock-s counter pill',
    /\b1\/3\b/.test(sectionText), sectionText.slice(0, 140));

  const peek = await evaluate(`
    (() => {
      const header = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((n) => /^Open the diary for /.test(n.getAttribute('aria-label') || ''))
        .filter((n) => n.offsetParent !== null)
        .map((n) => n.parentElement)[0];
      const photos = Array.from((header ? header.parentElement : document).querySelectorAll('img'))
        .filter((n) => n.offsetParent !== null);
      if (photos.length < 2) return { photos: photos.length };
      // The SCROLLER is the clipping viewport; its parent is the content strip, which is as wide
      // as every photo laid end to end — measuring that reports ~846px and hides the peek.
      let scroller = photos[0];
      while (scroller && scroller.scrollWidth <= scroller.clientWidth) scroller = scroller.parentElement;
      return {
        photos: photos.length,
        photoWidth: Math.round(photos[0].getBoundingClientRect().width),
        stageWidth: scroller === null ? 0 : Math.round(scroller.clientWidth),
      };
    })()
  `);
  check('AC 2: one photo owns the viewport — no sliver of the next (founder, 08/12)',
    peek.photos >= 2 && peek.stageWidth > 0 && peek.photoWidth === peek.stageWidth,
    JSON.stringify(peek));

  // The scrollbar is gone on web (the dots carry navigation), so a mouse must be able to DRAG the
  // strip or the carousel is unreachable there — the S1.3 dead-click shape with a new cause. A
  // real pointer sequence is the only honest check: react-native-web renders a native overflow
  // div, which a synthetic scroll would move without proving the handlers exist.
  const postcardDrag = await evaluate(DRAG_IN_PAGE(0.7));
  check('AC 2: a pointer drag scrolls the photo strip on web, now that the scrollbar is gone',
    postcardDrag !== null && postcardDrag.dragged > postcardDrag.before,
    JSON.stringify(postcardDrag));

  // The drag released 70% of a photo in, so a strip that merely stopped where the pointer left
  // it would rest mid-photo. The founder asked for a slide: the release settles on a MULTIPLE of
  // the photo width.
  await sleep(900);
  const settled = await evaluate(`
    (() => {
      const img = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((n) => /, photo 1$/.test(n.getAttribute('aria-label') || ''))
        .filter((n) => n.offsetParent !== null)[0];
      let s = img;
      while (s && !(s.scrollWidth > s.clientWidth && /auto|scroll/.test(getComputedStyle(s).overflowX))) s = s.parentElement;
      if (!s) return null;
      return { left: Math.round(s.scrollLeft), pitch: Math.round(s.clientWidth) };
    })()
  `);

  check('AC 2: releasing a drag slides to the nearest photo rather than stopping mid-swipe',
    settled !== null && settled.pitch > 0 && settled.left > 0 && settled.left % settled.pitch === 0,
    JSON.stringify(settled));

  const collapsed = await tapFirstSection(2500);
  const afterCollapse = (await evaluate(`
    (() => {
      // expo-router keeps previously-visited screens mounted beneath the current one, so the
      // count is taken from the section's OWN subtree rather than the whole document (S4.0).
      const header = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((n) => /^Open the diary for /.test(n.getAttribute('aria-label') || ''))
        .filter((n) => n.offsetParent !== null)
        .map((n) => n.parentElement)[0];
      const section = header ? header.parentElement : null;
      if (!section) return -1;
      return Array.from(section.querySelectorAll('[aria-label]'))
        .filter((n) => (n.getAttribute('aria-label') || '').startsWith('Open your entry for'))
        .filter((n) => n.offsetParent !== null).length;
    })()
  `));
  check('AC 2: tapping the section header collapses it, and its postcards go with it',
    collapsed.clicked === true && afterCollapse === 0, `postcards visible=${afterCollapse}`);

  await tapFirstSection(3500);
  const afterExpand = (await evaluate(`
    (() => {
      // expo-router keeps previously-visited screens mounted beneath the current one, so the
      // count is taken from the section's OWN subtree rather than the whole document (S4.0).
      const header = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((n) => /^Open the diary for /.test(n.getAttribute('aria-label') || ''))
        .filter((n) => n.offsetParent !== null)
        .map((n) => n.parentElement)[0];
      const section = header ? header.parentElement : null;
      if (!section) return -1;
      return Array.from(section.querySelectorAll('[aria-label]'))
        .filter((n) => (n.getAttribute('aria-label') || '').startsWith('Open your entry for'))
        .filter((n) => n.offsetParent !== null).length;
    })()
  `));
  check('AC 2: tapping again expands it, and the postcards come back',
    afterExpand > 0, `postcards visible=${afterExpand}`);

  const entryLabel = await evaluate(`
    (() => {
      const header = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((n) => /^Open the diary for /.test(n.getAttribute('aria-label') || ''))
        .filter((n) => n.offsetParent !== null)
        .map((n) => n.parentElement)[0];
      const card = Array.from((header ? header.parentElement : document).querySelectorAll('[aria-label]'))
        .filter((n) => (n.getAttribute('aria-label') || '').startsWith('Open your entry for'))
        .filter((n) => n.offsetParent !== null)[0];
      return card ? card.getAttribute('aria-label') : '';
    })()
  `);
  // A postcard opens the PREVIEW (the founder's second diary mock), not the editor: the editor is
  // one more tap, behind Edit entry. Asserting the URL alone would pass on either surface, so the
  // discriminating signal is the preview's own chrome plus the URL NOT having moved.
  const urlBeforePreview = await url();
  const openedPreview = await tapLabel(entryLabel, 5000);
  const previewText = (await text()) || '';
  check('AC 2: tapping a postcard opens the postcard preview, not the editor',
    openedPreview.clicked === true &&
      previewText.includes('Edit entry') &&
      previewText.includes('Share') &&
      (await url()) === urlBeforePreview,
    `${entryLabel} -> ${await url()}`);

  // S4.22 made this button real on the profile's copy of the preview: the mock's Share slot is
  // where retro-sharing to the Home feed lives, so the S4.21 coming-soon assertion is superseded
  // rather than broken. The preview opened by any surface WITHOUT a share handler still refuses.
  const sharedToFeed = await tapLabel('Share to feed', 3500);
  const afterShare = (await text()) || '';
  check('AC 2 (S4.22): the mock-s Share slot performs the real act — the postcard goes public',
    sharedToFeed.clicked === true && afterShare.includes('Remove from feed'),
    `clicked=${sharedToFeed.clicked} offers=${afterShare.includes('Remove from feed')}`);

  const pulledBack = await tapLabel('Remove from feed', 3500);
  const afterUnshare = (await text()) || '';
  check('AC 2 (S4.22): and it is symmetric — the same slot pulls the postcard back',
    pulledBack.clicked === true && afterUnshare.includes('Share to feed'),
    `clicked=${pulledBack.clicked} offers=${afterUnshare.includes('Share to feed')}`);

  const toEditor = await tapLabel('Edit entry', 5000);
  check('AC 2: Edit entry carries the traveler through to the editor — a doorway, not a dead end',
    toEditor.clicked === true && /\/diary\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/.test(await url()),
    `-> ${await url()}`);

  // The entry screen lives in BOTH stacks (S4.13: a stack cannot pop onto a screen it does not
  // contain), so back from the profile's copy must land on the profile — not in Trips.
  const wentBackFromEntry = await tapLabel('Go back', 4500);
  check('AC 2: back from the entry returns to the PROFILE, not into the trip stack (S4.13)',
    wentBackFromEntry.clicked === true && (await url()).includes('/profile'),
    await url());

  const diaryStillSelected = (await text()) || '';
  check('AC 2: …with the Diary tab still selected and its section still open',
    diaryStillSelected.includes('Sunset at Las Cabanas'),
    diaryStillSelected.replace(/\n/g, ' | ').slice(0, 140));

  // --- the trip diary screen, reached by tapping the section ROW (the founder's first frame) ---
  const toTripDiary = await evaluate(`
    (() => {
      const row = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((n) => /^Open the diary for /.test(n.getAttribute('aria-label') || ''))
        .filter((n) => n.offsetParent !== null)[0];
      if (!row) return { clicked: false };
      row.click();
      return { clicked: true };
    })()
  `);
  await sleep(5000);
  const tripDiary = (await text()) || '';
  check('AC 2: tapping the section row opens that trip’s diary screen',
    toTripDiary.clicked === true &&
      /\/diary\/[0-9a-f-]{36}$/.test(await url()) &&
      tripDiary.includes(diaryTitle),
    `-> ${await url()}`);

  // Dragging the stream's photos must NOT open the preview: the whole entry used to be one
  // Pressable, so a swipe released over a photo landed as a tap and the postcard flew open
  // mid-scroll (founder, 08/12). The tap target is now the heading and caption only.
  const streamDrag = await evaluate(DRAG_IN_PAGE(0.7));
  await sleep(900);
  const afterStreamDrag = (await text()) || '';
  check('AC 2: dragging the stream-s photos SCROLLS them and does NOT open the preview (founder, 08/12)',
    streamDrag !== null && streamDrag.dragged > streamDrag.before && !afterStreamDrag.includes('Edit entry'),
    JSON.stringify(streamDrag) + ' preview=' + afterStreamDrag.includes('Edit entry'));

  const previewFromStream = await tapLabel('Open your entry for Sunset at Las Cabanas', 4500);
  check('AC 2: an entry in the stream opens the same postcard preview',
    previewFromStream.clicked === true && ((await text()) || '').includes('Edit entry'),
    ((await text()) || '').replace(/\n/g, ' | ').slice(0, 120));

  const closedPreview = await tapLabel('Close this postcard', 3500);
  check('AC 2: closing the preview leaves the traveler on the diary screen',
    closedPreview.clicked === true && ((await text()) || '').includes(diaryTitle),
    await url());

  const backFromTripDiary = await tapLabel('Go back', 4500);
  check('AC 2: back from the trip diary returns to the profile, not into the trip stack (S4.13)',
    backFromTripDiary.clicked === true && (await url()).includes('/profile'),
    await url());

  // --- the Itineraries tab: the showcase, and only the showcase (AC 3) ----------------------
  await goto('/profile');
  const toItineraries = await tapLabel('Itineraries', 3500);
  const showcase = (await text()) || '';
  check('AC 3: the tab switches to Itineraries',
    toItineraries.clicked === true && showcase.includes('PUBLISHED'),
    showcase.replace(/\n/g, ' | ').slice(0, 200));

  await shoot('web-2b-itineraries');

  check('AC 3: it shows the published trips the traveler owns',
    showcase.includes(showcaseTitle) && showcase.includes('El Nido, Palawan · 5 days'),
    showcase.replace(/\n/g, ' | ').slice(0, 220));

  check('AC 3: it shows neither the draft nor the published trip the traveler merely joined',
    !showcase.includes(draftTitle) && !showcase.includes(hostedTitle),
    showcase.replace(/\n/g, ' | ').slice(0, 220));

  check('AC 3/5: the stub star and price pill render in the mock-s format',
    /★|\d\.\d/.test(showcase) && /₱\d{2},\d00 \/ person/.test(showcase),
    showcase.replace(/\n/g, ' | ').slice(0, 220));

  const openedCard = await tapLabel(`Open the published view of ${showcaseTitle}`, 5000);
  check('AC 3: tapping a card opens the published view — what an audience sees',
    openedCard.clicked === true && (await url()).includes(`/showcase/${showcased}`),
    await url());

  // --- back returns to the profile with the tab still selected (tickets 04/05) --------------
  // The card opens the PROFILE stack's own copy of the screen. It used to push /published/[id],
  // which lives in (trips) — a different navigator, so back unwound the trip stack and dumped the
  // traveler wherever that stack happened to be (founder: "sometimes it doesn't go to the
  // previous screen"). S4.13 again: a stack cannot pop onto a screen it does not contain.
  check('AC 3: the showcase card opens the profile stack-s copy, not the trip stack-s (S4.13)',
    (await url()).includes('/showcase/'), await url());

  // Press the screen's own back control, not history.back() — the browser button would unwind the
  // URL whatever the app did, which is a check with no failure mode.
  const backFromShowcase = await tapLabel('Go back', 4000);
  const returned = (await text()) || '';
  check('back returns to the profile with Itineraries still selected (S4.18: web unmounts beneath a push)',
    backFromShowcase.clicked === true && (await url()).includes('/profile') &&
      returned.includes('PUBLISHED') && !returned.includes('Sunset at Las Cabanas'),
    `${await url()} :: ${returned.replace(/\n/g, ' | ').slice(0, 140)}`);

  // --- the cogwheel opens the account page (AC 6) -------------------------------------------
  const openedAccount = await tapLabel('Open your account settings', 4500);
  const account = (await text()) || '';
  check('AC 6: the cogwheel opens the account screen with its card and buttons',
    openedAccount.clicked === true && (await url()).includes('/account') &&
      ['Edit profile', 'Reload', 'Sign out'].every((label) => account.includes(label)),
    `${await url()} :: ${account.replace(/\n/g, ' | ').slice(0, 160)}`);

  check('AC 6: the My Diary section is gone from the account page — the Diary tab is its one home',
    !account.includes('My Diary'), account.replace(/\n/g, ' | ').slice(0, 160));

  const wentBack = await tapLabel('Back to your profile', 4000);
  check('the account page returns to the profile, not to some other stack (S4.13)',
    wentBack.clicked === true && (await url()).includes('/profile') &&
      !(await url()).includes('/account'),
    await url());

  // --- nothing on this surface reaches another traveler (AC 18, decision 1) ------------------
  const hostShowcase = (await api('/v1/me/profile/published', 'GET', host.idToken)).body;
  check('decision 1: the surface is own-view only — the host sees their own showcase, never t1-s',
    hostShowcase.items.every((card) => card.id !== showcased),
    hostShowcase.items.map((c) => c.title).join(', '));

  check('no page errors during the walk', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 200));
  check('no console errors during the walk', consoleErrors.length === 0,
    consoleErrors.join(' | ').slice(0, 200));

  fs.rmSync(fixture, { force: true });
  ws.close();
  chrome.kill();
  console.log(`\n──────── S4.21 web rung: ${pass} passed, ${fail} failed ────────`);
  process.exit(fail === 0 ? 0 : 1);
})();
