import { apiClient } from '../api/apiClient';
import type { MeResponse } from '../types/api';


export const travelerRepository = {
  async fetchMe(): Promise<MeResponse> {
    return apiClient.get<MeResponse>('/v1/me');
  },
};
