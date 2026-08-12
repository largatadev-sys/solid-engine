import { apiClient } from '../api/apiClient';
import type { FeedPostcardResponse, Page } from '../types/api';


export const feedRepository = {

  async fetchPage(cursor?: string): Promise<Page<FeedPostcardResponse>> {
    const query = cursor === undefined ? '' : `?cursor=${encodeURIComponent(cursor)}`;
    return apiClient.get<Page<FeedPostcardResponse>>(`/v1/feed/postcards${query}`);
  },
};
