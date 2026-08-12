import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { useAuth } from '../hooks/authContext';
import { feedRepository } from '../repositories/feedRepository';
import type { FeedPostcardResponse, Page } from '../types/api';


export const feedKeys = {
  all: ['feed'] as const,
  postcards: () => [...feedKeys.all, 'postcards'] as const,
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
