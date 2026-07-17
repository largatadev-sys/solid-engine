import { apiClient } from '../api/apiClient';
import type { HealthResponse } from '../types/api';

/**
 * The repository/local-cache layer (ADR-001). Screens read through a repository; the network
 * populates it. No UI code ever touches {@link apiClient} directly.
 *
 * There is deliberately no cache here yet. Cache *technology* (SQLite / MMKV / query-persistence)
 * is decided at S0.3, when the first real domain read exists to inform it — health has no
 * meaningful cache semantics, so choosing on its evidence would be choosing on none (S0.1 spec,
 * deferral table). Storing a last-known health value would be an ADR-001 gesture nothing reads.
 *
 * What is load-bearing today is the *shape*: screen -> hook -> repository -> apiClient. When S0.3
 * picks the store, it lands behind this function and the screens do not change.
 */
export const healthRepository = {
  async fetchHealth(): Promise<HealthResponse> {
    return apiClient.get<HealthResponse>('/v1/health');
  },
};
