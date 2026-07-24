import { ApiError } from '../api/ApiError';

/**
 * The wording shown when a plan-edit surface can't be opened because of the edit lock (S1.4,
 * ADR-014) — kept in one module so the native and web forks of {@link editLockedAlert} cannot drift
 * (the S1.3 `comingSoonMessage` discipline).
 *
 * <p>Two situations, two messages:
 * <ul>
 *   <li><strong>Locked by another member</strong> — the backend's 409 message already names the
 *       holder ("Maria is editing this itinerary right now."), written to be shown as-is. We surface
 *       that verbatim, since it is more specific than anything the client could compose.
 *   <li><strong>Offline</strong> — editing needs connectivity (the lease can't survive an offline
 *       gap, ADR-014), so the acquire failed at the network. A plain "you're offline" is the honest
 *       message; the traveler can still read the plan.
 * </ul>
 */
export type EditLockedMessage = { title: string; body: string };

const LOCKED_TITLE = 'Someone is editing';
const OFFLINE_TITLE = "You're offline";
const OFFLINE_BODY =
  'You need a connection to edit the plan. You can still view it, and edit once you’re back online.';
const FALLBACK_BODY = 'Another member is editing this itinerary right now. Try again in a moment.';

/**
 * Maps the error from a failed lock acquire (or a plan write that lost the lease) to the message to
 * show. `EDIT_LOCKED` → the backend's holder-naming prose; a network failure → the offline message;
 * anything else → a neutral fallback (the modal is a courtesy, never the place to leak a raw error).
 */
export function editLockedMessage(error: unknown): EditLockedMessage {
  if (error instanceof ApiError && error.code === 'EDIT_LOCKED') {
    return { title: LOCKED_TITLE, body: error.message };
  }
  if (error instanceof ApiError && error.code === 'NETWORK_UNAVAILABLE') {
    return { title: OFFLINE_TITLE, body: OFFLINE_BODY };
  }
  return { title: LOCKED_TITLE, body: FALLBACK_BODY };
}
