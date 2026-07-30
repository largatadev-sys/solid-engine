import { AuthCancelled, AuthError } from '../src/repositories/authContract';
import { GENERIC_AUTH_FAILURE, messageForAuthFailure } from '../src/auth/authFailureMessage';

describe('what the traveler is told when authentication fails', () => {
  it('a cancelled sign-in says nothing — the traveler already knows they backed out', () => {
    expect(messageForAuthFailure(new AuthCancelled())).toBeNull();
  });

  it('a translated auth failure shows its own wording', () => {
    const failure = new AuthError('auth/email-already-in-use', 'An account with that email already exists.');

    expect(messageForAuthFailure(failure)).toBe('An account with that email already exists.');
  });

  it('an untranslated failure falls back rather than leaking a raw error', () => {
    expect(messageForAuthFailure(new TypeError('undefined is not an object'))).toBe(GENERIC_AUTH_FAILURE);
    expect(messageForAuthFailure('a thrown string')).toBe(GENERIC_AUTH_FAILURE);
    expect(messageForAuthFailure(undefined)).toBe(GENERIC_AUTH_FAILURE);
  });
});
