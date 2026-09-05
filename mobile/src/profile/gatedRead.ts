import { ApiError } from '../api/ApiError';
import { PROFILE_PRIVATE_CODE } from '../types/api';


export function isProfilePrivate(error: unknown): boolean {
  return error instanceof ApiError && error.code === PROFILE_PRIVATE_CODE;
}
