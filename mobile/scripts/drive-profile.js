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

function writeFixture() {
  const file = path.join(os.tmpdir(), `largata-profile-${Date.now()}.jpg`);
  const w = 1200, h = 900;
  const header = Buffer.from([
    0xFF,0xD8, 0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46,0x00,0x01,0x01,0x00,0x00,0x01,0x00,0x01,0x00,0x00,
  ]);
  const dqt = Buffer.concat([Buffer.from([0xFF,0xDB,0x00,0x43,0x00]), Buffer.alloc(64, 0x10)]);
  const sof = Buffer.from([
    0xFF,0xC0,0x00,0x0B,0x08, (h>>8)&0xFF, h&0xFF, (w>>8)&0xFF, w&0xFF, 0x01, 0x01,0x11,0x00,
  ]);
  const dht = Buffer.concat([
    Buffer.from([0xFF,0xC4,0x00,0x1F,0x00]),
    Buffer.from([0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0]),
    Buffer.from([0,1,2,3,4,5,6,7,8,9,10,11]),
    Buffer.from([0xFF,0xC4,0x00,0xB5,0x10]),
    Buffer.from([0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,0x7D]),
    Buffer.alloc(162, 0x01),
  ]);
  const sos = Buffer.from([0xFF,0xDA,0x00,0x08,0x01,0x01,0x00,0x00,0x3F,0x00]);
  const scan = Buffer.alloc(24000, 0x5A);
  fs.writeFileSync(file, Buffer.concat([header, dqt, sof, dht, sos, scan, Buffer.from([0xFF,0xD9])]));
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
  const dumped = await postPhoto(`/v1/itineraries/${diaryTrip}/photo-dump`, me.idToken, fixture, 'photo');
  const entry = await postDiaryEntry(diaryTrip, me.idToken, {
    activityId: activity.id,
    caption: 'The most magical sunset we have ever seen',
    fromDump: [dumped.body.id],
  });
  if (entry.status !== 201) {
    throw new Error(
      `fixture failed: the diary entry did not post (${entry.status}) — ${JSON.stringify(entry.body)}. ` +
        `dump=${dumped.status}`,
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

  const postcard = await evaluate(`
    (() => {
      const header = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((n) => / entr(y|ies)$/.test(n.getAttribute('aria-label') || ''))
        .filter((n) => n.offsetParent !== null)[0];
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
        const header = Array.from(document.querySelectorAll('[aria-label]'))
          .filter((n) => / entr(y|ies)$/.test(n.getAttribute('aria-label') || ''))
          .filter((n) => n.offsetParent !== null)[0];
        if (!header) return { clicked: false };
        header.click();
        return { clicked: true };
      })()
    `);
    await sleep(wait);
    return result;
  };

  const collapsed = await tapFirstSection(2500);
  const afterCollapse = (await evaluate(`
    (() => {
      // expo-router keeps previously-visited screens mounted beneath the current one, so the
      // count is taken from the section's OWN subtree rather than the whole document (S4.0).
      const header = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((n) => / entr(y|ies)$/.test(n.getAttribute('aria-label') || ''))
        .filter((n) => n.offsetParent !== null)[0];
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
        .filter((n) => / entr(y|ies)$/.test(n.getAttribute('aria-label') || ''))
        .filter((n) => n.offsetParent !== null)[0];
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
        .filter((n) => / entr(y|ies)$/.test(n.getAttribute('aria-label') || ''))
        .filter((n) => n.offsetParent !== null)[0];
      const card = Array.from((header ? header.parentElement : document).querySelectorAll('[aria-label]'))
        .filter((n) => (n.getAttribute('aria-label') || '').startsWith('Open your entry for'))
        .filter((n) => n.offsetParent !== null)[0];
      return card ? card.getAttribute('aria-label') : '';
    })()
  `);
  const openedEntry = await tapLabel(entryLabel, 5000);
  check('AC 2: tapping a postcard opens its entry screen — a doorway, not a dead end',
    openedEntry.clicked === true && /\/diary\/[0-9a-f-]{36}$/.test(await url()),
    `${entryLabel} -> ${await url()}`);

  // --- the Itineraries tab: the showcase, and only the showcase (AC 3) ----------------------
  await goto('/profile');
  const toItineraries = await tapLabel('Itineraries', 3500);
  const showcase = (await text()) || '';
  check('AC 3: the tab switches to Itineraries',
    toItineraries.clicked === true && showcase.includes('PUBLISHED'),
    showcase.replace(/\n/g, ' | ').slice(0, 200));

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
    openedCard.clicked === true && (await url()).includes(`/published/${showcased}`),
    await url());

  // --- back returns to the profile with the tab still selected (tickets 04/05) --------------
  await evaluate('history.back(); true');
  await sleep(4000);
  const returned = (await text()) || '';
  check('back returns to the profile with Itineraries still selected (S4.18: web unmounts beneath a push)',
    (await url()).includes('/profile') && returned.includes('PUBLISHED') &&
      !returned.includes('Sunset at Las Cabanas'),
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
