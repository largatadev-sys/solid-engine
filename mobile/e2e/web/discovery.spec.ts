import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP } from '../support/identities';
import { SeedFailure, seedCover, stamp } from '../support/seed';
import { labelled, labelStarting, dragStripBy } from '../support/screen';
import {
  RECOMMENDED_SECTION_TITLE,
  SEARCH_PLACEHOLDER,
  SEE_ALL_LABEL,
  SUGGESTED_DESTINATIONS_LABEL,
  SUGGESTED_ITINERARIES_LABEL,
  TRENDING_SECTION_TITLE,
} from '../../src/discovery/discoveryCopy';

const SEARCH_FIELD = SEARCH_PLACEHOLDER.replace(/…$/, '');

const PUBLISHER = ownerTagFor('web/discovery');
const BROWSER = IDENTITY_MAP['web/discovery'].tags[1]!;

requireStack(PUBLISHER);

let mark: string;

async function publishedTrip(
  token: string,
  title: string,
  destination: string,
  durationDays: number,
): Promise<string> {
  const created = await api('/v1/itineraries', 'POST', token, {
    title,
    destinations: [destination],
    durationDays,
  });
  if (created.status !== 201) throw new SeedFailure(`the trip "${title}"`, created.body);
  const id = created.body.id;
  await seedCover({ id, title, ownerTag: PUBLISHER, ownerToken: token, days: created.body.days ?? [] });
  for (const rung of ['finish-planning', 'start', 'complete']) {
    const moved = await api(`/v1/itineraries/${id}/${rung}`, 'POST', token);
    if (moved.status !== 200) throw new SeedFailure(`the climb through ${rung}`, moved.body);
  }
  const published = await api(`/v1/itineraries/${id}/publish`, 'POST', token, { audience: 'public' });
  if (published.status !== 200) throw new SeedFailure(`publishing "${title}"`, published.body);
  return id;
}


test.beforeAll(async () => {
  const token = await tokenFor(PUBLISHER);
  mark = stamp('w').split(' ')[1]!;
  await publishedTrip(token, `Kyoto temples ${mark}`, `Kyoto ${mark}`, 5);
  await publishedTrip(token, `Osaka food ${mark}`, `Kyoto ${mark}`, 3);
  await publishedTrip(token, `Lima ceviche ${mark}`, `Lima ${mark}`, 12);
});

test.beforeEach(async ({ signIn }) => {
  await signIn(BROWSER);
});

test('the Discover tab opens a real screen rather than refusing the tap', async ({ page }) => {
  await page.goto('/discover');
  await expect(page.getByText(TRENDING_SECTION_TITLE)).toBeVisible();
});

test('the landing carries the Trending destinations rail', async ({ page }) => {
  await page.goto('/discover');
  await expect(page.getByText(TRENDING_SECTION_TITLE)).toBeVisible();
});

test('…and the Recommended itineraries rail beside it', async ({ page }) => {
  await page.goto('/discover');
  await expect(page.getByText(RECOMMENDED_SECTION_TITLE)).toBeVisible();
});

test('a trending card names its destination and its trip count', async ({ page }) => {
  await page.goto('/discover');
  await expect(labelStarting(page, 'Browse itineraries in ')).toBeVisible();
  const label = await labelStarting(page, 'Browse itineraries in ').getAttribute('aria-label');
  expect(label).toMatch(/Browse itineraries in .+, \d+ trips?/);
});

test('a mouse drag scrolls the trending rail, and leaves it free rather than paging', async ({ page }) => {
  await page.goto('/discover');
  await expect(page.getByText(TRENDING_SECTION_TITLE)).toBeVisible();

  await expect(labelStarting(page, 'Browse itineraries in ')).toBeVisible();

  const dragged = await dragStripBy(page, 'Browse itineraries in', 260);
  expect(dragged, 'the trending rail must be a horizontally scrollable strip').not.toBeNull();
  expect(dragged!.after, 'a real mouse drag must scroll the rail').toBeGreaterThan(dragged!.before);
  expect(dragged!.snapType, 'a free strip must not be left paging').toBe('none');
});

test('See all lands on the browse results with a count line', async ({ page }) => {
  await page.goto('/discover');
  await page.getByText(SEE_ALL_LABEL, { exact: true }).first().click();
  await expect(page.getByText(/\d+ itiner(ary|aries)/)).toBeVisible();
});

test('tapping a trending destination opens results filtered to it, and the route carries the filter', async ({
  page,
}) => {
  await page.goto('/discover');
  await expect(labelStarting(page, 'Browse itineraries in ')).toBeVisible();

  const card = labelStarting(page, 'Browse itineraries in ');
  const destination = (await card.getAttribute('aria-label'))!
    .replace(/^Browse itineraries in /i, '')
    .replace(/, \d+ trips?$/i, '');
  await card.click();

  await expect(page).toHaveURL(/destination=/);
  expect(decodeURIComponent(page.url())).toContain(destination);
});

test('the filter button wears a badge counting the active filter groups', async ({ page }) => {
  await page.goto(`/discovery-results?destination=${encodeURIComponent(`Kyoto ${mark}`)}`);
  await expect(labelled(page, 'Filter these results')).toBeVisible();
  const label = await labelled(page, 'Filter these results').getAttribute('aria-label');
  expect(label).toMatch(/1 active/);
});

