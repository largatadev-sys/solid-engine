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
const widthIndex = args.indexOf('--width');
const viewportWidth = widthIndex === -1 ? null : Number(args[widthIndex + 1]);

const steps = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--fill' || args[i] === '--fill-env' || args[i] === '--click') {
    const value = args[i + 1] ?? '';
    const split = value.indexOf('=');
    steps.push(
      args[i] === '--click'
        ? { kind: 'click', label: value }
        : {
            kind: 'fill',
            label: value.slice(0, split),
            value:
              args[i] === '--fill-env'
                ? (process.env[value.slice(split + 1)] ?? '')
                : value.slice(split + 1),
          },
    );
  }
}
const PORT = Number(process.env.LARGATA_CDP_PORT || 9223);

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
  const apiRequests = [];

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
      const { status, url: u } = msg.params.response;
      gisNetwork.push(`  ${status} ${u.split('?')[0]}`);
    }
    if (msg.method === 'Network.requestWillBeSent' && msg.params.request.url.includes('/v1/')) {
      const { method, url: u, headers } = msg.params.request;
      const bearer = Object.keys(headers).some((h) => h.toLowerCase() === 'authorization');
      apiRequests.push({ method, path: new URL(u).pathname, bearer });
    }
  });

  await send('Runtime.enable');
  await send('Network.enable');
  await send('Page.enable');

  if (viewportWidth !== null) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: viewportWidth,
      height: 852,
      deviceScaleFactor: 2,
      mobile: true,
    });
  }

  await send('Page.navigate', { url });
  await sleep(6000);

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true });
    return r?.result?.value;
  };

  const stepLog = [];
  for (const step of steps) {
    const target = JSON.stringify(step.label);

    if (step.kind === 'fill') {
      const ok = await evaluate(`(() => {
        const el = document.querySelector('[aria-label=' + JSON.stringify(${target}) + ']');
        if (!el) return 'NOT FOUND';
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, ${JSON.stringify(step.value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return 'ok';
      })()`);
      stepLog.push(`  fill  ${step.label} -> ${ok === 'ok' ? `${step.value.length} chars` : ok}`);
    } else {
      const ok = await evaluate(`(() => {
        const wanted = ${target};
        const hit = Array.from(document.querySelectorAll('[role="button"],button'))
          .find(e => (e.getAttribute('aria-label') || e.innerText || '').trim() === wanted);
        if (!hit) return 'NOT FOUND';
        hit.click();
        return 'ok';
      })()`);
      stepLog.push(`  click ${step.label} -> ${ok}`);
    }

    await sleep(step.kind === 'click' ? 6000 : 300);
  }

  const bodyText = await evaluate('document.body.innerText');
  const googleIframes = await evaluate(
    `Array.from(document.querySelectorAll('iframe')).filter(f => (f.src||'').includes('accounts.google')).length`,
  );
  const googleGlobal = await evaluate('typeof window.google?.accounts?.id');
  const oneTap = await evaluate(`document.querySelectorAll('#credential_picker_container').length`);

  const loadedFonts = await evaluate(
    `Array.from(document.fonts).filter(f => f.status === 'loaded').map(f => f.family).join(', ')`,
  );
  const renderedFonts = await evaluate(
    `Array.from(document.querySelectorAll('div,span')).filter(e => e.innerText && !e.querySelector('*'))
       .slice(0, 40)
       .map(e => getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, ''))
       .filter((v, i, a) => v && a.indexOf(v) === i).join(', ')`,
  );

  if (screenshotPath !== null) {
    const shot = await send('Page.captureScreenshot', {});
    fs.writeFileSync(screenshotPath, Buffer.from(shot.data, 'base64'));
  }

  console.log(`=== ${url} ===\n`);
  if (stepLog.length) {
    console.log('STEPS:');
    console.log(stepLog.join('\n'));
    console.log('');
  }
  console.log('PAGE TEXT (empty means a white screen — the S0.4 failure):');
  console.log((bodyText || '  (EMPTY — WHITE SCREEN)').split('\n').map((l) => `  ${l}`).join('\n'));
  console.log('\nGOOGLE SIGN-IN:');
  console.log(`  window.google.accounts.id : ${googleGlobal}   (object = GIS script loaded)`);
  console.log(`  Google-rendered iframes   : ${googleIframes}   <- THE SIGNAL: 1 = the button rendered`);
  console.log(`  One Tap overlay           : ${oneTap}   (0 = correct; S0.6 is button-only)`);
  console.log('\nGIS NETWORK (context only — a 400 on /gsi/button does NOT mean the button failed):');
  console.log(gisNetwork.length ? gisNetwork.join('\n') : '  (none)');
  console.log('\nFONTS (a family named in CSS but absent from "loaded" is a SILENT FALLBACK):');
  console.log(`  loaded by the document : ${loadedFonts || '(none)'}`);
  console.log(`  used by rendered text  : ${renderedFonts || '(none)'}`);

  const anonymous = apiRequests.filter((r) => !r.bearer && r.method !== 'OPTIONS');
  console.log('\nAPI REQUESTS (bearer = the request carried an Authorization header):');
  console.log(
    apiRequests.length
      ? apiRequests
          .map((r) => `  ${r.method === 'OPTIONS' ? 'preflt' : r.bearer ? 'bearer' : 'ANON  '} ${r.method} ${r.path}`)
          .join('\n')
      : '  (none)',
  );
  console.log(
    `  -> ${anonymous.length} anonymous /v1 request(s), excluding CORS preflights, which carry no ` +
      `Authorization by definition. A cold visit must make ZERO (S4.0; the backlog line S0.5 raised).`,
  );

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
