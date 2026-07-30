import { ApiError } from '../api/ApiError';


export const CODE_LENGTH = 6;


export function messageForVerificationFailure(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Try again.';

  switch (error.code) {
    case 'VERIFICATION_CODE_INCORRECT':
      return 'That code is not right. Check it and try again.';
    case 'VERIFICATION_CODE_EXPIRED':
      return 'That code has expired. Send yourself a new one.';
    case 'VERIFICATION_ATTEMPTS_EXHAUSTED':
      return 'Too many wrong codes. Send yourself a new one.';
    case 'VERIFICATION_CODE_NOT_ISSUED':
      return 'No code is waiting. Send yourself a new one.';
    case 'VERIFICATION_RESEND_TOO_SOON':
      return 'A code was just sent. Wait a moment before asking for another.';
    case 'EMAIL_ALREADY_VERIFIED':
      return 'This address is already verified.';
    case 'DEPENDENCY_UNAVAILABLE':
      return 'We could not confirm your email right now. Try again shortly.';
    case 'NETWORK_UNAVAILABLE':
      return 'Could not reach the server. Check your connection.';
    default:
      return error.message;
  }
}


export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
}


export function isCompleteCode(code: string): boolean {
  return code.length === CODE_LENGTH;
}


export function secondsUntil(target: string | null, now: number): number {
  if (target === null) return 0;
  const remaining = Math.ceil((Date.parse(target) - now) / 1000);
  return remaining > 0 ? remaining : 0;
}
