import { ApiError } from '../api/ApiError';

export const PHOTO_FAILURE_FALLBACK = 'That photo could not be uploaded. Try again.';

export const COVER_NOT_ATTACHED = {
  title: 'Cover photo not added',
  body: 'Your trip was created, but the cover photo did not upload. You can add it from Edit Trip.',
};

export function messageForPhotoFailure(error: unknown): string {
  return error instanceof ApiError ? error.message : PHOTO_FAILURE_FALLBACK;
}
