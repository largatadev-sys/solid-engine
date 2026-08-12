import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useAuth } from '../hooks/authContext';
import { feedRepository } from '../repositories/feedRepository';
import type { FeedPostcardResponse, Page, PublicTripDiaryResponse } from '../types/api';


export const feedKeys = {
  all: ['feed'] as const,
  postcards: () => [...feedKeys.all, 'postcards'] as const,
  tripDiary: (itineraryId: string, authorId: string) =>
    [...feedKeys.all, 'tripDiary', itineraryId, authorId] as const,
};


export function useFeed(): UseInfiniteQueryResult<
  InfiniteData<Page<FeedPostcardResponse>>,
  Error
> {
  const { kind } = useAuth();
  return useInfiniteQuery({
    queryKey: feedKeys.postcards(),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      feedRepository.fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: Page<FeedPostcardResponse>) => lastPage.nextCursor ?? undefined,
    enabled: kind === 'signedIn',
  });
}


export function usePublicTripDiary(
  itineraryId: string,
  authorId: string,
): UseQueryResult<PublicTripDiaryResponse, Error> {
  const { kind } = useAuth();
  return useQuery({
    queryKey: feedKeys.tripDiary(itineraryId, authorId),
    queryFn: () => feedRepository.fetchTripDiary(itineraryId, authorId),
    enabled: kind === 'signedIn' && itineraryId !== '' && authorId !== '',
  });
}
