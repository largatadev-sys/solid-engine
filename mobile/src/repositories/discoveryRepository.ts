import { apiClient } from '../api/apiClient';
import { queryStringOf, type DiscoveryFilters } from '../discovery/discoveryFilters';
import type {
  DiscoveryCardResponse,
  DiscoveryCountResponse,
  DiscoverySuggestionsResponse,
  Page,
  TrendingDestinationResponse,
} from '../types/api';


export const discoveryRepository = {

  async fetchPage(
    filters: DiscoveryFilters,
    cursor?: string,
  ): Promise<Page<DiscoveryCardResponse>> {
    const paged = cursor === undefined ? '' : `&cursor=${encodeURIComponent(cursor)}`;
    return apiClient.get<Page<DiscoveryCardResponse>>(
      `/v1/discovery/itineraries?v=1${queryStringOf(filters)}${paged}`,
    );
  },


  async fetchCount(filters: DiscoveryFilters): Promise<DiscoveryCountResponse> {
    return apiClient.get<DiscoveryCountResponse>(
      `/v1/discovery/count?v=1${queryStringOf(filters)}`,
    );
  },


  async fetchRecommended(): Promise<DiscoveryCardResponse[]> {
    return apiClient.get<DiscoveryCardResponse[]>('/v1/discovery/recommended');
  },


  async fetchTrending(): Promise<TrendingDestinationResponse[]> {
    return apiClient.get<TrendingDestinationResponse[]>('/v1/discovery/trending');
  },


  async fetchSuggestions(query: string): Promise<DiscoverySuggestionsResponse> {
    return apiClient.get<DiscoverySuggestionsResponse>(
      `/v1/discovery/suggestions?q=${encodeURIComponent(query)}`,
    );
  },
};
