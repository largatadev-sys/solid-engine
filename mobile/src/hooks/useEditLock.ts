import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/ApiError';
import { editLockedAlert } from '../components/editLockedAlert';
import { itineraryRepository } from '../repositories/itineraryRepository';
import type { LeaseSubject } from '../types/api';


export const EDIT_LOCK_RENEW_MS = 60_000;


function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError({ code: 'UNKNOWN', message: 'Something went wrong.', status: 0 });
}

export type EditLockState =
  | { kind: 'idle' }
  | { kind: 'acquiring' }
  | { kind: 'held'; subject: LeaseSubject }
  | { kind: 'denied'; error: ApiError };


export function useEditLock(itineraryId: string): {
  state: EditLockState;
  acquire: (subject: LeaseSubject) => Promise<boolean>;
  release: () => void;
} {
  const [state, setState] = useState<EditLockState>({ kind: 'idle' });
  const held = useRef<LeaseSubject | null>(null);

  const acquire = useCallback(
    async (subject: LeaseSubject): Promise<boolean> => {
      setState({ kind: 'acquiring' });
      try {
        await itineraryRepository.acquireEditLock(itineraryId, subject);
        held.current = subject;
        setState({ kind: 'held', subject });
        return true;
      } catch (error) {
        held.current = null;
        const apiError = toApiError(error);
        setState({ kind: 'denied', error: apiError });
        editLockedAlert(apiError);
        return false;
      }
    },
    [itineraryId],
  );

  const release = useCallback(() => {
    const subject = held.current;
    if (subject === null) return;
    held.current = null;
    setState({ kind: 'idle' });
    void itineraryRepository.releaseEditLock(itineraryId, subject).catch(() => {});
  }, [itineraryId]);

  useEffect(() => {
    if (state.kind !== 'held') return;
    const subject = state.subject;
    const timer = setInterval(() => {
      void itineraryRepository.renewEditLock(itineraryId, subject).catch((error: unknown) => {
        held.current = null;
        const apiError = toApiError(error);
        setState({ kind: 'denied', error: apiError });
        editLockedAlert(apiError);
      });
    }, EDIT_LOCK_RENEW_MS);
    return () => clearInterval(timer);
  }, [state, itineraryId]);

  useEffect(() => {
    return () => {
      const subject = held.current;
      if (subject !== null) {
        held.current = null;
        void itineraryRepository.releaseEditLock(itineraryId, subject).catch(() => {});
      }
    };
  }, [itineraryId]);

  return { state, acquire, release };
}
