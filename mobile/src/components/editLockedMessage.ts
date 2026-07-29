import { ApiError } from '../api/ApiError';


export type EditLockedMessage = { title: string; body: string };

const LOCKED_TITLE = 'Someone is editing';
const OFFLINE_TITLE = "You're offline";
const OFFLINE_BODY =
  'You need a connection to edit the plan. You can still view it, and edit once you’re back online.';
const FALLBACK_BODY = 'Another member is editing this itinerary right now. Try again in a moment.';


export function editLockedMessage(error: unknown): EditLockedMessage {
  if (error instanceof ApiError && error.code === 'EDIT_LOCKED') {
    return { title: LOCKED_TITLE, body: error.message };
  }
  if (error instanceof ApiError && error.code === 'NETWORK_UNAVAILABLE') {
    return { title: OFFLINE_TITLE, body: OFFLINE_BODY };
  }
  return { title: LOCKED_TITLE, body: FALLBACK_BODY };
}
