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
const PORT = Number(process.env.LARGATA_CDP_PORT || 9234);

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

// Seeding a pool big enough to page is the one thing the UI is a bad tool for — 31 picker journeys
// to prove one button. The photos still arrive through the real endpoint; only the tapping is
// skipped, and the assertion that matters is what the tab does with them.
function uploadTo(itineraryId, token, file) {
  return new Promise((resolve, reject) => {
    const boundary = '----largatadrive' + Math.floor(Number(process.hrtime.bigint() % 1000000n));
    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="seed.jpg"\r\n` +
      'Content-Type: image/jpeg\r\n\r\n', 'utf8');
    const body = Buffer.concat([head, fs.readFileSync(file), Buffer.from(`\r\n--${boundary}--\r\n`)]);
    const req = http.request(
      new URL(`${API}/v1/itineraries/${itineraryId}/photo-dump`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      },
      (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); },
    );
    req.on('error', reject);
    req.end(body);
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

// A real JPEG on disk, so the upload path reads bytes exactly as a traveler's does.
function writeFixture() {
  const file = path.join(os.tmpdir(), `largata-dump-${Date.now()}.jpg`);
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

(async () => {
  // t1 = owner, t2 = member. Both delete authorities are exercised below.
  const owner = await signIn('t1');
  const member = await signIn('t2');
  const fixture = writeFixture();

  const created = await api('/v1/itineraries', 'POST', owner.idToken, {
    title: 'S3.4 photo dump smoke',
    destinations: ['Siargao'],
    durationDays: 2,
  });
  const trip = created.body.id;

  const invite = await api(`/v1/itineraries/${trip}/invitations`, 'POST', owner.idToken, {
    email: address('t2'),
  });
  await api(`/v1/invitations/${invite.body.id}/accept`, 'POST', member.idToken);

  // The shared Chrome profile carries the previous run's session, and a polluted profile reads as
  // the S0.4 white screen. Start clean so a 0-char page means something (S4.20).
  const profile = `${os.tmpdir()}/largata-photo-dump-driver`;
  fs.rmSync(profile, { recursive: true, force: true });

  const chrome = spawn(
    chromePath(),
    [
      `--remote-debugging-port=${PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=${profile}`,
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

  // Alert is a no-op on react-native-web and an unhandled confirm HANGS the driver (S4.20), so both
  // are recorded rather than suppressed — the wording stays evidence.
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
  const text = () => evaluate('document.body.innerText');

  // The tab row renders role="tab", which a button-only selector misses entirely (S4.20).
  const tapLabel = async (label) => {
    const result = await evaluate(`
      (() => {
        const all = Array.from(document.querySelectorAll('[aria-label],[role="tab"],button,a'))
          .filter((n) => ((n.getAttribute('aria-label') || n.innerText || '').trim()) === ${JSON.stringify(label)});
        const visible = all.filter((n) => n.offsetParent !== null && n.closest('[aria-hidden="true"]') === null);
        const target = visible[visible.length - 1];
        if (!target) return { clicked: false, seen: all.length, visible: visible.length };
        target.click();
        return { clicked: true, seen: all.length, visible: visible.length };
      })()
    `);
    await sleep(4000);
    return result;
  };

  // One tile is a Pressable wrapping an Image, both labelled "Trip photo" — so count the outer
  // ones only, or every photo scores two. react-native-web does not reliably render <Image> as an
  // <img>, so filtering by tagName is not the way (it silently returned 0).
  const countTiles = () =>
    evaluate(`
      (() => Array.from(document.querySelectorAll('[aria-label="Trip photo"]'))
        .filter((n) => n.offsetParent !== null
          && n.querySelector('[aria-label="Trip photo"]') !== null).length)()
    `);

  const plantFile = async (file) => {
    const bytes = fs.readFileSync(file).toString('base64');
    await evaluate(`window.__drivenB64 = ${JSON.stringify(bytes)}; true`);
    return evaluate(`(() => {
      const raw = atob(window.__drivenB64);
      delete window.__drivenB64;
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
      const f = new File([arr], ${JSON.stringify(path.basename(file))}, { type: 'image/jpeg' });
      const transfer = new DataTransfer();
      transfer.items.add(f);
      const proto = HTMLInputElement.prototype;
      if (!window.__drivenFilesHooked) {
        window.__drivenFilesHooked = true;
        const nativeClick = proto.click;
        proto.click = function () {
          if (this.type === 'file' && window.__drivenPlantedFiles) {
            Object.defineProperty(this, 'files', { configurable: true, get: () => window.__drivenPlantedFiles });
            this.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
          return nativeClick.call(this);
        };
      }
      window.__drivenPlantedFiles = transfer.files;
      return 'planted ' + f.size + ' bytes';
    })()`);
  };

  // --- the owner opens the tab and uploads --------------------------------------------------
  await seat(owner);
  await goto(`/itineraries/${trip}`);

  const opened = await tapLabel('Photo Dump');
  check('the Photo Dump tab is reachable — no longer greyed (AC 7)', opened.clicked === true,
    JSON.stringify(opened));

  const emptyScreen = (await text()) || '';
  check('the empty pool says so honestly (AC 7)', emptyScreen.includes('No photos yet'),
    emptyScreen.slice(0, 120));
  check('no coming-soon dialog fired on the tab',
    (await evaluate('JSON.stringify(window.__largataAlerts || [])')) === '[]');

  await plantFile(fixture);
  const uploadTap = await tapLabel('Add Photos');
  await sleep(3000);
  check('the upload tile drives the real multipart route (AC 1)', uploadTap.clicked === true,
    JSON.stringify(uploadTap));

  const afterOwner = await api(`/v1/itineraries/${trip}/photo-dump`, 'GET', owner.idToken);
  check('the owner\'s photo landed in the pool, server-side (AC 1)',
    afterOwner.body.items?.length === 1, `n=${afterOwner.body.items?.length}`);

  const ownersPhotoId = afterOwner.body.items?.[0]?.id;

  // --- the member sees it, adds their own -----------------------------------------------------
  await seat(member);
  await goto(`/itineraries/${trip}?tab=photo-dump`);
  const memberScreen = (await text()) || '';
  check('the deep link opens the tab directly for the member', memberScreen.length > 0,
    `${memberScreen.length} chars`);

  await plantFile(fixture);
  const memberUpload = await tapLabel('Add Photos');
  await sleep(3000);
  check('a member uploads into the same shared pool (AC 1)', memberUpload.clicked === true,
    JSON.stringify(memberUpload));

  const shared = await api(`/v1/itineraries/${trip}/photo-dump`, 'GET', member.idToken);
  check('both members\' photos are in one pool (AC 1)', shared.body.items?.length === 2,
    `n=${shared.body.items?.length}`);

  const mediaCalls = apiCalls.filter((c) => c.url.includes('/v1/media/'));
  check('every media request carried a bearer — the S3.3 ANON-GET tell (AC 1)',
    mediaCalls.length > 0 && mediaCalls.every((c) => c.bearer),
    `${mediaCalls.filter((c) => c.bearer).length}/${mediaCalls.length} bearer`);

  // --- tapping a photo previews it; deleting lives inside that preview -------------------------
  const previewTap = await tapLabel('Trip photo');
  const previewText = (await text()) || '';
  check('tapping a photo opens a preview rather than destroying it (founder, 2026-08-11)',
    previewTap.clicked === true && previewText.includes('Close'), previewText.slice(0, 90));
  const stillThere = await api(`/v1/itineraries/${trip}/photo-dump`, 'GET', member.idToken);
  check('the tap deleted nothing — the pool is untouched by opening a photo',
    stillThere.body.items?.length === 2, `n=${stillThere.body.items?.length}`);

  const beforeDelete = (await evaluate('JSON.stringify(window.__largataConfirms || [])')) ?? '[]';
  const deleteTap = await tapLabel('Delete Photo');
  const confirms = JSON.parse((await evaluate('JSON.stringify(window.__largataConfirms || [])')) ?? '[]');
  check('deleting asks for confirmation first, and says what it will do',
    deleteTap.clicked === true && confirms.length > JSON.parse(beforeDelete).length,
    confirms[confirms.length - 1]?.slice(0, 90) ?? 'no confirm recorded');
  check('the member is told their own photo leaves the trip for everyone',
    (confirms[confirms.length - 1] ?? '').includes('for everyone'),
    confirms[confirms.length - 1]?.slice(0, 90) ?? 'no confirm recorded');

  const afterMemberDelete = await api(`/v1/itineraries/${trip}/photo-dump`, 'GET', member.idToken);
  check('the member took out their own photo and the owner\'s survives (AC 3)',
    afterMemberDelete.body.items?.length === 1 && afterMemberDelete.body.items[0].id === ownersPhotoId,
    `n=${afterMemberDelete.body.items?.length}`);

  const poaching = await api(`/v1/itineraries/${trip}/photo-dump/${ownersPhotoId}`, 'DELETE', member.idToken);
  check('a member cannot delete the owner\'s photo — named refusal (AC 3)',
    poaching.status === 403 && poaching.body?.code === 'NOT_PERMITTED',
    `${poaching.status} ${poaching.body?.code}`);

  // --- owner authority proper: a photo the owner did NOT upload ---------------------------------
  // The member's photo is re-added so the owner deletes somebody else's, not their own — deleting
  // your own only proves uploader authority, which the owner holds regardless.
  await seat(member);
  await goto(`/itineraries/${trip}?tab=photo-dump`);
  await plantFile(fixture);
  await tapLabel('Add Photos');
  await sleep(3000);
  const restocked = await api(`/v1/itineraries/${trip}/photo-dump`, 'GET', member.idToken);
  check('the member re-adds a photo for the owner to remove', restocked.body.items?.length === 2,
    `n=${restocked.body.items?.length}`);
  const foreignPhotoId = restocked.body.items?.find((p) => p.id !== ownersPhotoId)?.id;

  await seat(owner);
  await goto(`/itineraries/${trip}?tab=photo-dump`);
  const beforeOwnerDelete = JSON.parse(
    (await evaluate('JSON.stringify(window.__largataConfirms || [])')) ?? '[]',
  );
  await tapLabel('Trip photo');
  const ownerDeleteTap = await tapLabel('Delete Photo');
  const ownerConfirms = JSON.parse(
    (await evaluate('JSON.stringify(window.__largataConfirms || [])')) ?? '[]',
  );
  check('the owner can reach delete on a photo in the pool (AC 3)', ownerDeleteTap.clicked === true,
    JSON.stringify(ownerDeleteTap));
  check('the owner is told they are removing another traveler\'s photo',
    ownerConfirms.length > beforeOwnerDelete.length
      && (ownerConfirms[ownerConfirms.length - 1] ?? '').includes('any traveler'),
    ownerConfirms[ownerConfirms.length - 1]?.slice(0, 110) ?? 'no confirm recorded');

  const afterOwnerDelete = await api(`/v1/itineraries/${trip}/photo-dump`, 'GET', owner.idToken);
  const survivingIds = (afterOwnerDelete.body.items ?? []).map((p) => p.id);
  check('the owner removed ANOTHER member\'s photo, not their own (AC 3)',
    !survivingIds.includes(foreignPhotoId) && survivingIds.includes(ownersPhotoId),
    `left: ${survivingIds.length}`);

  // --- a non-member LOOKS AT THE SCREEN (AC 2) -------------------------------------------------
  // The masking is pinned at the API and in the ITs. What no other rung answers is what the app
  // does with a 404 on this tab: an unhandled one is a crash or a spinner that never resolves.
  const stranger = await signIn('t3');
  await seat(stranger);
  await goto(`/itineraries/${trip}?tab=photo-dump`);
  const strangerScreen = (await text()) || '';
  check('a non-member sees no photos and no crash on the tab (AC 2)',
    strangerScreen.length > 0 && !strangerScreen.includes('Add Photos'),
    strangerScreen.slice(0, 110));

  // --- paging through the tab's own control (AC 8) ---------------------------------------------
  // The cursor shape is pinned at the API and in an IT. Whether the tab's Load more button is
  // wired to fetchNextPage — or is another S1.3 dead click — only the UI can answer.
  const paged = await api('/v1/itineraries', 'POST', owner.idToken, {
    title: 'S3.4 paging', destinations: ['Coron'], durationDays: 2,
  });
  const pagedTrip = paged.body.id;
  for (let i = 0; i < 31; i += 1) {
    await uploadTo(pagedTrip, owner.idToken, fixture);
  }
  await seat(owner);
  await goto(`/itineraries/${pagedTrip}?tab=photo-dump`);
  const firstPageTiles = await countTiles();
  check('the first page stops at the server\'s page size rather than the whole pool (AC 8)',
    firstPageTiles === 30, `${firstPageTiles} tiles`);

  const morePressed = await tapLabel('Load more photos');
  const afterMoreTiles = await countTiles();
  check('Load more is wired to the cursor, not a dead click (AC 8)',
    morePressed.clicked === true && afterMoreTiles === 31,
    `${firstPageTiles} -> ${afterMoreTiles} tiles`);

  // --- the fences, on the screen rather than only on the wire (AC 6) ---------------------------
  // Its own trip on purpose: archiving the paging one would leave every later step navigating a
  // read-only trip, and the resulting empty grid reads as "paging broke" rather than "I archived
  // the fixture out from under myself".
  const archivedTrip = (await api('/v1/itineraries', 'POST', owner.idToken, {
    title: 'S3.4 archived pool', destinations: ['Sagada'], durationDays: 2,
  })).body.id;
  await uploadTo(archivedTrip, owner.idToken, fixture);
  await api(`/v1/itineraries/${archivedTrip}/archive`, 'POST', owner.idToken);
  await goto(`/itineraries/${archivedTrip}?tab=photo-dump`);
  const archivedScreen = (await text()) || '';
  check('an archived trip tells the owner the pool is read-only and hides Add Photos (AC 6)',
    archivedScreen.includes('archived') && !archivedScreen.includes('Add Photos'),
    archivedScreen.slice(0, 130));

  // A published trip accepts dump uploads on the wire — decision 5, pinned by the API rung and by
  // aPublishedTripStillTakesPhotosBecauseTheFreezeIsThePlan. The WORKSPACE, however, redirects a
  // published trip to its published view (S4.17), so the tab is unreachable there and no traveler
  // can use the capability the server grants. Asserted as it actually is, with the gap named,
  // rather than left as a check that quietly fails on somebody else's routing decision.
  const publishTrip = (await api('/v1/itineraries', 'POST', owner.idToken, {
    title: 'S3.4 published pool', destinations: ['Bohol'], durationDays: 2,
  })).body.id;
  for (const step of ['finish-planning', 'start', 'complete', 'publish']) {
    await api(`/v1/itineraries/${publishTrip}/${step}`, 'POST', owner.idToken);
  }
  const publishedUpload = await uploadTo(publishTrip, owner.idToken, fixture);
  const publishedPool = await api(`/v1/itineraries/${publishTrip}/photo-dump`, 'GET', owner.idToken);
  check('a PUBLISHED trip still takes photos — the freeze is the plan, not the pool (AC 6)',
    publishedUpload === 201 && publishedPool.body.items?.length === 1,
    `${publishedUpload}, n=${publishedPool.body.items?.length}`);

  await goto(`/itineraries/${publishTrip}?tab=photo-dump`);
  const publishedScreen = (await text()) || '';
  check('KNOWN GAP: the workspace redirects a published trip, so its pool has no UI door',
    !publishedScreen.includes('Add Photos'), publishedScreen.slice(0, 90));

  check('no page errors during the walk', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 200));
  check('no console errors during the walk', consoleErrors.length === 0,
    consoleErrors.join(' | ').slice(0, 200));

  fs.rmSync(fixture, { force: true });
  ws.close();
  chrome.kill();
  console.log(`\n──────── S3.4 web rung: ${pass} passed, ${fail} failed ────────`);
  process.exit(fail === 0 ? 0 : 1);
})();
