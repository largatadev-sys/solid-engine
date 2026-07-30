import { apiClient } from '../api/apiClient';
import type { VerificationCodeResponse, VerificationResultResponse } from '../types/api';


export const verificationRepository = {
  async sendCode(): Promise<VerificationCodeResponse> {
    return apiClient.post<VerificationCodeResponse>('/v1/verification-codes', {});
  },

  async confirmCode(code: string): Promise<VerificationResultResponse> {
    return apiClient.post<VerificationResultResponse>('/v1/verification-codes/confirm', { code });
  },
};
