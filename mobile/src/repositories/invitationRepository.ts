import { apiClient } from '../api/apiClient';
import type {
  AcceptResponse,
  CreateInvitationRequest,
  InboxInvitationResponse,
  InvitationResponse,
  MemberResponse,
  Page,
} from '../types/api';

/**
 * The invitation surface (S1.2) — email invite → accept → member, and the member list.
 *
 * Dumb by design, like `itineraryRepository`: it maps calls to paths and typed shapes and knows
 * nothing about caching or React (that is `src/query/`). Transitions (accept/decline/revoke) are
 * POSTs with no body — the invitation is named in the path, and the rows survive terminal, so they
 * are not DELETEs (grilling Q3). Decline and revoke answer 204; `post<void>` yields `undefined`.
 */
export const invitationRepository = {
  /** The caller's inbox: pending invitations addressed to their verified email. */
  async fetchInbox(): Promise<Page<InboxInvitationResponse>> {
    return apiClient.get<Page<InboxInvitationResponse>>('/v1/invitations');
  },

  /** Accept an invitation; resolves to the itinerary just joined. */
  async accept(invitationId: string): Promise<AcceptResponse> {
    return apiClient.post<AcceptResponse>(`/v1/invitations/${invitationId}/accept`, {});
  },

  async decline(invitationId: string): Promise<void> {
    await apiClient.post<void>(`/v1/invitations/${invitationId}/decline`, {});
  },

  async revoke(invitationId: string): Promise<void> {
    await apiClient.post<void>(`/v1/invitations/${invitationId}/revoke`, {});
  },

  /** A trip's members (any member may read). */
  async fetchMembers(itineraryId: string): Promise<Page<MemberResponse>> {
    return apiClient.get<Page<MemberResponse>>(`/v1/itineraries/${itineraryId}/members`);
  },

  /** A trip's pending invitations (any member may read). */
  async fetchPendingInvitations(itineraryId: string): Promise<Page<InvitationResponse>> {
    return apiClient.get<Page<InvitationResponse>>(`/v1/itineraries/${itineraryId}/invitations`);
  },

  /** Invite an email into a trip (owner only — the server enforces it). */
  async invite(itineraryId: string, request: CreateInvitationRequest): Promise<InvitationResponse> {
    return apiClient.post<InvitationResponse>(`/v1/itineraries/${itineraryId}/invitations`, request);
  },
};
