import type { ItineraryResponse, TripCategory } from '../types/api';


export const TRIP_CATEGORIES: readonly TripCategory[] = ['draft', 'active', 'complete'] as const;


export const DEFAULT_TRIP_CATEGORY: TripCategory = 'draft';


const LABELS: Record<TripCategory, string> = {
  draft: 'Draft',
  active: 'Active',
  complete: 'Complete',
};


export function tripCategoryLabel(category: TripCategory): string {
  return LABELS[category];
}


export function categoryOf(itinerary: Pick<ItineraryResponse, 'state'>): TripCategory {
  return itinerary.state === 'completed' ? 'complete' : itinerary.state;
}


export function emptyCategoryMessage(category: TripCategory): string {
  return {
    draft: 'Nothing being planned. A trip starts as a draft while you build the plan.',
    active: 'No trip under way. Start a trip when you set off.',
    complete: 'No finished trips yet. Mark a trip complete when you get back — then you can publish it.',
  }[category];
}


export type TripBadge = { label: string; tone: 'public' | 'private' };


export function tripBadge(
  itinerary: Pick<ItineraryResponse, 'published' | 'visibility'>,
): TripBadge | null {
  if (!itinerary.published) return null;
  return itinerary.visibility === 'public'
    ? { label: 'Published', tone: 'public' }
    : { label: 'Private', tone: 'private' };
}
