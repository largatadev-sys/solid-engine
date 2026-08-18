import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP } from '../support/identities';
import { SeedFailure, stamp } from '../support/seed';

const PUBLISHER = ownerTagFor('api/discovery');
const BROWSER = IDENTITY_MAP['api/discovery'].tags[1]!;

requireStack(PUBLISHER);

interface Fixture {
  mark: string;
  kyoto: string;
  osaka: string;
  lima: string;
  hidden: string;
  archived: string;
  browserToken: string;
}

let fixture: Fixture;

async function publishedTrip(
  token: string,
  title: string,
  destination: string,
  durationDays: number,
): Promise<string> {
  const created = await api('/v1/itineraries', 'POST', token, {
    title,
    destination,
    durationDays,
  });
  if (created.status !== 201) throw new SeedFailure(`the trip "${title}"`, created.body);
  const id = created.body.id;
  for (const rung of ['finish-planning', 'start', 'complete']) {
    const moved = await api(`/v1/itineraries/${id}/${rung}`, 'POST', token);
    if (moved.status !== 200) throw new SeedFailure(`the climb through ${rung}`, moved.body);
  }
  const published = await api(`/v1/itineraries/${id}/publish`, 'POST', token, { audience: 'public' });
  if (published.status !== 200) throw new SeedFailure(`publishing "${title}"`, published.body);
  return id;
}

test.beforeAll(async () => {
  const publisherToken = await tokenFor(PUBLISHER);
  const browserToken = await tokenFor(BROWSER);
  const mark = stamp('d').split(' ')[1]!;

  const kyoto = await publishedTrip(publisherToken, `Kyoto temples ${mark}`, `Kyoto ${mark}`, 5);
  const osaka = await publishedTrip(publisherToken, `Osaka food ${mark}`, `Kyoto ${mark}`, 3);
  const lima = await publishedTrip(publisherToken, `Lima ceviche ${mark}`, `Lima ${mark}`, 12);

  const hidden = await publishedTrip(publisherToken, `Hidden trip ${mark}`, `Secretplace ${mark}`, 4);
  await api(`/v1/itineraries/${hidden}/audience`, 'POST', publisherToken, { audience: 'private' });

  const archived = await publishedTrip(publisherToken, `Archived trip ${mark}`, `Archivetown ${mark}`, 4);
  await api(`/v1/itineraries/${archived}/archive`, 'POST', publisherToken);

  fixture = { mark, kyoto, osaka, lima, hidden, archived, browserToken };
});

test('a published public trip reaches a stranger who shares no trip with its author', async () => {
  const browsed = await api('/v1/discovery/itineraries?limit=50', 'GET', fixture.browserToken);
  expect(browsed.status).toBe(200);
  expect(browsed.body.items.map((card: { id: string }) => card.id)).toContain(fixture.kyoto);
});

test('a published-but-private trip is absent from the strangers surface', async () => {
  const browsed = await api('/v1/discovery/itineraries?limit=50', 'GET', fixture.browserToken);
  expect(browsed.body.items.map((card: { id: string }) => card.id)).not.toContain(fixture.hidden);
});

test('an archived trip is absent however it was published', async () => {
  const browsed = await api('/v1/discovery/itineraries?limit=50', 'GET', fixture.browserToken);
  expect(browsed.body.items.map((card: { id: string }) => card.id)).not.toContain(fixture.archived);
});

test("the sheet's count agrees with the list it promises, under identical filters", async () => {
  const destination = encodeURIComponent(`Kyoto ${fixture.mark}`);
  const counted = await api(`/v1/discovery/count?destination=${destination}`, 'GET', fixture.browserToken);
  const listed = await api(
    `/v1/discovery/itineraries?destination=${destination}&limit=50`,
    'GET',
    fixture.browserToken,
  );
  expect(counted.body.count).toBe(listed.body.items.length);
});

test("the destination filter narrows to that destination's trips", async () => {
  const destination = encodeURIComponent(`Kyoto ${fixture.mark}`);
  const counted = await api(`/v1/discovery/count?destination=${destination}`, 'GET', fixture.browserToken);
  expect(counted.body.count).toBe(2);
});

test('the trending endpoint answers with a list', async () => {
  const trending = await api('/v1/discovery/trending', 'GET', fixture.browserToken);
  expect(trending.status).toBe(200);
  expect(Array.isArray(trending.body)).toBe(true);
});

test('trending ranks destinations by how many trips were published there', async () => {
  const trending = await api('/v1/discovery/trending', 'GET', fixture.browserToken);
  const rows: Array<{ destination: string; tripCount: number }> = Array.isArray(trending.body)
    ? trending.body
    : [];

  expect(rows.length).toBeGreaterThan(0);
  expect(rows.length).toBeLessThanOrEqual(12);
  expect(rows.every((row) => row.tripCount >= 1)).toBe(true);

  const counts = rows.map((row) => row.tripCount);
  expect(counts).toEqual([...counts].sort((left, right) => right - left));

  const ours = rows.find((row) => row.destination === `Kyoto ${fixture.mark}`);
  if (ours !== undefined) expect(ours.tripCount).toBe(2);
});

test('trending never leaks a private or archived destination', async () => {
  const trending = await api('/v1/discovery/trending', 'GET', fixture.browserToken);
  const rows: Array<{ destination: string }> = Array.isArray(trending.body) ? trending.body : [];
  expect(rows.some((row) => /Secretplace|Archivetown/.test(row.destination))).toBe(false);
});

test('suggestions group destinations and itineraries for a partial query', async () => {
  const suggested = await api('/v1/discovery/suggestions?q=Kyoto', 'GET', fixture.browserToken);
  const destinations: string[] = suggested.body.destinations ?? [];
  const titles: string[] = suggested.body.itineraries ?? [];

  expect(destinations.length).toBeGreaterThan(0);
  expect(titles.length).toBeGreaterThan(0);
  expect(destinations.length).toBeLessThanOrEqual(3);
  expect(titles.length).toBeLessThanOrEqual(3);
  expect(destinations.every((name) => /kyoto/i.test(name))).toBe(true);
  expect(titles.every((title) => /kyoto/i.test(title))).toBe(true);
});
