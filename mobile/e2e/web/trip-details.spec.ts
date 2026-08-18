import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP } from '../support/identities';
import { seedTrip, seedPlan, joinTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled, labelStarting } from '../support/screen';

const OWNER = ownerTagFor('web/trip-details');
const MEMBER = IDENTITY_MAP['web/trip-details'].tags[1]!;

requireStack(OWNER);


test.describe('the owner edits the trip-s details', () => {
  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await seedTrip({
      ownerTag: OWNER,
      title: stamp('details'),
      destination: 'Boracay',
      durationDays: 2,
    });
    await seedPlan(trip, [{ title: 'Sunset paraw sailing', costAmount: '1500.00', costCurrency: 'PHP' }]);
  });

  test.beforeEach(async ({ signIn }) => {
    await signIn(OWNER);
  });

  test('sets dates, and they survive a reload of the editor', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}/edit`);
    await expect(page.getByText('Edit Trip')).toBeVisible();

    await labelStarting(page, 'Start date').fill('2027-03-12');
    await labelStarting(page, 'End date').fill('2027-03-19');
    await page.getByText('Save', { exact: true }).last().click();

    await page.goto(`/itineraries/${trip.id}/edit`);
    await expect(labelStarting(page, 'Start date')).toHaveValue('2027-03-12');
    await expect(labelStarting(page, 'End date')).toHaveValue('2027-03-19');
  });

  test('clears both dates, and the clear survives a reload', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}/edit`);
    await expect(page.getByText('Edit Trip')).toBeVisible();

    await labelStarting(page, 'Start date').fill('2027-03-12');
    await labelStarting(page, 'End date').fill('2027-03-19');
    await expect(labelled(page, 'Clear start date')).toBeVisible();

    await labelled(page, 'Clear start date').click();
    await labelled(page, 'Clear end date').click();
    await page.getByText('Save', { exact: true }).last().click();

    await page.goto(`/itineraries/${trip.id}/edit`);
    await expect(labelStarting(page, 'Start date')).toHaveValue('');
    await expect(labelStarting(page, 'End date')).toHaveValue('');
  });

  test('changes the currency through the confirm, and every priced activity relabels', async ({
    page,
    signal,
  }) => {
    await page.goto(`/itineraries/${trip.id}/edit`);
    await expect(page.getByText('Edit Trip')).toBeVisible();

    await page.locator('[aria-label^="Currency:"]').last().click();
    await page.getByText('$  USD — US Dollar').click();
    await page.getByText('Save', { exact: true }).last().click();

    await expect(page.getByText('Day 1')).toBeVisible();
    expect(signal.dialogs.join(' ')).toMatch(/Prices keep their numbers/);

    const token = await tokenFor(OWNER);
    const after = await api(`/v1/itineraries/${trip.id}`, 'GET', token);

    expect(after.body.currency).toBe('USD');
    expect(
      after.body.days.flatMap((day: { activities: Array<{ costCurrency: string | null }> }) =>
        day.activities.map((activity) => activity.costCurrency),
      ),
    ).toEqual(['USD']);
  });
});


test.describe('a collaborator plans but does not rename', () => {
  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await seedTrip({
      ownerTag: OWNER,
      title: stamp('collab-details'),
      destination: 'Boracay',
      durationDays: 2,
    });
    await joinTrip(trip, MEMBER);
  });

  test.beforeEach(async ({ signIn }) => {
    await signIn(MEMBER);
  });

  test('opens the workspace and reads the plan like everybody else', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);

    await expect(page.getByText('Day 1')).toBeVisible();
  });

  test('is offered no cog at all on an unpublished trip (S4.25 artboard 1b)', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);

    await expect(page.getByText('Day 1')).toBeVisible();
    await expect(labelled(page, 'Trip settings')).toHaveCount(0);
  });

  test('is refused a details edit by the server, with the owner-act code', async () => {
    const token = await tokenFor(MEMBER);
    await api(`/v1/itineraries/${trip.id}/edit-lock`, 'POST', token);

    const refused = await api(`/v1/itineraries/${trip.id}`, 'PATCH', token, {
      title: 'Hijacked',
      destination: 'Boracay',
    });

    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('NOT_PERMITTED');
  });
});
