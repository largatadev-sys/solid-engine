import { apiClient } from '../api/apiClient';
import type {
  JoinLinkResponse,
  JoinRequestResponse,
  JoinRequestSummaryResponse,
  JoinTeaserResponse,
  Page,
} from '../types/api';


export const joinRepository = {

  async fetchLink(itineraryId: string): Promise<JoinLinkResponse> {
    return apiClient.get<JoinLinkResponse>(`/v1/itineraries/${itineraryId}/join-link`);
  },


  async fetchTeaser(token: string): Promise<JoinTeaserResponse> {
    return apiClient.get<JoinTeaserResponse>(`/v1/join/${encodeURIComponent(token)}`);
  },


  async request(token: string): Promise<JoinRequestResponse> {
    return apiClient.post<JoinRequestResponse>(
      `/v1/join/${encodeURIComponent(token)}/request`,
      undefined,
    );
  },


  async fetchRequests(itineraryId: string): Promise<Page<JoinRequestSummaryResponse>> {
    return apiClient.get<Page<JoinRequestSummaryResponse>>(
      `/v1/itineraries/${itineraryId}/join-requests`,
    );
  },


  async approve(itineraryId: string, requestId: string): Promise<void> {
    await apiClient.post<void>(
      `/v1/itineraries/${itineraryId}/join-requests/${requestId}/approve`,
      undefined,
    );
  },


  async decline(itineraryId: string, requestId: string): Promise<void> {
    await apiClient.post<void>(
      `/v1/itineraries/${itineraryId}/join-requests/${requestId}/decline`,
      undefined,
    );
  },


  coverPath(token: string): string {
    return `/v1/join/${encodeURIComponent(token)}/cover`;
  },
};
