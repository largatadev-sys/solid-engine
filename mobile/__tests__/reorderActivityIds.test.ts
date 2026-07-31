import { applyMove, reorderActivityIds } from '../src/itineraries/reorderActivityIds';


describe('applyMove — the id-keyed intent a 409 can be re-applied from (spec AC 7)', () => {
  it('moves the named activity, wherever it currently sits', () => {
    expect(applyMove(['a', 'b', 'c'], { activityId: 'c', direction: 'up' })).toEqual(['a', 'c', 'b']);
  });

  it('re-applies against a list that changed underneath it, which is the whole point', () => {
    const move = { activityId: 'c', direction: 'up' } as const;

    expect(applyMove(['a', 'b', 'c'], move)).toEqual(['a', 'c', 'b']);
    expect(applyMove(['x', 'a', 'b', 'c'], move)).toEqual(['x', 'a', 'c', 'b']);
  });

  it('declines rather than no-ops when the move is off the end, so no pointless PUT is sent', () => {
    expect(applyMove(['a', 'b'], { activityId: 'a', direction: 'up' })).toBeNull();
    expect(applyMove(['a', 'b'], { activityId: 'b', direction: 'down' })).toBeNull();
  });

  it('declines when the activity is gone from the refetched list', () => {
    expect(applyMove(['a', 'b'], { activityId: 'deleted-meanwhile', direction: 'up' })).toBeNull();
  });
});



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
