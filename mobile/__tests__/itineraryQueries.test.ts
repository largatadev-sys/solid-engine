import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import {
  archivedItinerariesOptions,
  findInListCache,
  itineraryKeys,
  itineraryOptions,
  myItinerariesOptions,
  onItineraryCreated,
  onItineraryUpdated,
  onPlanChanged,
} from '../src/query/itineraryQueries';
import type { ItineraryResponse, Page } from '../src/types/api';



jest.mock('../src/repositories/itineraryRepository', () => ({
  itineraryRepository: {
    fetchMine: jest.fn(),
    fetchOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    appendDay: jest.fn(),
    renameDay: jest.fn(),
    deleteDay: jest.fn(),
  },
}));

const { itineraryRepository } = jest.requireMock('../src/repositories/itineraryRepository') as {
  itineraryRepository: {
    fetchMine: jest.Mock;
    fetchOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    appendDay: jest.Mock;
    renameDay: jest.Mock;
    deleteDay: jest.Mock;
  };
};


const trip = (id: string, title: string): ItineraryResponse => ({
  id,
  title,
  destinations: ['Sapporo'],
  description: null,
  standouts: [],
  bestTimeOfYear: null,
  coverImageUrl: null,
  startDate: null,
  endDate: null,
  state: 'draft',
  published: false,
  visibility: 'public',
  archived: false,
  lastEditedBy: null,
  lastEditedAt: null,
  days: [],
  createdAt: '2026-07-16T00:00:00Z',
});

function freshClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the list', () => {
  it('asks for the first page with no cursor', async () => {
    itineraryRepository.fetchMine.mockResolvedValue({ items: [trip('1', 'Lisbon')] });

    const data = await freshClient().fetchInfiniteQuery(myItinerariesOptions);

    expect(itineraryRepository.fetchMine).toHaveBeenCalledWith(undefined, false, undefined);
    expect(data.pages[0]?.items[0]?.title).toBe('Lisbon');
  });

  it('threads the server-s cursor into the next page, untouched', async () => {
    itineraryRepository.fetchMine
      .mockResolvedValueOnce({ items: [trip('2', 'second')], nextCursor: 'opaque-cursor' })
      .mockResolvedValueOnce({ items: [trip('1', 'first')] });

    const data = await freshClient().fetchInfiniteQuery({ ...myItinerariesOptions, pages: 2 });

    expect(itineraryRepository.fetchMine).toHaveBeenNthCalledWith(1, undefined, false, undefined);
    expect(itineraryRepository.fetchMine).toHaveBeenNthCalledWith(2, 'opaque-cursor', false, undefined);
    expect(data.pages).toHaveLength(2);
  });

  it('stops when the server sends no cursor back', () => {
    const exhausted = { items: [] };
    const more = { items: [], nextCursor: 'more' };

    expect(myItinerariesOptions.getNextPageParam(exhausted, [exhausted], undefined, [undefined])).toBeUndefined();
    expect(myItinerariesOptions.getNextPageParam(more, [more], undefined, [undefined])).toBe('more');
  });
});

describe('the archived view (S1.9)', () => {
  it('asks the repository for the archived half', async () => {
    itineraryRepository.fetchMine.mockResolvedValue({ items: [trip('1', 'Old Lisbon')] });

    await freshClient().fetchInfiniteQuery(archivedItinerariesOptions);

    expect(itineraryRepository.fetchMine).toHaveBeenCalledWith(undefined, true);
  });


  it('keeps the two lists in separate cache entries', async () => {
    const client = freshClient();
    itineraryRepository.fetchMine
      .mockResolvedValueOnce({ items: [trip('live', 'A live trip')] })
      .mockResolvedValueOnce({ items: [trip('gone', 'An archived trip')] });

    await client.fetchInfiniteQuery(myItinerariesOptions);
    await client.fetchInfiniteQuery(archivedItinerariesOptions);

    const live = client.getQueryData<InfiniteData<Page<ItineraryResponse>>>(itineraryKeys.list(false));
    const archived = client.getQueryData<InfiniteData<Page<ItineraryResponse>>>(itineraryKeys.list(true));

    expect(live?.pages[0]?.items[0]?.title).toBe('A live trip');
    expect(archived?.pages[0]?.items[0]?.title).toBe('An archived trip');
  });


  it('invalidates both views when a trip is archived', async () => {
    const client = freshClient();
    itineraryRepository.fetchMine.mockResolvedValue({ items: [] });
    await client.fetchInfiniteQuery(myItinerariesOptions);
    await client.fetchInfiniteQuery(archivedItinerariesOptions);

    await onItineraryUpdated(client, { ...trip('gone', 'An archived trip'), archived: true });

    expect(client.getQueryState(itineraryKeys.list(false))?.isInvalidated).toBe(true);
    expect(client.getQueryState(itineraryKeys.list(true))?.isInvalidated).toBe(true);
  });
});

