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
import type {
  ActivityRequest,
  ActivityResponse,
  CreateItineraryRequest,
  DayResponse,
  ItineraryResponse,
  Page,
  UpdateItineraryRequest,
} from '../types/api';

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
  /**
   * The trip list, keyed by which view it is (S1.9).
   *
   * **The `archived` flag has to be in the key.** The two views are different server responses, so a
   * shared key would let the archived view's pages overwrite the default list's in the same cache
   * entry — the trips would appear to vanish and reappear depending on which screen was opened last.
   *
   * `lists()` is the prefix that invalidates *both*, which is what every archive/unarchive must do: a
   * trip moves from one view to the other, so refreshing only the one you are looking at leaves the
   * other holding a row that has left it.
   */
  lists: () => [...itineraryKeys.all, 'list'] as const,
  list: (archived = false) => [...itineraryKeys.lists(), { archived }] as const,
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
  queryKey: itineraryKeys.list(false),
  queryFn: ({ pageParam }: { pageParam: string | undefined }) => itineraryRepository.fetchMine(pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage: Page<ItineraryResponse>) => lastPage.nextCursor,
});

/**
 * The archived trips (S1.9) — the same list, the other side of the filter.
 *
 * A function rather than a constant because it mirrors `myItinerariesOptions` at a different key; the
 * shape is identical, which is the point: the archived view is not a special screen, it is My Trips
 * asking a different question. **Available to members, not just the owner** — hiding an archived trip
 * from the people on it would repeat, one level up, the failure S1.5 had to fix in copy (a trip
 * vanishing with no explanation reads as data loss).
 */
export const archivedItinerariesOptions = infiniteQueryOptions({
  queryKey: itineraryKeys.list(true),
  queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
    itineraryRepository.fetchMine(pageParam, true),
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
  await client.invalidateQueries({ queryKey: itineraryKeys.lists() });
}

/**
 * What must happen after any day mutation (add / rename / delete): the single-itinerary cache holds
 * the embedded plan, so it is now stale and must refetch to show the changed days.
 *
 * Not optimistic, for the create's reason and one more: a delete *renumbers* every later day on the
 * server (ADR-013's contiguity), so the client cannot predict the resulting ordinals without
 * replaying that logic — and a wrong guess would flash an incorrect plan. A refetch is one round trip
 * and always right. The list cache is untouched: a day change does not alter the trip card.
 */
export async function onPlanChanged(client: QueryClient, itineraryId: string): Promise<void> {
  await client.invalidateQueries({ queryKey: itineraryKeys.one(itineraryId) });
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

/**
 * Edit an itinerary's own fields (S1.3, ticket 04). The response is the updated itinerary — seed the
 * detail cache from it (no refetch needed), and invalidate the list because the title/dates on the
 * trip card may have changed.
 */
export async function onItineraryUpdated(client: QueryClient, updated: ItineraryResponse): Promise<void> {
  client.setQueryData(itineraryKeys.one(updated.id), updated);
  await client.invalidateQueries({ queryKey: itineraryKeys.lists() });
}

export function useUpdateItinerary(
  id: string,
): UseMutationResult<ItineraryResponse, Error, UpdateItineraryRequest> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: UpdateItineraryRequest) => itineraryRepository.update(id, request),
    onSuccess: (updated) => onItineraryUpdated(client, updated),
  });
}

/**
 * Start the trip, or mark it complete (S1.7) — `draft → active → completed`.
 *
 * Both reuse `onItineraryUpdated`: the response is the whole updated itinerary, so the detail cache is
 * seeded from it directly and the list is invalidated because **the trip card carries the state
 * badge** — without that invalidation the owner transitions a trip, returns to My Trips, and sees the
 * old badge on a row that is no longer accurate. Exactly the shape the create's comment warns about.
 *
 * Not optimistic. The server is the authority on whether the transition was legal at all (a 409 means
 * this screen was stale), and an optimistic badge flip would show a state the server then refused.
 */
export function useStartTrip(id: string): UseMutationResult<ItineraryResponse, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => itineraryRepository.startTrip(id),
    onSuccess: (updated) => onItineraryUpdated(client, updated),
  });
}

export function useCompleteTrip(id: string): UseMutationResult<ItineraryResponse, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => itineraryRepository.completeTrip(id),
    onSuccess: (updated) => onItineraryUpdated(client, updated),
  });
}