test("the filtered results show only that destination's trips", async ({ page }) => {
  await page.goto(`/discovery-results?destination=${encodeURIComponent(`Kyoto ${mark}`)}`);
  await expect(page.getByText(`Kyoto temples ${mark}`)).toBeVisible();
  await expect(page.getByText(`Lima ceviche ${mark}`)).toHaveCount(0);
});

test('the search bar opens full-screen search mode', async ({ page }) => {
  await page.goto('/discover');
  await labelled(page, SEARCH_FIELD).click();
  await expect(page.getByText(/trending searches|recent/i).first()).toBeVisible();
});

test('typing surfaces grouped suggestions for the partial query', async ({ page }) => {
  await page.goto('/discover');
  await labelled(page, SEARCH_FIELD).click();
  await labelled(page, SEARCH_FIELD).fill('Kyoto');

  await expect(page.getByText(SUGGESTED_DESTINATIONS_LABEL, { exact: true })).toBeVisible();
  await expect(page.getByText(SUGGESTED_ITINERARIES_LABEL, { exact: true })).toBeVisible();
});

test('submitting a suggestion lands on results carrying the query, showing the matching trips', async ({
  page,
}) => {
  await page.goto('/discover');
  await labelled(page, SEARCH_FIELD).click();
  await labelled(page, SEARCH_FIELD).fill(`Kyoto temples ${mark}`);
  await labelled(page, `Search for Kyoto temples ${mark}`).click();

  await expect(page).toHaveURL(/q=/);
  await expect(page.getByText(`Kyoto temples ${mark}`).first()).toBeVisible();
});

test('the submitted query is remembered as a recent search on this device', async ({ page }) => {
  await page.goto('/discover');
  await labelled(page, SEARCH_FIELD).click();
  await labelled(page, SEARCH_FIELD).fill(`Kyoto temples ${mark}`);
  await labelled(page, `Search for Kyoto temples ${mark}`).click();
  await expect(page).toHaveURL(/q=/);

  await page.goto('/discover');
  await labelled(page, SEARCH_FIELD).click();

  await expect(page.getByText(/recent/i).first()).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem('largata.discovery.recents')))
    .toContain(`Kyoto temples ${mark}`);
});

test('the filter sheet opens, offering the four duration bands the mock draws', async ({ page }) => {
  await page.goto('/discovery-results');
  await labelled(page, 'Filter these results').click();

  await expect(page.getByText('Filters')).toBeVisible();
  for (const band of ['1-3 days', '4-7 days', '8-14 days', '15+ days']) {
    await expect(page.getByText(band)).toBeVisible();
  }
});

test('Apply previews the outcome before the traveler commits to it', async ({ page }) => {
  await page.goto('/discovery-results');
  await labelled(page, 'Filter these results').click();
  await expect(page.getByText(/Show \d+ itiner(ary|aries)|No exact matches/)).toBeVisible();
});

test('Reset appears once the draft differs, and the live count follows the draft', async ({ page }) => {
  await page.goto('/discovery-results');
  await labelled(page, 'Filter these results').click();
  await page.getByText('4-7 days').click();

  await expect(page.getByText('Reset')).toBeVisible();
  await expect(page.getByText(/Show \d+ itiner(ary|aries)|No exact matches/)).toBeVisible();
});

test('Apply commits the draft to the route, so the search is shareable', async ({ page }) => {
  await page.goto('/discovery-results');
  await labelled(page, 'Filter these results').click();
  await page.getByText('4-7 days').click();
  await page.getByText(/^Show \d+ itiner(ary|aries)|No exact matches/).click();

  await expect(page).toHaveURL(/duration=/);
});

test('the bookmark refuses honestly rather than pretending to save', async ({ page, signal }) => {
  await page.goto('/discovery-results');
  await labelled(page, 'to trip ideas').click();

  await expect.poll(() => signal.dialogs.join(' ')).toMatch(/coming soon|still being built/i);
});

test('the author tap refuses honestly too — no dead clicks on either control', async ({ page, signal }) => {
  await page.goto('/discovery-results');
  await labelled(page, 'Open the profile of').click();

  await expect.poll(() => signal.dialogs.length).toBeGreaterThan(0);
});

test('a card opens the published itinerary view that already exists', async ({ page }) => {
  await page.goto(`/discovery-results?destination=${encodeURIComponent(`Kyoto ${mark}`)}`);
  await labelStarting(page, `Kyoto temples ${mark},`).click();

  await expect(page).toHaveURL(/\/published\//);
});

test('every discovery read is bearer-authenticated, with no page or console errors', async ({
  page,
  signal,
}) => {
  await page.goto('/discover');
  await expect(page.getByText(TRENDING_SECTION_TITLE)).toBeVisible();
  await page.getByText(SEE_ALL_LABEL, { exact: true }).first().click();
  await expect(page.getByText(/\d+ itiner(ary|aries)/)).toBeVisible();

  const anonymous = signal.apiRequests.filter(
    (request) => request.auth === 'ANON' && request.url.includes('/v1/discovery/'),
  );
  expect(anonymous.map((request) => request.url)).toEqual([]);
  expect(signal.pageErrors).toEqual([]);
  expect(signal.consoleErrors).toEqual([]);
});
