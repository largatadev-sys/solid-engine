import { apiClient } from '../api/apiClient';
import type { Page, TravelerCardResponse } from '../types/api';


function followPath(travelerId: string): string {
  return `/v1/travelers/${encodeURIComponent(travelerId)}/follow`;
}


function listPath(handle: string, which: 'followers' | 'following', cursor?: string): string {
  const paged = cursor === undefined ? '' : `?cursor=${encodeURIComponent(cursor)}`;
  return `/v1/travelers/${encodeURIComponent(handle)}/${which}${paged}`;
}


export const followRepository = {

  async follow(travelerId: string): Promise<void> {
    return apiClient.post<void>(followPath(travelerId), undefined);
  },


  async unfollow(travelerId: string): Promise<void> {
    return apiClient.delete(followPath(travelerId));
  },


  async fetchFollowers(handle: string, cursor?: string): Promise<Page<TravelerCardResponse>> {
    return apiClient.get<Page<TravelerCardResponse>>(listPath(handle, 'followers', cursor));
  },


  async fetchFollowing(handle: string, cursor?: string): Promise<Page<TravelerCardResponse>> {
    return apiClient.get<Page<TravelerCardResponse>>(listPath(handle, 'following', cursor));
  },
};
