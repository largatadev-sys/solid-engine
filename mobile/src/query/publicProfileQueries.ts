import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useAuth } from '../hooks/authContext';
import { publicProfileRepository } from '../repositories/publicProfileRepository';
import type {
  DiaryTripResponse,
  Page,
  PublicProfileResponse,
  ShowcaseItineraryResponse,
} from '../types/api';


export const publicProfileKeys = {
  all: ['publicProfile'] as const,

  profile: (handle: string) => [...publicProfileKeys.all, 'profile', handle] as const,

  published: (handle: string) => [...publicProfileKeys.all, 'published', handle] as const,

  diaryTrips: (handle: string) => [...publicProfileKeys.all, 'diaryTrips', handle] as const,
};


export function usePublicProfile(handle: string): UseQueryResult<PublicProfileResponse, Error> {
  const { kind } = useAuth();
  return useQuery({
    queryKey: publicProfileKeys.profile(handle),
    queryFn: () => publicProfileRepository.fetchProfile(handle),
    enabled: kind === 'signedIn' && handle.length > 0,
    retry: false,
  });
}


export function usePublicShowcase(
  handle: string,
  enabled: boolean,
): UseInfiniteQueryResult<InfiniteData<Page<ShowcaseItineraryResponse>>, Error> {
  const { kind } = useAuth();
  return useInfiniteQuery({
    queryKey: publicProfileKeys.published(handle),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      publicProfileRepository.fetchPublished(handle, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: Page<ShowcaseItineraryResponse>) => lastPage.nextCursor,
    enabled: kind === 'signedIn' && handle.length > 0 && enabled,
  });
}


export function usePublicDiaryTrips(
  handle: string,
  enabled: boolean,
): UseInfiniteQueryResult<InfiniteData<Page<DiaryTripResponse>>, Error> {
  const { kind } = useAuth();
  return useInfiniteQuery({
    queryKey: publicProfileKeys.diaryTrips(handle),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      publicProfileRepository.fetchDiaryTrips(handle, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: Page<DiaryTripResponse>) => lastPage.nextCursor,
    enabled: kind === 'signedIn' && handle.length > 0 && enabled,
  });
}
