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
import { feedKeys } from './feedQueries';
import { MAX_DIARY_PHOTOS } from '../diary/diaryCapture';
import { saveSteps, type StagedEntry } from '../diary/stagedEntry';
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

export interface SaveDiaryEntryInput {
  readonly staged: StagedEntry;
  readonly savedPhotoCount: number;
}


export function useSaveDiaryEntry(
  itineraryId: string,
  entryId: string,
): UseMutationResult<void, Error, SaveDiaryEntryInput> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ staged, savedPhotoCount }: SaveDiaryEntryInput) => {
      for (const step of saveSteps(staged, savedPhotoCount, MAX_DIARY_PHOTOS)) {
        if (step.kind === 'remove') {
          await diaryRepository.removePhoto(itineraryId, entryId, step.photoId);
        } else if (step.kind === 'dump') {
          await diaryRepository.addPhotoFromDump(itineraryId, entryId, step.photoId);
        } else {
          await diaryRepository.addDevicePhoto(
            itineraryId,
            entryId,
            staged.devicePhotos[step.at]!,
          );
        }
      }
      await diaryRepository.recaption(
        itineraryId,
        entryId,
        staged.caption.trim() === '' ? null : staged.caption.trim(),
      );
    },
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
