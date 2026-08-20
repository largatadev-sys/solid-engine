import type { ItineraryResponse, Visibility } from '../types/api';


const BADGES: Record<Visibility, string> = {
  public: 'Published',
  private: 'Private',
};


export function publicationBadge(
  itinerary: Pick<ItineraryResponse, 'published' | 'visibility'>,
): string | null {
  return itinerary.published ? BADGES[itinerary.visibility] : null;
}
