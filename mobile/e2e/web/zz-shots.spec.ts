import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, type PoolTag } from '../support/identities';
import { joinTrip, seedTrip, stamp } from '../support/seed';
import { labelled } from '../support/screen';

const OWNER = ownerTagFor('web/polls');
const SECOND: PoolTag = 't2';
const OUT = process.env.SHOT_DIR ?? '.';

requireStack(OWNER);

test('poll board frames', async ({ page, signIn }) => {
  test.setTimeout(180_000);
  const owner = await tokenFor(OWNER);
  const second = await tokenFor(SECOND);
  const trip = await seedTrip({ ownerTag: OWNER, title: stamp('Shot trip'), durationDays: 2 });
  await joinTrip(trip, SECOND);
  await page.setViewportSize({ width: 412, height: 915 });

  await signIn(OWNER);
  await page.goto(`/itineraries/${trip.id}?tab=polls`);
  await expect(page.getByText('No polls yet')).toBeVisible();
  await page.screenshot({ path: `${OUT}/01-empty.png` });

  const closesAt = new Date(Date.now() + 3 * 3600_000).toISOString();
  const made = await api(`/v1/itineraries/${trip.id}/polls`, 'POST', owner, {
    question: 'Day 2 Afternoon Activity',
    options: ['Island Hopping Tour A', 'Snorkeling at Shimizu', 'Beach Rest Day'],
    closesAt,
  });
  const poll = made.body;

  await page.goto(`/itineraries/${trip.id}?tab=polls`);
  await expect(page.getByText(poll.question)).toBeVisible();
  await page.screenshot({ path: `${OUT}/02-open-not-voted.png` });

  await labelled(page, `${poll.options[0].label}, 0 votes`).click();
  await page.screenshot({ path: `${OUT}/03-selected.png` });
  await labelled(page, 'Submit Vote').click();
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.getByText('Tap another option to change your vote.')).toBeVisible();
  await page.screenshot({ path: `${OUT}/04-recorded.png` });

  await labelled(page, `${poll.options[1].label}, 0 votes`).click();
  await expect(labelled(page, `Change Vote to "${poll.options[1].label}"`)).toBeVisible();
  await page.screenshot({ path: `${OUT}/05-changing.png` });

  await labelled(page, 'Poll actions').click();
  await page.screenshot({ path: `${OUT}/06-kebab.png` });
  await page.keyboard.press('Escape');

  // a tie, closed
  const tied = await api(`/v1/itineraries/${trip.id}/polls`, 'POST', owner, {
    question: 'Day 3 Morning Activity', options: ['Underground River Tour', 'Beach Yoga'], closesAt,
  });
  await api(`/v1/itineraries/${trip.id}/polls/${tied.body.id}/vote`, 'PUT', owner, { optionId: tied.body.options[0].id });
  await api(`/v1/itineraries/${trip.id}/polls/${tied.body.id}/vote`, 'PUT', second, { optionId: tied.body.options[1].id });
  await api(`/v1/itineraries/${trip.id}/polls/${tied.body.id}/close`, 'POST', owner, {});
  const zero = await api(`/v1/itineraries/${trip.id}/polls`, 'POST', owner, {
    question: 'Karaoke Night?', options: ['Yes', 'No'], closesAt,
  });
  await api(`/v1/itineraries/${trip.id}/polls/${zero.body.id}/close`, 'POST', owner, {});

  await page.goto(`/itineraries/${trip.id}?tab=polls`);
  await expect(page.getByText('Completed Polls')).toBeVisible();
  await page.screenshot({ path: `${OUT}/07-board-full.png`, fullPage: true });

  await page.goto(`/itineraries/${trip.id}/polls/new`);
  await expect(labelled(page, 'Poll Question')).toBeVisible();
  await page.screenshot({ path: `${OUT}/08-create.png`, fullPage: true });
});
