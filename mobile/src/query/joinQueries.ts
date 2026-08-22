import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { joinRepository } from '../repositories/joinRepository';
import { invitationKeys } from './invitationQueries';
import { itineraryKeys } from './itineraryQueries';
import { joinKeys } from './joinKeys';
import type {
  JoinLinkResponse,
  JoinRequestResponse,
  JoinRequestSummaryResponse,
  JoinTeaserResponse,
  MyJoinRequestResponse,
  Page,
} from '../types/api';



export function myJoinRequestsOptions() {
  return queryOptions({
    queryKey: joinKeys.mine(),
    queryFn: () => joinRepository.fetchMyRequests(),
  });
}


export function useMyJoinRequests(): UseQueryResult<Page<MyJoinRequestResponse>, Error> {
  return useQuery(myJoinRequestsOptions());
}


export function useWithdrawJoinRequest(): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => joinRepository.withdraw(requestId),
    onSuccess: () => client.invalidateQueries({ queryKey: joinKeys.mine() }),
  });
}


export function joinLinkOptions(itineraryId: string) {
  return queryOptions({
    queryKey: joinKeys.link(itineraryId),
    queryFn: () => joinRepository.fetchLink(itineraryId),
    staleTime: 0,
  });
}


export function joinTeaserOptions(token: string) {
  return queryOptions({
    queryKey: joinKeys.teaser(token),
    queryFn: () => joinRepository.fetchTeaser(token),
    retry: false,
  });
}


export function joinRequestsOptions(itineraryId: string, enabled: boolean) {
  return queryOptions({
    queryKey: joinKeys.requests(itineraryId),
    queryFn: () => joinRepository.fetchRequests(itineraryId),
    enabled,
  });
}


export function useJoinLink(itineraryId: string): UseQueryResult<JoinLinkResponse> {
  return useQuery(joinLinkOptions(itineraryId));
}


export function useJoinTeaser(token: string): UseQueryResult<JoinTeaserResponse> {
  return useQuery(joinTeaserOptions(token));
}


export function useJoinRequests(
  itineraryId: string,
  enabled: boolean,
): UseQueryResult<Page<JoinRequestSummaryResponse>> {
  return useQuery(joinRequestsOptions(itineraryId, enabled));
}


export async function onRequestAnswered(
  client: QueryClient,
  itineraryId: string,
  admitted: boolean,
): Promise<void> {
  const pending = [
    client.invalidateQueries({ queryKey: joinKeys.requests(itineraryId) }),
    ...(admitted
      ? [
          client.invalidateQueries({ queryKey: invitationKeys.members(itineraryId) }),
          client.invalidateQueries({ queryKey: invitationKeys.pending(itineraryId) }),
        ]
      : []),
  ];
  await Promise.all(pending);
}


export function useRequestToJoin(token: string): UseMutationResult<JoinRequestResponse, Error, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => joinRepository.request(token),
    onSuccess: (result) => {
      client.setQueryData<JoinTeaserResponse>(joinKeys.teaser(token), (teaser) =>
        teaser === undefined ? teaser : { ...teaser, viewerState: result.viewerState },
      );
    },
  });
}


export function useApproveRequest(itineraryId: string): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => joinRepository.approve(itineraryId, requestId),
    onSuccess: () => onRequestAnswered(client, itineraryId, true),
  });
}


export function useDeclineRequest(itineraryId: string): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => joinRepository.decline(itineraryId, requestId),
    onSuccess: () => onRequestAnswered(client, itineraryId, false),
  });
}


export async function onJoinedFromLanding(client: QueryClient): Promise<void> {
  await client.invalidateQueries({ queryKey: itineraryKeys.lists() });
}
