import { ApiError } from '../api/ApiError';

export type ReportFailure = {
  readonly message: string;
  readonly retryable: boolean;
};

export const REPORT_FAILURES = {
  offline: 'Could not send just yet. Check your connection and try again.',
  tooLarge: 'Those images are too large. Try removing one.',
  rateLimited: 'That is a lot of reports at once. Please try again a bit later.',
  rejected: 'We could not send that. Try shortening the description.',
  unexpected: 'Something went wrong sending that. Try again.',
} as const;


export function failureOf(thrown: unknown): ReportFailure {
  if (!(thrown instanceof ApiError)) {
    return { message: REPORT_FAILURES.unexpected, retryable: true };
  }

  if (thrown.status === 0) return { message: REPORT_FAILURES.offline, retryable: true };
  if (thrown.status === 413) return { message: REPORT_FAILURES.tooLarge, retryable: false };
  if (thrown.status === 429) return { message: REPORT_FAILURES.rateLimited, retryable: true };
  if (thrown.status === 400) return { message: REPORT_FAILURES.rejected, retryable: false };
  if (thrown.status >= 500) return { message: REPORT_FAILURES.unexpected, retryable: true };

  return { message: REPORT_FAILURES.unexpected, retryable: true };
}
