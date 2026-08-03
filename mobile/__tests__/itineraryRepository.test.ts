import { itineraryRepository } from '../src/repositories/itineraryRepository';



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

    expect(apiClient.get).toHaveBeenCalledWith('/v1/itineraries');
  });

  it('passes a cursor back exactly as it was handed one', async () => {
    apiClient.get.mockResolvedValue({ items: [] });

    await itineraryRepository.fetchMine('MDE5-abc');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/itineraries?cursor=MDE5-abc');
  });

  it('escapes a cursor rather than trusting its characters', async () => {
    apiClient.get.mockResolvedValue({ items: [] });

    await itineraryRepository.fetchMine('a+b/c=');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/itineraries?cursor=a%2Bb%2Fc%3D');
  });

  it('asks for the archived view only when asked to (S1.9)', async () => {
    apiClient.get.mockResolvedValue({ items: [] });

    await itineraryRepository.fetchMine(undefined, true);

    expect(apiClient.get).toHaveBeenCalledWith('/v1/itineraries?archived=true');
  });

  it('leaves the default list’s URL byte-identical to the pre-S1.9 one', async () => {
    apiClient.get.mockResolvedValue({ items: [] });

    await itineraryRepository.fetchMine(undefined, false);
    await itineraryRepository.fetchMine('MDE5-abc', false);

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/v1/itineraries');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/v1/itineraries?cursor=MDE5-abc');
  });

  it('threads a cursor through the archived view too', async () => {
    apiClient.get.mockResolvedValue({ items: [] });

    await itineraryRepository.fetchMine('MDE5-abc', true);

    expect(apiClient.get).toHaveBeenCalledWith('/v1/itineraries?cursor=MDE5-abc&archived=true');
  });
});

describe('unarchiving (S1.9 — the archive control itself was removed from the UI, founder 08/01)', () => {

  it('unarchives the same way', async () => {
    apiClient.post.mockResolvedValue({ id: 'abc', archived: false });

    await itineraryRepository.unarchiveTrip('abc');

    expect(apiClient.post).toHaveBeenCalledWith('/v1/itineraries/abc/unarchive', undefined);
  });
});

describe('publishing (S4.1)', () => {
  it('publishes with the chosen audience — public is the default the screen offers', async () => {
    apiClient.post.mockResolvedValue({ id: 'abc', status: 'public' });

    await itineraryRepository.publishTrip('abc', 'public');

    expect(apiClient.post).toHaveBeenCalledWith('/v1/itineraries/abc/publish', { audience: 'public' });
  });

  it('unpublishes symmetrically, on the same itinerary id', async () => {
    apiClient.post.mockResolvedValue({ id: 'abc', status: 'draft' });

    await itineraryRepository.unpublishTrip('abc');

    expect(apiClient.post).toHaveBeenCalledWith('/v1/itineraries/abc/unpublish', undefined);
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

    await itineraryRepository.reorderActivities('trip-1', 'day-1', {
      activityIds: ['c', 'a', 'b'],
      expectedActivityIds: ['a', 'b', 'c'],
    });

    expect(apiClient.put).toHaveBeenCalledWith('/v1/itineraries/trip-1/days/day-1/activities/order', {
      activityIds: ['c', 'a', 'b'],
      expectedActivityIds: ['a', 'b', 'c'],
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

describe('edit lease (S1.4 / ADR-014 as amended at S4.9 — every call names its subject)', () => {
  it('acquires a header lease, the shape the trip-fields editor uses', async () => {
    apiClient.post.mockResolvedValue({
      itineraryId: 'trip-1',
      subjectType: 'header',
      subjectId: 'trip-1',
      holderId: 'me',
      expiresAt: '2026-07-24T10:03:00Z',
    });

    await itineraryRepository.acquireEditLock('trip-1', { subjectType: 'header' });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/itineraries/trip-1/edit-lock', {
      subjectType: 'header',
    });
  });

  it('acquires an activity lease naming which activity', async () => {
    apiClient.post.mockResolvedValue({
      itineraryId: 'trip-1',
      subjectType: 'activity',
      subjectId: 'a-1',
      holderId: 'me',
      expiresAt: '2026-07-24T10:03:00Z',
    });

    await itineraryRepository.acquireEditLock('trip-1', { subjectType: 'activity', subjectId: 'a-1' });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/itineraries/trip-1/edit-lock', {
      subjectType: 'activity',
      subjectId: 'a-1',
    });
  });

  it('renews under /edit-lock/renew, for the subject it holds', async () => {
    apiClient.post.mockResolvedValue({
      itineraryId: 'trip-1',
      subjectType: 'day',
      subjectId: 'day-1',
      holderId: 'me',
      expiresAt: '2026-07-24T10:04:00Z',
    });

    await itineraryRepository.renewEditLock('trip-1', { subjectType: 'day', subjectId: 'day-1' });

    expect(apiClient.post).toHaveBeenCalledWith('/v1/itineraries/trip-1/edit-lock/renew', {
      subjectType: 'day',
      subjectId: 'day-1',
    });
  });

  it('releases with a DELETE carrying the subject — a release must not free somebody else', async () => {
    apiClient.delete.mockResolvedValue(undefined);

    await itineraryRepository.releaseEditLock('trip-1', { subjectType: 'activity', subjectId: 'a-1' });

    expect(apiClient.delete).toHaveBeenCalledWith('/v1/itineraries/trip-1/edit-lock', {
      subjectType: 'activity',
      subjectId: 'a-1',
    });
  });
});
