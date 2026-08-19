import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { track } from '../analytics/track';
import { useAuth } from '../hooks/authContext';
import { POLL_CLOSED, POLL_CREATED, POLL_DELETED, POLL_VOTED } from '../polls/pollEvents';
import { pollRepository } from '../repositories/pollRepository';
import type { CreatePollRequest, PollBoardResponse, PollResponse } from '../types/api';


export const pollKeys = {
  all: ['polls'] as const,

  board: (itineraryId: string) => [...pollKeys.all, 'board', itineraryId] as const,
};


export interface VoteIntent {
  readonly pollId: string;
  readonly optionId: string;
}


export function usePollBoard(itineraryId: string): UseQueryResult<PollBoardResponse, Error> {
  const { kind } = useAuth();
  return useQuery({
    queryKey: pollKeys.board(itineraryId),
    queryFn: () => pollRepository.board(itineraryId),
    enabled: kind === 'signedIn',
  });
}


export function castVoteInBoardCache(
  client: QueryClient,
  itineraryId: string,
  intent: VoteIntent,
): PollBoardResponse | undefined {
  const previous = client.getQueryData<PollBoardResponse>(pollKeys.board(itineraryId));
  if (previous === undefined) return undefined;

  const withVote = votedLocally(previous.active, intent);
  if (withVote === null) return undefined;

  client.setQueryData<PollBoardResponse>(pollKeys.board(itineraryId), {
    ...previous,
    active: withVote,
  });
  return previous;
}


function votedLocally(polls: PollResponse[], intent: VoteIntent): PollResponse[] | null {
  const target = polls.find((poll) => poll.id === intent.pollId);
  if (target === undefined || !target.options.some((option) => option.id === intent.optionId)) {
    return null;
  }
  return polls.map((poll) => (poll.id === intent.pollId ? { ...poll, myVoteOptionId: intent.optionId } : poll));
}


export function useCreatePoll(
  itineraryId: string,
): UseMutationResult<PollResponse, Error, CreatePollRequest> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: CreatePollRequest) => pollRepository.create(itineraryId, request),
    onSuccess: (created) => {
      track(POLL_CREATED, { itineraryId, pollId: created.id });
      return client.invalidateQueries({ queryKey: pollKeys.board(itineraryId) });
    },
  });
}


export function useCastVote(itineraryId: string): UseMutationResult<PollResponse, Error, VoteIntent> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, optionId }: VoteIntent) =>
      pollRepository.vote(itineraryId, pollId, { optionId }),
    onMutate: async (intent: VoteIntent) => {
      await client.cancelQueries({ queryKey: pollKeys.board(itineraryId) });
      return { previous: castVoteInBoardCache(client, itineraryId, intent) };
    },
    onError: (_error, _intent, context) => {
      if (context?.previous !== undefined) {
        client.setQueryData(pollKeys.board(itineraryId), context.previous);
      }
    },
    onSuccess: (_voted, intent) => {
      track(POLL_VOTED, { itineraryId, pollId: intent.pollId });
      return client.invalidateQueries({ queryKey: pollKeys.board(itineraryId) });
    },
  });
}


export function useClosePoll(itineraryId: string): UseMutationResult<PollResponse, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (pollId: string) => pollRepository.close(itineraryId, pollId),
    onSuccess: (_closed, pollId) => {
      track(POLL_CLOSED, { itineraryId, pollId });
      return client.invalidateQueries({ queryKey: pollKeys.board(itineraryId) });
    },
  });
}


export function useDeletePoll(itineraryId: string): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (pollId: string) => pollRepository.remove(itineraryId, pollId),
    onSuccess: (_removed, pollId) => {
      track(POLL_DELETED, { itineraryId, pollId });
      return client.invalidateQueries({ queryKey: pollKeys.board(itineraryId) });
    },
  });
}
