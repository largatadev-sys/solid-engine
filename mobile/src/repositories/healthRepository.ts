import { apiClient } from '../api/apiClient';
import type { HealthResponse } from '../types/api';

/**
 * The repository/local-cache layer (ADR-001). Screens read through a repository; the network
 * populates it. No UI code ever touches {@link apiClient} directly.
 *
 * The cache here is a deliberate in-memory pass-through, not the real thing. Cache *technology*
 * (SQLite / MMKV / query-persistence) is decided at S0.3, when the first real domain read exists
 * to inform it — health has no meaningful cache semantics, so choosing on its evidence would be
 * choosing on no evidence (S0.1 spec, deferral table).
 *
 * What is load-bearing today is the *shape*: screen -> hook -> repository -> apiClient. Swapping
 * the store behind this function is then a change to one file.
 */

let lastKnown: HealthResponse | undefined;

export const healthRepository = {
  async fetchHealth(): Promise<HealthResponse> {
    const health = await apiClient.get<HealthResponse>('/v1/health');
    lastKnown = health;
    return health;
  },

  /** The read-through half of ADR-001's posture: what we last saw, if anything. */
  cached(): HealthResponse | undefined {
    return lastKnown;
  },

  /** Tests need a clean slate; module state would otherwise leak between them. */
  reset(): void {
    lastKnown = undefined;
  },
};
