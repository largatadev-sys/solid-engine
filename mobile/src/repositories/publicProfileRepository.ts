import { apiClient } from '../api/apiClient';
import type {
  DiaryTripResponse,
  Page,
  PublicProfileResponse,
  ShowcaseItineraryResponse,
} from '../types/api';


function pathFor(handle: string, suffix = ''): string {
  return `/v1/travelers/${encodeURIComponent(handle)}${suffix}`;
}


function paged(cursor?: string): string {
  return cursor === undefined ? '' : `?cursor=${encodeURIComponent(cursor)}`;
}


export const publicProfileRepository = {

  async fetchProfile(handle: string): Promise<PublicProfileResponse> {
    return apiClient.get<PublicProfileResponse>(pathFor(handle));
  },


  async fetchPublished(
    handle: string,
    cursor?: string,
  ): Promise<Page<ShowcaseItineraryResponse>> {
    return apiClient.get<Page<ShowcaseItineraryResponse>>(
      `${pathFor(handle, '/published')}${paged(cursor)}`,
    );
  },


  async fetchDiaryTrips(handle: string, cursor?: string): Promise<Page<DiaryTripResponse>> {
    return apiClient.get<Page<DiaryTripResponse>>(
      `${pathFor(handle, '/diary/trips')}${paged(cursor)}`,
    );
  },
};
