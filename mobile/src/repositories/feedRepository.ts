import { apiClient } from '../api/apiClient';
import { scopeParam, type FeedScope } from '../feed/feedScope';
import type { FeedPostcardResponse, Page, PublicTripDiaryResponse } from '../types/api';


export const feedRepository = {

  async fetchPage(cursor?: string, scope: FeedScope = 'all'): Promise<Page<FeedPostcardResponse>> {
    const asked = [
      cursor === undefined ? null : `cursor=${encodeURIComponent(cursor)}`,
      scopeParam(scope) === undefined ? null : `scope=${scopeParam(scope)}`,
    ].filter((part): part is string => part !== null);
    const query = asked.length === 0 ? '' : `?${asked.join('&')}`;
    return apiClient.get<Page<FeedPostcardResponse>>(`/v1/feed/postcards${query}`);
  },


  async fetchTripDiary(itineraryId: string, authorId: string): Promise<PublicTripDiaryResponse> {
    return apiClient.get<PublicTripDiaryResponse>(
      `/v1/feed/postcards/trips/${itineraryId}/by/${authorId}`,
    );
  },
};
