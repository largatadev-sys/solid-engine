import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { SeedFailure } from '../support/seed';

const OWNER = ownerTagFor('api/create-flow');

requireStack(OWNER);

let token: string;
let trip: string;
let day1: string;
let created: { status: number; body: any };
let activity: { status: number; body: any };

test.beforeAll(async () => {
  token = await tokenFor(OWNER);
  created = await api('/v1/itineraries', 'POST', token, {
    title: 'Island Hopping in El Nido',
    destination: 'Palawan',
    durationDays: 5,
    bestTimeOfYear: 'Dec - Apr',
    standouts: ['Big Lagoon Kayaking', 'Local Seafood Dinners'],
  });
  if (created.status !== 201) throw new SeedFailure('the create-flow trip', created.body);
  trip = created.body.id;
  day1 = created.body.days[0].id;

  activity = await api(`/v1/itineraries/${trip}/days/${day1}/activities`, 'POST', token, {
    title: 'Airport Transfer',
    timeOfDay: '14:00',
    costAmount: '500',
    costCurrency: 'PHP',
    place: 'Lio Airport',
    bookingPurpose: 'Van transfer',
    bookingProvider: 'Klook',
    externalUrl: 'https://klook.com/x',
    bookingPriceAmount: '1800',
    bookingPriceCurrency: 'PHP',
  });
});

test('create carries standouts and best time in one act', () => {
  expect(created.status).toBe(201);
  expect(created.body.standouts).toHaveLength(2);
  expect(created.body.bestTimeOfYear).toBe('Dec - Apr');
});

test('duration mints the days', () => {
  expect(created.body.days).toHaveLength(5);
});

test('the booking card round-trips whole', () => {
  expect(activity.status).toBe(201);
  expect(activity.body.bookingProvider).toBe('Klook');
  expect(activity.body.bookingPurpose).toBe('Van transfer');
  expect(String(activity.body.bookingPriceAmount)).toMatch(/^1800(\.00)?$/);
});

test('the booking price does not disturb the activity cost', () => {
  expect(String(activity.body.costAmount)).toMatch(/^500(\.00)?$/);
});

test('a booking price with no currency is refused', async () => {
  const refused = await api(`/v1/itineraries/${trip}/days/${day1}/activities`, 'POST', token, {
    title: 'X',
    bookingPriceAmount: '1800',
  });
  expect(refused.status).toBe(400);
});

test('the upcoming section filter finds a finished trip', async () => {
  const listed = await api('/v1/itineraries?category=upcoming', 'GET', token);
  expect(listed.body.items.map((row: { id: string }) => row.id)).toContain(trip);
});

test('the retired word is refused, not silently understood', async () => {
  const legacy = await api('/v1/itineraries?category=active', 'GET', token);
  expect(legacy.status).toBe(400);
  expect(legacy.body.code).toBe('UNKNOWN_TRIP_CATEGORY');
});

test('every row carries beingEdited for the card status slot', async () => {
  const all = await api('/v1/itineraries', 'GET', token);
  expect(all.body.items.every((row: { beingEdited: unknown }) => typeof row.beingEdited === 'boolean')).toBe(true);
});

test('a held trip reports beingEdited true', async () => {
  await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', token, {
    subjectType: 'day',
    subjectId: day1,
  });
  const held = await api('/v1/itineraries', 'GET', token);
  expect(held.body.items.find((row: { id: string }) => row.id === trip)?.beingEdited).toBe(true);
  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', token, {
    subjectType: 'day',
    subjectId: day1,
  });
});
