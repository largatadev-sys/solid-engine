import { reorderActivityIds } from '../src/itineraries/reorderActivityIds';

/**
 * The reorder reducer (S1.3, ticket 03) — the pure logic behind the up/down controls, tested without
 * a renderer (the `formatActivityCost` pattern). What matters: a nudge swaps exactly two neighbours,
 * the ends are no-ops, and the input is never mutated.
 */

describe('reorderActivityIds', () => {
  it('moves an activity up by swapping it with the one above', () => {
    expect(reorderActivityIds(['a', 'b', 'c'], 1, 'up')).toEqual(['b', 'a', 'c']);
  });

  it('moves an activity down by swapping it with the one below', () => {
    expect(reorderActivityIds(['a', 'b', 'c'], 1, 'down')).toEqual(['a', 'c', 'b']);
  });

  it('is a no-op moving the first activity up', () => {
    expect(reorderActivityIds(['a', 'b', 'c'], 0, 'up')).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op moving the last activity down', () => {
    expect(reorderActivityIds(['a', 'b', 'c'], 2, 'down')).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op on an out-of-range index', () => {
    expect(reorderActivityIds(['a', 'b'], 5, 'up')).toEqual(['a', 'b']);
  });

  it('never mutates the input array', () => {
    const input = ['a', 'b', 'c'];
    reorderActivityIds(input, 1, 'up');
    expect(input).toEqual(['a', 'b', 'c']);
  });
});
