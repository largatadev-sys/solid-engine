import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/ApiError';
import { editLockedAlert } from '../components/editLockedAlert';
import { itineraryRepository } from '../repositories/itineraryRepository';

/**
 * The renewal heartbeat, in milliseconds (S1.4, ADR-014). The backend TTL is 3 minutes; renewing
 * every 60s keeps a live editor's lease alive with wide margin, and one missed renewal (a brief
 * network blip) still leaves two more windows before the lease lapses.
 */
export const EDIT_LOCK_RENEW_MS = 60_000;

/** Normalizes any thrown value to an {@link ApiError} so the denied state always carries a typed one. */
function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError({ code: 'UNKNOWN', message: 'Something went wrong.', status: 0 });
}

export type EditLockState =
  | { kind: 'idle' } // not yet attempted (the surface has not been entered)
  | { kind: 'acquiring' } // acquire in flight
  | { kind: 'held' } // we hold the lease; the edit surface may open
  | { kind: 'denied'; error: ApiError }; // another member holds it, or we are offline

/**
 * Holds the single-writer edit lock for an itinerary's plan across the life of an edit surface (S1.4,
 * ADR-014). `acquire()` claims the lease (call it as the surface opens); while `held`, the hook renews
 * on {@link EDIT_LOCK_RENEW_MS}; on unmount (or an explicit `release()`) it frees the lease
 * best-effort.
 *
 * <p><strong>The failure path is the point.</strong> A denied acquire — another member is editing, or
 * the device is offline — moves the state to `denied` and shows the lock modal ({@link
 * editLockedAlert}, platform-forked so it actually fires on web). The caller renders nothing editable
 * in that state; the traveler dismisses the modal and stays on the read-only plan. There is no polling
 * and no "it's free now" signal (pull-based, ADR-014): the traveler simply tries again.
 *
 * <p>Release is best-effort and never awaited by the UI: expiry is the real guarantee (a dead client
 * never releases, and its lease frees itself), so a failed release is not an error the traveler sees.
 */
export function useEditLock(itineraryId: string): {
  state: EditLockState;
  acquire: () => Promise<boolean>;
  release: () => void;
} {
  const [state, setState] = useState<EditLockState>({ kind: 'idle' });
  // `held` in a ref so the renew interval and the unmount cleanup read the live value without
  // re-subscribing the effect on every state change.
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
      // Tell the traveler why the surface won't open — the holder's name, or the offline message.
      editLockedAlert(apiError);
      return false;
    }
  }, [itineraryId]);

  const release = useCallback(() => {
    if (!held.current) return;
    held.current = false;
    setState({ kind: 'idle' });
    // Best-effort: ignore the result and any error (idempotent server-side; expiry is the guarantee).
    void itineraryRepository.releaseEditLock(itineraryId).catch(() => {});
  }, [itineraryId]);

  // The renewal heartbeat: only runs while we hold the lease. A failed renew (someone took over after
  // a network drop) flips us to `denied` and shows the modal — the same surface as a denied acquire.
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

  // On unmount, free the lease best-effort — navigating away releases fast, though expiry would free
  // it regardless.
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
