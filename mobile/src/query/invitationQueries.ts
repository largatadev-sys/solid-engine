import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { invitationRepository } from '../repositories/invitationRepository';
import { itineraryKeys } from './itineraryQueries';
import type {
  AcceptResponse,
  CreateInvitationRequest,
  InboxInvitationResponse,
  InvitationResponse,
  MemberResponse,
  Page,
} from '../types/api';

/**
 * The invitation read/write seam for screens (ADR-001): UI -> query cache -> repository -> apiClient.
 *
 * Same shape as `itineraryQueries` — keys in one place, options split from the thin hooks so the
 * cache decisions (what invalidates what) are plain data a test can drive. The load-bearing decision
 * here is what accept invalidates: the inbox (the card leaves) AND the itinerary list (the joined
 * trip appears in My Trips — the walls-open moment made visible).
 */

export const invitationKeys = {
  all: ['invitations'] as const,
  inbox: () => [...invitationKeys.all, 'inbox'] as const,
  members: (itineraryId: string) => [...invitationKeys.all, 'members', itineraryId] as const,
  pending: (itineraryId: string) => [...invitationKeys.all, 'pending', itineraryId] as const,
};

export const inboxOptions = queryOptions({
  queryKey: invitationKeys.inbox(),
  queryFn: () => invitationRepository.fetchInbox(),
});

export function membersOptions(itineraryId: string) {
  return queryOptions({
    queryKey: invitationKeys.members(itineraryId),
    queryFn: () => invitationRepository.fetchMembers(itineraryId),
  });
}

export function pendingInvitationsOptions(itineraryId: string) {
  return queryOptions({
    queryKey: invitationKeys.pending(itineraryId),
    queryFn: () => invitationRepository.fetchPendingInvitations(itineraryId),
  });
}

/**
 * What must happen after accepting an invitation, wherever called from. The two invalidations are the
 * point: the inbox drops the accepted card, and the itinerary list refetches so the newly-joined trip
 * appears in My Trips. Without the second, a traveler accepts and lands on a list that predates their
 * membership — the same staleness `onItineraryCreated` guards against for creates.
 */
export async function onInvitationAccepted(client: QueryClient): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: invitationKeys.inbox() }),
    client.invalidateQueries({ queryKey: itineraryKeys.list() }),
  ]);
}

// ─── The hooks screens use. Thin by design; the decisions are above. ──────────────────────────────

export function useInbox(): UseQueryResult<Page<InboxInvitationResponse>> {
  return useQuery(inboxOptions);
}

export function useMembers(itineraryId: string): UseQueryResult<Page<MemberResponse>> {
  return useQuery(membersOptions(itineraryId));
}

export function usePendingInvitations(itineraryId: string): UseQueryResult<Page<InvitationResponse>> {
  return useQuery(pendingInvitationsOptions(itineraryId));
}

export function useAcceptInvitation(): UseMutationResult<AcceptResponse, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => invitationRepository.accept(invitationId),
    onSuccess: () => onInvitationAccepted(client),
  });
}

export function useDeclineInvitation(): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => invitationRepository.decline(invitationId),
    onSuccess: () => client.invalidateQueries({ queryKey: invitationKeys.inbox() }),
  });
}

export function useInvite(itineraryId: string): UseMutationResult<InvitationResponse, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => invitationRepository.invite(itineraryId, { email } satisfies CreateInvitationRequest),
    onSuccess: () => client.invalidateQueries({ queryKey: invitationKeys.pending(itineraryId) }),
  });
}

export function useRevokeInvitation(itineraryId: string): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => invitationRepository.revoke(invitationId),
    onSuccess: () => client.invalidateQueries({ queryKey: invitationKeys.pending(itineraryId) }),
  });
}
