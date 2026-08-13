import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useAuth } from '../hooks/authContext';
import { discoveryRepository } from '../repositories/discoveryRepository';
import type { DiscoveryCardResponse, Page } from '../types/api';


export const discoveryKeys = {
  all: ['discovery'] as const,
  browse: () => [...discoveryKeys.all, 'browse'] as const,
  recommended: () => [...discoveryKeys.all, 'recommended'] as const,
};


export function useDiscoveryBrowse(): UseInfiniteQueryResult<
  InfiniteData<Page<DiscoveryCardResponse>>,
  Error
> {
  const { kind } = useAuth();
  return useInfiniteQuery({
    queryKey: discoveryKeys.browse(),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      discoveryRepository.fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: Page<DiscoveryCardResponse>) => lastPage.nextCursor ?? undefined,
    enabled: kind === 'signedIn',
  });
}


export function useRecommended(): UseQueryResult<DiscoveryCardResponse[], Error> {
  const { kind } = useAuth();
  return useQuery({
    queryKey: discoveryKeys.recommended(),
    queryFn: () => discoveryRepository.fetchRecommended(),
    enabled: kind === 'signedIn',
  });
}
