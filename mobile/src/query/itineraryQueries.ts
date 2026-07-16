import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { itineraryRepository } from '../repositories/itineraryRepository';
import type { CreateItineraryRequest, ItineraryResponse, Page } from '../types/api';

/**
 * The itinerary read/write seam for screens (ADR-001): UI -> query cache -> repository -> apiClient.
 *
 * Screens import the hooks at the bottom and nothing below them: they never see `apiClient`, never
 * hold a cursor, and never decide when to refetch.
 *
 * WHY THE OPTIONS ARE SEPARATE FROM THE HOOKS. The options objects below hold every decision worth
 * testing — the keys, the cursor threading, what invalidates what — and they are plain data, so a
 * test drives them through a real QueryClient with no renderer involved. The hooks are then one-line
 * wrappers with nowhere for logic to hide. This split was forced by a broken tool (@testing-library
 * /react-native 14 renders nothing under jest-expo's preset — see the S0.3 ticket comments) and kept
 * because it is the better shape: the cache contract is provable, and the untested part is trivial.
 */

/**
 * Query keys, in one place.
 *
 * Scattered key literals are how a cache quietly stops invalidating: one screen writes
 * `['itineraries']`, another reads `['itinerary-list']`, and the list simply never refreshes after a
 * create. The bug looks like "the app is stale", not like a typo.
 */
export const itineraryKeys = {
  all: ['itineraries'] as const,
  list: () => [...itineraryKeys.all, 'list'] as const,
  one: (id: string) => [...itineraryKeys.all, 'one', id] as const,
};

/**
 * The traveler's own itineraries, newest first, paginated.
 *
 * The cursor is threaded here and nowhere else: `getNextPageParam` hands back exactly what the
 * server sent, so it stays opaque (Artifact 05) and its internals can change without this app
 * noticing. `undefined` for the first page — never the string "undefined", which the server would
 * try to decode and reject.
 */
export const myItinerariesOptions = infiniteQueryOptions({
  queryKey: itineraryKeys.list(),
  queryFn: ({ pageParam }: { pageParam: string | undefined }) => itineraryRepository.fetchMine(pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage: Page<ItineraryResponse>) => lastPage.nextCursor,
});

/**
 * One itinerary, seeded from the list's cache when it is there.
 *
 * Opening a trip from the list — the only route into the detail screen — should not show a spinner
 * for a row already on screen. It still refetches in the background, so a stale row corrects itself.
 */
export function itineraryOptions(id: string, client: QueryClient) {
  return queryOptions({
    queryKey: itineraryKeys.one(id),
    queryFn: () => itineraryRepository.fetchOne(id),
    initialData: () => findInListCache(client, id),
  });
}

/** Reads a single itinerary out of the list's paginated cache, if the list has been fetched. */
export function findInListCache(client: QueryClient, id: string): ItineraryResponse | undefined {
  return client
    .getQueryData<InfiniteData<Page<ItineraryResponse>>>(itineraryKeys.list())
    ?.pages.flatMap((page) => page.items)
    .find((itinerary) => itinerary.id === id);
}

/**
 * What must happen after a create, wherever it is called from.
 *
 * The invalidation is the load-bearing line: without it a traveler creates a trip, lands back on My
 * Trips, and does not see it — the cache still holds the list it fetched before the trip existed.
 * Invalidating marks it stale so the list refetches on sight.
 *
 * Deliberately not an optimistic update: a server-assigned id, `createdAt`, and the newest-first
 * ordering all mean the client would be guessing at the row it inserts. Optimism is for when the
 * client knows what the answer will be.
 */
export async function onItineraryCreated(client: QueryClient, created: ItineraryResponse): Promise<void> {
  // Seed the detail cache from the response we already hold: opening the new trip immediately after
  // creating it is the likeliest next tap, and it has no reason to hit the network.
  client.setQueryData(itineraryKeys.one(created.id), created);
  await client.invalidateQueries({ queryKey: itineraryKeys.list() });
}

// ─── The hooks screens use. Thin by design; the decisions are above. ──────────────────────────────

export function useMyItineraries(): UseInfiniteQueryResult<InfiniteData<Page<ItineraryResponse>>> {
  return useInfiniteQuery(myItinerariesOptions);
}

export function useItinerary(id: string): UseQueryResult<ItineraryResponse> {
  const client = useQueryClient();
  return useQuery(itineraryOptions(id, client));
}

export function useCreateItinerary(): UseMutationResult<ItineraryResponse, Error, CreateItineraryRequest> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateItineraryRequest) => itineraryRepository.create(request),
    onSuccess: (created) => onItineraryCreated(client, created),
  });
}
