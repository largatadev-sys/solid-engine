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
const PORT = Number(process.env.LARGATA_CDP_PORT || 9247);

// t1 publishes, t2 browses. They share no trip: discovery is the strangers' surface, so a walk
// where the viewer is a member proves nothing about the audience the feed is built for.
const PUBLISHER = 't1';
const BROWSER = 't2';

let passed = 0;
let failed = 0;

function check(what, ok, detail) {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${what}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${what}${detail === undefined ? '' : `\n        ${detail}`}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function address(tag) {
  const [user, domain] = BASE.split('@');
  return `${user}+${tag}@${domain}`;
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const data = JSON.stringify(body);
    const req = lib.request(
      new URL(url),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
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
  if (found === undefined) {
    throw new Error(`Chrome not found. Tried:\n  ${CHROME_CANDIDATES.join('\n  ')}`);
  }
  return found;
}

function getJson(reqPath) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: PORT, path: reqPath }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve(JSON.parse(body)));
      })
      .on('error', reject);
  });
}

async function publishedTrip(token, title, destination, days) {
  const created = await api('/v1/itineraries', 'POST', token, {
    title,
    destinations: [destination],
    durationDays: days,
  });
  const id = created.body.id;
  await api(`/v1/itineraries/${id}/finish-planning`, 'POST', token);
  await api(`/v1/itineraries/${id}/start`, 'POST', token);
  await api(`/v1/itineraries/${id}/complete`, 'POST', token);
  await api(`/v1/itineraries/${id}/publish`, 'POST', token, { audience: 'public' });
  return id;
}

