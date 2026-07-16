import { QueryClient } from '@tanstack/react-query';
import {
  findInListCache,
  itineraryKeys,
  itineraryOptions,
  myItinerariesOptions,
  onItineraryCreated,
} from '../src/query/itineraryQueries';
import type { ItineraryResponse } from '../src/types/api';

/**
 * The query layer (S0.3, ticket 06) — ADR-001's "reads through a local store the network populates",
 * asserted rather than assumed.
 *
 * Driven through a real QueryClient with no renderer: the options objects hold every decision worth
 * testing, so this exercises the cache contract itself. (@testing-library/react-native 14 renders
 * nothing under jest-expo's preset — recorded in the ticket comments. The split it forced turned out
 * to be the better shape anyway.)
 *
 * Mocked at the repository boundary: what is under test is the cache, not the network.
 */

jest.mock('../src/repositories/itineraryRepository', () => ({
  itineraryRepository: { fetchMine: jest.fn(), fetchOne: jest.fn(), create: jest.fn() },
}));

const { itineraryRepository } = jest.requireMock('../src/repositories/itineraryRepository') as {
  itineraryRepository: { fetchMine: jest.Mock; fetchOne: jest.Mock; create: jest.Mock };
};

/** The server's shape, nulls and all — see `formatDates.test.ts` for why that matters. */
const trip = (id: string, title: string): ItineraryResponse => ({
  id,
  title,
  destinations: ['Sapporo'],
  startDate: null,
  endDate: null,
  state: 'draft',
  visibility: 'private',
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

    // undefined, not the string "undefined" — the server would try to decode that and answer 400.
    expect(itineraryRepository.fetchMine).toHaveBeenCalledWith(undefined);
    expect(data.pages[0]?.items[0]?.title).toBe('Lisbon');
  });

  it('threads the server-s cursor into the next page, untouched', async () => {
    // `pages: 2` is what asks for a second page: fetchInfiniteQuery re-walks the traversal from the
    // start, taking each page's cursor from the one before — which is exactly the threading under
    // test. (Calling it twice without `pages` just refetches page one, and asserts nothing.)
    itineraryRepository.fetchMine
      .mockResolvedValueOnce({ items: [trip('2', 'second')], nextCursor: 'opaque-cursor' })
      .mockResolvedValueOnce({ items: [trip('1', 'first')] });

    const data = await freshClient().fetchInfiniteQuery({ ...myItinerariesOptions, pages: 2 });

    expect(itineraryRepository.fetchMine).toHaveBeenNthCalledWith(1, undefined);
    expect(itineraryRepository.fetchMine).toHaveBeenNthCalledWith(2, 'opaque-cursor');
    expect(data.pages).toHaveLength(2);
  });

  it('stops when the server sends no cursor back', () => {
    // getNextPageParam is what "hasNextPage" is computed from: undefined means exhausted. Its other
    // three arguments (all pages, all params, the current param) are unused by this implementation —
    // the cursor comes from the last page and nowhere else — but the signature is the library's.
    const exhausted = { items: [] };
    const more = { items: [], nextCursor: 'more' };

    expect(myItinerariesOptions.getNextPageParam(exhausted, [exhausted], undefined, [undefined])).toBeUndefined();
    expect(myItinerariesOptions.getNextPageParam(more, [more], undefined, [undefined])).toBe('more');
  });
});

describe('one itinerary', () => {
  it('is seeded from the list-s cache — the point of the store', async () => {
    // Opening a trip from the list is the only route into the detail screen, so the row is already
    // in memory and the screen should not spinner for it. `initialData` is what carries that, and
    // it is a useQuery-only concept (fetchQuery deliberately bypasses it), so the seeding *source*
    // is what is asserted here — the one line that wires it into the options is not worth a
    // renderer. What that line cannot get wrong, it also cannot hide.
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
    // The load-bearing behaviour: without the invalidation a traveler creates a trip, lands back on
    // My Trips, and does not see it — the cache still holds the list from before it existed.
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
