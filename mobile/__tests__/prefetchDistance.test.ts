import { PREFETCH_CARDS, prefetchThreshold } from '../src/feed/prefetchDistance';

const CARD = 560;
const VIEWPORT = 780;


describe('prefetchThreshold — "three cards from the end", in the units RN actually uses', () => {
  it('converts three cards into viewport-lengths, which is what onEndReachedThreshold means', () => {
    expect(prefetchThreshold(CARD, VIEWPORT)).toBeCloseTo((3 * CARD) / VIEWPORT, 5);
  });

  it('asks for more lead time when the cards are tall relative to the screen', () => {
    expect(prefetchThreshold(900, VIEWPORT)).toBeGreaterThan(prefetchThreshold(400, VIEWPORT));
  });

  it('asks for less when the screen is tall enough to show several cards at once', () => {
    expect(prefetchThreshold(CARD, 2000)).toBeLessThan(prefetchThreshold(CARD, 600));
  });

  it('falls back to half a viewport before anything has been measured', () => {
    expect(prefetchThreshold(0, VIEWPORT)).toBe(0.5);
    expect(prefetchThreshold(CARD, 0)).toBe(0.5);
    expect(prefetchThreshold(0, 0)).toBe(0.5);
  });

  it('keeps the mock-s number where a reader can see it', () => {
    expect(PREFETCH_CARDS).toBe(3);
  });
});