describe('one itinerary', () => {
  it('is seeded from the list-s cache — the point of the store', async () => {
    const client = freshClient();
    itineraryRepository.fetchMine.mockResolvedValue({ items: [trip('abc', 'Lisbon')] });
    await client.fetchInfiniteQuery(myItinerariesOptions);

    expect(findInListCache(client, 'abc')?.title).toBe('Lisbon');
    expect(itineraryOptions('abc', client).queryKey).toEqual(itineraryKeys.one('abc'));
  });

  it('has nothing to seed when the cache has never seen the list', () => {
    expect(findInListCache(freshClient(), 'abc')).toBeUndefined();
  });

  it('fetches when the cache has never seen the trip', async () => {
    const client = freshClient();
    itineraryRepository.fetchOne.mockResolvedValue(trip('abc', 'Kyoto'));

    const itinerary = await client.fetchQuery(itineraryOptions('abc', client));

    expect(itineraryRepository.fetchOne).toHaveBeenCalledWith('abc');
    expect(itinerary.title).toBe('Kyoto');
  });

  it('never serves the seeded list row as fresh — a trip archived elsewhere still refetches', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    });
    itineraryRepository.fetchMine.mockResolvedValue({ items: [trip('abc', 'Osaka')] });
    await client.fetchInfiniteQuery(myItinerariesOptions);
    itineraryRepository.fetchOne.mockResolvedValue({ ...trip('abc', 'Osaka'), archived: true });

    const detail = await client.fetchQuery(itineraryOptions('abc', client));

    expect(itineraryRepository.fetchOne).toHaveBeenCalledWith('abc');
    expect(detail.archived).toBe(true);
  });

  it('finds a trip on any page of the cached list, not just the first', async () => {
    const client = freshClient();
    itineraryRepository.fetchMine
      .mockResolvedValueOnce({ items: [trip('1', 'page one')], nextCursor: 'c' })
      .mockResolvedValueOnce({ items: [trip('2', 'page two')] });
    await client.fetchInfiniteQuery(myItinerariesOptions);
    await client.fetchInfiniteQuery({ ...myItinerariesOptions, pages: 2 });

    expect(findInListCache(client, '2')?.title).toBe('page two');
  });
});

describe('after creating', () => {
  it('marks the list stale so a new trip cannot be missing from it', async () => {
    const client = freshClient();
    itineraryRepository.fetchMine.mockResolvedValue({ items: [] });
    await client.fetchInfiniteQuery(myItinerariesOptions);
    expect(client.getQueryState(itineraryKeys.list())?.isInvalidated).toBe(false);

    await onItineraryCreated(client, trip('new', 'Oslo'));

    expect(client.getQueryState(itineraryKeys.list())?.isInvalidated).toBe(true);
  });

  it('seeds the detail cache from the create response', async () => {
    const client = freshClient();

    await onItineraryCreated(client, trip('new', 'Oslo'));

    expect(client.getQueryData(itineraryKeys.one('new'))).toEqual(
      expect.objectContaining({ title: 'Oslo' }),
    );
    expect(itineraryRepository.fetchOne).not.toHaveBeenCalled();
  });
});

describe('after a field edit (S1.3, ticket 04)', () => {
  it('seeds the detail cache from the response and invalidates the list (title may have changed)', async () => {
    const client = freshClient();
    itineraryRepository.fetchMine.mockResolvedValue({ items: [trip('trip-1', 'Old name')] });
    await client.fetchInfiniteQuery(myItinerariesOptions);
    expect(client.getQueryState(itineraryKeys.list())?.isInvalidated).toBe(false);

    await onItineraryUpdated(client, trip('trip-1', 'New name'));

    expect(client.getQueryData(itineraryKeys.one('trip-1'))).toEqual(
      expect.objectContaining({ title: 'New name' }),
    );
    expect(client.getQueryState(itineraryKeys.list())?.isInvalidated).toBe(true);
  });
});

describe('after a day changes', () => {
  it('marks the single trip stale so the embedded plan refetches (S1.3)', async () => {
    const client = freshClient();
    itineraryRepository.fetchOne.mockResolvedValue(trip('trip-1', 'Palawan'));
    await client.fetchQuery(itineraryOptions('trip-1', client));
    expect(client.getQueryState(itineraryKeys.one('trip-1'))?.isInvalidated).toBe(false);

    await onPlanChanged(client, 'trip-1');

    expect(client.getQueryState(itineraryKeys.one('trip-1'))?.isInvalidated).toBe(true);
  });

  it('leaves the list cache untouched — a day change does not alter the trip card', async () => {
    const client = freshClient();
    itineraryRepository.fetchMine.mockResolvedValue({ items: [trip('trip-1', 'Palawan')] });
    await client.fetchInfiniteQuery(myItinerariesOptions);

    await onPlanChanged(client, 'trip-1');

    expect(client.getQueryState(itineraryKeys.list())?.isInvalidated).toBe(false);
  });
});
