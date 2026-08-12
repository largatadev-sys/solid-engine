import { apiClient } from '../api/apiClient';
import type { FeedPostcardResponse, Page, PublicTripDiaryResponse } from '../types/api';


export const feedRepository = {

  async fetchPage(cursor?: string): Promise<Page<FeedPostcardResponse>> {
    const query = cursor === undefined ? '' : `?cursor=${encodeURIComponent(cursor)}`;
    return apiClient.get<Page<FeedPostcardResponse>>(`/v1/feed/postcards${query}`);
  },


  async fetchTripDiary(itineraryId: string, authorId: string): Promise<PublicTripDiaryResponse> {
    return apiClient.get<PublicTripDiaryResponse>(
      `/v1/feed/postcards/trips/${itineraryId}/by/${authorId}`,
    );
  },
};
