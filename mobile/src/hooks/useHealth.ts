import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/ApiError';
import { healthRepository } from '../repositories/healthRepository';
import type { HealthResponse } from '../types/api';

export type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; health: HealthResponse }
  | { kind: 'error'; error: ApiError };

/**
 * Binds the repository to React. The screen renders {@link HealthState} and knows nothing about
 * transport — no fetch, no URLs, no status codes.
 */
export function useHealth(): { state: HealthState; refresh: () => void } {
  const [state, setState] = useState<HealthState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      setState({ kind: 'ok', health: await healthRepository.fetchHealth() });
    } catch (error) {
      // The client layer's contract is that it throws exactly one type; anything else is a bug
      // in that layer, and surfacing it as an unknown crash would hide it.
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
