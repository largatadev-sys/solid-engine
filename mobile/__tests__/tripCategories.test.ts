import {
  categoryOf,
  DEFAULT_TRIP_CATEGORY,
  emptyCategoryMessage,
  TRIP_CATEGORIES,
  tripCategoryLabel,
} from '../src/itineraries/tripCategories';

describe('the Trips categories (ADR-018)', () => {
  it('is the publication status itself, so the three are mutually exclusive', () => {
    expect(TRIP_CATEGORIES).toEqual(['draft', 'private', 'public']);
    expect(TRIP_CATEGORIES.map(tripCategoryLabel)).toEqual(['Draft', 'Private', 'Public']);
  });

  it('puts every trip in exactly one category — the earlier overlap is gone', () => {
    expect(categoryOf({ status: 'draft' })).toBe('draft');
    expect(categoryOf({ status: 'private' })).toBe('private');
    expect(categoryOf({ status: 'public' })).toBe('public');
  });

  it('opens on Public', () => {
    expect(DEFAULT_TRIP_CATEGORY).toBe('public');
    expect(TRIP_CATEGORIES).toContain(DEFAULT_TRIP_CATEGORY);
  });

  it('explains an empty category rather than repeating one line three times', () => {
    const messages = TRIP_CATEGORIES.map(emptyCategoryMessage);

    expect(new Set(messages).size).toBe(TRIP_CATEGORIES.length);
  });
});
