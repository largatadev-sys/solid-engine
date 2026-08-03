import type { ItineraryResponse, TripCategory } from '../types/api';


export const TRIP_CATEGORIES: readonly TripCategory[] = ['draft', 'private', 'public'] as const;


export const DEFAULT_TRIP_CATEGORY: TripCategory = 'public';


const LABELS: Record<TripCategory, string> = {
  draft: 'Draft',
  private: 'Private',
  public: 'Public',
};


export function tripCategoryLabel(category: TripCategory): string {
  return LABELS[category];
}


export function categoryOf(itinerary: Pick<ItineraryResponse, 'status'>): TripCategory {
  return itinerary.status;
}


export function emptyCategoryMessage(category: TripCategory): string {
  return {
    draft: 'Nothing in progress. A trip stays a draft until you publish it.',
    private: 'Nothing published privately. A private itinerary is readable by you and your collaborators.',
    public: 'Nothing published publicly yet. Publish a trip to put it in front of every traveler.',
  }[category];
}
