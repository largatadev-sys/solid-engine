import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { track } from '../analytics/track';
import {
  DIARY_ENTRY_CREATED,
  DIARY_ENTRY_DELETED,
  DIARY_ENTRY_EDITED,
} from '../diary/diaryEvents';
import { useAuth } from '../hooks/authContext';
import type { PickedPhoto } from '../media/pickedPhoto';
import { diaryRepository } from '../repositories/diaryRepository';
import type {
  DiaryEntryResponse,
  DiaryTripResponse,
  Page,
  PostDiaryEntryRequest,
} from '../types/api';


export const diaryKeys = {
  all: ['diary'] as const,

  mine: (itineraryId: string) => [...diaryKeys.all, 'mine', itineraryId] as const,

  trips: () => [...diaryKeys.all, 'trips'] as const,
};


export function useMyDiaryEntries(
  itineraryId: string,
  enabled: boolean,
): UseQueryResult<DiaryEntryResponse[], Error> {
  const { kind } = useAuth();
  return useQuery({
    queryKey: diaryKeys.mine(itineraryId),
    queryFn: () => diaryRepository.fetchEveryEntry(itineraryId),
    enabled: enabled && kind === 'signedIn',
  });
}


export function useMyDiaryTrips(): UseInfiniteQueryResult<
  InfiniteData<Page<DiaryTripResponse>>,
  Error
> {
  const { kind } = useAuth();
  return useInfiniteQuery({
    queryKey: diaryKeys.trips(),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      diaryRepository.fetchMyTrips(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: Page<DiaryTripResponse>) => lastPage.nextCursor,
    enabled: kind === 'signedIn',
  });
}


export interface PostDiaryEntryInput {
  readonly entry: PostDiaryEntryRequest;
  readonly devicePhotos: readonly PickedPhoto[];
}


export function usePostDiaryEntry(
  itineraryId: string,
): UseMutationResult<DiaryEntryResponse, Error, PostDiaryEntryInput> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: PostDiaryEntryInput) =>
      diaryRepository.post(itineraryId, input.entry, input.devicePhotos),
    onSuccess: async (created) => {
      track(DIARY_ENTRY_CREATED, { itineraryId, diaryEntryId: created.id });
      await invalidateDiary(client, itineraryId);
    },
  });
}


export function useRecaptionDiaryEntry(
  itineraryId: string,
  entryId: string,
): UseMutationResult<DiaryEntryResponse, Error, string | null> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (caption: string | null) =>
      diaryRepository.recaption(itineraryId, entryId, caption),
    onSuccess: async () => {
      track(DIARY_ENTRY_EDITED, { itineraryId, diaryEntryId: entryId });
      await invalidateDiary(client, itineraryId);
    },
  });
}


export function useAddDiaryDevicePhoto(
  itineraryId: string,
  entryId: string,
): UseMutationResult<DiaryEntryResponse, Error, PickedPhoto> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (photo: PickedPhoto) =>
      diaryRepository.addDevicePhoto(itineraryId, entryId, photo),
    onSuccess: async () => {
      track(DIARY_ENTRY_EDITED, { itineraryId, diaryEntryId: entryId });
      await invalidateDiary(client, itineraryId);
    },
  });
}


export function useAddDiaryPhotoFromDump(
  itineraryId: string,
  entryId: string,
): UseMutationResult<DiaryEntryResponse, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) =>
      diaryRepository.addPhotoFromDump(itineraryId, entryId, photoId),
    onSuccess: async () => {
      track(DIARY_ENTRY_EDITED, { itineraryId, diaryEntryId: entryId });
      await invalidateDiary(client, itineraryId);
    },
  });
}


export function useRemoveDiaryPhoto(
  itineraryId: string,
  entryId: string,
): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => diaryRepository.removePhoto(itineraryId, entryId, photoId),
    onSuccess: async () => {
      track(DIARY_ENTRY_EDITED, { itineraryId, diaryEntryId: entryId });
      await invalidateDiary(client, itineraryId);
    },
  });
}


export function useDeleteDiaryEntry(
  itineraryId: string,
): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => diaryRepository.remove(itineraryId, entryId),
    onSuccess: async (_result, entryId) => {
      track(DIARY_ENTRY_DELETED, { itineraryId, diaryEntryId: entryId });
      await invalidateDiary(client, itineraryId);
    },
  });
}


async function invalidateDiary(
  client: ReturnType<typeof useQueryClient>,
  itineraryId: string,
): Promise<void> {
  await client.invalidateQueries({ queryKey: diaryKeys.mine(itineraryId) });
  await client.invalidateQueries({ queryKey: diaryKeys.trips() });
}
