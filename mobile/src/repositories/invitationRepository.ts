import { apiClient } from '../api/apiClient';
import type {
  AcceptResponse,
  CreateInvitationRequest,
  InboxInvitationResponse,
  InvitationResponse,
  MemberResponse,
  OwnershipOfferRequest,
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

  /**
   * End a membership (S1.5): the owner removing somebody, or a member leaving.
   *
   * One call for both doors — the server reads which it is from whether `travelerId` is the caller's
   * own, so there is no flag to send and no way for the client to claim an authority it lacks. A real
   * DELETE, unlike the invitation transitions above: those flip a row that survives terminal, this
   * destroys one.
   */
  async endMembership(itineraryId: string, travelerId: string): Promise<void> {
    await apiClient.delete(`/v1/itineraries/${itineraryId}/members/${travelerId}`);
  },

  // ─── Ownership offers (S1.6). A singleton per trip: no offer ids on the wire. ────────────────────

  /** Offer ownership to a member (owner only — the server enforces it). */
  async offerOwnership(itineraryId: string, request: OwnershipOfferRequest): Promise<void> {
    await apiClient.post<void>(`/v1/itineraries/${itineraryId}/ownership-offer`, request);
  },

  /**
   * Retract the trip's pending offer (owner only). A DELETE, unlike the invitation transitions above,
   * because the offer is addressed as a singleton resource rather than by id — and it is idempotent:
   * revoking when nothing is pending is still 204.
   */
  async revokeOwnershipOffer(itineraryId: string): Promise<void> {
    await apiClient.delete(`/v1/itineraries/${itineraryId}/ownership-offer`);
  },

  /** Accept the offer made to the caller — this is the transfer. */
  async acceptOwnershipOffer(itineraryId: string): Promise<void> {
    await apiClient.post<void>(`/v1/itineraries/${itineraryId}/ownership-offer/accept`, undefined);
  },

  /** Decline the offer made to the caller; ownership stays where it is. */
  async declineOwnershipOffer(itineraryId: string): Promise<void> {
    await apiClient.post<void>(`/v1/itineraries/${itineraryId}/ownership-offer/decline`, undefined);
  },
};
