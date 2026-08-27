import { ApiError } from '../api/ApiError';
import { REMOVAL_FAILED_TOAST } from './removalCopy';


const ALREADY_DONE = ['ILLEGAL_STATE_TRANSITION', 'ITINERARY_NOT_FOUND', 'NOT_FOUND'];


export function failureToast(cause: unknown): string | null {
  if (cause instanceof ApiError && ALREADY_DONE.includes(cause.code)) {
    return null;
  }
  return REMOVAL_FAILED_TOAST;
}
