import { test, expect } from '../support/fixtures';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { seedTrip, stamp } from '../support/seed';
import { labelled } from '../support/screen';
import {
  PICKER_DISMISS,
  PICKER_CONFIRM,
  PLACE_LABEL,
  SEARCH_PLACEHOLDER,
  placeFieldLabel,
  resultLabel,
} from '../../src/maps/mapCopy';

const OWNER = ownerTagFor('web/place-picker');

requireStack(OWNER);

const BIG_LAGOON = 'Big Lagoon';

const OPEN_THE_MAP = placeFieldLabel('');

const ADD_TO_DAY_ONE = 'Add an activity to Day 1';

let tripId: string;

test.beforeAll(async () => {
  const trip = await seedTrip({
    ownerTag: OWNER,
    title: `Picker ${stamp('PL-2')}`,
    destination: 'El Nido, Palawan',
    durationDays: 1,
  });
  tripId = trip.id;
});


test.beforeEach(async ({ signIn }) => {
  await signIn(OWNER);
});


test.describe.configure({ mode: 'serial' });

test.describe('picking a place drops a pin the save carries (PL-2)', () => {

  test('the search box the placeholder has promised since S4.17 finally exists', async ({ page }) => {
    await page.goto(`/itineraries/${tripId}/edit-plan`);
    await expect(labelled(page, ADD_TO_DAY_ONE)).toBeVisible({ timeout: 20_000 });
    await labelled(page, ADD_TO_DAY_ONE).click();

    await labelled(page, OPEN_THE_MAP).click();

    await expect(labelled(page, SEARCH_PLACEHOLDER).last()).toBeVisible({ timeout: 15_000 });
  });


  test('a search result centres the map on it and names it exactly', async ({ page }) => {
    await page.goto(`/itineraries/${tripId}/edit-plan`);
    await labelled(page, ADD_TO_DAY_ONE).click();
    await labelled(page, OPEN_THE_MAP).click();

    await labelled(page, SEARCH_PLACEHOLDER).last().fill(BIG_LAGOON);

    const result = labelled(page, resultLabel(BIG_LAGOON, 'El Nido, Palawan')).last();
    await expect(result).toBeVisible({ timeout: 15_000 });
    await result.click();

    await expect(labelled(page, PLACE_LABEL).last()).toHaveValue(BIG_LAGOON, { timeout: 10_000 });
  });


  test('the coordinates under the pin reach the save request', async ({ page }) => {
    await page.goto(`/itineraries/${tripId}/edit-plan`);
    await labelled(page, ADD_TO_DAY_ONE).click();

    await labelled(page, 'Activity name').last().fill('Kayak the lagoon');
    await labelled(page, OPEN_THE_MAP).click();
    await labelled(page, SEARCH_PLACEHOLDER).last().fill(BIG_LAGOON);

    const result = labelled(page, resultLabel(BIG_LAGOON, 'El Nido, Palawan')).last();
    await expect(result).toBeVisible({ timeout: 15_000 });
    await result.click();
    await labelled(page, PICKER_CONFIRM).last().click();

    const saved = page.waitForRequest(
      (request) =>
        request.method() === 'PUT' &&
        request.url().includes('/plan') &&
        JSON.stringify(request.postDataJSON()).includes('"pin"'),
      { timeout: 20_000 },
    );
    await labelled(page, 'Save Activity').last().click();
    await labelled(page, 'Save Changes').last().click();

    const body = JSON.stringify((await saved).postDataJSON());

    expect(body).toContain('"pin"');
    expect(body).toContain('11.19');
    expect(body).toContain('119.40');
  });

  test('cancelling the picker leaves the activity form as it was', async ({ page }) => {
    await page.goto(`/itineraries/${tripId}/edit-plan`);
    await labelled(page, ADD_TO_DAY_ONE).click();
    await labelled(page, 'Activity name').last().fill('Unchanged');

    await labelled(page, OPEN_THE_MAP).click();
    await expect(labelled(page, PICKER_CONFIRM).last()).toBeVisible({ timeout: 15_000 });
    await labelled(page, PICKER_DISMISS).last().click({ position: { x: 20, y: 20 } });

    await expect(labelled(page, 'Activity name').last()).toHaveValue('Unchanged');
  });
});
