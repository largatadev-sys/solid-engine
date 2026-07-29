import { apiClient } from '../api/apiClient';
import type { HealthResponse } from '../types/api';


export const healthRepository = {
  async fetchHealth(): Promise<HealthResponse> {
    return apiClient.get<HealthResponse>('/v1/health');
  },
};
