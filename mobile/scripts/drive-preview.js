const { chromium } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const at = args.indexOf(flag);
  return at === -1 ? null : (args[at + 1] ?? null);
};

const url = args.find((a) => a.startsWith('http')) ?? 'http://localhost:8081/';
const screenshotPath = valueAfter('--shot');
const shotStepsDir = valueAfter('--shot-steps');
const widthArg = valueAfter('--width');
const viewportWidth = widthArg === null ? null : Number(widthArg);

const steps = [];
const expectations = [];
const alertExpectations = [];

for (let i = 0; i < args.length; i += 1) {
  const flag = args[i];
  const value = args[i + 1] ?? '';
  const split = value.indexOf('=');

  if (flag === '--expect') expectations.push(value);
  else if (flag === '--expect-alert') alertExpectations.push(value);
  else if (flag === '--fill-otp') steps.push({ kind: 'otp', label: value || 'Verification code' });
  else if (flag === '--upload')
    steps.push({ kind: 'upload', label: value.slice(0, split), file: value.slice(split + 1) });
  else if (flag === '--blur') steps.push({ kind: 'blur', label: 'focused field' });
  else if (flag === '--click') steps.push({ kind: 'click', label: value });
  else if (flag === '--fill' || flag === '--fill-env')
    steps.push({
      kind: 'fill',
      label: value.slice(0, split),
      value:
        flag === '--fill-env'
          ? (process.env[value.slice(split + 1)] ?? '')
          : value.slice(split + 1),
    });
}

