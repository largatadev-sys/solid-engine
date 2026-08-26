import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useAuth } from '../hooks/authContext';
import { DEFAULT_FEED_SCOPE, type FeedScope } from '../feed/feedScope';
import { feedRepository } from '../repositories/feedRepository';
import type { FeedPostcardResponse, Page, PublicTripDiaryResponse } from '../types/api';


export const feedKeys = {
  all: ['feed'] as const,
  postcards: (scope: FeedScope = DEFAULT_FEED_SCOPE) =>
    [...feedKeys.all, 'postcards', scope] as const,
  tripDiary: (itineraryId: string, authorId: string) =>
    [...feedKeys.all, 'tripDiary', itineraryId, authorId] as const,
};


export function useFeed(
  scope: FeedScope = DEFAULT_FEED_SCOPE,
): UseInfiniteQueryResult<InfiniteData<Page<FeedPostcardResponse>>, Error> {
  const { kind } = useAuth();
  return useInfiniteQuery({
    queryKey: feedKeys.postcards(scope),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      feedRepository.fetchPage(pageParam, scope),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: Page<FeedPostcardResponse>) => lastPage.nextCursor ?? undefined,
    enabled: kind === 'signedIn',
  });
}


export function usePublicTripDiary(
  itineraryId: string,
  authorId: string,
  enabled = true,
): UseQueryResult<PublicTripDiaryResponse, Error> {
  const { kind } = useAuth();
  return useQuery({
    queryKey: feedKeys.tripDiary(itineraryId, authorId),
    queryFn: () => feedRepository.fetchTripDiary(itineraryId, authorId),
    enabled: kind === 'signedIn' && itineraryId !== '' && authorId !== '' && enabled,
  });
}
