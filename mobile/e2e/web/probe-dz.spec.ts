import { test } from '../support/fixtures';
import { requireStack } from '../support/gate';
import { seedTrip, stamp, uploadPhoto } from '../support/seed';
import { tokenFor } from '../support/pool';

requireStack('t6');
test.setTimeout(180000);

test('probezz t6now', async ({ page, signIn }) => {
  const trip = await seedTrip({ ownerTag: 't6', title: stamp('probe t6b'), durationDays: 2 });
  const token = await tokenFor('t6');
  await uploadPhoto(`/v1/itineraries/${trip.id}/photo-dump`, token);
  await signIn('t6');
  await page.goto(`/itineraries/${trip.id}?tab=photo-dump`);
  await page.waitForTimeout(6000);
  console.log('URL', page.url());
  console.log('=== T6 ===');
  console.log(await page.evaluate(() => document.body.innerText));
  console.log('LABELS', JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('[aria-label]')).filter(n => (n as HTMLElement).offsetParent !== null).map(n => n.getAttribute('aria-label')))));
});
