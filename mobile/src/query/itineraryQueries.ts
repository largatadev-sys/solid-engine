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
import { useAuth } from '../hooks/authContext';
import { itineraryRepository } from '../repositories/itineraryRepository';
import type {
  ActivityRequest,
  ActivityResponse,
  CreateItineraryRequest,
  DayResponse,
  ItineraryResponse,
  Page,
  PublishedItineraryResponse,
  TripCategory,
  UpdateItineraryRequest,
} from '../types/api';




export const itineraryKeys = {
  all: ['itineraries'] as const,

  lists: () => [...itineraryKeys.all, 'list'] as const,
  list: (archived = false, category?: TripCategory) =>
    [...itineraryKeys.lists(), { archived, category: category ?? null }] as const,
  one: (id: string) => [...itineraryKeys.all, 'one', id] as const,

  published: (id: string) => [...itineraryKeys.all, 'published', id] as const,

  preview: (id: string) => [...itineraryKeys.all, 'preview', id] as const,
};


export function myItinerariesOptionsFor(category?: TripCategory) {
  return infiniteQueryOptions({
    queryKey: itineraryKeys.list(false, category),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      itineraryRepository.fetchMine(pageParam, false, category),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: Page<ItineraryResponse>) => lastPage.nextCursor,
  });
}


export const myItinerariesOptions = myItinerariesOptionsFor(undefined);


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


export function useMyItineraries(
  category?: TripCategory,
): UseInfiniteQueryResult<InfiniteData<Page<ItineraryResponse>>> {
  const { kind } = useAuth();
  return useInfiniteQuery({ ...myItinerariesOptionsFor(category), enabled: kind === 'signedIn' });
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



export function useUnarchiveTrip(id: string): UseMutationResult<ItineraryResponse, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => itineraryRepository.unarchiveTrip(id),
    onSuccess: (updated) => onItineraryUpdated(client, updated),
  });
}

export function usePublishedItinerary(id: string): UseQueryResult<PublishedItineraryResponse> {
  const { kind } = useAuth();
  return useQuery({
    queryKey: itineraryKeys.published(id),
    queryFn: () => itineraryRepository.fetchPublished(id),
    enabled: kind === 'signedIn',
    retry: false,
  });
}


export function useItineraryPreview(id: string): UseQueryResult<PublishedItineraryResponse> {
  const { kind } = useAuth();
  return useQuery({
    queryKey: itineraryKeys.preview(id),
    queryFn: () => itineraryRepository.fetchPreview(id),
    enabled: kind === 'signedIn',
    retry: false,
  });
}


export function usePublishTrip(id: string): UseMutationResult<ItineraryResponse, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => itineraryRepository.publishTrip(id),
    onSuccess: async (updated) => {
      await onItineraryUpdated(client, updated);
      await client.invalidateQueries({ queryKey: itineraryKeys.published(id) });
    },
  });
}

export function useUnpublishTrip(id: string): UseMutationResult<ItineraryResponse, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => itineraryRepository.unpublishTrip(id),
    onSuccess: async (updated) => {
      await onItineraryUpdated(client, updated);
      await client.invalidateQueries({ queryKey: itineraryKeys.published(id) });
    },
  });
}

export function useArchivedItineraries(): UseInfiniteQueryResult<InfiniteData<Page<ItineraryResponse>>> {
  const { kind } = useAuth();
  return useInfiniteQuery({ ...archivedItinerariesOptions, enabled: kind === 'signedIn' });
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


export type ReorderIntent = { dayId: string; activityIds: string[]; expectedActivityIds: string[] };


export function useReorderActivities(
  itineraryId: string,
): UseMutationResult<DayResponse, Error, ReorderIntent> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, activityIds, expectedActivityIds }: ReorderIntent) =>
      itineraryRepository.reorderActivities(itineraryId, dayId, { activityIds, expectedActivityIds }),
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
