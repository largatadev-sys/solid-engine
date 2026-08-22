export const ADD_SHEET_TITLE = 'Add traveler';
export const ADD_TRAVELER_LABEL = 'Add traveler';

export const REVOKE_LABEL = 'Revoke';
export const APPROVE_LABEL = 'Approve';
export const SHEET_DISMISS_LABEL = 'Dismiss';

export const ACCEPT_LABEL = 'Accept';
export const DECLINE_LABEL = 'Decline';

export const REQUESTED_GHOST_LABEL = 'Requested';
export const WITHDRAW_LABEL = 'Withdraw';

export const OFFER_ACCEPT_LABEL = 'Accept';
export const OFFER_DECLINE_LABEL = 'Decline';

export const WORDMARK = 'Largata';
export const KICKER = "You're invited";
export const SIGNED_OUT_CTA = 'Sign in or create account';
export const REQUEST_CTA = 'Request to join';
export const PENDING_QUIET = 'Request sent';
export const MEMBER_CTA = 'Open trip workspace';
export const DEAD_QUIET = "This trip isn't taking new travelers.";
export const DEAD_COVER_OPACITY = 0.45;
export const LEAVE_LANDING_LABEL = 'Back to my trips';


export function offerCardTitle(offererHandleLabel: string): string {
  return `${offererHandleLabel} offered you ownership`;
}
