import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP } from '../support/identities';
import { seedTrip, seedPlan, joinTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';

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

  test('sets dates, and the facts line says so across a reload', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await labelled(page, 'Trip settings').click();
    await labelled(page, 'Edit details').click();

    await labelled(page, 'Start date').fill('2027-03-12');
    await labelled(page, 'End date').fill('2027-03-19');
    await page.getByText('Save', { exact: true }).last().click();

    await expect(page.getByText('Boracay · 12–19 Mar 2027')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Boracay · 12–19 Mar 2027')).toBeVisible();
  });

  test('clears both dates, and "Dates to be decided" survives a reload', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await labelled(page, 'Trip settings').click();
    await labelled(page, 'Edit details').click();

    await labelled(page, 'Clear start date').click();
    await labelled(page, 'Clear end date').click();
    await page.getByText('Save', { exact: true }).last().click();

    await expect(page.getByText('Boracay · Dates to be decided')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Boracay · Dates to be decided')).toBeVisible();
  });

  test('changes the currency through the confirm, and the prices relabel', async ({ page, signal }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await labelled(page, 'Trip settings').click();
    await labelled(page, 'Edit details').click();

    await labelled(page, 'Currency').click();
    await page.getByText('$  USD — US Dollar').click();
    await page.getByText('Save', { exact: true }).last().click();

    expect(signal.dialogs.join(' ')).toMatch(/Prices keep their numbers/);

    await expect(page.getByText(/\$1,500|\$1500/)).toBeVisible();
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

  test('reads the facts line like everybody else', async ({ page }) => {
    await page.goto(`/itineraries/${trip.id}`);

    await expect(page.getByText('Boracay · Dates to be decided')).toBeVisible();
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