(async () => {
  for (const [name, value] of [
    ['EXPO_PUBLIC_FIREBASE_API_KEY', KEY],
    ['LARGATA_TEST_POOL_EMAIL_BASE', BASE],
    ['LARGATA_TEST_POOL_PASSWORD', PASSWORD],
  ]) {
    if (!value) throw new Error(`${name} is unset — source mobile/.env first`);
  }

  const publisher = await signIn(PUBLISHER);
  const browser = await signIn(BROWSER);
  const stamp = Date.now().toString().slice(-6);

  console.log(`\nS4.3 discovery — ${PUBLISHER} = publisher, ${BROWSER} = browser (no shared trip)\n`);

  // --- fixture: three public trips, one private, one archived ------------------------------
  const kyoto = await publishedTrip(publisher.idToken, `Kyoto temples ${stamp}`, `Kyoto ${stamp}`, 5);
  const osaka = await publishedTrip(publisher.idToken, `Osaka food ${stamp}`, `Kyoto ${stamp}`, 3);
  const lima = await publishedTrip(publisher.idToken, `Lima ceviche ${stamp}`, `Lima ${stamp}`, 12);

  const privateTrip = await publishedTrip(
    publisher.idToken, `Hidden trip ${stamp}`, `Secretplace ${stamp}`, 4);
  await api(`/v1/itineraries/${privateTrip}/audience`, 'POST', publisher.idToken, {
    audience: 'private',
  });

  const archivedTrip = await publishedTrip(
    publisher.idToken, `Archived trip ${stamp}`, `Archivetown ${stamp}`, 4);
  await api(`/v1/itineraries/${archivedTrip}/archive`, 'POST', publisher.idToken);

  // --- the API contract, before any pixels --------------------------------------------------
  const browsed = await api('/v1/discovery/itineraries?limit=50', 'GET', browser.idToken);
  const ids = (browsed.body.items || []).map((card) => card.id);

  check('AC: a published public trip reaches a stranger who shares no trip with its author',
    browsed.status === 200 && ids.includes(kyoto), `status=${browsed.status}`);
  check('AC: a published-but-private trip is absent from the strangers surface',
    !ids.includes(privateTrip));
  check('AC: an archived trip is absent however it was published',
    !ids.includes(archivedTrip));

  const counted = await api(
    `/v1/discovery/count?destination=${encodeURIComponent(`Kyoto ${stamp}`)}`,
    'GET', browser.idToken);
  const listed = await api(
    `/v1/discovery/itineraries?destination=${encodeURIComponent(`Kyoto ${stamp}`)}&limit=50`,
    'GET', browser.idToken);

  check('AC: the sheet-s count agrees with the list it promises, under identical filters',
    counted.body.count === (listed.body.items || []).length,
    `count=${counted.body.count} list=${(listed.body.items || []).length}`);
  check('AC: the destination filter narrows to that destination-s trips',
    counted.body.count === 2, `count=${counted.body.count}`);

  const trending = await api('/v1/discovery/trending', 'GET', browser.idToken);
  // An error body is an object, not an array, and .find on it throws — which kills the whole walk
  // and hides every assertion after it behind a driver crash (the "failed vs never ran" trap).
  const trendingRows = Array.isArray(trending.body) ? trending.body : [];
  check('AC: the trending endpoint answers with a list',
    trending.status === 200 && Array.isArray(trending.body),
    `status=${trending.status} body=${JSON.stringify(trending.body).slice(0, 200)}`);
  const kyotoRow = trendingRows.find((row) => row.destination === `Kyoto ${stamp}`);
  check('AC: trending ranks the destination by how many trips were published there',
    kyotoRow !== undefined && kyotoRow.tripCount === 2,
    `row=${JSON.stringify(kyotoRow)}`);
  check('AC: trending never leaks a private or archived destination',
    !trendingRows.some((row) => /Secretplace|Archivetown/.test(row.destination)));

  // "Kyoto" alone, not "Kyoto <stamp>": the stamped form appears in the DESTINATION but never in a
  // title, so asking for both groups with it would demand a match the fixture cannot produce.
  const suggested = await api('/v1/discovery/suggestions?q=Kyoto', 'GET', browser.idToken);
  // Each group caps at 3 by spec, so on a database carrying earlier fixtures this run's own
  // destination can be crowded out — asserting our stamp in BOTH groups demands more than the
  // contract promises. Assert the shape, the cap, and that every row genuinely matches.
  const suggestedDestinations = suggested.body.destinations || [];
  const suggestedTitles = suggested.body.itineraries || [];
  check('AC: suggestions group destinations and itineraries for a partial query',
    suggestedDestinations.length > 0 && suggestedTitles.length > 0 &&
      suggestedDestinations.length <= 3 && suggestedTitles.length <= 3 &&
      suggestedDestinations.every((name) => /kyoto/i.test(name)) &&
      suggestedTitles.every((title) => /kyoto/i.test(title)),
    JSON.stringify(suggested.body));

  // --- the screen ---------------------------------------------------------------------------
  const profileDir = path.join(os.tmpdir(), 'largata-publish-driver');
  const chrome = spawn(chromePath(), [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profileDir}`,
    '--headless=new',
    '--no-first-run',
    '--window-size=393,852',
    'about:blank',
  ], { stdio: 'ignore' });

  const pageErrors = [];
  const consoleErrors = [];
  const requests = [];

  let ws;
  for (let tries = 0; tries < 40; tries += 1) {
    try {
      const targets = await getJson('/json/list');
      const page = targets.find((t) => t.type === 'page');
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
        break;
      }
    } catch {
      // Chrome is still coming up.
    }
    await sleep(250);
  }
  if (!ws) throw new Error('DRIVER FAILED: no CDP target');
  await new Promise((r) => ws.on('open', r));

  let nextId = 1;
  const pending = new Map();
  const send = (method, params) =>
    new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      pageErrors.push(
        (msg.params.exceptionDetails.exception &&
          msg.params.exceptionDetails.exception.description) ||
          msg.params.exceptionDetails.text,
      );
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push((msg.params.args || []).map((a) => a.value ?? a.description).join(' '));
    }
    if (msg.method === 'Network.requestWillBeSent') {
      const url = msg.params.request.url;
      if (url.includes('/v1/discovery/') && msg.params.request.method === 'GET') {
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
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return r?.result?.value;
  };

  await send('Page.navigate', { url: PREVIEW });
  await sleep(3000);
  await evaluate(`
    localStorage.setItem('largata.web.session', JSON.stringify({
      idToken: ${JSON.stringify(browser.idToken)},
      refreshToken: ${JSON.stringify(browser.refreshToken)},
      uid: ${JSON.stringify(browser.localId)},
      expiresAt: ${Date.now() + 3000 * 1000}
    }));
    true
  `);

  const goto = async (to) => {
    await send('Page.navigate', { url: `${PREVIEW}${to}` });
    await sleep(4500);
  };
  const text = () => evaluate('document.body.innerText');
  const url = () => evaluate('location.pathname + location.search');
  const alerts = () => evaluate('JSON.stringify(window.__largataAlerts || [])');

  // The last VISIBLE match, because expo-router keeps previously-visited screens mounted
  // beneath the current one and a naive query returns the screen underneath (S4.0).
  const clickLabel = async (label) =>
    evaluate(`
      (() => {
        const wanted = ${JSON.stringify(label)};
        const all = Array.from(document.querySelectorAll('[aria-label]'))
          .filter((n) => (n.getAttribute('aria-label') || '').includes(wanted))
          .filter((n) => n.offsetParent !== null);
        const node = all[all.length - 1];
        if (!node) return 'NOT FOUND';
        node.click();
        return 'ok:' + all.length;
      })()
    `);

  // A programmatic value setter is INVISIBLE to react-native-web's TextInput — the field shows the
  // text and onChangeText never fires, so a working search reads as dead. Focus it and send real
  // key events instead, which is what a traveler's keyboard produces.
  const typeInto = async (label, value) => {
    const focused = await evaluate(`
      (() => {
        const wanted = ${JSON.stringify(label)};
        const all = Array.from(document.querySelectorAll('input, textarea'))
          .filter((n) => (n.getAttribute('aria-label') || '').includes(wanted))
          .filter((n) => n.offsetParent !== null);
        const node = all[all.length - 1];
        if (!node) return 'NOT FOUND';
        node.focus();
        return 'ok';
      })()
    `);
    if (focused !== 'ok') return focused;
    for (const character of value) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', text: character });
      await send('Input.dispatchKeyEvent', { type: 'keyUp' });
      await sleep(120);
    }
    return 'ok';
  };

  await goto('/discover');
  const landing = await text();

  check('AC 3.1: the Discover tab opens a real screen rather than refusing the tap',
    !/coming soon/i.test(landing) && (landing || '').length > 0,
    `${(landing || '').length} chars`);
  check('AC 4.4: the landing carries the Trending destinations rail',
    /Trending destinations/.test(landing || ''));
  check('AC 3.2: …and the Recommended itineraries rail beside it',
    /Recommended itineraries/.test(landing || ''));
  check('AC 4.2: a trending card names its destination and its trip count',
    new RegExp(`Kyoto ${stamp}`).test(landing || '') && /\d+ trips?/.test(landing || ''));

  // The rails hide their scrollbar and a mouse has no horizontal gesture, so without a drag handler
  // they are unreachable on desktop — the S1.3 dead-click shape with a new cause. CDP's
  // Input.dispatchMouseEvent does NOT synthesize PointerEvents, so the sequence is dispatched
  // in-page; a probe that skips this reports a dead drag against a working rail (S4.21).
  // Addressed by POSITION, not by this run's own fixture title: the Recommended rail ranks over
  // every published trip in the database, so a freshly-seeded one need not appear in it — keying
  // on it reports a dead rail against a working one.
  const dragRail = async (index) =>
    evaluate(`
      (() => {
        const strips = Array.from(document.querySelectorAll('div'))
          .filter((n) => n.offsetParent !== null)
          .filter((n) => n.scrollWidth > n.clientWidth + 4)
          .filter((n) => /auto|scroll/.test(getComputedStyle(n).overflowX));
        const s = strips[${index}];
        if (!s) return { rails: strips.length };
        const r = s.getBoundingClientRect();
        const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
        const travel = Math.round(s.clientWidth * 0.7);
        const before = Math.round(s.scrollLeft);
        const mk = (t, x, b) => new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', clientX: x, clientY: cy, button: 0, buttons: b });
        s.dispatchEvent(mk('pointerdown', cx, 1));
        for (const f of [0.25, 0.5, 0.75, 1]) s.dispatchEvent(mk('pointermove', cx - travel * f, 1));
        const dragged = Math.round(s.scrollLeft);
        s.dispatchEvent(mk('pointerup', cx - travel, 0));
        return { rails: strips.length, before, dragged, snap: getComputedStyle(s).scrollSnapType };
      })()
    `);

  const trendingDrag = await dragRail(0);
  check('the landing carries exactly the two rails this walk drags',
    trendingDrag.rails === 2, JSON.stringify(trendingDrag));
  check('a mouse drag scrolls the trending rail — desktop has no other way to reach it',
    trendingDrag.dragged > trendingDrag.before, JSON.stringify(trendingDrag));

  const recommendedDrag = await dragRail(1);
  check('a mouse drag scrolls the recommended rail too',
    recommendedDrag.dragged > recommendedDrag.before, JSON.stringify(recommendedDrag));

  // A free-scrolling rail must not be handed mandatory snap on release: it has no paging concept,
  // and imposing one would make the rail jump to a card boundary the traveler never asked for.
  check('the rails are never left paging — a free strip stays free after a drag',
    trendingDrag.snap === 'none', JSON.stringify(trendingDrag));

  const afterDragUrl = await url();
  check('a drag that ends over a card does NOT open it — the strip scrolled, nothing was tapped',
    /\/discover/.test(afterDragUrl || ''), `url=${afterDragUrl}`);

  await goto('/discover');
  await clickLabel('See all itineraries');
  await sleep(3500);
  const results = await text();
  check('AC 3.3: See all lands on the browse results with a count line',
    /\d+ itiner(ary|aries)/.test(results || ''), `url=${await url()}`);

  await goto('/discover');
  const opened = await clickLabel(`Browse itineraries in Kyoto ${stamp}`);
  await sleep(3500);
  const filtered = await text();
  const filteredUrl = await url();

  check('AC 4.5: tapping a trending destination opens results filtered to it',
    opened.startsWith('ok') && /destination=/.test(filteredUrl || ''),
    `click=${opened} url=${filteredUrl}`);
  check('AC 4.5: …and the route carries that filter, so the link restores the same view',
    /Kyoto/.test(decodeURIComponent(filteredUrl || '')), `url=${filteredUrl}`);
  check('AC 6.6: the filter button wears a badge counting the active filter groups',
    /1 active/.test(await evaluate(`
      JSON.stringify(Array.from(document.querySelectorAll('[aria-label]'))
        .map((n) => n.getAttribute('aria-label')).filter((l) => /Filter these results/.test(l)))
    `) || ''), 'expected the filter control to report one active group');
  check('AC 6.7: the filtered results show only that destination-s trips',
    new RegExp(`Kyoto temples ${stamp}`).test(filtered || '') &&
      !new RegExp(`Lima ceviche ${stamp}`).test(filtered || ''));

  // --- search mode --------------------------------------------------------------------------
  await goto('/discover');
  const openedSearch = await clickLabel('Destinations, itineraries, people');
  await sleep(2500);
  const searchMode = await text();

  // The section labels are uppercased by textTransform, and innerText reports what is PAINTED,
  // so a case-sensitive match here fails against a perfectly working screen.
  check('AC 5.1: the search bar opens full-screen search mode',
    openedSearch.startsWith('ok') && /trending searches|recent/i.test(searchMode || ''),
    `click=${openedSearch} url=${await url()} text=${(searchMode || '').slice(0, 120)}`);

  await typeInto('Destinations, itineraries, people', 'Kyoto');
  await sleep(2500);
  const suggesting = await text();
  // Each group caps at 3, so on a database carrying earlier walks' fixtures THIS run's destination
  // can be crowded out legitimately. Assert the groups and a real match, not our own stamp.
  check('AC 5.4: typing surfaces grouped suggestions for the partial query',
    /destinations/i.test(suggesting || '') && /itineraries/i.test(suggesting || '') &&
      /Kyoto \d{6}/.test(suggesting || '') &&
      new RegExp(`Kyoto temples ${stamp}`).test(suggesting || ''),
    (suggesting || '').slice(0, 200));

  const ranSearch = await clickLabel(`Search for Kyoto temples ${stamp}`);
  await sleep(3500);
  const searched = await text();
  check('AC 5.5: submitting a suggestion lands on results carrying the query',
    ranSearch.startsWith('ok') && /q=/.test(await url() || ''),
    `click=${ranSearch} url=${await url()}`);
  check('AC 5.6: …and the results are the trips that match it',
    new RegExp(`Kyoto temples ${stamp}`).test(searched || ''));

  await goto('/discover');
  await clickLabel('Destinations, itineraries, people');
  // The recents load is async (storage read on mount), so a read taken at click time sees the
  // empty first render and reports a working store as broken.
  await sleep(4000);
  const withRecent = await text();
  const stored = await evaluate("localStorage.getItem('largata.discovery.recents')");
  check('AC 5.2: the submitted query is remembered as a recent search on this device',
    /recent/i.test(withRecent || '') &&
      new RegExp(`Kyoto temples ${stamp}`).test(withRecent || '') &&
      (stored || '').includes(`Kyoto temples ${stamp}`),
    `stored=${stored} text=${(withRecent || '').slice(0, 160)}`);

  // --- the filter sheet ---------------------------------------------------------------------
  await goto('/discovery-results');
  await sleep(1000);
  const openedSheet = await clickLabel('Filter these results');
  await sleep(2500);
  const sheet = await text();

  check('AC 6.1: the filter button opens the sheet',
    openedSheet.startsWith('ok') && /Filters/.test(sheet || ''), `click=${openedSheet}`);
  check('AC 6.2: the sheet offers the four duration bands the mock draws',
    /1-3 days/.test(sheet || '') && /4-7 days/.test(sheet || '') &&
      /8-14 days/.test(sheet || '') && /15\+ days/.test(sheet || ''));
  check('AC 6.4: Apply previews the outcome before the traveler commits to it',
    /Show \d+ itiner(ary|aries)/.test(sheet || ''),
    (sheet || '').split('\n').filter((l) => /Show|No exact/.test(l)).join(' | '));

  await clickLabel('4-7 days');
  await sleep(2500);
  const drafted = await text();
  check('AC 6.5: Reset appears once the draft differs from the applied filters',
    /Reset/.test(drafted || ''));
  check('AC 6.4: …and the live count follows the draft rather than the applied set',
    /Show \d+ itiner(ary|aries)|No exact matches/.test(drafted || ''));

  const applyLabel = (drafted || '').split('\n').find((l) => /^Show |No exact/.test(l)) || '';
  await clickLabel(applyLabel.trim());
  await sleep(3500);
  const applied = await url();
  check('AC 6.3: Apply commits the draft to the route, so the search is shareable',
    /duration=/.test(applied || ''), `url=${applied}`);

  // --- the honest stubs ---------------------------------------------------------------------
  await goto('/discovery-results');
  await sleep(1500);
  const bookmarked = await clickLabel('to trip ideas');
  await sleep(1200);
  const afterBookmark = JSON.parse((await alerts()) || '[]');
  check('AC 3.5: the bookmark refuses honestly rather than pretending to save',
    bookmarked.startsWith('ok') && afterBookmark.some((m) => /coming soon|still being built/i.test(m)),
    `click=${bookmarked} alerts=${JSON.stringify(afterBookmark)}`);

  const authorTapped = await clickLabel('Open the profile of');
  await sleep(1200);
  const afterAuthor = JSON.parse((await alerts()) || '[]');
  check('AC 3.5: the author tap refuses honestly too — no dead clicks on either control',
    authorTapped.startsWith('ok') && afterAuthor.length > afterBookmark.length,
    `click=${authorTapped} alerts=${JSON.stringify(afterAuthor)}`);

  // --- the card opens the published page ----------------------------------------------------
  await goto('/discovery-results');
  await sleep(1500);
  // The card and its bookmark BOTH carry the title, and clickLabel takes the last visible match —
  // which is the bookmark, so a title-only selector taps Save and reports a card that never opened.
  const cardTapped = await evaluate(`
    (() => {
      const all = Array.from(document.querySelectorAll('[aria-label]'))
        .filter((n) => (n.getAttribute('aria-label') || '').startsWith(${JSON.stringify(`Kyoto temples ${stamp},`)}))
        .filter((n) => n.offsetParent !== null);
      const node = all[all.length - 1];
      if (!node) return 'NOT FOUND';
      node.click();
      return 'ok:' + all.length;
    })()
  `);
  await sleep(3500);
  check('AC 3.6: a card opens the published itinerary view that already exists',
    cardTapped.startsWith('ok') && /\/published\//.test(await url() || ''),
    `click=${cardTapped} url=${await url()}`);

  // --- evidence -----------------------------------------------------------------------------
  const anonymous = requests.filter((r) => r.auth === 'ANON');
  check('every discovery read is bearer-authenticated — no anonymous GETs',
    anonymous.length === 0, anonymous.map((r) => r.url).join('\n        '));
  check('no page errors and no console errors along the whole walk',
    pageErrors.length === 0 && consoleErrors.length === 0,
    [...pageErrors, ...consoleErrors].slice(0, 4).join('\n        '));

  const shot = path.join(os.tmpdir(), `largata-discovery-${stamp}.png`);
  await goto('/discover');
  const captured = await send('Page.captureScreenshot', { format: 'png' });
  if (captured && captured.data) {
    fs.writeFileSync(shot, Buffer.from(captured.data, 'base64'));
    console.log(`\n  screenshot: ${shot}`);
  }

  ws.close();
  chrome.kill();

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((error) => {
  console.error(`\nDRIVER FAILED: ${error.message}\n`);
  process.exit(1);
});
