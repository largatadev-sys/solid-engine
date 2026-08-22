import { apiClient } from '../api/apiClient';
import type {
  JoinLinkResponse,
  JoinRequestResponse,
  JoinRequestSummaryResponse,
  JoinTeaserResponse,
  MyJoinRequestResponse,
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


  async fetchMyRequests(): Promise<Page<MyJoinRequestResponse>> {
    return apiClient.get<Page<MyJoinRequestResponse>>('/v1/join-requests');
  },


  async withdraw(requestId: string): Promise<void> {
    await apiClient.delete(`/v1/join-requests/${requestId}`);
  },


  coverPath(token: string): string {
    return `/v1/join/${encodeURIComponent(token)}/cover`;
  },


  myRequestCoverPath(requestId: string): string {
    return `/v1/join-requests/${requestId}/cover`;
  },
};
