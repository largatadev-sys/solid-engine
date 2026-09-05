import { ApiError } from '../src/api/ApiError';
import { isProfilePrivate } from '../src/profile/gatedRead';

function refusal(code: string, status: number): ApiError {
  return new ApiError({ code, message: 'refused', status, traceId: 't' });
}

describe('a gated read is recognised by its CODE, never by its status (S4.40 decision 11)', () => {
  it('names the fence when the server names it', () => {
    expect(isProfilePrivate(refusal('PROFILE_PRIVATE', 403))).toBe(true);
  });

  it('leaves every other refusal to the posture that already handles it', () => {
    expect(isProfilePrivate(refusal('FORBIDDEN', 403))).toBe(false);
    expect(isProfilePrivate(refusal('TRAVELER_NOT_FOUND', 404))).toBe(false);
    expect(isProfilePrivate(refusal('NETWORK_UNAVAILABLE', 0))).toBe(false);
  });

  it('does not mistake a 403 for the fence, since other things also forbid', () => {
    expect(isProfilePrivate(refusal('ITINERARY_NOT_FOUND', 403))).toBe(false);
  });

  it('says no to anything that is not an ApiError at all', () => {
    expect(isProfilePrivate(new Error('PROFILE_PRIVATE'))).toBe(false);
    expect(isProfilePrivate(null)).toBe(false);
  });
});
