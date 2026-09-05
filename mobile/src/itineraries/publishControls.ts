import type { ItineraryResponse, ItineraryState } from '../types/api';


export type PublishControl = 'publish' | 'unpublish';


export function publishControl(
  itinerary: Pick<ItineraryResponse, 'published' | 'archived'>,
  isOwner: boolean,
): PublishControl | null {
  if (!isOwner || itinerary.archived) return null;
  return itinerary.published ? 'unpublish' : 'publish';
}


export function isPublished(itinerary: Pick<ItineraryResponse, 'published'>): boolean {
  return itinerary.published;
}


export function isEditable(itinerary: Pick<ItineraryResponse, 'published' | 'archived'>): boolean {
  return !itinerary.archived && !itinerary.published;
}


export function canPublish(itinerary: Pick<ItineraryResponse, 'state'>): boolean {
  return itinerary.state === 'completed';
}


export const PUBLISH_AUDIENCE_LINE =
  'Everyone on Largata can find and read this itinerary.';


export const PUBLISH_NEEDS_COMPLETE_TITLE = 'This trip is not finished yet';


const NOT_COMPLETE_WHERE: Record<Exclude<ItineraryState, 'completed'>, string> = {
  upcoming: 'planned but not travelled yet',
  ongoing: 'under way',
};


export function publishNeedsCompleteBody(state: ItineraryState): string {
  const where = state === 'completed' ? 'complete' : NOT_COMPLETE_WHERE[state];
  return `Only a completed trip can be published, because a published itinerary is a record of a trip that happened. This one is ${where} — mark it complete first, and you can publish it after.`;
}
