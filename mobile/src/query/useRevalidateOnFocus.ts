import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { shouldRevalidate } from './revalidateOnFocus';


export interface RevalidatableQuery {
  readonly isPending: boolean;
  readonly isFetching: boolean;
  readonly refetch: () => Promise<unknown>;
}


export function useRevalidateOnFocus(query: RevalidatableQuery, enabled = true): void {
  const { isPending, isFetching, refetch } = query;

  useFocusEffect(
    useCallback(() => {
      if (shouldRevalidate({ enabled, isPending, isFetching })) {
        void refetch();
      }
    }, [enabled, isPending, isFetching, refetch]),
  );
}
