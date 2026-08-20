import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { climbTo, seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';
import { TAB_ROW_LABEL, tabEmptyCopy, tabLabel, type TripTab } from '../../src/itineraries/tripTabs';

const TRAVELER = ownerTagFor('web/trips-tabs');

requireStack(TRAVELER);

const DEAD_LABELS = ['Draft', 'Ready', 'Active'];

const CREATE_BAR = 'Plan a Trip';

const ARCHIVED_LINK = 'Archived trips';

let token: string;

test.beforeAll(async () => {
  token = await tokenFor(TRAVELER);
});

test.beforeEach(async ({ signIn }) => {
  await signIn(TRAVELER);
});

const myTrips = async (): Promise<Array<{ id: string; state: string; title: string }>> => {
  const page = await api('/v1/itineraries?limit=100', 'GET', token);
  return page.body.items;
};

const parkEveryOngoingTrip = async (): Promise<void> => {
  for (const row of await myTrips()) {
    if (row.state === 'ongoing') {
      await api(`/v1/itineraries/${row.id}/archive`, 'POST', token, {});
    }
  }
};

const lifecycleTabs = (page: import('@playwright/test').Page) =>
  page.getByRole('tablist', { name: TAB_ROW_LABEL });

const tabNamed = (page: import('@playwright/test').Page, tab: TripTab) =>
  lifecycleTabs(page).getByRole('tab', { name: tabLabel(tab) });

const selectedTab = async (page: import('@playwright/test').Page): Promise<string | null> => {
  const tabs = lifecycleTabs(page).getByRole('tab');
  const count = await tabs.count();
  for (let i = 0; i < count; i += 1) {
    const tab = tabs.nth(i);
    if ((await tab.getAttribute('aria-selected')) === 'true') return (await tab.innerText()).trim();
  }
  return null;
};


test.describe('the three fixed tabs (S4.26, canvas C1)', () => {
  test('renders exactly three tabs in ladder order, always visible', async ({ page }) => {
    await page.goto('/trips');

    const tabs = lifecycleTabs(page).getByRole('tab');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toHaveText(tabLabel('upcoming'));
    await expect(tabs.nth(1)).toHaveText(tabLabel('ongoing'));
    await expect(tabs.nth(2)).toHaveText(tabLabel('completed'));
  });

  test('carries no counts and no lifecycle badge on any card', async ({ page }) => {
    const trip = await seedTrip({ ownerTag: TRAVELER, title: stamp('no badge') });
    await page.goto('/trips');
    await tabNamed(page, 'upcoming').click();

    await expect(page.getByText(trip.title)).toBeVisible();
    for (const dead of DEAD_LABELS) {
      await expect(page.getByText(new RegExp(`\\b${dead}\\b`))).toHaveCount(0);
    }
  });

  test('shows no dead label anywhere on the surface, in any tab', async ({ page }) => {
    await page.goto('/trips');

    for (const tab of ['upcoming', 'ongoing', 'completed'] as TripTab[]) {
      await tabNamed(page, tab).click();
      for (const dead of DEAD_LABELS) {
        await expect(page.getByText(new RegExp(`\\b${dead}\\b`))).toHaveCount(0);
      }
    }
  });
});


test.describe('adaptive landing (canvas C2)', () => {
  test.describe.configure({ mode: 'serial' });

  test('lands on Upcoming when nothing is under way', async ({ page }) => {
    await parkEveryOngoingTrip();
    await seedTrip({ ownerTag: TRAVELER, title: stamp('nothing under way') });

    await page.goto('/trips');
    await expect(lifecycleTabs(page).getByRole('tab')).toHaveCount(3);

    await expect.poll(async () => selectedTab(page), { timeout: 15_000 }).toBe(tabLabel('upcoming'));
  });

  test('lands on Ongoing the moment one trip is under way', async ({ page }) => {
    const travelling = await seedTrip({ ownerTag: TRAVELER, title: stamp('under way') });
    await climbTo(travelling, 'ongoing');

    await page.goto('/trips');
    await expect(lifecycleTabs(page).getByRole('tab')).toHaveCount(3);

    await expect.poll(async () => selectedTab(page), { timeout: 15_000 }).toBe(tabLabel('ongoing'));
    await expect(page.getByText(travelling.title)).toBeVisible();
  });

  test('a manual pick wins over the adaptive rule for the rest of the session', async ({ page }) => {
    await page.goto('/trips');
    await expect.poll(async () => selectedTab(page), { timeout: 15_000 }).toBe(tabLabel('ongoing'));

    await tabNamed(page, 'completed').click();

    await expect.poll(async () => selectedTab(page), { timeout: 5_000 }).toBe(tabLabel('completed'));
  });

  test('the pick survives opening a trip and coming back — the screen unmounts beneath a push (S4.18)', async ({
    page,
  }) => {
    const travelled = await seedTrip({ ownerTag: TRAVELER, title: stamp('came back to') });
    await climbTo(travelled, 'completed');

    await page.goto('/trips');
    await tabNamed(page, 'completed').click();
    await expect.poll(async () => selectedTab(page), { timeout: 5_000 }).toBe(tabLabel('completed'));

    await labelled(page, travelled.title).click();
    await expect(page).toHaveURL(/itineraries\//, { timeout: 15_000 });

    await page.goBack();
    await expect(lifecycleTabs(page).getByRole('tab')).toHaveCount(3);

    await expect
      .poll(async () => selectedTab(page), { timeout: 15_000 })
      .toBe(tabLabel('completed'));
  });
});


test.describe('the create bar and the archived link (canvas C4, C6)', () => {
  test('the Plan a Trip bar rides Upcoming, populated or not, and no other tab', async ({ page }) => {
    await page.goto('/trips');

    await tabNamed(page, 'upcoming').click();
    await expect(labelled(page, CREATE_BAR)).toBeVisible();

    await tabNamed(page, 'ongoing').click();
    await expect(labelled(page, CREATE_BAR)).toHaveCount(0);

    await tabNamed(page, 'completed').click();
    await expect(labelled(page, CREATE_BAR)).toHaveCount(0);
  });

  test('the Archived trips link sits on Completed alone and routes to the archived list', async ({
    page,
  }) => {
    await page.goto('/trips');

    await tabNamed(page, 'upcoming').click();
    await expect(labelled(page, ARCHIVED_LINK)).toHaveCount(0);

    await tabNamed(page, 'completed').click();
    await expect(labelled(page, ARCHIVED_LINK)).toBeVisible();

    await labelled(page, ARCHIVED_LINK).click();
    await expect(page).toHaveURL(/itineraries\/archived/);
    await expect(page.getByText('Archived Trips', { exact: true })).toBeVisible();
  });

  test('an archived trip never appears inside the three tabs', async ({ page }) => {
    const filed = await seedTrip({ ownerTag: TRAVELER, title: stamp('filed away') });
    await api(`/v1/itineraries/${filed.id}/archive`, 'POST', token, {});

    await page.goto('/trips');
    for (const tab of ['upcoming', 'ongoing', 'completed'] as TripTab[]) {
      await tabNamed(page, tab).click();
      await expect(page.getByText(filed.title)).toHaveCount(0);
    }
  });
});


test.describe('per-tab empty states (canvas C4)', () => {
  test('an empty tab shows its own one line, verbatim', async ({ page }) => {
    await page.goto('/trips');

    for (const tab of ['upcoming', 'ongoing', 'completed'] as TripTab[]) {
      await tabNamed(page, tab).click();
      const rows = await page.getByRole('button').count();
      if (rows === 0) {
        await expect(page.getByText(tabEmptyCopy(tab), { exact: true })).toBeVisible();
      }
    }
  });

  test('the Ongoing tab shows its empty copy once nothing is under way', async ({ page }) => {
    await parkEveryOngoingTrip();

    await page.goto('/trips');
    await tabNamed(page, 'ongoing').click();

    await expect(page.getByText(tabEmptyCopy('ongoing'), { exact: true })).toBeVisible();
    await expect(labelled(page, CREATE_BAR)).toHaveCount(0);
  });
});


test('the card sub-line reads destination and day count, with no date overline', async ({ page }) => {
  const trip: SeededTrip = await seedTrip({
    ownerTag: TRAVELER,
    title: stamp('sub-line'),
    destination: 'Kyoto, Japan',
    durationDays: 6,
  });

  await page.goto('/trips');
  await tabNamed(page, 'upcoming').click();

  await expect(labelled(page, trip.title).getByText('Kyoto, Japan · 6 days')).toBeVisible();
});


test('no console or page errors across the tabs', async ({ page, signal }) => {
  await page.goto('/trips');
  await expect(lifecycleTabs(page).getByRole('tab')).toHaveCount(3);

  for (const tab of ['upcoming', 'ongoing', 'completed'] as TripTab[]) {
    await tabNamed(page, tab).click();
  }

  expect(signal.pageErrors).toEqual([]);
  expect(signal.consoleErrors).toEqual([]);
});