/**
 * Archive the trip, or bring it back (S1.9).
 *
 * Both reuse `onItineraryUpdated`, which invalidates `lists()` — **the prefix covering both views, and
 * that is the load-bearing part here**. An archive moves the trip from the default list to the archived
 * one, so invalidating only the view currently on screen leaves the other holding a row that has left
 * it: the traveler archives a trip, opens the archived view, and does not see it (or unarchives and
 * still sees it there). The single-view key that shipped before S1.9 would have done exactly that.
 *
 * Not optimistic, for the lifecycle transitions' reason: the server decides whether the edge was legal
 * at all, and a 409 means this screen was stale.
 */
export function useArchiveTrip(id: string): UseMutationResult<ItineraryResponse, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => itineraryRepository.archiveTrip(id),
    onSuccess: (updated) => onItineraryUpdated(client, updated),
  });
}

export function useUnarchiveTrip(id: string): UseMutationResult<ItineraryResponse, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => itineraryRepository.unarchiveTrip(id),
    onSuccess: (updated) => onItineraryUpdated(client, updated),
  });
}

export function useArchivedItineraries(): UseInfiniteQueryResult<InfiniteData<Page<ItineraryResponse>>> {
  return useInfiniteQuery(archivedItinerariesOptions);
}

/** Append a day to a plan (S1.3). The itinerary id is fixed at the hook; the title is per-call. */
export function useAppendDay(itineraryId: string): UseMutationResult<DayResponse, Error, { title?: string }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: { title?: string }) => itineraryRepository.appendDay(itineraryId, request),
    onSuccess: () => onPlanChanged(client, itineraryId),
  });
}

/** Rename a day (S1.3). */
export function useRenameDay(
  itineraryId: string,
): UseMutationResult<DayResponse, Error, { dayId: string; title?: string }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, title }: { dayId: string; title?: string }) =>
      itineraryRepository.renameDay(itineraryId, dayId, { title }),
    onSuccess: () => onPlanChanged(client, itineraryId),
  });
}

/** Delete a day; the server renumbers the survivors (S1.3, ADR-013). */
export function useDeleteDay(itineraryId: string): UseMutationResult<void, Error, { dayId: string }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId }: { dayId: string }) => itineraryRepository.deleteDay(itineraryId, dayId),
    onSuccess: () => onPlanChanged(client, itineraryId),
  });
}

/**
 * Create an activity on a day (S1.3, ticket 02). Like the day mutations, it invalidates the single
 * trip so the embedded plan refetches — the new activity's server-assigned id and sort order make an
 * optimistic insert a guess, so a refetch is the honest move.
 */
export function useCreateActivity(
  itineraryId: string,
): UseMutationResult<ActivityResponse, Error, { dayId: string; request: ActivityRequest }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, request }: { dayId: string; request: ActivityRequest }) =>
      itineraryRepository.createActivity(itineraryId, dayId, request),
    onSuccess: () => onPlanChanged(client, itineraryId),
  });
}

/** Edit an activity — whole-entity, last-write-wins (S1.3). */
export function useEditActivity(
  itineraryId: string,
): UseMutationResult<ActivityResponse, Error, { dayId: string; activityId: string; request: ActivityRequest }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, activityId, request }: { dayId: string; activityId: string; request: ActivityRequest }) =>
      itineraryRepository.editActivity(itineraryId, dayId, activityId, request),
    onSuccess: () => onPlanChanged(client, itineraryId),
  });
}

/** Delete an activity (S1.3). */
export function useDeleteActivity(
  itineraryId: string,
): UseMutationResult<void, Error, { dayId: string; activityId: string }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, activityId }: { dayId: string; activityId: string }) =>
      itineraryRepository.deleteActivity(itineraryId, dayId, activityId),
    onSuccess: () => onPlanChanged(client, itineraryId),
  });
}

/**
 * Reorder a day's activities (S1.3, ticket 03). The caller computes the new order (see
 * `reorderActivityIds`) and sends the whole list; a refetch then shows the server's confirmed order.
 */
export function useReorderActivities(
  itineraryId: string,
): UseMutationResult<DayResponse, Error, { dayId: string; activityIds: string[] }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, activityIds }: { dayId: string; activityIds: string[] }) =>
      itineraryRepository.reorderActivities(itineraryId, dayId, { activityIds }),
    onSuccess: () => onPlanChanged(client, itineraryId),
  });
}

/** Move an activity to another day, landing at its end (S1.3, ticket 03). */
export function useMoveActivity(
  itineraryId: string,
): UseMutationResult<ActivityResponse, Error, { dayId: string; activityId: string; targetDayId: string }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, activityId, targetDayId }: { dayId: string; activityId: string; targetDayId: string }) =>
      itineraryRepository.moveActivity(itineraryId, dayId, activityId, { targetDayId }),
    onSuccess: () => onPlanChanged(client, itineraryId),
  });
}
