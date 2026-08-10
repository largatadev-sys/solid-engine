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
const alertExpectations = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--expect') {
    expectations.push(args[i + 1] ?? '');
    continue;
  }
  if (args[i] === '--expect-alert') {
    alertExpectations.push(args[i + 1] ?? '');
    continue;
  }
  if (args[i] === '--fill-otp') {
    steps.push({ kind: 'otp', label: args[i + 1] ?? 'Verification code' });
    continue;
  }
  // A real file upload, not a simulated one: the picker opens a native file chooser the page
  // cannot script, so CDP intercepts the chooser and hands it a path. Without this the web upload
  // path is untestable, and "renders on web" would stand in for "works on web" (the S1.3 lesson).
  if (args[i] === '--upload') {
    const value = args[i + 1] ?? '';
    const split = value.indexOf('=');
    steps.push({ kind: 'upload', label: value.slice(0, split), file: value.slice(split + 1) });
    continue;
  }
  if (args[i] === '--blur') steps.push({ kind: 'blur', label: 'focused field' });
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

  // react-native-web's Alert is a NO-OP, so a control whose whole job is to say something can
  // render, click, and do nothing at all — S1.3 shipped a screenful of dead greys that way, and
  // every test was green because "renders on web" is not "works on web". Headless Chrome swallows
  // native dialogs, so the only way to see one is to replace window.alert before the app loads and
  // record what it was asked to say. Recorded, not suppressed: --expect-alert then gives the check
  // a failure mode, which a click that merely "succeeded" does not have.
  // window.confirm gets the same treatment for the same reason, plus one of its own: an unhandled
  // confirm BLOCKS headless Chrome outright, so a destructive flow does not fail — it hangs, and
  // the run has to be killed. Confirming (rather than dismissing) is what lets accept/remove/leave
  // be driven end to end; the wording is recorded so the dialog is still evidence (S4.20).
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__largataAlerts = [];
      window.alert = (message) => { window.__largataAlerts.push(String(message)); };
      window.__largataConfirms = [];
      window.confirm = (message) => { window.__largataConfirms.push(String(message)); return true; };
    `,
  });

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
        const proto = el.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        el.focus();
        setter.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return shown.length > 1 ? 'ok (of ' + shown.length + ' visible)' : 'ok';
      })()`);
  };

  const clickLabel = (target) =>
    evaluate(`(() => {
        ${VISIBLE_LAST}
        const wanted = ${target};
        const clickable =
          '[role="button"],button,[role="checkbox"],[role="radio"],[role="link"],a,[role="tab"]';
        const all = Array.from(document.querySelectorAll(clickable))
          .filter(e => (e.getAttribute('aria-label') || e.innerText || '').trim() === wanted);
        const shown = visible(all);
        if (shown.length === 0) return all.length === 0 ? 'NOT FOUND' : 'FOUND BUT HIDDEN x' + all.length;
        shown[shown.length - 1].click();
        return shown.length > 1 ? 'ok (of ' + shown.length + ' visible)' : 'ok';
      })()`);

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

    if (step.kind === 'upload') {
      // PLANT THE FILE, THEN CLICK. A web picker creates a hidden input, clicks it, and removes it
      // on settle — and in headless Chrome no chooser can open, so `cancel` fires immediately and
      // the element is gone before any post-click CDP query can reach it. Pre-seeding
      // HTMLInputElement.prototype.files means the picker's OWN input is already carrying the file
      // the instant it is created, so the real change-handler → repository → multipart path runs
      // exactly as it does for a traveler. The bytes are read from disk here, not faked.
      // A JSON array literal of every byte melts V8 on multi-megabyte files (a 29MB photo becomes
      // a ~110MB source string to parse), so the bytes travel as base64 in bounded slices instead.
      const fileBytes = require('fs').readFileSync(require('path').resolve(step.file));
      const base64 = fileBytes.toString('base64');
      const SLICE = 4 * 1024 * 1024;
      await evaluate(`window.__drivenB64 = '';`);
      for (let at = 0; at < base64.length; at += SLICE) {
        await evaluate(
          `(() => { window.__drivenB64 += ${JSON.stringify(base64.slice(at, at + SLICE))}; return window.__drivenB64.length; })()`,
        );
      }
      const mime = /\.png$/i.test(step.file) ? 'image/png' : 'image/jpeg';
      const planted = await evaluate(`(() => {
          const raw = atob(window.__drivenB64);
          delete window.__drivenB64;
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
          const file = new File([bytes], ${JSON.stringify(require('path').basename(step.file))}, { type: ${JSON.stringify(mime)} });
          const transfer = new DataTransfer();
          transfer.items.add(file);
          const proto = HTMLInputElement.prototype;
          if (!window.__drivenFilesHooked) {
            window.__drivenFilesHooked = true;
            const nativeClick = proto.click;
            proto.click = function () {
              if (this.type === 'file' && window.__drivenPlantedFiles) {
                Object.defineProperty(this, 'files', {
                  configurable: true,
                  get: () => window.__drivenPlantedFiles,
                });
                this.dispatchEvent(new Event('change', { bubbles: true }));
                return;
              }
              return nativeClick.call(this);
            };
          }
          window.__drivenPlantedFiles = transfer.files;
          return 'planted ' + file.size + ' bytes';
        })()`);

      const clicked = await clickLabel(target);
      stepLog.push(`  upload ${step.label} -> ${planted}, click ${clicked}`);
      await sleep(3500);
      continue;
    }

    if (step.kind === 'blur') {
      const ok = await evaluate(
        `(() => {
          const el = document.activeElement;
          if (el === null || el === document.body) return 'NOTHING FOCUSED';
          el.blur();
          el.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
          el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
          return 'ok';
        })()`,
      );
      stepLog.push(`  blur  -> ${ok}`);
    } else if (step.kind === 'fill') {
      const ok = await fillField(step.label, step.value);
      stepLog.push(`  fill  ${step.label} -> ${ok === 'ok' ? `${step.value.length} chars` : ok}`);
    } else {
      const ok = await clickLabel(target);
      stepLog.push(`  click ${step.label} -> ${ok}`);
    }

    await sleep(step.kind === 'fill' ? 300 : 6000);

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

  const alerts = (await evaluate('JSON.stringify(window.__largataAlerts || [])')) ?? '[]';
  const spoken = JSON.parse(alerts);
  console.log('\nALERTS THE PAGE RAISED (a greyed control that raises none is a DEAD CLICK — S1.3):');
  console.log(spoken.length ? spoken.map((a) => `  ${a.replace(/\n+/g, ' | ')}`).join('\n') : '  (none)');

  const confirms = (await evaluate('JSON.stringify(window.__largataConfirms || [])')) ?? '[]';
  const asked = JSON.parse(confirms);
  console.log('\nCONFIRMS THE PAGE RAISED (auto-accepted, so a destructive flow runs to completion):');
  console.log(asked.length ? asked.map((c) => `  ${c.replace(/\n+/g, ' | ')}`).join('\n') : '  (none)');

  const missingAlerts = alertExpectations.filter(
    (wanted) => !spoken.some((a) => a.includes(wanted)),
  );
  if (alertExpectations.length > 0) {
    console.log('\nALERT EXPECTATIONS (each greyed affordance must actually SAY something):');
    for (const wanted of alertExpectations) {
      console.log(`  ${missingAlerts.includes(wanted) ? 'MISSING' : 'present'}  ${wanted}`);
    }
  }

  const missing = expectations.filter((wanted) => !(bodyText || '').includes(wanted));
  if (expectations.length > 0) {
    console.log('\nEXPECTATIONS (the walk only passes if the final page says these):');
    for (const wanted of expectations) {
      console.log(`  ${missing.includes(wanted) ? 'MISSING' : 'present'}  ${wanted}`);
    }
  }

  ws.close();
  chrome.kill();
  process.exit(missing.length === 0 && missingAlerts.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error('DRIVER FAILED:', e.message);
  process.exit(1);
});
