import { AVATAR_TINTS, tintFor, tintIndexFor } from '../src/members/avatarTints';

describe('the per-member tint map', () => {
  it('carries the canvas’s eight well/ink pairs', () => {
    expect(AVATAR_TINTS).toHaveLength(8);
    expect(AVATAR_TINTS[0]).toEqual({ well: '#DBEAFE', ink: '#1D4ED8' });
    expect(AVATAR_TINTS[7]).toEqual({ well: '#FEE2E2', ink: '#B91C1C' });
  });

  it('gives one traveler the same tint every time, on every surface', () => {
    const id = '018f2c1a-7b3d-7000-8000-000000000001';

    expect(tintFor(id)).toBe(tintFor(id));
    expect(tintIndexFor(id)).toBe(tintIndexFor(id));
  });

  it('always lands inside the palette', () => {
    const ids = Array.from({ length: 200 }, (_, at) => `traveler-${at}`);

    for (const id of ids) {
      expect(tintIndexFor(id)).toBeGreaterThanOrEqual(0);
      expect(tintIndexFor(id)).toBeLessThan(AVATAR_TINTS.length);
    }
  });

  it('spreads a realistic roster across more than one tint', () => {
    const spread = new Set(
      Array.from({ length: 40 }, (_, at) => tintIndexFor(`018f2c1a-7b3d-7000-8000-00000000000${at}`)),
    );

    expect(spread.size).toBeGreaterThan(1);
  });

  it('never throws on an empty id', () => {
    expect(tintFor('')).toEqual(AVATAR_TINTS[0]);
  });
});
