import { test } from '../support/fixtures';
import { requireStack } from '../support/gate';

requireStack('t5');

test('probe tripdiary', async ({ page, signIn }) => {
  await signIn('t5');
  await page.goto('/profile');
  await page.waitForTimeout(4500);
  const label = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[aria-label]'))
      .filter((n) => (n.getAttribute('aria-label') ?? '').startsWith('Open the diary for'))
      .filter((n) => (n as HTMLElement).offsetParent !== null)
      .map((n) => n.getAttribute('aria-label'))[0],
  );
  console.log('SECTION LABEL', label);
  await page.locator(`[aria-label="${label}"]`).locator('visible=true').last().click();
  await page.waitForTimeout(4500);
  console.log('URL', page.url());
  console.log('=== TRIP DIARY SCREEN ===');
  console.log(await page.evaluate(() => document.body.innerText));
  console.log('LABELS:', JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('[aria-label]')).filter(n => (n as HTMLElement).offsetParent !== null).map(n => n.getAttribute('aria-label')).slice(0, 25))));
  console.log('PILL 1/3?', await page.evaluate(() => document.body.innerText.includes('1/3')));
});
