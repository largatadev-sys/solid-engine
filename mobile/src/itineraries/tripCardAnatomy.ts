import type { ItineraryResponse } from '../types/api';


const PUBLISHED_BADGE = 'Published';


export function publicationBadge(
  itinerary: Pick<ItineraryResponse, 'published'>,
): string | null {
  return itinerary.published ? PUBLISHED_BADGE : null;
}
