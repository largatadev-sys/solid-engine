import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/ApiError';
import { meKeys, meOptions } from '../query/travelerQueries';
import { useAuth } from './authContext';
import type { MeResponse } from '../types/api';

export type MeState =
  | { kind: 'loading' }
  | { kind: 'ok'; me: MeResponse }
  | { kind: 'error'; error: ApiError };


function asApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError({ code: 'UNKNOWN', message: 'Something went wrong.', status: 0 });
}


export function useMe(): { state: MeState; refresh: () => void } {
  const client = useQueryClient();
  const { kind } = useAuth();
  const query = useQuery({ ...meOptions, enabled: kind === 'signedIn' });

  const state: MeState = query.isSuccess
    ? { kind: 'ok', me: query.data }
    : query.isError
      ? { kind: 'error', error: asApiError(query.error) }
      : { kind: 'loading' };

  return {
    state,
    refresh: () => void client.invalidateQueries({ queryKey: meKeys.me }),
  };
}
