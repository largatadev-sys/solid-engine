export const CHAT_MESSAGE_SENT = 'chat_message_sent';

export const CHAT_MESSAGE_APPENDED = 'chat.message.appended';


export function chatTopicFor(itineraryId: string): string {
  return `itinerary:${itineraryId}:chat`;
}
