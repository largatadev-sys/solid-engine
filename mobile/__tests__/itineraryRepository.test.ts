import { itineraryRepository } from '../src/repositories/itineraryRepository';

/**
 * The itinerary repository (S0.3, ticket 06) — mocked at the apiClient boundary, the same seam
 * `healthRepository.test.ts` mocks (S0.1 convention).
 */

jest.mock('../src/api/apiClient', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const { apiClient } = jest.requireMock('../src/api/apiClient') as {
  apiClient: { get: jest.Mock; post: jest.Mock; patch: jest.Mock; put: jest.Mock; delete: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('reading the list', () => {
  it('asks for the first page with no cursor at all', async () => {
    apiClient.get.mockResolvedValue({ items: [] });

    await itineraryRepository.fetchMine();

    // Not "?cursor=undefined" — the server would try to decode that string and answer 400.
    expect(apiClient.get).toHaveBeenCalledWith('/v1/itineraries');
  });

  it('passes a cursor back exactly as it was handed one', async () => {
    apiClient.get.mockResolvedValue({ items: [] });

    await itineraryRepository.fetchMine('MDE5-abc');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/itineraries?cursor=MDE5-abc');
  });

  it('escapes a cursor rather than trusting its characters', async () => {
    // The cursor is opaque (Artifact 05): this layer must not assume base64url stays URL-safe, or
    // the day the server's cursor changes shape, pages silently start 400ing.
    apiClient.get.mockResolvedValue({ items: [] });

    await itineraryRepository.fetchMine('a+b/c=');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/itineraries?cursor=a%2Bb%2Fc%3D');
  });
});

describe('reading one and creating', () => {
  it('fetches a single itinerary by id', async () => {
    apiClient.get.mockResolvedValue({ id: 'abc' });

    await itineraryRepository.fetchOne('abc');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/itineraries/abc');
  });

  it('posts the create request as the API contract spells it', async () => {
    apiClient.post.mockResolvedValue({ id: 'abc' });
    const request = { title: 'Lisbon', destinations: ['Lisbon'] };

    await itineraryRepository.create(request);

    expect(apiClient.post).toHaveBeenCalledWith('/v1/itineraries', request);
  });

  it('edits the fields by PATCHing the itinerary (S1.3, ticket 04)', async () => {
    apiClient.patch.mockResolvedValue({ id: 'abc' });
    const request = { title: 'Renamed', destinations: ['Palawan'], startDate: '2027-01-10' };

    await itineraryRepository.update('abc', request);

    expect(apiClient.patch).toHaveBeenCalledWith('/v1/itineraries/abc', request);
  });
});

describe('the day operations (S1.3)', () => {
  it('appends a day under the itinerary, itinerary-addressed (no workspace id on the wire)', async () => {
    apiClient.post.mockResolvedValue({ id: 'day-1' });

    await itineraryRepository.appendDay('trip-1', { title: 'Arrival' });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/itineraries/trip-1/days', { title: 'Arrival' });
  });

  it('renames a day by patching it under its itinerary', async () => {
    apiClient.patch.mockResolvedValue({ id: 'day-1' });

    await itineraryRepository.renameDay('trip-1', 'day-1', { title: 'Arrival Day' });

    expect(apiClient.patch).toHaveBeenCalledWith('/v1/itineraries/trip-1/days/day-1', { title: 'Arrival Day' });
  });

  it('deletes a day by id under its itinerary', async () => {
    apiClient.delete.mockResolvedValue(undefined);

    await itineraryRepository.deleteDay('trip-1', 'day-1');

    expect(apiClient.delete).toHaveBeenCalledWith('/v1/itineraries/trip-1/days/day-1');
  });
});

describe('the activity operations (S1.3, ticket 02)', () => {
  const request = { title: 'Airport Transfer' };

  it('creates an activity under its day, itinerary- and day-addressed', async () => {
    apiClient.post.mockResolvedValue({ id: 'a-1' });

    await itineraryRepository.createActivity('trip-1', 'day-1', request);

    expect(apiClient.post).toHaveBeenCalledWith('/v1/itineraries/trip-1/days/day-1/activities', request);
  });

  it('edits an activity by patching it under its day', async () => {
    apiClient.patch.mockResolvedValue({ id: 'a-1' });

    await itineraryRepository.editActivity('trip-1', 'day-1', 'a-1', request);

    expect(apiClient.patch).toHaveBeenCalledWith('/v1/itineraries/trip-1/days/day-1/activities/a-1', request);
  });

  it('deletes an activity by id under its day', async () => {
    apiClient.delete.mockResolvedValue(undefined);

    await itineraryRepository.deleteActivity('trip-1', 'day-1', 'a-1');

    expect(apiClient.delete).toHaveBeenCalledWith('/v1/itineraries/trip-1/days/day-1/activities/a-1');
  });
});

describe('reorder and move (S1.3, ticket 03)', () => {
  it('reorders a day by PUTting the whole ordered list', async () => {
    apiClient.put.mockResolvedValue(undefined);

    await itineraryRepository.reorderActivities('trip-1', 'day-1', { activityIds: ['c', 'a', 'b'] });

    expect(apiClient.put).toHaveBeenCalledWith('/v1/itineraries/trip-1/days/day-1/activities/order', {
      activityIds: ['c', 'a', 'b'],
    });
  });

  it('moves an activity to another day', async () => {
    apiClient.post.mockResolvedValue({ id: 'a-1' });

    await itineraryRepository.moveActivity('trip-1', 'day-1', 'a-1', { targetDayId: 'day-2' });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/itineraries/trip-1/days/day-1/activities/a-1/move', {
      targetDayId: 'day-2',
    });
  });
});
