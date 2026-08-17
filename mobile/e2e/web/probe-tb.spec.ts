import { test } from '../support/fixtures';
import { requireStack } from '../support/gate';
import { seedTrip, seedPlan, stamp } from '../support/seed';

requireStack('t4');

test('probe tabbar', async ({ page, signIn }) => {
  const trip = await seedTrip({ ownerTag: 't4', title: stamp('probe tabs'), durationDays: 2 });
  await seedPlan(trip, [{ title: 'A stop' }]);
  await signIn('t4');
  await page.goto(`/itineraries/${trip.id}`);
  await page.waitForTimeout(4000);
  console.log('URL', page.url());
  console.log('=== IN TRIP ===');
  console.log(await page.evaluate(() => document.body.innerText));
  console.log('TABBAR NODES:', JSON.stringify(await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role],[aria-label]')).filter(n => (n as HTMLElement).offsetParent !== null)
      .filter(n => ['Home','Discover','Trips','Profile'].includes((n.getAttribute('aria-label') || (n as HTMLElement).innerText || '').trim()))
      .map(n => ({ role: n.getAttribute('role'), label: n.getAttribute('aria-label'), text: (n as HTMLElement).innerText.trim(), sel: n.getAttribute('aria-selected') })))));
  console.log('EDITPROFILE VISIBLE?', await page.evaluate(() => Array.from(document.querySelectorAll('[aria-label],[role="button"]')).filter(n => ((n.getAttribute('aria-label') || (n as HTMLElement).innerText || '').trim() === 'Edit Profile')).some(n => (n as HTMLElement).offsetParent !== null)));
});