function newestCodeInBackendLog() {
  const raw = execFileSync(
    'docker',
    ['compose', 'logs', '--no-color', '--since', '120s', 'backend'],
    { cwd: path.join(__dirname, '../..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  const matches = [...raw.matchAll(/code=(\d{6})/g)];
  if (matches.length === 0) throw new Error('no verification code in the last 120s of backend log');
  return matches[matches.length - 1][1];
}

const PROFILE_DIR = path.join(os.tmpdir(), 'largata-preview-driver');

(async () => {
  if (args.includes('--fresh')) fs.rmSync(PROFILE_DIR, { recursive: true, force: true });

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    viewport: { width: viewportWidth ?? 1280, height: 900 },
  });
  const page = context.pages()[0] ?? (await context.newPage());

  const consoleErrors = [];
  const pageErrors = [];
  const apiRequests = [];
  const gisNetwork = [];
  const spoken = [];
  const asked = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('dialog', async (dialog) => {
    const said = dialog.message();
    if (dialog.type() === 'confirm') asked.push(said);
    else spoken.push(said);
    await dialog.accept();
  });
  page.on('request', (request) => {
    const target = new URL(request.url());
    if (target.pathname.startsWith('/v1/')) {
      apiRequests.push({
        method: request.method(),
        path: target.pathname + target.search,
        bearer: Boolean(request.headers()['authorization']),
      });
    }
    if (/gstatic|googleapis|accounts\.google/.test(target.host)) {
      gisNetwork.push(`  ${request.method()} ${target.host}${target.pathname}`);
    }
  });

  await page.goto(url, { waitUntil: 'networkidle' }).catch(() => page.goto(url));

  const visible = (label) =>
    page.locator(`[aria-label*="${String(label).replace(/"/g, '\\"')}" i]`).locator('visible=true').last();

  let stepIndex = 0;
  for (const step of steps) {
    stepIndex += 1;
    const shot = shotStepsDir === null ? null : path.join(shotStepsDir, `step-${stepIndex}.png`);
    try {
      if (step.kind === 'click') {
        await visible(step.label).click({ timeout: 15_000 });
      } else if (step.kind === 'fill') {
        await visible(step.label).fill(step.value, { timeout: 15_000 });
      } else if (step.kind === 'otp') {
        await visible(step.label).fill(newestCodeInBackendLog(), { timeout: 15_000 });
      } else if (step.kind === 'upload') {
        await page.locator('input[type=file]').last().setInputFiles(step.file);
      } else if (step.kind === 'blur') {
        await page.keyboard.press('Tab');
      }
      console.log(`step ${stepIndex}: ${step.kind} ${step.label} -> ok`);
    } catch (failure) {
      console.log(`step ${stepIndex}: ${step.kind} ${step.label} -> FAILED (${failure.message.split('\n')[0]})`);
    }
    await page.waitForLoadState('networkidle').catch(() => undefined);
    if (shot !== null) {
      fs.mkdirSync(shotStepsDir, { recursive: true });
      await page.screenshot({ path: shot });
    }
  }

  const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
  const googleGlobal = await page
    .evaluate(() => typeof (window.google && window.google.accounts && window.google.accounts.id))
    .catch(() => 'undefined');
  const googleIframes = await page
    .evaluate(() => document.querySelectorAll('iframe[src*="accounts.google.com"]').length)
    .catch(() => 0);
  const oneTap = await page
    .evaluate(() => document.querySelectorAll('#credential_picker_container, [id*="onetap"]').length)
    .catch(() => 0);
  const loadedFonts = await page
    .evaluate(() => Array.from(document.fonts).map((f) => f.family).join(', '))
    .catch(() => '');
  const renderedFonts = await page
    .evaluate(() => {
      const families = new Set();
      for (const node of Array.from(document.querySelectorAll('body *')).slice(0, 400)) {
        const text = node.textContent ?? '';
        if (text.trim() !== '') families.add(getComputedStyle(node).fontFamily.split(',')[0].trim());
      }
      return Array.from(families).join(', ');
    })
    .catch(() => '');

  console.log('');
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
    anonymous.length
      ? `  ^ ${anonymous.length} ANONYMOUS request(s) — an authenticated screen must send none (S3.3)`
      : '  (every request carried a bearer token)',
  );

  console.log('\nCONSOLE ERRORS:');
  console.log(consoleErrors.length ? consoleErrors.map((e) => `  ${e}`).join('\n') : '  (none)');
  console.log('\nPAGE ERRORS:');
  console.log(pageErrors.length ? pageErrors.map((e) => `  ${e}`).join('\n') : '  (none)');

  if (screenshotPath !== null) {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\nSCREENSHOT: ${screenshotPath}`);
  }

  console.log('\nALERTS THE PAGE RAISED (a greyed control that raises none is a DEAD CLICK — S1.3):');
  console.log(spoken.length ? spoken.map((a) => `  ${a.replace(/\n+/g, ' | ')}`).join('\n') : '  (none)');
  console.log('\nCONFIRMS THE PAGE RAISED (auto-accepted, so a destructive flow runs to completion):');
  console.log(asked.length ? asked.map((c) => `  ${c.replace(/\n+/g, ' | ')}`).join('\n') : '  (none)');

  const missingAlerts = alertExpectations.filter(
    (wanted) => !spoken.some((said) => said.toLowerCase().includes(wanted.toLowerCase())),
  );
  if (alertExpectations.length > 0) {
    console.log('\nALERT EXPECTATIONS (each greyed affordance must actually SAY something):');
    for (const wanted of alertExpectations) {
      console.log(`  ${missingAlerts.includes(wanted) ? 'MISSING' : 'present'}  ${wanted}`);
    }
  }

  const missing = expectations.filter(
    (wanted) => !bodyText.toLowerCase().includes(wanted.toLowerCase()),
  );
  if (expectations.length > 0) {
    console.log('\nEXPECTATIONS (the walk only passes if the final page says these):');
    for (const wanted of expectations) {
      console.log(`  ${missing.includes(wanted) ? 'MISSING' : 'present'}  ${wanted}`);
    }
  }

  console.log(`\n--fresh wipes only this tool's own profile: ${PROFILE_DIR}`);

  await context.close();
  process.exit(missing.length + missingAlerts.length > 0 ? 1 : 0);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
