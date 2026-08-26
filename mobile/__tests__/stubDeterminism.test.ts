import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MOBILE_ROOT = join(__dirname, '..');
const MODULE_PATH = '../src/profile/stubMetrics';
const SOURCE = readFileSync(join(MOBILE_ROOT, 'src', 'profile', 'stubMetrics.ts'), 'utf8');

type StubMetrics = typeof import('../src/profile/stubMetrics');

function freshModule(): StubMetrics {
  let loaded: StubMetrics | null = null;
  jest.isolateModules(() => {
    loaded = require(MODULE_PATH) as StubMetrics;
  });
  return loaded as unknown as StubMetrics;
}

const SUBJECTS = ['0192f0a1-6c3e-7a41-9f2b-5d8e1c4a7b30', 'itinerary-1', 'itinerary-2', 'a', ''];


describe('stub metrics are a pure function of the subject id', () => {
  it('survives a module reload — a second process shows a founder the same numbers', () => {
    const first = freshModule();
    const second = freshModule();

    for (const id of SUBJECTS) {
      expect(second.stubRatingFor(id)).toBe(first.stubRatingFor(id));
      expect(second.stubPricePerPersonFor(id)).toBe(first.stubPricePerPersonFor(id));
      expect(second.stubLikeCountFor(id)).toBe(first.stubLikeCountFor(id));
      expect(second.stubCommentCountFor(id)).toBe(first.stubCommentCountFor(id));
    }
  });

  it('holds still across repeated calls within one module instance', () => {
    const metrics = freshModule();

    for (const id of SUBJECTS) {
      const rating = metrics.stubRatingFor(id);
      const price = metrics.stubPricePerPersonFor(id);
      expect(metrics.stubRatingFor(id)).toBe(rating);
      expect(metrics.stubPricePerPersonFor(id)).toBe(price);
    }
  });

  it('does not depend on call order — the same id drawn first or last reads the same', () => {
    const forwards = freshModule();
    const backwards = freshModule();

    const inOrder = SUBJECTS.map((id) => forwards.stubRatingFor(id));
    const reversed = [...SUBJECTS].reverse().map((id) => backwards.stubRatingFor(id));

    expect([...reversed].reverse()).toEqual(inOrder);
  });

  it('keeps no Math.random in the module, which is the only way the guarantee can hold', () => {
    expect(SOURCE).not.toContain('Math.random');
  });

  it('spreads distinct ids across the range rather than collapsing them onto one value', () => {
    const metrics = freshModule();
    const ids = Array.from({ length: 200 }, (_unused, index) => `itinerary-${index}`);

    expect(new Set(ids.map((id) => metrics.stubRatingFor(id))).size).toBeGreaterThan(1);
    expect(new Set(ids.map((id) => metrics.stubPricePerPersonFor(id))).size).toBeGreaterThan(10);
    expect(new Set(ids.map((id) => metrics.stubLikeCountFor(id))).size).toBeGreaterThan(10);
  });

  it('gives one id different numbers per metric, so a card is not four copies of one draw', () => {
    const metrics = freshModule();
    const id = 'itinerary-7';

    expect(metrics.stubRatingFor(id)).not.toBe(metrics.stubLikeCountFor(id));
    expect(metrics.stubLikeCountFor(id)).not.toBe(metrics.stubCommentCountFor(id));
  });
});


describe('the drawn values stay inside the ranges the screens were designed against', () => {
  const metrics = freshModule();
  const ids = Array.from({ length: 400 }, (_unused, index) => `spread-${index}`);

  it('rates within 1.0 and 5.0 carrying exactly one decimal', () => {
    for (const rating of ids.map((id) => metrics.stubRatingFor(id))) {
      expect(rating).not.toBeNull();
      expect(rating!).toBeGreaterThanOrEqual(1);
      expect(rating!).toBeLessThanOrEqual(5);
      expect(Number(rating!.toFixed(1))).toBe(rating);
    }
  });

  it('prices within 10,000 and 20,000 landing only on whole hundreds', () => {
    for (const price of ids.map((id) => metrics.stubPricePerPersonFor(id))) {
      expect(price).not.toBeNull();
      expect(price!).toBeGreaterThanOrEqual(10_000);
      expect(price!).toBeLessThanOrEqual(20_000);
      expect(price! % 100).toBe(0);
    }
  });

  it('reaches both ends of the ranges across enough ids', () => {
    const prices = ids.map((id) => metrics.stubPricePerPersonFor(id)!);
    expect(Math.min(...prices)).toBeLessThan(11_000);
    expect(Math.max(...prices)).toBeGreaterThan(19_000);
  });

  it('reaches past 999 likes so the compact formatting meets real stub data', () => {
    const likes = ids.map((id) => metrics.stubLikeCountFor(id)!);
    expect(Math.max(...likes)).toBeGreaterThan(999);
    expect(Math.min(...likes)).toBeGreaterThanOrEqual(1);
  });

  it('never falls below the floor of any range — a signed hash would make counts negative', () => {
    for (const id of ids) {
      expect(metrics.stubLikeCountFor(id)!).toBeGreaterThanOrEqual(1);
      expect(metrics.stubCommentCountFor(id)!).toBeGreaterThanOrEqual(0);
      expect(metrics.stubCommentCountFor(id)!).toBeLessThanOrEqual(60);
      expect(metrics.stubRatingFor(id)!).toBeGreaterThanOrEqual(1);
      expect(metrics.stubPricePerPersonFor(id)!).toBeGreaterThanOrEqual(10_000);
    }
  });
});


describe('the kill-switch still takes every number away', () => {
  const metrics = freshModule();

  it('withholds the per-subject stubs as null', () => {
    expect(metrics.stubRatingFor('x', false)).toBeNull();
    expect(metrics.stubPricePerPersonFor('x', false)).toBeNull();
    expect(metrics.stubLikeCountFor('x', false)).toBeNull();
    expect(metrics.stubCommentCountFor('x', false)).toBeNull();
  });

  it('holds no follow stub at all — S4.37 made those counts real', () => {
    expect(metrics).not.toHaveProperty('stubFollowerCountFor');
    expect(metrics).not.toHaveProperty('stubFollowingCountFor');
  });

  it('ships with the stubs on, since the founders are eyeballing the dressed screen', () => {
    expect(metrics.STUB_METRICS_ON).toBe(true);
  });
});
