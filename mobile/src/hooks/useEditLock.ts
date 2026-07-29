import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/ApiError';
import { editLockedAlert } from '../components/editLockedAlert';
import { itineraryRepository } from '../repositories/itineraryRepository';


export const EDIT_LOCK_RENEW_MS = 60_000;


function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError({ code: 'UNKNOWN', message: 'Something went wrong.', status: 0 });
}

export type EditLockState =
  | { kind: 'idle' }
  | { kind: 'acquiring' }
  | { kind: 'held' }
  | { kind: 'denied'; error: ApiError };


export function useEditLock(itineraryId: string): {
  state: EditLockState;
  acquire: () => Promise<boolean>;
  release: () => void;
} {
  const [state, setState] = useState<EditLockState>({ kind: 'idle' });
  const held = useRef(false);

  const acquire = useCallback(async (): Promise<boolean> => {
    setState({ kind: 'acquiring' });
    try {
      await itineraryRepository.acquireEditLock(itineraryId);
      held.current = true;
      setState({ kind: 'held' });
      return true;
    } catch (error) {
      held.current = false;
      const apiError = toApiError(error);
      setState({ kind: 'denied', error: apiError });
      editLockedAlert(apiError);
      return false;
    }
  }, [itineraryId]);

  const release = useCallback(() => {
    if (!held.current) return;
    held.current = false;
    setState({ kind: 'idle' });
    void itineraryRepository.releaseEditLock(itineraryId).catch(() => {});
  }, [itineraryId]);

  useEffect(() => {
    if (state.kind !== 'held') return;
    const timer = setInterval(() => {
      void itineraryRepository.renewEditLock(itineraryId).catch((error: unknown) => {
        held.current = false;
        const apiError = toApiError(error);
        setState({ kind: 'denied', error: apiError });
        editLockedAlert(apiError);
      });
    }, EDIT_LOCK_RENEW_MS);
    return () => clearInterval(timer);
  }, [state.kind, itineraryId]);

  useEffect(() => {
    return () => {
      if (held.current) {
        held.current = false;
        void itineraryRepository.releaseEditLock(itineraryId).catch(() => {});
      }
    };
  }, [itineraryId]);

  return { state, acquire, release };
}
