/**
 * Drives the web preview in a REAL browser and reports what it finds (S0.6).
 *
 * WHY THIS EXISTS. The web preview's ACs cannot be closed by tests or greps. A bundle grep proves a
 * string shipped, never that React mounted it; a unit test proves a module's logic, never that a
 * browser agrees. S0.4's white screen was invisible to everything except loading the page, and S0.6
 * added a second class of failure only a browser can see: Google's button silently not rendering
 * because an OAuth origin is not registered — clean console, no page errors, nothing in the bundle
 * to grep for. This is the "verify at the layer that ships" rule (CLAUDE.md) made runnable.
 *
 * WHY IT IS COMMITTED. S0.5 wrote this, threw it away, and S0.6 wrote it again from scratch. That is
 * the discovery cost this file exists to stop paying.
 *
 * IT IS NOT A TEST. It reports; it asserts nothing and gates nothing. Jest owns the assertions. Run
 * it when you need to know what a browser actually does with the container.
 *
 * USAGE (from mobile/, with the preview container running — see CLAUDE.md's rig recipe):
 *   node scripts/drive-preview.js [url]            # default http://localhost:8081/
 *   node scripts/drive-preview.js --shot out.png   # also write a screenshot
 *
 * NO NEW DEPENDENCY: `ws` is already present transitively, and Chrome is driven over the DevTools
 * protocol rather than through Puppeteer.
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const args = process.argv.slice(2);
const shotIndex = args.indexOf('--shot');
const screenshotPath = shotIndex === -1 ? null : args[shotIndex + 1];
const url = args.find((a) => a.startsWith('http')) ?? 'http://localhost:8081/';
const PORT = 9223;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

(async () => {
  const chrome = spawn(
    chromePath(),
    [
      `--remote-debugging-port=${PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      // A throwaway profile: a signed-in Google session would change what the page does, and this
      // should report the state a founder arriving cold would see.
      `--user-data-dir=${require('os').tmpdir()}/largata-preview-driver`,
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
  const consoleErrors = [];
  const pageErrors = [];
  const gisNetwork = [];

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
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      pageErrors.push(msg.params.exceptionDetails.text);
    }
    if (msg.method === 'Network.responseReceived' && msg.params.response.url.includes('gsi/')) {
      // Reported for context, NOT as a verdict. Observed at S0.6: `/gsi/button` returns 400 while
      // the button renders perfectly (GIS retries/falls back internally), so this status is not the
      // origin-registration signal it looks like. The trustworthy signal is the iframe count below.
      const { status, url: u } = msg.params.response;
      gisNetwork.push(`  ${status} ${u.split('?')[0]}`);
    }
  });

  await send('Runtime.enable');
  await send('Network.enable');
  await send('Page.enable');
  await send('Page.navigate', { url });
  await sleep(6000); // GIS loads from a CDN and renders async; a shorter wait reports false negatives.

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true });
    return r?.result?.value;
  };

  const bodyText = await evaluate('document.body.innerText');
  const googleIframes = await evaluate(
    `Array.from(document.querySelectorAll('iframe')).filter(f => (f.src||'').includes('accounts.google')).length`,
  );
  const googleGlobal = await evaluate('typeof window.google?.accounts?.id');
  const oneTap = await evaluate(`document.querySelectorAll('#credential_picker_container').length`);

  if (screenshotPath !== null) {
    const shot = await send('Page.captureScreenshot', {});
    fs.writeFileSync(screenshotPath, Buffer.from(shot.data, 'base64'));
  }

  console.log(`=== ${url} ===\n`);
  console.log('PAGE TEXT (empty means a white screen — the S0.4 failure):');
  console.log((bodyText || '  (EMPTY — WHITE SCREEN)').split('\n').map((l) => `  ${l}`).join('\n'));
  console.log('\nGOOGLE SIGN-IN:');
  console.log(`  window.google.accounts.id : ${googleGlobal}   (object = GIS script loaded)`);
  console.log(`  Google-rendered iframes   : ${googleIframes}   <- THE SIGNAL: 1 = the button rendered`);
  console.log(`  One Tap overlay           : ${oneTap}   (0 = correct; S0.6 is button-only)`);
  console.log('\nGIS NETWORK (context only — a 400 on /gsi/button does NOT mean the button failed):');
  console.log(gisNetwork.length ? gisNetwork.join('\n') : '  (none)');
  console.log('\nCONSOLE ERRORS:');
  console.log(consoleErrors.length ? consoleErrors.map((e) => `  ${e}`).join('\n') : '  (none)');
  console.log('\nPAGE ERRORS:');
  console.log(pageErrors.length ? pageErrors.map((e) => `  ${e}`).join('\n') : '  (none)');
  if (screenshotPath !== null) console.log(`\nSCREENSHOT: ${screenshotPath}`);

  ws.close();
  chrome.kill();
  process.exit(0);
})().catch((e) => {
  console.error('DRIVER FAILED:', e.message);
  process.exit(1);
});
