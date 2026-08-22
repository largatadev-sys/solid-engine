import { ApiError } from '../src/api/ApiError';
import {
  MEMBERSHIP_FALLBACK,
  membershipErrorMessage,
} from '../src/members/membershipErrors';

const failedWith = (code: string) =>
  new ApiError({ code, message: 'server wording', status: 409 });

describe('what a traveler is told when a membership act is refused', () => {
  it('explains the publish freeze in the terms the traveler can act on', () => {
    expect(membershipErrorMessage(failedWith('MEMBERSHIP_FROZEN'))).toContain('Unpublish');
  });

  it('tells an owner why they cannot walk out', () => {
    expect(membershipErrorMessage(failedWith('OWNER_CANNOT_LEAVE'))).toContain('Offer ownership');
  });

  it('never leaks the server’s own wording — the copy is ours', () => {
    expect(membershipErrorMessage(failedWith('MEMBERSHIP_FROZEN'))).not.toBe('server wording');
  });

  it('falls back rather than rendering a bare code at somebody', () => {
    expect(membershipErrorMessage(failedWith('SOME_CODE_NOBODY_MAPPED'))).toBe(
      MEMBERSHIP_FALLBACK,
    );
  });

  it('falls back on a plain error, an offline throw, or nothing at all', () => {
    expect(membershipErrorMessage(new Error('boom'))).toBe(MEMBERSHIP_FALLBACK);
    expect(membershipErrorMessage(null)).toBe(MEMBERSHIP_FALLBACK);
    expect(membershipErrorMessage(undefined)).toBe(MEMBERSHIP_FALLBACK);
  });

  it('covers every code the tab’s own mutations can raise', () => {
    for (const code of [
      'NOT_PERMITTED',
      'ITINERARY_NOT_FOUND',
      'ALREADY_A_MEMBER',
      'TRAVELER_NOT_FOUND',
      'TARGET_NOT_A_MEMBER',
      'CANNOT_OFFER_TO_SELF',
      'OFFER_ALREADY_PENDING',
      'OFFER_NOT_FOUND',
      'NOT_OFFER_TARGET',
      'JOIN_REQUEST_NOT_FOUND',
      'ILLEGAL_STATE_TRANSITION',
      'EMAIL_NOT_VERIFIED',
    ]) {
      expect(membershipErrorMessage(failedWith(code))).not.toBe(MEMBERSHIP_FALLBACK);
    }
  });
});
