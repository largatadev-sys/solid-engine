import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { seedTrip, seedPlan, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';

const TRAVELER = ownerTagFor('web/drag-reorder');

requireStack(TRAVELER);

const FIRST = 'Kayak the lagoon';
const SECOND = 'Sunset dinner';
const THIRD = 'Night market';

let token: string;

const plannedOrder = async (trip: SeededTrip): Promise<string[]> => {
  const read = await api(`/v1/itineraries/${trip.id}`, 'GET', token);
  return read.body.days[0].activities.map((activity: { title: string }) => activity.title);
};

const screenOrder = async (page: import('@playwright/test').Page): Promise<string[]> =>
  page.evaluate((titles) => {
    const seen: string[] = [];
    for (const node of Array.from(document.querySelectorAll('[aria-label^="Drag " i]'))) {
      const label = node.getAttribute('aria-label') ?? '';
      const match = titles.find((title) => label.includes(title));
      if (match !== undefined) seen.push(match);
    }
    return seen;
  }, [FIRST, SECOND, THIRD]);

async function freshPlan(): Promise<SeededTrip> {
  const trip = await seedTrip({ ownerTag: TRAVELER, title: stamp('drag'), durationDays: 1 });
  await seedPlan(trip, [
    { title: FIRST, timeOfDay: '09:00', place: 'Big Lagoon' },
    { title: SECOND, timeOfDay: '18:00', place: 'Lio Beach' },
    { title: THIRD, timeOfDay: '20:00', place: 'Town' },
  ]);
  return trip;
}

async function dragGrip(
  page: import('@playwright/test').Page,
  title: string,
  rows: number,
): Promise<void> {
  const grip = labelled(page, `Drag ${title} to reorder`);
  const from = await grip.boundingBox();
  if (from === null) throw new Error(`the grip for ${title} has no box`);

  const pitch = await page.evaluate(() => {
    const grips = Array.from(document.querySelectorAll('[aria-label^="Drag " i]'));
    if (grips.length < 2) return 0;
    const first = grips[0]!.getBoundingClientRect();
    const second = grips[1]!.getBoundingClientRect();
    return Math.round(second.top - first.top);
  });
  expect(pitch, 'the rows must have a measurable pitch to drag across').toBeGreaterThan(0);

  const x = from.x + from.width / 2;
  const y = from.y + from.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  for (const step of [0.25, 0.5, 0.75, 1]) {
    await page.mouse.move(x, y + pitch * rows * step, { steps: 3 });
  }
  await page.mouse.up();
}

test.beforeAll(async () => {
  token = await tokenFor(TRAVELER);
});

test.beforeEach(async ({ signIn }) => {
  await signIn(TRAVELER);
});

test('the arrow buttons are gone from the rows', async ({ page }) => {
  const trip = await freshPlan();
  await page.goto(`/itineraries/${trip.id}/edit-plan`);
  await expect(labelled(page, `Drag ${FIRST} to reorder`)).toBeVisible();

  await expect(page.locator('[aria-label*="Move up" i]')).toHaveCount(0);
  await expect(page.locator('[aria-label*="Move down" i]')).toHaveCount(0);
});

test('a downward drag lands on the correct slot and stages rather than persisting', async ({
  page,
}) => {
  const trip = await freshPlan();
  await page.goto(`/itineraries/${trip.id}/edit-plan`);
  await expect(labelled(page, `Drag ${FIRST} to reorder`)).toBeVisible();

  expect(await screenOrder(page)).toEqual([FIRST, SECOND, THIRD]);

  await dragGrip(page, FIRST, 1);

  await expect.poll(async () => screenOrder(page), { timeout: 10_000 }).toEqual([
    SECOND,
    FIRST,
    THIRD,
  ]);
  expect(await plannedOrder(trip), 'the drop must stage, never persist').toEqual([
    FIRST,
    SECOND,
    THIRD,
  ]);
});

test('an upward drag lands on the correct slot too — the rounding is symmetric', async ({ page }) => {
  const trip = await freshPlan();
  await page.goto(`/itineraries/${trip.id}/edit-plan`);
  await expect(labelled(page, `Drag ${THIRD} to reorder`)).toBeVisible();

  await dragGrip(page, THIRD, -1);

  await expect.poll(async () => screenOrder(page), { timeout: 10_000 }).toEqual([
    FIRST,
    THIRD,
    SECOND,
  ]);
  expect(await plannedOrder(trip)).toEqual([FIRST, SECOND, THIRD]);
});

test('the staged order survives into the save', async ({ page }) => {
  const trip = await freshPlan();
  await page.goto(`/itineraries/${trip.id}/edit-plan`);
  await expect(labelled(page, `Drag ${FIRST} to reorder`)).toBeVisible();

  await dragGrip(page, FIRST, 1);
  await expect.poll(async () => screenOrder(page), { timeout: 10_000 }).toEqual([
    SECOND,
    FIRST,
    THIRD,
  ]);

  await page.getByText('Save Changes').click();

  await expect.poll(async () => plannedOrder(trip), { timeout: 20_000 }).toEqual([
    SECOND,
    FIRST,
    THIRD,
  ]);
});

test('ArrowUp on a focused grip reorders the screen and writes nothing', async ({ page }) => {
  const trip = await freshPlan();
  await page.goto(`/itineraries/${trip.id}/edit-plan`);
  await expect(labelled(page, `Drag ${SECOND} to reorder`)).toBeVisible();

  await labelled(page, `Drag ${SECOND} to reorder`).focus();
  await page.keyboard.press('ArrowUp');

  await expect.poll(async () => screenOrder(page), { timeout: 10_000 }).toEqual([
    SECOND,
    FIRST,
    THIRD,
  ]);
  expect(await plannedOrder(trip), 'the keyboard reorder writes nothing either').toEqual([
    FIRST,
    SECOND,
    THIRD,
  ]);
});

test('a touch drag exercises the same reorder path', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  try {
    const trip = await freshPlan();
    const idToken = await tokenFor(TRAVELER);
    await page.goto('/');
    await page.evaluate(
      ([value, expires]) => {
        window.localStorage.setItem(
          'largata.web.session',
          JSON.stringify({ idToken: value, refreshToken: value, uid: 'pool', expiresAt: expires }),
        );
      },
      [idToken, Date.now() + 50 * 60 * 1000] as const,
    );

    await page.goto(`/itineraries/${trip.id}/edit-plan`);
    const grip = page
      .locator(`[aria-label="Drag ${FIRST} to reorder" i]`)
      .locator('visible=true')
      .last();
    await expect(grip).toBeVisible();

    const box = await grip.boundingBox();
    expect(box, 'the grip must be reachable by touch').not.toBeNull();

    const pitch = await page.evaluate(() => {
      const grips = Array.from(document.querySelectorAll('[aria-label^="Drag " i]'));
      if (grips.length < 2) return 0;
      return Math.round(
        grips[1]!.getBoundingClientRect().top - grips[0]!.getBoundingClientRect().top,
      );
    });

    const session = await context.newCDPSession(page);
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;

    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y }],
    });
    for (const step of [0.3, 0.6, 1]) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y + pitch * step }],
      });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    await expect
      .poll(
        async () =>
          page.evaluate(
            (titles) =>
              Array.from(document.querySelectorAll('[aria-label^="Drag " i]'))
                .map((node) => titles.find((t) => (node.getAttribute('aria-label') ?? '').includes(t)))
                .filter((t): t is string => t !== undefined),
            [FIRST, SECOND, THIRD],
          ),
        { timeout: 10_000 },
      )
      .toEqual([SECOND, FIRST, THIRD]);
  } finally {
    await context.close();
  }
});
