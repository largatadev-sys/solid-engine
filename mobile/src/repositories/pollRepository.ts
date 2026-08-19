import { apiClient } from '../api/apiClient';
import type {
  CastVoteRequest,
  CreatePollRequest,
  PollBoardResponse,
  PollResponse,
} from '../types/api';


export const pollRepository = {

  async board(itineraryId: string): Promise<PollBoardResponse> {
    return apiClient.get<PollBoardResponse>(`/v1/itineraries/${itineraryId}/polls`);
  },

  async create(itineraryId: string, request: CreatePollRequest): Promise<PollResponse> {
    return apiClient.post<PollResponse>(`/v1/itineraries/${itineraryId}/polls`, request);
  },

  async vote(itineraryId: string, pollId: string, request: CastVoteRequest): Promise<PollResponse> {
    return apiClient.put<PollResponse>(
      `/v1/itineraries/${itineraryId}/polls/${pollId}/vote`,
      request,
    );
  },

  async close(itineraryId: string, pollId: string): Promise<PollResponse> {
    return apiClient.post<PollResponse>(
      `/v1/itineraries/${itineraryId}/polls/${pollId}/close`,
      undefined,
    );
  },

  async remove(itineraryId: string, pollId: string): Promise<void> {
    return apiClient.delete(`/v1/itineraries/${itineraryId}/polls/${pollId}`);
  },
};
