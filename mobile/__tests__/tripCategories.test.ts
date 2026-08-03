import {
  categoryOf,
  DEFAULT_TRIP_CATEGORY,
  emptyCategoryMessage,
  TRIP_CATEGORIES,
  tripBadge,
  tripCategoryLabel,
} from '../src/itineraries/tripCategories';

describe('the Trips categories (ADR-019)', () => {
  it('is the lifecycle itself, so the three are mutually exclusive', () => {
    expect(TRIP_CATEGORIES).toEqual(['draft', 'active', 'complete']);
    expect(TRIP_CATEGORIES.map(tripCategoryLabel)).toEqual(['Draft', 'Active', 'Complete']);
  });

  it('puts every trip in exactly one category', () => {
    expect(categoryOf({ state: 'draft' })).toBe('draft');
    expect(categoryOf({ state: 'active' })).toBe('active');
    expect(categoryOf({ state: 'completed' })).toBe('complete');
  });

  it('opens on Draft', () => {
    expect(DEFAULT_TRIP_CATEGORY).toBe('draft');
    expect(TRIP_CATEGORIES).toContain(DEFAULT_TRIP_CATEGORY);
  });

  it('explains an empty category rather than repeating one line three times', () => {
    const messages = TRIP_CATEGORIES.map(emptyCategoryMessage);

    expect(new Set(messages).size).toBe(TRIP_CATEGORIES.length);
  });

  it('shows publication as a badge, because it is a different axis from the chips', () => {
    expect(tripBadge({ published: true, visibility: 'public' })).toEqual({
      label: 'Published',
      tone: 'public',
    });
    expect(tripBadge({ published: true, visibility: 'private' })).toEqual({
      label: 'Private',
      tone: 'private',
    });
  });

  it('gives an unpublished trip no badge, whatever its audience would be', () => {
    expect(tripBadge({ published: false, visibility: 'public' })).toBeNull();
    expect(tripBadge({ published: false, visibility: 'private' })).toBeNull();
  });
});
