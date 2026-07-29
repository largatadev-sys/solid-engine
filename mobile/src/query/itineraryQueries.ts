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




export const itineraryKeys = {
  all: ['itineraries'] as const,

  lists: () => [...itineraryKeys.all, 'list'] as const,
  list: (archived = false) => [...itineraryKeys.lists(), { archived }] as const,
  one: (id: string) => [...itineraryKeys.all, 'one', id] as const,
};


export const myItinerariesOptions = infiniteQueryOptions({
  queryKey: itineraryKeys.list(false),
  queryFn: ({ pageParam }: { pageParam: string | undefined }) => itineraryRepository.fetchMine(pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage: Page<ItineraryResponse>) => lastPage.nextCursor,
});


export const archivedItinerariesOptions = infiniteQueryOptions({
  queryKey: itineraryKeys.list(true),
  queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
    itineraryRepository.fetchMine(pageParam, true),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage: Page<ItineraryResponse>) => lastPage.nextCursor,
});


export function itineraryOptions(id: string, client: QueryClient) {
  return queryOptions({
    queryKey: itineraryKeys.one(id),
    queryFn: () => itineraryRepository.fetchOne(id),
    placeholderData: () => findInListCache(client, id),
  });
}


export function findInListCache(client: QueryClient, id: string): ItineraryResponse | undefined {
  return client
    .getQueryData<InfiniteData<Page<ItineraryResponse>>>(itineraryKeys.list())
    ?.pages.flatMap((page) => page.items)
    .find((itinerary) => itinerary.id === id);
}


export async function onItineraryCreated(client: QueryClient, created: ItineraryResponse): Promise<void> {
  client.setQueryData(itineraryKeys.one(created.id), created);
  await client.invalidateQueries({ queryKey: itineraryKeys.lists() });
}


export async function onPlanChanged(client: QueryClient, itineraryId: string): Promise<void> {
  await client.invalidateQueries({ queryKey: itineraryKeys.one(itineraryId) });
}


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


export function useAppendDay(itineraryId: string): UseMutationResult<DayResponse, Error, { title?: string }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: { title?: string }) => itineraryRepository.appendDay(itineraryId, request),
    onSuccess: () => onPlanChanged(client, itineraryId),
  });
}


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


export function useDeleteDay(itineraryId: string): UseMutationResult<void, Error, { dayId: string }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId }: { dayId: string }) => itineraryRepository.deleteDay(itineraryId, dayId),
    onSuccess: () => onPlanChanged(client, itineraryId),
  });
}


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
