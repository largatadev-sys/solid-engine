import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/ApiError';
import { travelerRepository } from '../repositories/travelerRepository';
import type { MeResponse } from '../types/api';

export type MeState =
  | { kind: 'loading' }
  | { kind: 'ok'; me: MeResponse }
  | { kind: 'error'; error: ApiError };

/**
 * Binds the traveler repository to React, exactly as `useHealth` does for health — the screen
 * renders a state and knows nothing about transport.
 */
export function useMe(): { state: MeState; refresh: () => void } {
  const [state, setState] = useState<MeState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      setState({ kind: 'ok', me: await travelerRepository.fetchMe() });
    } catch (error) {
      setState({
        kind: 'error',
        error:
          error instanceof ApiError
            ? error
            : new ApiError({ code: 'UNKNOWN', message: 'Something went wrong.', status: 0 }),
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, refresh: () => void load() };
}
