import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/ApiError';
import { healthRepository } from '../repositories/healthRepository';
import type { HealthResponse } from '../types/api';

export type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; health: HealthResponse }
  | { kind: 'error'; error: ApiError };


export function useHealth(): { state: HealthState; refresh: () => void } {
  const [state, setState] = useState<HealthState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      setState({ kind: 'ok', health: await healthRepository.fetchHealth() });
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
