import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { shouldRevalidate } from './revalidateOnFocus';


export interface RevalidatableQuery {
  readonly isPending: boolean;
  readonly isFetching: boolean;
  readonly refetch: () => Promise<unknown>;
}


export function useRevalidateOnFocus(query: RevalidatableQuery, enabled = true): void {
  const latest = useRef(query);
  latest.current = query;

  const armed = useRef(enabled);
  armed.current = enabled;

  useFocusEffect(
    useCallback(() => {
      const { isPending, isFetching, refetch } = latest.current;
      if (shouldRevalidate({ enabled: armed.current, isPending, isFetching })) {
        void refetch();
      }
    }, []),
  );
}
