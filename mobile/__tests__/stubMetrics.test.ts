import {
  STUB_METRICS_ON,
  stubFollowerCount,
  stubFollowingCount,
  stubLikeCount,
  stubPricePerPerson,
  stubRating,
} from '../src/profile/stubMetrics';


const DRAWS = 500;

function draw<T>(generate: () => T): T[] {
  return Array.from({ length: DRAWS }, generate);
}


describe('stubMetrics — the fake numbers the profile wears until the real features land', () => {
  describe('with the switch on', () => {
    it('draws follower and following counts as integers within 1 and 100', () => {
      for (const count of [...draw(() => stubFollowerCount(true)), ...draw(() => stubFollowingCount(true))]) {
        expect(Number.isInteger(count)).toBe(true);
        expect(count).toBeGreaterThanOrEqual(1);
        expect(count).toBeLessThanOrEqual(100);
      }
    });

    it('draws a like count as an integer within 1 and 100', () => {
      for (const likes of draw(() => stubLikeCount(true))) {
        expect(likes).not.toBeNull();
        expect(Number.isInteger(likes)).toBe(true);
        expect(likes).toBeGreaterThanOrEqual(1);
        expect(likes).toBeLessThanOrEqual(100);
      }
    });

    it('draws a rating within 1.0 and 5.0 carrying exactly one decimal', () => {
      for (const rating of draw(() => stubRating(true))) {
        expect(rating).not.toBeNull();
        expect(rating!).toBeGreaterThanOrEqual(1);
        expect(rating!).toBeLessThanOrEqual(5);
        expect(Math.round(rating! * 10)).toBe(Number(rating!.toFixed(1)) * 10);
        expect(Number(rating!.toFixed(1))).toBe(rating);
      }
    });

    it('draws a price within 10,000 and 20,000 landing only on whole hundreds', () => {
      for (const price of draw(() => stubPricePerPerson(true))) {
        expect(price).not.toBeNull();
        expect(price!).toBeGreaterThanOrEqual(10_000);
        expect(price!).toBeLessThanOrEqual(20_000);
        expect(price! % 100).toBe(0);
      }
    });

    it('rerolls rather than repeating one value forever', () => {
      expect(new Set(draw(() => stubFollowerCount(true))).size).toBeGreaterThan(1);
      expect(new Set(draw(() => stubRating(true))).size).toBeGreaterThan(1);
    });

    it('reaches both ends of every range across enough draws', () => {
      const followers = draw(() => stubFollowerCount(true));
      expect(Math.min(...followers)).toBeLessThan(10);
      expect(Math.max(...followers)).toBeGreaterThan(90);

      const prices = draw(() => stubPricePerPerson(true)).map((price) => price!);
      expect(Math.min(...prices)).toBeLessThan(11_000);
      expect(Math.max(...prices)).toBeGreaterThan(19_000);
    });
  });

  describe('with the switch off, every derivation falls back to the honest screen', () => {
    it('renders follower and following counts as zero', () => {
      expect(stubFollowerCount(false)).toBe(0);
      expect(stubFollowingCount(false)).toBe(0);
    });

    it('withholds the like count so no likes row renders', () => {
      expect(stubLikeCount(false)).toBeNull();
    });

    it('withholds the rating so the star renders muted and numberless', () => {
      expect(stubRating(false)).toBeNull();
    });

    it('withholds the price so no pill renders', () => {
      expect(stubPricePerPerson(false)).toBeNull();
    });
  });

  it('ships with the stubs on, since the founders are eyeballing the dressed screen', () => {
    expect(STUB_METRICS_ON).toBe(true);
  });
});
