import { AuthCancelled, AuthError } from '../repositories/authContract';

export const GENERIC_AUTH_FAILURE = 'Something went wrong. Please try again.';

export function messageForAuthFailure(error: unknown): string | null {
  if (error instanceof AuthCancelled) return null;
  if (error instanceof AuthError) return error.message;

  return GENERIC_AUTH_FAILURE;
}
