const { chromium } = require('playwright');
const { poolToken, requirePoolEnv } = require('./poolApi');

const BASE = process.env.PREVIEW || 'http://localhost:8081';
const OUT = process.argv[2] || '.';
const TAG = process.argv[3] || 't1';
const SESSION_KEY = 'largata.web.session';

const TABS = [
  [0, 'upcoming'],
  [1, 'ongoing'],
  [2, 'completed'],
];

(async () => {
  requirePoolEnv();
  const idToken = await poolToken(TAG);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ([key, token, expires]) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ idToken: token, refreshToken: token, uid: 'pool', expiresAt: expires }),
      );
    },
    [SESSION_KEY, idToken, Date.now() + 50 * 60 * 1000],
  );

  await page.goto(`${BASE}/trips`);
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(2500);

  const tabs = page.getByRole('tab');
  const count = await tabs.count();
  console.log(`tabs found: ${count}`);
  for (let i = 0; i < count; i += 1) {
    const tab = tabs.nth(i);
    const label = (await tab.innerText()).trim();
    console.log(`  [${i}] "${label}" selected=${await tab.getAttribute('aria-selected')}`);
  }

  const lines = (await page.locator('body').innerText()).split('\n').filter(Boolean);
  console.log('\nPAGE TEXT (first 20 lines):');
  lines.slice(0, 20).forEach((line) => console.log(`  ${line}`));

  await page.screenshot({ path: `${OUT}/trips-landing.png` });

  for (const [index, name] of TABS) {
    if (index >= count) continue;
    await tabs.nth(index).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT}/trips-${name}.png` });
    const text = (await page.locator('body').innerText()).split('\n').filter(Boolean);
    console.log(
      `\n--- ${name} --- planBar=${text.some((l) => l.includes('Plan a Trip'))}`
        + ` archivedLink=${text.some((l) => l.includes('Archived trips'))}`
        + ` lines=${text.length}`,
    );
  }

  console.log(`\nERRORS: ${errors.length ? errors.join(' | ') : '(none)'}`);
  await browser.close();
})();
