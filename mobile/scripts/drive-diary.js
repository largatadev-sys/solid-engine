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
const PORT = Number(process.env.LARGATA_CDP_PORT || 9236);

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

function uploadToDump(itineraryId, token, file) {
  return new Promise((resolve, reject) => {
    const boundary = '----largatadiary' + Math.floor(Number(process.hrtime.bigint() % 1000000n));
    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="pool.jpg"\r\n` +
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

function writeFixture() {
  const file = path.join(os.tmpdir(), `largata-diary-${Date.now()}.jpg`);
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
  // t1 = the diary's author, t2 = a co-traveler on the same trip who must see none of it.
  const author = await signIn('t1');
  const coTraveler = await signIn('t2');
  const fixture = writeFixture();

  const created = await api('/v1/itineraries', 'POST', author.idToken, {
    title: 'S3.1 diary smoke',
    destinations: ['El Nido'],
    durationDays: 2,
  });
  const trip = created.body.id;

  const invite = await api(`/v1/itineraries/${trip}/invitations`, 'POST', author.idToken, {
    email: address('t2'),
  });
  await api(`/v1/invitations/${invite.body.id}/accept`, 'POST', coTraveler.idToken);

  const plan = (await api(`/v1/itineraries/${trip}`, 'GET', author.idToken)).body;
  const day1 = plan.days[0];
  await api(`/v1/itineraries/${trip}/days/${day1.id}/activities`, 'POST', author.idToken,
    { title: 'Sunset at Las Cabanas', timeOfDay: '17:30' });

  const profile = `${os.tmpdir()}/largata-diary-driver`;
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

  // `copies` plants the same bytes under distinct names, so a multi-select picker returns more
  // than one file — the single-file plant would silently prove nothing about `input.multiple`.
  const plantFile = async (file, copies = 1) => {
    const bytes = fs.readFileSync(file).toString('base64');
    await evaluate(`window.__drivenB64 = ${JSON.stringify(bytes)}; true`);
    return evaluate(`(() => {
      const raw = atob(window.__drivenB64);
      delete window.__drivenB64;
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
      const transfer = new DataTransfer();
      for (let n = 0; n < ${copies}; n += 1) {
        transfer.items.add(new File([arr], n + '-' + ${JSON.stringify(path.basename(file))}, { type: 'image/jpeg' }));
      }
      const proto = HTMLInputElement.prototype;
      if (!window.__drivenFilesHooked) {
        window.__drivenFilesHooked = true;
        const nativeClick = proto.click;
        proto.click = function () {
          if (this.type === 'file' && window.__drivenPlantedFiles) {
            // Single-use: a plant left armed re-fires on the NEXT input.click() too, which reads
            // as the app picking twice. Consume it here so each plant answers exactly one open.
            const planted = window.__drivenPlantedFiles;
            window.__drivenPlantedFiles = null;
            Object.defineProperty(this, 'files', { configurable: true, get: () => planted });
            this.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
          return nativeClick.call(this);
        };
      }
      window.__drivenPlantedFiles = transfer.files;
      return 'planted ' + transfer.files.length + ' file(s)';
    })()`);
  };

  // --- the links do not exist before the trip starts (AC 2, client half) ---------------------
  await seat(author);
  await goto(`/itineraries/${trip}`);
  const draftScreen = (await text()) || '';
  check('a DRAFT trip draws no capture links at all (AC 2)',
    !draftScreen.includes('Add to Diary'), draftScreen.slice(0, 90));

  await api(`/v1/itineraries/${trip}/finish-planning`, 'POST', author.idToken);
  await api(`/v1/itineraries/${trip}/start`, 'POST', author.idToken);
  await uploadToDump(trip, coTraveler.idToken, fixture);

  // --- the capture flow, entered through the affordance and never a direct route (S4.18) -----
  await goto(`/itineraries/${trip}`);
  const ongoingScreen = (await text()) || '';
  check('an ONGOING trip draws the link on the activity row (AC 1)',
    ongoingScreen.includes('Add to Diary'), ongoingScreen.slice(0, 120));

  const openedComposer = await tapLabel('Add to Diary: Sunset at Las Cabanas');
  check('the link opens the composer', openedComposer.clicked === true, JSON.stringify(openedComposer));

  const composerScreen = (await text()) || '';
  // The mock's eyebrow is text-transform: uppercase — the walk pins the case, since the token
  // shipped without it first and the screen looked plausible either way.
  check('the composer draws the mock: eyebrow, title, both photo sections, the caption (frame 3)',
    composerScreen.includes('DAY 1 • 5:30 PM') &&
    composerScreen.includes('Sunset at Las Cabanas') &&
    composerScreen.includes('Photos in this memory') &&
    composerScreen.includes('Add from camera roll') &&
    composerScreen.includes('Pick from Photo Dump') &&
    composerScreen.includes('Add a caption'),
    composerScreen.replace(/\n/g, ' | ').slice(0, 200));

  check('AC 11: the info note reads exactly as the founder approved it',
    composerScreen.includes('Only you can see your diary. It shows up on your profile.'));

  // The dump tiles live inside the picker modal now, so the bearer check moves to the modal
  // below — it is asserted once for the whole walk at the end regardless.
  const anonBefore = apiCalls.filter((c) => c.url.includes('/v1/media/') && !c.bearer);
  check('no anonymous media GET so far — a raw <Image> URL would show up here (S3.3)',
    anonBefore.length === 0, `${anonBefore.length} anon media GETs`);

  // Both Add More tiles open a modal now. The camera roll's relays straight to the device
  // picker on mount, so planting the file first is what makes that relay land a real photo.
  await plantFile(fixture, 2);
  // No modal on this one — Add from phone goes straight to the device picker.
  const openedDevicePicker = await tapLabel('Add a photo from your camera roll', 4000);
  // A tile labels BOTH its Pressable and the Image inside it, so a naive count doubles every
  // photo (the S3.4 countTiles trap) — keep only the outer node of each pair.
  const devicePhotoLanded = await evaluate(`
    (() => Array.from(document.querySelectorAll('[aria-label]'))
      .filter((n) => (n.getAttribute('aria-label') || '').startsWith('Selected photo'))
      .filter((n) => n.offsetParent !== null)
      .filter((n) => n.querySelector('[aria-label^="Selected photo"]') !== null).length)()
  `);
  check('the camera-roll picker takes MULTIPLE photos in one trip to the device',
    openedDevicePicker.clicked === true && devicePhotoLanded === 2,
    `${devicePhotoLanded} device photo(s) on the composer`);

  const openedDumpPicker = await tapLabel('Add a photo from the Photo Dump', 2500);
  const dumpSheet = (await text()) || '';
  check('the Photo Dump tile opens its own picker modal',
    openedDumpPicker.clicked === true && dumpSheet.includes('From the Photo Dump'),
    dumpSheet.replace(/\n/g, ' | ').slice(0, 120));

  const pickedDump = await tapLabel('Photo Dump photo', 1500);
  check('a dump photo can be selected inside the modal', pickedDump.clicked === true,
    JSON.stringify(pickedDump));

  const confirmed = await tapLabel('Add 1 photo', 2500);
  check('the confirm button counts the selection and commits it',
    confirmed.clicked === true, JSON.stringify(confirmed));

  await evaluate(`
    (() => {
      const field = Array.from(document.querySelectorAll('textarea,input'))
        .filter((n) => (n.getAttribute('aria-label') || '') === 'Add a caption')[0];
      if (!field) return 'no caption field';
      const setter = Object.getOwnPropertyDescriptor(
        field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value').set;
      setter.call(field, 'Golden hour, no filter');
      field.dispatchEvent(new Event('input', { bubbles: true }));
      return 'typed';
    })()
  `);

  const submitted = await tapLabel('Add to Diary', 6000);
  check('the CTA submits the one-act create', submitted.clicked === true, JSON.stringify(submitted));

  const successScreen = (await text()) || '';
  check('AC 1: the success screen is frame 4, naming the activity',
    successScreen.includes('Activity Added!') &&
    successScreen.includes('Sunset at Las Cabanas is now part of your Diary.'),
    successScreen.replace(/\n/g, ' | ').slice(0, 160));

  const entries = await api(`/v1/itineraries/${trip}/diary/entries`, 'GET', author.idToken);
  const entry = entries.body.items[0];
  check('the postcard landed with both sources and the caption (2 device + 1 dump)',
    entries.body.items.length === 1 && entry.photos.length === 3 &&
    entry.caption === 'Golden hour, no filter',
    `${entry?.photos?.length} photos, caption=${JSON.stringify(entry?.caption)}`);

  await tapLabel('Back to Day-by-Day', 5000);
  const afterPost = (await text()) || '';
  check('AC 1: the row now reads Added ✓',
    afterPost.includes('Added ✓') && !afterPost.includes('Add to Diary'),
    afterPost.replace(/\n/g, ' | ').slice(0, 140));

  // --- the edit door, and delete reverting the link (AC 10, client half) ---------------------
  const openedEntry = await tapLabel('Added ✓: Sunset at Las Cabanas');
  const entryScreen = (await text()) || '';
  // The caption lives in a textarea's VALUE, which innerText never reports — read the field.
  const shownCaption = await evaluate(`
    (() => {
      const field = Array.from(document.querySelectorAll('textarea,input'))
        .filter((n) => (n.getAttribute('aria-label') || '') === 'Add a caption')
        .filter((n) => n.offsetParent !== null).pop();
      return field ? field.value : '(no caption field)';
    })()
  `);
  check('Added ✓ opens the existing entry, caption and snapshot intact',
    openedEntry.clicked === true && entryScreen.includes('Your Diary Entry') &&
    entryScreen.includes('Sunset at Las Cabanas') && shownCaption === 'Golden hour, no filter',
    `caption=${JSON.stringify(shownCaption)}`);

  // The founder's bug: after one successful save the screen kept comparing against the caption
  // it loaded WITH, so every later edit looked unchanged and the save silently did nothing.
  // Two saves in a row is the only shape that catches it — the first always worked.
  const typeCaption = async (text) => evaluate(`
    (() => {
      const field = Array.from(document.querySelectorAll('textarea,input'))
        .filter((n) => (n.getAttribute('aria-label') || '') === 'Add a caption')
        .filter((n) => n.offsetParent !== null).pop();
      if (!field) return 'no caption field';
      const setter = Object.getOwnPropertyDescriptor(
        field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value').set;
      setter.call(field, ${JSON.stringify(text)});
      field.dispatchEvent(new Event('input', { bubbles: true }));
      return 'typed';
    })()
  `);

  // Nothing reaches the server until Save. Stage a photo AND a caption, confirm the entry on the
  // wire is untouched, then save and confirm both landed together.
  const photosBeforeStaging = (await api(`/v1/itineraries/${trip}/diary/entries`, 'GET', author.idToken))
    .body.items[0]?.photos?.length;
  await plantFile(fixture, 1);
  await tapLabel('Add a photo from your camera roll', 3500);
  await typeCaption('First edit');

  const midStage = (await api(`/v1/itineraries/${trip}/diary/entries`, 'GET', author.idToken)).body.items[0];
  check('a staged photo and caption reach the server ONLY on Save, never on pick',
    midStage?.photos?.length === photosBeforeStaging && midStage?.caption !== 'First edit',
    `photos=${midStage?.photos?.length} (was ${photosBeforeStaging}), caption=${JSON.stringify(midStage?.caption)}`);

  await tapLabel('Save to Diary', 5000);
  const afterSave = (await api(`/v1/itineraries/${trip}/diary/entries`, 'GET', author.idToken)).body.items[0];
  check('Save commits the photo and the caption in one act',
    afterSave?.photos?.length === photosBeforeStaging + 1 && afterSave?.caption === 'First edit',
    `photos=${afterSave?.photos?.length}, caption=${JSON.stringify(afterSave?.caption)}`);

  // A save lands on the same confirmation the create does, worded for an edit rather than a first
  // post — so the traveler is told it worked instead of being dropped back on the form.
  const savedScreen = (await text()) || '';
  check('saving confirms on the success screen, worded as an edit',
    savedScreen.includes('Changes Saved!') &&
    savedScreen.includes('is up to date') &&
    !savedScreen.includes('Activity Added!'),
    savedScreen.replace(/\n/g, ' | ').slice(0, 140));

  await tapLabel('Back to Day-by-Day', 5000);
  await tapLabel('Added ✓: Sunset at Las Cabanas', 4000);

  // A FULL entry that swaps a photo — remove one, add one — still holds five, so the cap must not
  // refuse it. Adding before removing asks for a sixth and the server says no; that shipped once.
  await plantFile(fixture, 1);
  await tapLabel('Add a photo from your camera roll', 3500);
  await tapLabel('Save to Diary', 5000);
  await tapLabel('Back to Day-by-Day', 5000);
  await tapLabel('Added ✓: Sunset at Las Cabanas', 4000);

  const atCap = (await api(`/v1/itineraries/${trip}/diary/entries`, 'GET', author.idToken)).body.items[0];
  check('the entry is full, so the next save is a genuine swap at the cap',
    atCap?.photos?.length === 5, `photos=${atCap?.photos?.length}`);

  await tapLabel('Remove Diary photo 1', 2000);
  await plantFile(fixture, 1);
  await tapLabel('Add a photo from your camera roll', 3500);
  await tapLabel('Save to Diary', 6000);

  const swapped = (await api(`/v1/itineraries/${trip}/diary/entries`, 'GET', author.idToken)).body.items[0];
  const swapFailure = (await evaluate('JSON.stringify(window.__largataAlerts || [])')) ?? '[]';
  check('swapping a photo on a FULL entry is not a sixth photo (founder, 08/11)',
    swapped?.photos?.length === 5 &&
    !swapped.photos.some((p) => p.id === atCap.photos[0].id) &&
    !swapFailure.includes('TOO_MANY'),
    `photos=${swapped?.photos?.length}, alerts=${swapFailure.slice(0, 80)}`);

  await tapLabel('Back to Day-by-Day', 5000);
  await tapLabel('Added ✓: Sunset at Las Cabanas', 4000);
  await typeCaption('Second edit');
  await tapLabel('Save to Diary', 4000);

  const resaved = await api(`/v1/itineraries/${trip}/diary/entries`, 'GET', author.idToken);
  check('an entry can be edited AGAIN after a save — not just the first time',
    resaved.body.items[0]?.caption === 'Second edit',
    `caption=${JSON.stringify(resaved.body.items[0]?.caption)}`);

  // Back through the affordance again — the second save also lands on the confirmation.
  await tapLabel('Back to Day-by-Day', 5000);
  await tapLabel('Added ✓: Sunset at Las Cabanas', 4000);
  await tapLabel('Delete entry', 5000);
  const confirms = await evaluate('JSON.stringify(window.__largataConfirms || [])');
  check('deleting asks first, in words (the confirm is evidence, not an invisible yes)',
    confirms.includes('diary entry'), confirms.slice(0, 120));

  const afterDelete = (await text()) || '';
  check('AC 10: deleting reverts the row to Add to Diary',
    afterDelete.includes('Add to Diary') && !afterDelete.includes('Added ✓'),
    afterDelete.replace(/\n/g, ' | ').slice(0, 140));

  // --- My Diary on the profile (AC 9), and the co-traveler seeing none of it (AC 6) ----------
  await api(`/v1/itineraries/${trip}/diary/entries`, 'GET', author.idToken);
  const reposted = await tapLabel('Add to Diary: Sunset at Las Cabanas');
  check('the composer reopens after a delete', reposted.clicked === true);
  await plantFile(fixture);
  await tapLabel('Add a photo from your camera roll', 3000);
  await evaluate(`
    (() => {
      const field = Array.from(document.querySelectorAll('textarea,input'))
        .filter((n) => (n.getAttribute('aria-label') || '') === 'Add a caption')
        .filter((n) => n.offsetParent !== null).pop();
      if (!field) return 'no caption field';
      const setter = Object.getOwnPropertyDescriptor(
        field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value').set;
      setter.call(field, 'Second time around');
      field.dispatchEvent(new Event('input', { bubbles: true }));
      return 'typed';
    })()
  `);
  await tapLabel('Add to Diary', 6000);

  await goto('/profile');
  const profileScreen = (await text()) || '';
  // S4.21 moved this surface: the My Diary LIST became the profile's Diary TAB, so the diary is
  // still grouped by trip with a count on the profile — it is now sections rather than rows, and
  // the heading it used to carry went with the wordmark.
  check('AC 9: the diary shows on the profile, grouped by trip with a count',
    profileScreen.includes('S3.1 diary smoke') && profileScreen.includes('1 entry'),
    profileScreen.replace(/\n/g, ' | ').slice(0, 200));

  // expo-router keeps the profile MOUNTED beneath the pushed stream, so body.innerText carries
  // both screens (S4.0). Read the postcard's own control instead of the whole page.
  // The per-trip stream is its own screen still, reached here directly because the profile's
  // Diary tab now renders the postcards inline rather than linking out to it (S4.21).
  await goto(`/itineraries/${trip}/diary`);
  const postcard = await evaluate(`
    (() => {
      const card = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((n) => (n.getAttribute('aria-label') || '')
          .startsWith('Open your entry for'))
        .filter((n) => n.offsetParent !== null).pop();
      return card ? card.innerText.replace(/\\n/g, ' | ') : '(no postcard)';
    })()
  `);
  check('AC 9: the per-trip stream renders the postcard with its snapshot header',
    postcard.includes('Sunset at Las Cabanas') &&
    postcard.includes('DAY 1 • 5:30 PM') && postcard.includes('Second time around'),
    postcard.slice(0, 160));

  // The discriminating half: the same trip, the other traveler, nothing of the author's anywhere.
  await seat(coTraveler);
  await goto('/profile');
  const coProfile = (await text()) || '';
  check('AC 6: the co-traveler\'s own profile shows no diary of the author\'s',
    !coProfile.includes('S3.1 diary smoke'), coProfile.replace(/\n/g, ' | ').slice(0, 160));

  await goto(`/itineraries/${trip}`);
  const coViewer = (await text()) || '';
  check('AC 6: on the SAME trip the co-traveler sees their own state — Add to Diary, never Added ✓',
    coViewer.includes('Add to Diary') && !coViewer.includes('Added ✓'),
    coViewer.replace(/\n/g, ' | ').slice(0, 140));

  const coTravelerMedia = await new Promise((resolve) => {
    http.get(new URL(API + entry.photos[0].url),
      { headers: { Authorization: `Bearer ${coTraveler.idToken}` } },
      (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
  });
  check('AC 6: the co-traveler\'s media GET for a diary photo 404s',
    coTravelerMedia === 404, String(coTravelerMedia));

  const anonMedia = apiCalls.filter((c) => c.url.includes('/v1/media/') && !c.bearer);
  check('every media GET in the whole walk carried a bearer (S3.3)',
    anonMedia.length === 0, `${anonMedia.length} anonymous`);

  check('no page errors during the walk', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 200));
  check('no console errors during the walk', consoleErrors.length === 0,
    consoleErrors.join(' | ').slice(0, 200));

  fs.rmSync(fixture, { force: true });
  ws.close();
  chrome.kill();
  console.log(`\n──────── S3.1 web rung: ${pass} passed, ${fail} failed ────────`);
  process.exit(fail === 0 ? 0 : 1);
})();
