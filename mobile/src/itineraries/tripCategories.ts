import type { ItineraryResponse, TripCategory } from '../types/api';


export const TRIP_CATEGORIES: readonly TripCategory[] = ['draft', 'private', 'published'] as const;


const LABELS: Record<TripCategory, string> = {
  draft: 'Draft',
  private: 'Private',
  published: 'Published',
};


export function tripCategoryLabel(category: TripCategory): string {
  return LABELS[category];
}


export function categoriesOf(
  itinerary: Pick<ItineraryResponse, 'state' | 'visibility'>,
): TripCategory[] {
  const categories: TripCategory[] = [];
  if (itinerary.state === 'draft') categories.push('draft');
  categories.push(itinerary.visibility);
  return categories;
}


export function emptyCategoryMessage(category: TripCategory | undefined): string {
  if (category === undefined) return 'Every trip starts as a draft. Plan your first one.';
  return {
    draft: 'No drafts. A trip stays a draft until you start it.',
    private: 'No private trips. Everything you have is published.',
    published: 'Nothing published yet. Open a trip and publish it to share the plan.',
  }[category];
}
