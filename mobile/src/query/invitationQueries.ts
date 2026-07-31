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
  InviteByHandleRequest,
  MemberResponse,
  OwnershipOfferRequest,
  Page,
} from '../types/api';



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


export async function onInvitationAccepted(client: QueryClient): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: invitationKeys.inbox() }),
    client.invalidateQueries({ queryKey: itineraryKeys.lists() }),
  ]);
}


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

export function useInviteByHandle(
  itineraryId: string,
): UseMutationResult<InvitationResponse, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (handle: string) =>
      invitationRepository.inviteByHandle(itineraryId, { handle } satisfies InviteByHandleRequest),
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
  await client.invalidateQueries({ queryKey: itineraryKeys.lists() });
}



export async function onOwnershipOfferChanged(client: QueryClient, itineraryId: string): Promise<void> {
  await client.invalidateQueries({ queryKey: invitationKeys.members(itineraryId) });
}


export async function onOwnershipTransferred(client: QueryClient, itineraryId: string): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: invitationKeys.members(itineraryId) }),
    client.invalidateQueries({ queryKey: itineraryKeys.one(itineraryId) }),
    client.invalidateQueries({ queryKey: itineraryKeys.lists() }),
  ]);
}

export function useOfferOwnership(itineraryId: string): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (travelerId: string) =>
      invitationRepository.offerOwnership(itineraryId, { travelerId } satisfies OwnershipOfferRequest),
    onSuccess: () => onOwnershipOfferChanged(client, itineraryId),
  });
}

export function useRevokeOwnershipOffer(itineraryId: string): UseMutationResult<void, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => invitationRepository.revokeOwnershipOffer(itineraryId),
    onSuccess: () => onOwnershipOfferChanged(client, itineraryId),
  });
}

export function useAcceptOwnershipOffer(itineraryId: string): UseMutationResult<void, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => invitationRepository.acceptOwnershipOffer(itineraryId),
    onSuccess: () => onOwnershipTransferred(client, itineraryId),
  });
}

export function useDeclineOwnershipOffer(itineraryId: string): UseMutationResult<void, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => invitationRepository.declineOwnershipOffer(itineraryId),
    onSuccess: () => onOwnershipOfferChanged(client, itineraryId),
  });
}


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
