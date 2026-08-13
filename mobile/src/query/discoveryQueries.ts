import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  searchesFor,
  type DiscoveryFilters,
} from '../discovery/discoveryFilters';
import { SEARCH_DEBOUNCE_MS } from '../discovery/searchGating';
import { useAuth } from '../hooks/authContext';
import { discoveryRepository } from '../repositories/discoveryRepository';
import type {
  DiscoveryCardResponse,
  DiscoveryCountResponse,
  DiscoverySuggestionsResponse,
  Page,
  TrendingDestinationResponse,
} from '../types/api';


export const discoveryKeys = {
  all: ['discovery'] as const,
  browse: (filters: DiscoveryFilters) => [...discoveryKeys.all, 'browse', filters] as const,
  count: (filters: DiscoveryFilters) => [...discoveryKeys.all, 'count', filters] as const,
  recommended: () => [...discoveryKeys.all, 'recommended'] as const,
  trending: () => [...discoveryKeys.all, 'trending'] as const,
  suggestions: (query: string) => [...discoveryKeys.all, 'suggestions', query] as const,
};


export function useDiscoveryBrowse(
  filters: DiscoveryFilters,
): UseInfiniteQueryResult<InfiniteData<Page<DiscoveryCardResponse>>, Error> {
  const { kind } = useAuth();
  return useInfiniteQuery({
    queryKey: discoveryKeys.browse(filters),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      discoveryRepository.fetchPage(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: Page<DiscoveryCardResponse>) => lastPage.nextCursor ?? undefined,
    enabled: kind === 'signedIn',
    placeholderData: (previous) => previous,
  });
}


export function useDiscoveryCount(
  filters: DiscoveryFilters,
  enabled: boolean,
): UseQueryResult<DiscoveryCountResponse, Error> {
  const { kind } = useAuth();
  return useQuery({
    queryKey: discoveryKeys.count(filters),
    queryFn: () => discoveryRepository.fetchCount(filters),
    enabled: enabled && kind === 'signedIn',
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


export function useTrendingDestinations(): UseQueryResult<TrendingDestinationResponse[], Error> {
  const { kind } = useAuth();
  return useQuery({
    queryKey: discoveryKeys.trending(),
    queryFn: () => discoveryRepository.fetchTrending(),
    enabled: kind === 'signedIn',
  });
}


export function useSearchSuggestions(
  query: string,
): UseQueryResult<DiscoverySuggestionsResponse, Error> {
  const { kind } = useAuth();
  return useQuery({
    queryKey: discoveryKeys.suggestions(query.trim()),
    queryFn: () => discoveryRepository.fetchSuggestions(query.trim()),
    enabled: kind === 'signedIn' && searchesFor(query),
    staleTime: SEARCH_DEBOUNCE_MS,
  });
}
