import type { DiaryEntryResponse, FeedPostcardResponse } from '../types/api';


export function tripDestinationOf(cards: readonly FeedPostcardResponse[]): string | null {
  for (const card of cards) {
    const named = card.destination?.trim() ?? '';
    if (named !== '') return named;
  }
  return null;
}


export function asDiaryEntry(card: FeedPostcardResponse): DiaryEntryResponse {
  return {
    id: card.id,
    itineraryId: card.itineraryId,
    activityId: null,
    activityTitle: card.activityTitle,
    dayLabel: card.dayLabel,
    timeOfDay: null,
    place: card.place,
    caption: card.caption,
    photos: card.photos,
    sharedAt: card.sharedAt,
    createdAt: card.sharedAt,
    updatedAt: card.sharedAt,
  };
}
