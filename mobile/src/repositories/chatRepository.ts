import { apiClient } from '../api/apiClient';
import type { ChatMessageResponse, Page, SendChatMessageRequest } from '../types/api';


export const chatRepository = {

  async thread(itineraryId: string, cursor?: string): Promise<Page<ChatMessageResponse>> {
    const query = cursor === undefined ? '' : `?cursor=${encodeURIComponent(cursor)}`;
    return apiClient.get<Page<ChatMessageResponse>>(
      `/v1/itineraries/${itineraryId}/chat/messages${query}`,
    );
  },

  async send(itineraryId: string, request: SendChatMessageRequest): Promise<ChatMessageResponse> {
    return apiClient.post<ChatMessageResponse>(
      `/v1/itineraries/${itineraryId}/chat/messages`,
      request,
    );
  },
};
