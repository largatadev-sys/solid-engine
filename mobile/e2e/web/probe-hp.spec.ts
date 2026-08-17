import { test } from '../support/fixtures';
import { requireStack } from '../support/gate';
import { api, tokenFor } from '../support/pool';
import { seedTrip, seedPlan, climbTo, stamp } from '../support/seed';

requireStack('t1');

test('probe archive', async ({ page, signIn }) => {
  const token = await tokenFor('t1');
  const trip = await seedTrip({ ownerTag: 't1', title: stamp('probe archive'), members: ['t2'], durationDays: 2 });
  await seedPlan(trip, [{ title: 'Probe stop' }]);
  await signIn('t1');
  await page.goto(`/itineraries/${trip.id}`);
  await page.waitForTimeout(4000);
  console.log('=== LIVE TRIP ===');
  console.log(await page.evaluate(() => document.body.innerText));
  console.log('LABELS:', JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('[aria-label]')).filter(n => (n as HTMLElement).offsetParent !== null).map(n => n.getAttribute('aria-label')))));

  const arch = await api(`/v1/itineraries/${trip.id}/archive`, 'POST', token, {});
  console.log('ARCHIVE STATUS', arch.status, JSON.stringify(arch.body).slice(0,300));
  await page.reload();
  await page.waitForTimeout(4000);
  console.log('=== ARCHIVED TRIP ===');
  console.log(await page.evaluate(() => document.body.innerText));
  console.log('LABELS:', JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('[aria-label]')).filter(n => (n as HTMLElement).offsetParent !== null).map(n => n.getAttribute('aria-label')))));

  await page.goto(`/members/${trip.id}`);
  await page.waitForTimeout(4000);
  console.log('=== MEMBERS ARCHIVED ===');
  console.log(await page.evaluate(() => document.body.innerText));

  await page.goto('/itineraries/archived');
  await page.waitForTimeout(4000);
  console.log('=== ARCHIVED LIST ===');
  console.log(await page.evaluate(() => document.body.innerText));
  console.log('TRIPID', trip.id, 'TITLE', trip.title);
});
