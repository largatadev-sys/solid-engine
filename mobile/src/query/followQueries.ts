import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useAuth } from '../hooks/authContext';
import { followRepository } from '../repositories/followRepository';
import type { FollowIntent } from '../profile/followState';
import type { Page, TravelerCardResponse } from '../types/api';
import { profileKeys } from './profileQueries';
import { publicProfileKeys } from './publicProfileQueries';
import { feedKeys } from './feedQueries';


export const followKeys = {
  all: ['follow'] as const,

  followers: (handle: string) => [...followKeys.all, 'followers', handle] as const,

  following: (handle: string) => [...followKeys.all, 'following', handle] as const,
};


export interface FollowMutation {
  readonly travelerId: string;
  readonly intent: FollowIntent;
}


export function useFollowMutation(): UseMutationResult<void, Error, FollowMutation> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ travelerId, intent }: FollowMutation) =>
      intent === 'follow'
        ? followRepository.follow(travelerId)
        : followRepository.unfollow(travelerId),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: publicProfileKeys.all });
      void client.invalidateQueries({ queryKey: profileKeys.stats() });
      void client.invalidateQueries({ queryKey: followKeys.all });
      void client.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}


export function useFollowers(
  handle: string,
): UseInfiniteQueryResult<InfiniteData<Page<TravelerCardResponse>>, Error> {
  const { kind } = useAuth();
  return useInfiniteQuery({
    queryKey: followKeys.followers(handle),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      followRepository.fetchFollowers(handle, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: Page<TravelerCardResponse>) => lastPage.nextCursor ?? undefined,
    enabled: kind === 'signedIn' && handle.length > 0,
  });
}


export function useFollowing(
  handle: string,
): UseInfiniteQueryResult<InfiniteData<Page<TravelerCardResponse>>, Error> {
  const { kind } = useAuth();
  return useInfiniteQuery({
    queryKey: followKeys.following(handle),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      followRepository.fetchFollowing(handle, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: Page<TravelerCardResponse>) => lastPage.nextCursor ?? undefined,
    enabled: kind === 'signedIn' && handle.length > 0,
  });
}
