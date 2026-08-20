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
import { track } from '../analytics/track';
import { useAuth } from '../hooks/authContext';
import type { PickedPhoto } from '../media/pickedPhoto';
import { PHOTO_DUMP_PHOTO_ADDED, PHOTO_DUMP_PHOTO_REMOVED } from '../media/photoDumpEvents';
import { itineraryRepository } from '../repositories/itineraryRepository';
import type {
  ActivityRequest,
  ActivityResponse,
  CreateItineraryRequest,
  DayResponse,
  ItineraryResponse,
  Page,
  PhotoDumpEntryResponse,
  PublishAudience,
  PublishedItineraryResponse,
  SavePlanRequest,
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

  photoDump: (id: string) => [...itineraryKeys.all, 'photo-dump', id] as const,
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



export function useUploadCover(id: string): UseMutationResult<ItineraryResponse, Error, PickedPhoto> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (photo: PickedPhoto) => itineraryRepository.uploadCover(id, photo),
    onSuccess: (updated) => onItineraryUpdated(client, updated),
  });
}


export function useRemoveCover(id: string): UseMutationResult<void, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => itineraryRepository.removeCover(id),
    onSuccess: () => onPlanChanged(client, id),
  });
}


export function useUnarchiveTrip(id: string): UseMutationResult<ItineraryResponse, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => itineraryRepository.unarchiveTrip(id),
    onSuccess: (updated) => onItineraryUpdated(client, updated),
  });
}

export function useForkItinerary(sourceId: string): UseMutationResult<ItineraryResponse, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => itineraryRepository.forkItinerary(sourceId),
    onSuccess: async (forked) => {
      await onItineraryCreated(client, forked);
      await client.invalidateQueries({ queryKey: itineraryKeys.published(sourceId) });
    },
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


export function usePublishTrip(
  id: string,
): UseMutationResult<ItineraryResponse, Error, PublishAudience> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (audience: PublishAudience) => itineraryRepository.publishTrip(id, audience),
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

export function useShowTripTo(
  id: string,
): UseMutationResult<ItineraryResponse, Error, PublishAudience> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (audience: PublishAudience) => itineraryRepository.showTripTo(id, audience),
    onSuccess: async (updated) => {
      await onItineraryUpdated(client, updated);
      await client.invalidateQueries({ queryKey: itineraryKeys.published(id) });
    },
  });
}

export type LifecycleAct = 'start' | 'complete' | 'reopen';

export function useTripLifecycle(id: string): UseMutationResult<ItineraryResponse, Error, LifecycleAct> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (act: LifecycleAct) => {
      if (act === 'start') return itineraryRepository.startTrip(id);
      if (act === 'complete') return itineraryRepository.completeTrip(id);
      return itineraryRepository.reopenTrip(id);
    },
    onSuccess: async (updated) => {
      await onItineraryUpdated(client, updated);
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


export function useAddActivityPhoto(
  itineraryId: string,
): UseMutationResult<ActivityResponse, Error, { dayId: string; activityId: string; photo: PickedPhoto }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, activityId, photo }: { dayId: string; activityId: string; photo: PickedPhoto }) =>
      itineraryRepository.addActivityPhoto(itineraryId, dayId, activityId, photo),
    onSuccess: () => onPlanChanged(client, itineraryId),
  });
}


export function useRemoveActivityPhoto(
  itineraryId: string,
): UseMutationResult<void, Error, { dayId: string; activityId: string; photoId: string }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, activityId, photoId }: { dayId: string; activityId: string; photoId: string }) =>
      itineraryRepository.removeActivityPhoto(itineraryId, dayId, activityId, photoId),
    onSuccess: () => onPlanChanged(client, itineraryId),
  });
}


export function usePhotoDump(
  itineraryId: string,
): UseInfiniteQueryResult<InfiniteData<Page<PhotoDumpEntryResponse>>, Error> {
  const { kind } = useAuth();
  return useInfiniteQuery({
    queryKey: itineraryKeys.photoDump(itineraryId),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      itineraryRepository.photoDump(itineraryId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: Page<PhotoDumpEntryResponse>) => lastPage.nextCursor,
    enabled: kind === 'signedIn',
  });
}


export function useAddPhotoDumpEntries(
  itineraryId: string,
): UseMutationResult<PhotoDumpEntryResponse | undefined, Error, readonly PickedPhoto[]> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (photos: readonly PickedPhoto[]) => {
      let latest: PhotoDumpEntryResponse | undefined;
      for (const photo of photos) {
        latest = await itineraryRepository.addPhotoDumpEntry(itineraryId, photo);
      }
      return latest;
    },
    onSuccess: (_added, photos) => {
      photos.forEach(() => track(PHOTO_DUMP_PHOTO_ADDED, { itineraryId }));
      return client.invalidateQueries({ queryKey: itineraryKeys.photoDump(itineraryId) });
    },
  });
}


export function useRemovePhotoDumpEntry(
  itineraryId: string,
): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => itineraryRepository.removePhotoDumpEntry(itineraryId, photoId),
    onSuccess: () => {
      track(PHOTO_DUMP_PHOTO_REMOVED, { itineraryId });
      return client.invalidateQueries({ queryKey: itineraryKeys.photoDump(itineraryId) });
    },
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


export function useSavePlan(
  itineraryId: string,
): UseMutationResult<ItineraryResponse, Error, SavePlanRequest> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: SavePlanRequest) => itineraryRepository.savePlan(itineraryId, request),
    onSuccess: () => onPlanChanged(client, itineraryId),
  });
}


export type ReorderIntent = { dayId: string; activityIds: string[]; expectedActivityIds: string[] };


export function reorderInPlanCache(
  client: QueryClient,
  itineraryId: string,
  dayId: string,
  orderedActivityIds: string[],
): ItineraryResponse | undefined {
  const previous = client.getQueryData<ItineraryResponse>(itineraryKeys.one(itineraryId));
  if (previous === undefined) return undefined;

  const day = previous.days.find((d) => d.id === dayId);
  if (day === undefined) return undefined;

  const byId = new Map(day.activities.map((a) => [a.id, a]));
  if (orderedActivityIds.some((id) => !byId.has(id)) || byId.size !== orderedActivityIds.length) {
    return undefined;
  }

  client.setQueryData<ItineraryResponse>(itineraryKeys.one(itineraryId), {
    ...previous,
    days: previous.days.map((d) =>
      d.id === dayId
        ? { ...d, activities: orderedActivityIds.map((id) => byId.get(id) as ActivityResponse) }
        : d,
    ),
  });
  return previous;
}


export function useReorderActivities(
  itineraryId: string,
): UseMutationResult<DayResponse, Error, ReorderIntent> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, activityIds, expectedActivityIds }: ReorderIntent) =>
      itineraryRepository.reorderActivities(itineraryId, dayId, { activityIds, expectedActivityIds }),
    onMutate: async ({ dayId, activityIds }: ReorderIntent) => {
      await client.cancelQueries({ queryKey: itineraryKeys.one(itineraryId) });
      return { previous: reorderInPlanCache(client, itineraryId, dayId, activityIds) };
    },
    onError: (_error, _intent, context) => {
      if (context?.previous !== undefined) {
        client.setQueryData(itineraryKeys.one(itineraryId), context.previous);
      }
    },
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
