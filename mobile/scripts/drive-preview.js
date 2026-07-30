const WebSocket = require('ws');
const { spawn, execFileSync } = require('child_process');
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
const shotStepsIndex = args.indexOf('--shot-steps');
const shotStepsDir = shotStepsIndex === -1 ? null : args[shotStepsIndex + 1];
const widthIndex = args.indexOf('--width');
const viewportWidth = widthIndex === -1 ? null : Number(args[widthIndex + 1]);

const steps = [];
const expectations = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--expect') {
    expectations.push(args[i + 1] ?? '');
    continue;
  }
  if (args[i] === '--fill-otp') {
    steps.push({ kind: 'otp', label: args[i + 1] ?? 'Verification code' });
    continue;
  }
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

// The keyless logging sink prints `code=NNNNNN` to the backend log (S4.0 decision 2) — which is how
// a local rung reads an OTP without an inbox. Taking the NEWEST match matters: a resend supersedes
// the previous code, so an older line in the same log window is a code the backend has discarded.
// `--since` bounds staleness on purpose: without it a code left over from an earlier run would be
// picked up and submitted, and the resulting VERIFICATION_CODE_INCORRECT would look like a bug in
// the screen rather than in the harness.
function newestCodeInBackendLog() {
  const raw = execFileSync(
    'docker',
    ['compose', 'logs', '--no-color', '--since', '120s', 'backend'],
    { cwd: `${__dirname}/../..`, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  const matches = [...raw.matchAll(/code=(\d{6})/g)];
  if (matches.length === 0) throw new Error('no verification code in the last 120s of backend log');
  return matches[matches.length - 1][1];
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
  const profileDir = `${require('os').tmpdir()}/largata-preview-driver`;

  if (args.includes('--fresh')) fs.rmSync(profileDir, { recursive: true, force: true });

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

  // expo-router keeps previously-visited screens MOUNTED under the current one, so the FIRST DOM
  // match for a label is often the screen underneath — clicking it succeeds and does nothing, which
  // reads as "the button is broken". Every lookup therefore takes the LAST VISIBLE match, and says
  // how many it saw so an ambiguity is reported rather than silently resolved (S4.0).
  const VISIBLE_LAST = `
    const visible = (els) => els.filter(e => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });`;

  const fillField = async (label, value) => {
    const target = JSON.stringify(label);
    return evaluate(`(() => {
        ${VISIBLE_LAST}
        const all = Array.from(document.querySelectorAll('[aria-label=' + JSON.stringify(${target}) + ']'));
        const shown = visible(all);
        if (shown.length === 0) return all.length === 0 ? 'NOT FOUND' : 'FOUND BUT HIDDEN x' + all.length;
        const el = shown[shown.length - 1];
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return shown.length > 1 ? 'ok (of ' + shown.length + ' visible)' : 'ok';
      })()`);
  };

  const stepLog = [];
  for (const step of steps) {
    const target = JSON.stringify(step.label);

    if (step.kind === 'otp') {
      let code;
      try {
        code = newestCodeInBackendLog();
      } catch (e) {
        stepLog.push(`  otp   ${step.label} -> ${e.message}`);
        await sleep(300);
        continue;
      }
      const ok = await fillField(step.label, code);
      stepLog.push(`  otp   ${step.label} -> ${ok === 'ok' ? `read ${code.length} digits from the backend log` : ok}`);
      await sleep(300);
      continue;
    }

    if (step.kind === 'fill') {
      const ok = await fillField(step.label, step.value);
      stepLog.push(`  fill  ${step.label} -> ${ok === 'ok' ? `${step.value.length} chars` : ok}`);
    } else {
      const ok = await evaluate(`(() => {
        ${VISIBLE_LAST}
        const wanted = ${target};
        const clickable = '[role="button"],button,[role="checkbox"],[role="radio"],[role="link"],a';
        const all = Array.from(document.querySelectorAll(clickable))
          .filter(e => (e.getAttribute('aria-label') || e.innerText || '').trim() === wanted);
        const shown = visible(all);
        if (shown.length === 0) return all.length === 0 ? 'NOT FOUND' : 'FOUND BUT HIDDEN x' + all.length;
        shown[shown.length - 1].click();
        return shown.length > 1 ? 'ok (of ' + shown.length + ' visible)' : 'ok';
      })()`);
      stepLog.push(`  click ${step.label} -> ${ok}`);
    }

    await sleep(step.kind === 'click' ? 6000 : 300);

    if (shotStepsDir !== null) {
      fs.mkdirSync(shotStepsDir, { recursive: true });
      const slug = `${String(stepLog.length).padStart(2, '0')}-${step.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
      const shot = await send('Page.captureScreenshot', {});
      fs.writeFileSync(`${shotStepsDir}/${slug}.png`, Buffer.from(shot.data, 'base64'));
    }
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

  const missing = expectations.filter((wanted) => !(bodyText || '').includes(wanted));
  if (expectations.length > 0) {
    console.log('\nEXPECTATIONS (the walk only passes if the final page says these):');
    for (const wanted of expectations) {
      console.log(`  ${missing.includes(wanted) ? 'MISSING' : 'present'}  ${wanted}`);
    }
  }

  ws.close();
  chrome.kill();
  process.exit(missing.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error('DRIVER FAILED:', e.message);
  process.exit(1);
});
