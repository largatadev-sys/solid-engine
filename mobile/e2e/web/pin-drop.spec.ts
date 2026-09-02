import { test, expect, lastOpenedUrl } from '../support/fixtures';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { climbTo, seedPlan, seedTrip, stamp } from '../support/seed';
import { api } from '../support/pool';
import { labelled } from '../support/screen';
import { OPEN_IN_MAPS, pinnedLinkLabel, viewerLabel } from '../../src/maps/mapCopy';
import { mapsLinkLabel } from '../../src/places/mapsQuery';

const OWNER = ownerTagFor('web/pin-drop');

requireStack(OWNER);

const BIG_LAGOON = { lat: 11.1949, lng: 119.4013, zoom: 15 };

const PINNED = 'Big Lagoon';

const TEXT_ONLY = 'Somewhere Nobody Pinned';

let publishedId: string;
let tripTitle: string;

test.beforeAll(async () => {
  tripTitle = `Pin drop ${stamp('PL-2')}`;
  const trip = await seedTrip({
    ownerTag: OWNER,
    title: tripTitle,
    destination: 'El Nido, Palawan',
    durationDays: 1,
  });

  await seedPlan(trip, [
    { title: 'Kayak the lagoon', place: PINNED, pin: BIG_LAGOON },
    { title: 'Wander', place: TEXT_ONLY },
  ]);

  await climbTo(trip, 'completed');
  const published = await api(`/v1/itineraries/${trip.id}/publish`, 'POST', trip.ownerToken, {
    audience: 'public',
  });
  expect(published.status).toBe(200);
  publishedId = trip.id;
});


test.describe('a pinned place opens in-app; a text-only place still hands off (PL-2)', () => {

  test('the pin round-trips through the API exactly as it was dropped', async () => {
    const projection = await api(`/v1/published/${publishedId}`, 'GET');

    expect(projection.status).toBe(200);
    const activities = projection.body.days[0].activities;
    const pinned = activities.find((a: { place: string }) => a.place === PINNED);
    const typed = activities.find((a: { place: string }) => a.place === TEXT_ONLY);

    expect(Number(pinned.pin.lat)).toBeCloseTo(BIG_LAGOON.lat, 4);
    expect(Number(pinned.pin.lng)).toBeCloseTo(BIG_LAGOON.lng, 4);
    expect(pinned.pin.zoom).toBe(BIG_LAGOON.zoom);
    expect(typed.pin).toBeNull();
  });


  test('a pinned place opens the in-app viewer rather than leaving the app', async ({ page }) => {
    await page.goto(`/published/${publishedId}`);
    await expect(labelled(page, pinnedLinkLabel(PINNED)).last()).toBeVisible({ timeout: 20_000 });

    await labelled(page, pinnedLinkLabel(PINNED)).last().click();

    await expect(labelled(page, viewerLabel(PINNED)).last()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/map\?/);
    expect(await lastOpenedUrl(page)).toBeUndefined();
  });


  test('the viewer offers the Google Maps escape it exists beside', async ({ page }) => {
    await page.goto(`/published/${publishedId}`);
    await labelled(page, pinnedLinkLabel(PINNED)).last().click();
    await expect(labelled(page, viewerLabel(PINNED)).last()).toBeVisible({ timeout: 15_000 });

    await labelled(page, OPEN_IN_MAPS).last().click();

    await expect
      .poll(() => lastOpenedUrl(page), { timeout: 15_000 })
      .toContain('google.com/maps/search');
  });


  test('a text-only place still opens Google Maps, exactly as PL-1 shipped it', async ({ page }) => {
    await page.goto(`/published/${publishedId}`);
    await expect(labelled(page, mapsLinkLabel(TEXT_ONLY)).last()).toBeVisible({ timeout: 20_000 });

    await labelled(page, mapsLinkLabel(TEXT_ONLY)).last().click();

    await expect
      .poll(() => lastOpenedUrl(page), { timeout: 15_000 })
      .toContain('google.com/maps/search');
    await expect(page).not.toHaveURL(/\/map\?/);
  });


  test('the viewer names the place, never its coordinates', async ({ page }) => {
    await page.goto(`/published/${publishedId}`);
    await labelled(page, pinnedLinkLabel(PINNED)).last().click();
    await expect(labelled(page, viewerLabel(PINNED)).last()).toBeVisible({ timeout: 15_000 });

    const spoken = await page.locator('body').innerText();

    expect(spoken).toContain(PINNED);
    expect(spoken).not.toContain(String(BIG_LAGOON.lat));
    expect(spoken).not.toContain(String(BIG_LAGOON.lng));
  });


  test('the map credits OpenStreetMap, because attribution is a licence obligation', async ({ page }) => {
    await page.goto(`/published/${publishedId}`);
    await labelled(page, pinnedLinkLabel(PINNED)).last().click();
    await expect(labelled(page, viewerLabel(PINNED)).last()).toBeVisible({ timeout: 15_000 });

    await expect(page.locator('text=/OpenStreetMap/i').last()).toBeVisible({ timeout: 15_000 });
  });
});
