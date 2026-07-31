import {
  categoriesOf,
  emptyCategoryMessage,
  TRIP_CATEGORIES,
  tripCategoryLabel,
} from '../src/itineraries/tripCategories';

describe('the Trips categories (founder ruling, 2026-08-01)', () => {
  it('ships the three the founder named, in that order', () => {
    expect(TRIP_CATEGORIES).toEqual(['draft', 'private', 'published']);
    expect(TRIP_CATEGORIES.map(tripCategoryLabel)).toEqual(['Draft', 'Private', 'Published']);
  });

  it('puts a new trip under BOTH draft and private — the overlap is the ruling, not a bug', () => {
    expect(categoriesOf({ state: 'draft', visibility: 'private' })).toEqual(['draft', 'private']);
  });

  it('keeps a published trip in draft while it has never been started', () => {
    expect(categoriesOf({ state: 'draft', visibility: 'published' })).toEqual(['draft', 'published']);
  });

  it('drops a started trip out of draft without touching its visibility', () => {
    expect(categoriesOf({ state: 'active', visibility: 'published' })).toEqual(['published']);
    expect(categoriesOf({ state: 'completed', visibility: 'private' })).toEqual(['private']);
  });

  it('explains an empty category rather than repeating the same line three times', () => {
    const messages = TRIP_CATEGORIES.map(emptyCategoryMessage);

    expect(new Set(messages).size).toBe(TRIP_CATEGORIES.length);
    expect(emptyCategoryMessage(undefined)).toMatch(/Plan your first one/);
  });
});
