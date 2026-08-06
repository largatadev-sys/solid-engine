import { apiClient } from '../api/apiClient';
import { photoPart } from '../media/photoPart';
import type { PickedPhoto } from '../media/pickedPhoto';
import type {
  HandleAvailabilityResponse,
  MeResponse,
  TravelerCardResponse,
  UpdateProfileRequest,
} from '../types/api';


export const travelerRepository = {

  async findByHandle(handle: string): Promise<TravelerCardResponse> {
    return apiClient.get<TravelerCardResponse>(`/v1/handles/${encodeURIComponent(handle)}`);
  },

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

  async uploadAvatar(photo: PickedPhoto): Promise<MeResponse> {
    return apiClient.upload<MeResponse>('/v1/me/avatar', await photoPart(photo));
  },

  async removeAvatar(): Promise<MeResponse> {
    return apiClient.deleteReturning<MeResponse>('/v1/me/avatar');
  },
};
