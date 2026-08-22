import { apiClient } from '../api/apiClient';
import type {
  AcceptResponse,
  CreateInvitationRequest,
  InboxInvitationResponse,
  InvitationResponse,
  InviteByHandleRequest,
  MemberResponse,
  OwnershipOfferRequest,
  Page,
} from '../types/api';


export const invitationRepository = {

  async fetchInbox(): Promise<Page<InboxInvitationResponse>> {
    return apiClient.get<Page<InboxInvitationResponse>>('/v1/invitations');
  },


  coverPath(invitationId: string): string {
    return `/v1/invitations/${invitationId}/cover`;
  },


  async accept(invitationId: string): Promise<AcceptResponse> {
    return apiClient.post<AcceptResponse>(`/v1/invitations/${invitationId}/accept`, {});
  },

  async decline(invitationId: string): Promise<void> {
    await apiClient.post<void>(`/v1/invitations/${invitationId}/decline`, {});
  },

  async revoke(invitationId: string): Promise<void> {
    await apiClient.post<void>(`/v1/invitations/${invitationId}/revoke`, {});
  },


  async fetchMembers(itineraryId: string): Promise<Page<MemberResponse>> {
    return apiClient.get<Page<MemberResponse>>(`/v1/itineraries/${itineraryId}/members`);
  },


  async fetchPendingInvitations(itineraryId: string): Promise<Page<InvitationResponse>> {
    return apiClient.get<Page<InvitationResponse>>(`/v1/itineraries/${itineraryId}/invitations`);
  },


  async invite(itineraryId: string, request: CreateInvitationRequest): Promise<InvitationResponse> {
    return apiClient.post<InvitationResponse>(`/v1/itineraries/${itineraryId}/invitations`, request);
  },


  async inviteByHandle(itineraryId: string, request: InviteByHandleRequest): Promise<InvitationResponse> {
    return apiClient.post<InvitationResponse>(
      `/v1/itineraries/${itineraryId}/invitations/by-handle`,
      request,
    );
  },


  async endMembership(itineraryId: string, travelerId: string): Promise<void> {
    await apiClient.delete(`/v1/itineraries/${itineraryId}/members/${travelerId}`);
  },



  async offerOwnership(itineraryId: string, request: OwnershipOfferRequest): Promise<void> {
    await apiClient.post<void>(`/v1/itineraries/${itineraryId}/ownership-offer`, request);
  },


  async revokeOwnershipOffer(itineraryId: string): Promise<void> {
    await apiClient.delete(`/v1/itineraries/${itineraryId}/ownership-offer`);
  },


  async acceptOwnershipOffer(itineraryId: string): Promise<void> {
    await apiClient.post<void>(`/v1/itineraries/${itineraryId}/ownership-offer/accept`, undefined);
  },


  async declineOwnershipOffer(itineraryId: string): Promise<void> {
    await apiClient.post<void>(`/v1/itineraries/${itineraryId}/ownership-offer/decline`, undefined);
  },
};
