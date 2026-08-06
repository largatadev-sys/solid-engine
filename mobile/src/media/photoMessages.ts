import { ApiError } from '../api/ApiError';

export const PHOTO_FAILURE_FALLBACK = 'That photo could not be uploaded. Try again.';

export function messageForPhotoFailure(error: unknown): string {
  return error instanceof ApiError ? error.message : PHOTO_FAILURE_FALLBACK;
}
