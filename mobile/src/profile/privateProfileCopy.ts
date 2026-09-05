import type { ProfileVisibility, ViewerRelation } from '../types/api';
import { followFailedToast, unfollowFailedToast } from './publicProfileCopy';


export const REQUESTED_LABEL = 'Requested';

export const ACCOUNT_TITLE = 'Account';

export const EDIT_PROFILE_ROW_LABEL = 'Edit profile';

export const PRIVATE_PROFILE_ROW_LABEL = 'Private profile';

export const PRIVATE_PROFILE_HELPER =
  'Only followers you approve can see your postcards and who you follow. Your published itineraries stay public.';

export const FOLLOW_REQUESTS_ROW_LABEL = 'Follow requests';

export const SIGN_OUT_ROW_LABEL = 'Sign out';

export const GO_PUBLIC_TITLE = 'Make your profile public?';

export const GO_PUBLIC_BODY =
  'Going public lets everyone see your postcards, and approves anyone who has asked to follow you.';

export const GO_PUBLIC_CANCEL_LABEL = 'Cancel';

export const GO_PUBLIC_CONFIRM_LABEL = 'Go public';

export const VISIBILITY_FAILED_TOAST = "Couldn't change your profile visibility";

export const FOLLOW_REQUESTS_TITLE = 'Follow requests';

export const APPROVE_LABEL = 'Approve';

export const DECLINE_LABEL = 'Decline';

export const NO_REQUESTS_TITLE = 'No requests right now';

export const NO_REQUESTS_BODY = "When someone asks to follow you, they'll show up here.";

export const DECLINE_FAILED_TOAST = "Couldn't decline";

export const REMOVE_FOLLOWER_LABEL = 'Remove follower';

export const REMOVE_FOLLOWER_BODY = "They won't be told, and they'll have to follow you again.";

export const REMOVE_FOLLOWER_CANCEL_LABEL = 'Cancel';

export const REMOVE_FOLLOWER_CONFIRM_LABEL = 'Remove';


export function requestFailedToast(handle: string | null): string {
  return handle === null
    ? "Couldn't send a request to that traveler"
    : `Couldn't send a request to @${handle}`;
}


export const CANCEL_REQUEST_FAILED_TOAST = "Couldn't cancel the request";


export function approveFailedToast(handle: string | null): string {
  return handle === null ? "Couldn't approve that traveler" : `Couldn't approve @${handle}`;
}


export function removeFollowerTitle(handle: string | null): string {
  return handle === null ? 'Remove this follower?' : `Remove @${handle}?`;
}


export function lockedProfileTitle(firstName: string): string {
  return `${firstName}'s postcards are for approved followers.`;
}


export function lockedProfileBody(firstName: string): string {
  return `Follow to ask. ${firstName} decides who's in.`;
}


export function followToastFor(
  before: { readonly relation: ViewerRelation; readonly visibility: ProfileVisibility },
  intent: 'follow' | 'unfollow',
  handle: string | null,
): string {
  if (intent === 'follow') {
    return before.visibility === 'private'
      ? requestFailedToast(handle)
      : followFailedToast(handle);
  }
  return before.relation === 'requested'
    ? CANCEL_REQUEST_FAILED_TOAST
    : unfollowFailedToast(handle);
}
