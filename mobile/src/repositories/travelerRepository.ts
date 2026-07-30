import { apiClient } from '../api/apiClient';
import type { HandleAvailabilityResponse, MeResponse, UpdateProfileRequest } from '../types/api';


export const travelerRepository = {
  async fetchMe(): Promise<MeResponse> {
    return apiClient.get<MeResponse>('/v1/me');
  },

  async updateProfile(request: UpdateProfileRequest): Promise<MeResponse> {
    return apiClient.patch<MeResponse>('/v1/me', request);
  },

  async completeOnboarding(): Promise<MeResponse> {
    return apiClient.post<MeResponse>('/v1/me/onboarding-completion', {});
  },

  async checkHandle(handle: string): Promise<HandleAvailabilityResponse> {
    return apiClient.get<HandleAvailabilityResponse>(
      `/v1/handles/${encodeURIComponent(handle)}/availability`,
    );
  },
};
