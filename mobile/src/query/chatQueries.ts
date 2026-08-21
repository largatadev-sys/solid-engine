import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { track } from '../analytics/track';
import { CHAT_MESSAGE_APPENDED, chatTopicFor } from '../chat/chatEvents';
import { useAuth } from '../hooks/authContext';
import { chatRepository } from '../repositories/chatRepository';
import { useTopicSubscription } from '../ws/useTopicSubscription';
import type { ChatMessageResponse, Page } from '../types/api';


export const chatKeys = {
  all: ['chat'] as const,

  thread: (itineraryId: string) => [...chatKeys.all, 'thread', itineraryId] as const,
};


type ChatPages = InfiniteData<Page<ChatMessageResponse>>;


export function useChatThread(
  itineraryId: string,
  enabled: boolean,
): UseInfiniteQueryResult<ChatPages, Error> {
  const { kind } = useAuth();
  return useInfiniteQuery({
    queryKey: chatKeys.thread(itineraryId),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      chatRepository.thread(itineraryId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextCursorOf,
    enabled: enabled && kind === 'signedIn',
  });
}


export function absorbIntoThreadCache(
  pages: ChatPages | undefined,
  message: ChatMessageResponse,
): ChatPages | undefined {
  if (pages === undefined) return pages;
  if (holds(pages, message.id)) return pages;

  const [newest, ...older] = pages.pages;
  if (newest === undefined) return pages;

  return { ...pages, pages: [{ ...newest, items: [message, ...newest.items] }, ...older] };
}


export function nextCursorOf(page: Page<ChatMessageResponse>): string | undefined {
  return page.nextCursor ?? undefined;
}


export function useChatDelivery(itineraryId: string, enabled: boolean): void {
  const client = useQueryClient();

  const absorb = useCallback(
    (message: ChatMessageResponse) => {
      client.setQueryData<ChatPages>(chatKeys.thread(itineraryId), (pages) =>
        absorbIntoThreadCache(pages, message),
      );
    },
    [client, itineraryId],
  );

  const catchUp = useCallback(() => {
    void client.invalidateQueries({ queryKey: chatKeys.thread(itineraryId) });
  }, [client, itineraryId]);

  useTopicSubscription(
    enabled ? chatTopicFor(itineraryId) : null,
    (frame) => {
      if (frame.type !== CHAT_MESSAGE_APPENDED) return;
      const message = asChatMessage(frame.payload);
      if (message !== null) absorb(message);
    },
    catchUp,
  );
}


export function useSendChatMessage(
  itineraryId: string,
): (body: string) => Promise<ChatMessageResponse> {
  const client = useQueryClient();

  return useCallback(
    async (body: string) => {
      const sent = await chatRepository.send(itineraryId, { body });
      client.setQueryData<ChatPages>(chatKeys.thread(itineraryId), (pages) =>
        absorbIntoThreadCache(pages, sent),
      );
      track('chat_message_sent', { itineraryId, messageId: sent.id });
      return sent;
    },
    [client, itineraryId],
  );
}


function holds(pages: ChatPages, id: string): boolean {
  return pages.pages.some((page) => page.items.some((item) => item.id === id));
}


function asChatMessage(payload: unknown): ChatMessageResponse | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;

  const candidate = payload as Record<string, unknown>;
  if (typeof candidate.id !== 'string') return null;
  if (typeof candidate.body !== 'string') return null;
  if (typeof candidate.at !== 'string') return null;

  return candidate as unknown as ChatMessageResponse;
}
