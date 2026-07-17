import { apiClient } from '../api/apiClient';
import type { MeResponse } from '../types/api';

/**
 * The signed-in traveler's own record (ADR-001 layering, as `healthRepository`).
 *
 * Note there is no "create traveler" call and never will be: the backend provisions on first
 * authenticated contact (S0.2 spec, decision 6a), so this is a read, not a read-or-create. The
 * client cannot forget a bootstrap step that does not exist.
 *
 * No cache here yet, same as health — cache technology is S0.3's decision (S0.1 deferral table).
 */
export const travelerRepository = {
  async fetchMe(): Promise<MeResponse> {
    return apiClient.get<MeResponse>('/v1/me');
  },
};
