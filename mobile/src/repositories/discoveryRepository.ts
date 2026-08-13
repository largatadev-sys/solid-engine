import { apiClient } from '../api/apiClient';
import type { DiscoveryCardResponse, Page } from '../types/api';


export const discoveryRepository = {

  async fetchPage(cursor?: string): Promise<Page<DiscoveryCardResponse>> {
    const query = cursor === undefined ? '' : `?cursor=${encodeURIComponent(cursor)}`;
    return apiClient.get<Page<DiscoveryCardResponse>>(`/v1/discovery/itineraries${query}`);
  },


  async fetchRecommended(): Promise<DiscoveryCardResponse[]> {
    return apiClient.get<DiscoveryCardResponse[]>('/v1/discovery/recommended');
  },
};
