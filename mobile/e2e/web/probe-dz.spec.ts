import { test } from '../support/fixtures';
import { requireStack } from '../support/gate';
import { api, tokenFor } from '../support/pool';
import { seedTrip, seedPlan, climbTo, stamp, uploadPhoto, FIXTURE_PHOTO } from '../support/seed';

requireStack('t5');
test.setTimeout(600000);
const tiles = (page: any) => page.evaluate(() => Array.from(document.querySelectorAll('[aria-label="Trip photo"]')).filter(n => (n as HTMLElement).offsetParent !== null && n.querySelector('[aria-label="Trip photo"]') !== null).length);

test('probe paging', async ({ page, signIn }) => {
  const trip = await seedTrip({ ownerTag: 't5', title: stamp('probe page'), durationDays: 2 });
  const token = await tokenFor('t5');
  for (let i = 0; i < 31; i += 1) await uploadPhoto(`/v1/itineraries/${trip.id}/photo-dump`, token);
  await signIn('t5');
  await page.goto(`/itineraries/${trip.id}?tab=photo-dump`);
  await page.waitForTimeout(8000);
  console.log('FIRST PAGE TILES', await tiles(page));
  console.log('HAS LOAD MORE', await page.locator('[aria-label="Load more photos"]').count());
  await page.locator('[aria-label="Load more photos"]').last().click();
  await page.waitForTimeout(6000);
  console.log('AFTER MORE TILES', await tiles(page));
});

test('probe stranger', async ({ page, signIn }) => {
  const trip = await seedTrip({ ownerTag: 't5', title: stamp('probe stranger'), durationDays: 2 });
  const token = await tokenFor('t5');
  await uploadPhoto(`/v1/itineraries/${trip.id}/photo-dump`, token);
  await signIn('t4');
  await page.goto(`/itineraries/${trip.id}?tab=photo-dump`);
  await page.waitForTimeout(5000);
  const t = await page.evaluate(() => document.body.innerText);
  console.log('=== STRANGER ===');
  console.log(t);
  console.log('LEN', t.length, 'HAS ADD', t.includes('Add Photos'));
});

test('probe profile diary', async ({ page, signIn }) => {
  const trip = await seedTrip({ ownerTag: 't5', title: stamp('probe pdiary'), durationDays: 2 });
  await seedPlan(trip, [{ title: 'Sunset at Las Cabanas', timeOfDay: '17:30' }]);
  await climbTo(trip, 'ongoing');
  const token = await tokenFor('t5');
  const plan = (await api(`/v1/itineraries/${trip.id}`, 'GET', token)).body;
  await signIn('t5');
  await page.goto(`/itineraries/${trip.id}/diary/compose?activityId=${plan.days[0].activities[0].id}&dayId=${plan.days[0].id}`);
  await page.waitForTimeout(2500);
  const ch = page.waitForEvent('filechooser');
  await page.locator('[aria-label="Add a photo from your camera roll"]').last().click();
  await (await ch).setFiles([FIXTURE_PHOTO]);
  await page.waitForTimeout(2500);
  await page.locator('[aria-label="Add a caption"]').last().fill('Second time around');
  await page.locator('[aria-label="Add to Diary"]').last().click();
  await page.waitForTimeout(6000);

  await page.goto('/profile');
  await page.waitForTimeout(5000);
  console.log('=== PROFILE ===');
  console.log((await page.evaluate(() => document.body.innerText)).slice(0, 900));
  console.log('LABELS', JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('[aria-label]')).filter(n => (n as HTMLElement).offsetParent !== null).map(n => n.getAttribute('aria-label')))));

  await page.goto(`/itineraries/${trip.id}/diary`);
  await page.waitForTimeout(5000);
  console.log('=== TRIP DIARY STREAM ===');
  console.log((await page.evaluate(() => document.body.innerText)).slice(0, 800));
  console.log('POSTCARD', await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('[aria-label]')).filter(n => (n.getAttribute('aria-label')||'').startsWith('Open your entry for')).filter(n => (n as HTMLElement).offsetParent !== null)[0];
    return card?.parentElement?.innerText.replace(/\n/g,' | ') ?? '(none)';
  }));
});
