import { ApiError } from '../api/ApiError';

const BY_CODE: Record<string, string> = {
  MEMBERSHIP_FROZEN:
    'This trip is published, so its travelers are settled. Unpublish it to change who is on the trip.',
  OWNER_CANNOT_LEAVE:
    'Offer ownership to another member and have them accept before leaving this trip.',
  NOT_PERMITTED: 'Only the trip owner can do that.',
  ITINERARY_NOT_FOUND: 'This trip is no longer available to you.',
  ALREADY_A_MEMBER: 'They are already on this trip.',
  TRAVELER_NOT_FOUND: 'No traveler with that handle.',
  TARGET_NOT_A_MEMBER: 'Invite them to the trip before offering them ownership.',
  CANNOT_OFFER_TO_SELF: 'You already own this trip.',
  OFFER_ALREADY_PENDING: 'An offer is already pending. Revoke it before making another.',
  OFFER_NOT_FOUND: 'That ownership offer is no longer open.',
  NOT_OFFER_TARGET: 'That ownership offer was made to somebody else.',
  JOIN_REQUEST_NOT_FOUND: 'That request is no longer waiting.',
  ILLEGAL_STATE_TRANSITION: 'That request has already been answered.',
  EMAIL_NOT_VERIFIED: 'Verify your email address first.',
};

export const MEMBERSHIP_FALLBACK = 'Something went wrong. Try again.';


export function membershipErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return MEMBERSHIP_FALLBACK;
  return BY_CODE[error.code] ?? MEMBERSHIP_FALLBACK;
}
