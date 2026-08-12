import { apiClient } from '../api/apiClient';
import type { Page, ProfileStatsResponse, ShowcaseItineraryResponse } from '../types/api';


export const profileRepository = {

  async fetchStats(): Promise<ProfileStatsResponse> {
    return apiClient.get<ProfileStatsResponse>('/v1/me/profile/stats');
  },


  async fetchPublished(cursor?: string): Promise<Page<ShowcaseItineraryResponse>> {
    const query = cursor === undefined ? '' : `?cursor=${encodeURIComponent(cursor)}`;
    return apiClient.get<Page<ShowcaseItineraryResponse>>(
      `/v1/me/profile/published${query}`,
    );
  },
};
