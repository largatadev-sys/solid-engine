import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useAuth } from '../hooks/authContext';
import { profileRepository } from '../repositories/profileRepository';
import type { Page, ProfileStatsResponse, ShowcaseItineraryResponse } from '../types/api';


export const profileKeys = {
  all: ['profile'] as const,

  stats: () => [...profileKeys.all, 'stats'] as const,

  published: () => [...profileKeys.all, 'published'] as const,
};


export function useProfileStats(): UseQueryResult<ProfileStatsResponse, Error> {
  const { kind } = useAuth();
  return useQuery({
    queryKey: profileKeys.stats(),
    queryFn: () => profileRepository.fetchStats(),
    enabled: kind === 'signedIn',
  });
}


export function useMyPublishedItineraries(): UseInfiniteQueryResult<
  InfiniteData<Page<ShowcaseItineraryResponse>>,
  Error
> {
  const { kind } = useAuth();
  return useInfiniteQuery({
    queryKey: profileKeys.published(),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      profileRepository.fetchPublished(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: Page<ShowcaseItineraryResponse>) => lastPage.nextCursor,
    enabled: kind === 'signedIn',
  });
}
