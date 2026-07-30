import { ApiError } from '../src/api/ApiError';
import {
  CODE_LENGTH,
  digitsOnly,
  isCompleteCode,
  messageForVerificationFailure,
  secondsUntil,
} from '../src/onboarding/verificationMessages';

function envelope(code: string, message = 'server wording'): ApiError {
  return new ApiError({ code, message, status: 400 });
}

describe('what the traveler may type into the code boxes', () => {
  it('keeps digits and nothing else', () => {
    expect(digitsOnly('12a3-4 5')).toBe('12345');
  });

  it('never exceeds the code length, however much is pasted', () => {
    expect(digitsOnly('1234567890')).toHaveLength(CODE_LENGTH);
  });

  it('only a full code is submittable', () => {
    expect(isCompleteCode('12345')).toBe(false);
    expect(isCompleteCode('123456')).toBe(true);
  });
});

describe('every refusal the backend can send has its own words', () => {
  it.each([
    ['VERIFICATION_CODE_INCORRECT', /not right/i],
    ['VERIFICATION_CODE_EXPIRED', /expired/i],
    ['VERIFICATION_ATTEMPTS_EXHAUSTED', /too many/i],
    ['VERIFICATION_CODE_NOT_ISSUED', /no code/i],
    ['VERIFICATION_RESEND_TOO_SOON', /wait a moment/i],
    ['EMAIL_ALREADY_VERIFIED', /already verified/i],
    ['DEPENDENCY_UNAVAILABLE', /try again/i],
    ['NETWORK_UNAVAILABLE', /connection/i],
  ])('%s reads as something a traveler can act on', (code, expected) => {
    expect(messageForVerificationFailure(envelope(code))).toMatch(expected);
  });

  it('the typed refusals are all distinct, so the screen never says the same thing twice', () => {
    const codes = [
      'VERIFICATION_CODE_INCORRECT',
      'VERIFICATION_CODE_EXPIRED',
      'VERIFICATION_ATTEMPTS_EXHAUSTED',
      'VERIFICATION_CODE_NOT_ISSUED',
      'VERIFICATION_RESEND_TOO_SOON',
    ];
    const wordings = codes.map((code) => messageForVerificationFailure(envelope(code)));

    expect(new Set(wordings).size).toBe(codes.length);
  });

  it('an unrecognised envelope shows the server wording rather than swallowing it', () => {
    expect(messageForVerificationFailure(envelope('SOMETHING_NEW', 'A newer server said this.'))).toBe(
      'A newer server said this.',
    );
  });

  it('a non-envelope failure still says something', () => {
    expect(messageForVerificationFailure(new Error('boom'))).toMatch(/went wrong/i);
  });

  it('no message leaks a code, a token or a trace id', () => {
    const message = messageForVerificationFailure(
      new ApiError({ code: 'X', message: 'ok', status: 400, traceId: 'trace-abc' }),
    );

    expect(message).not.toContain('trace-abc');
  });
});

describe('the resend cooldown countdown', () => {
  const NOW = Date.parse('2026-07-30T10:00:00Z');

  it('counts the seconds left', () => {
    expect(secondsUntil('2026-07-30T10:00:45Z', NOW)).toBe(45);
  });

  it('never goes negative once the moment has passed', () => {
    expect(secondsUntil('2026-07-30T09:59:00Z', NOW)).toBe(0);
  });

  it('is zero when no cooldown is known', () => {
    expect(secondsUntil(null, NOW)).toBe(0);
  });
});
