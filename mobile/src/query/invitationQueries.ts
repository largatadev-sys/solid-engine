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

/**
 * What must happen after a membership ends (S1.5) — and the two cases are genuinely different, which is
 * why `leaving` is a parameter rather than something this function guesses.
 *
 * Removing somebody else: only the roster changed, so invalidate it and nothing more. The trip is still
 * ours and its plan is untouched.
 *
 * Leaving ourselves: every cached answer about this trip is now a lie the server will refuse to repeat,
 * so the entries are *removed*, not invalidated. Invalidating would leave the data in place and merely
 * mark it stale — so a screen still mounted would render the plan from cache while every refetch 404s.
 * Removal makes the absence immediate and local, which is the one part of eviction a client can control
 * (the *other* traveler's copy is pull-based by decision — spec §5).
 *
 * <p><strong>The list invalidation on leave is inert today, and that is a known backend gap, not an
 * oversight here.</strong> `GET /v1/itineraries` is owner-scoped, so a trip a traveler *joined* was
 * never in their My Trips to begin with — and a leaver is always a member (the owner cannot leave), so
 * there is nothing for the refetch to drop. Verified at S1.5's device walk and recorded as its own
 * epic-map backlog line. The call stays because it costs one cache flag, it is already correct for the
 * day that list becomes membership-scoped, and removing it would leave a real bug behind with nothing
 * pointing at it.
 */
export async function onMembershipEnded(
  client: QueryClient,
  itineraryId: string,
  leaving: boolean,
): Promise<void> {
  if (!leaving) {
    await client.invalidateQueries({ queryKey: invitationKeys.members(itineraryId) });
    return;
  }
  client.removeQueries({ queryKey: itineraryKeys.one(itineraryId) });
  client.removeQueries({ queryKey: invitationKeys.members(itineraryId) });
  client.removeQueries({ queryKey: invitationKeys.pending(itineraryId) });
  await client.invalidateQueries({ queryKey: itineraryKeys.list() });
}

/**
 * End a membership (S1.5): the owner removing a member, or the caller leaving.
 *
 * `leaving` travels as a mutation variable rather than being derived here because this layer does not
 * know who the caller is — the screen does (it already resolves the caller's own id to gate the owner
 * controls). The server decides authority regardless; this flag only chooses what happens to the cache.
 */
export function useEndMembership(
  itineraryId: string,
): UseMutationResult<void, Error, { travelerId: string; leaving: boolean }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ travelerId }: { travelerId: string; leaving: boolean }) =>
      invitationRepository.endMembership(itineraryId, travelerId),
    onSuccess: (_result, { leaving }) => onMembershipEnded(client, itineraryId, leaving),
  });
}
