import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP } from '../support/identities';
import { seedTrip, seedPlan, joinTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled, labelStarting } from '../support/screen';
import type { Page } from '@playwright/test';


async function openEditorSettled(page: Page, tripId: string): Promise<void> {
  await page.goto(`/itineraries/${tripId}/edit`);
  await expect(page.getByText('Edit Trip')).toBeVisible();
  await expect(page.getByText('Save', { exact: true }).last()).toBeEnabled();
  await expect(labelled(page, 'Trip Title')).not.toHaveValue('');
  await page.waitForTimeout(SETTLE_MS);
}


async function setDate(page: Page, label: string, value: string): Promise<void> {
  await expect(async () => {
    await labelStarting(page, label).fill(value);
    await expect(labelStarting(page, label)).toHaveValue(value, { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}


const SETTLE_MS = 1_200;

const OWNER = ownerTagFor('web/trip-details');
const MEMBER = IDENTITY_MAP['web/trip-details'].tags[1]!;

requireStack(OWNER);


test.describe('the owner edits the trip-s details', () => {
  let trip: SeededTrip;

  test.beforeEach(async ({ signIn }) => {
    await signIn(OWNER);
    trip = await seedTrip({
      ownerTag: OWNER,
      title: stamp('details'),
      destination: 'Boracay',
      durationDays: 2,
    });
    await seedPlan(trip, [{ title: 'Sunset paraw sailing', costAmount: '1500.00', costCurrency: 'PHP' }]);
  });

  test.describe('the date walks, parked with their fields (founder, 2026-08-19)', () => {
  test.fixme('sets dates, and they survive a reload of the editor', async ({ page }) => {
    await openEditorSettled(page, trip.id);

    await setDate(page, 'Start date', '2027-03-12');
    await setDate(page, 'End date', '2027-03-19');
    await expect(labelStarting(page, 'Start date')).toHaveValue('2027-03-12');
    await expect(labelStarting(page, 'End date')).toHaveValue('2027-03-19');
    await page.getByText('Save', { exact: true }).last().click();

    await page.goto(`/itineraries/${trip.id}/edit`);
    await expect(labelStarting(page, 'Start date')).toHaveValue('2027-03-12');
    await expect(labelStarting(page, 'End date')).toHaveValue('2027-03-19');
  });

  test.fixme('clears both dates, and the clear survives a reload', async ({ page }) => {
    await openEditorSettled(page, trip.id);

    await setDate(page, 'Start date', '2027-03-12');
    await setDate(page, 'End date', '2027-03-19');
    await expect(labelStarting(page, 'Start date')).toHaveValue('2027-03-12');
    await page.getByText('Save', { exact: true }).last().click();

    await page.goto(`/itineraries/${trip.id}/edit`);
    await expect(labelStarting(page, 'Start date')).toHaveValue('2027-03-12');
    await expect(labelled(page, 'Clear start date')).toBeVisible();

    await labelled(page, 'Clear start date').click();
    await labelled(page, 'Clear end date').click();
    await page.getByText('Save', { exact: true }).last().click();

    await page.goto(`/itineraries/${trip.id}/edit`);
    await expect(page.getByText('Save', { exact: true }).last()).toBeEnabled();
    await expect(labelStarting(page, 'Start date')).toHaveValue('');
    await expect(labelled(page, 'Clear start date')).toHaveCount(0);
  });
  });

  test('changes the currency through the confirm, and every priced activity relabels', async ({
    page,
    signal,
  }) => {
    await openEditorSettled(page, trip.id);

    await page.locator('[aria-label^="Currency:"]').last().click();
    await page.getByText('$  USD — US Dollar').click();
    await page.getByText('Save', { exact: true }).last().click();

    await expect
      .poll(() => signal.dialogs.join(' '), { timeout: 15_000 })
      .toMatch(/Prices keep their numbers/);

    const token = await tokenFor(OWNER);
    await expect(async () => {
      const settled = await api(`/v1/itineraries/${trip.id}`, 'GET', token);
      expect(settled.body.currency).toBe('USD');
    }).toPass({ timeout: 15_000 });

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
