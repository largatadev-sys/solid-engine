import { addRow, cleanRows, moveRow, removeRow, setRow } from '../src/itineraries/rowEditor';

describe('rowEditor', () => {
  it('appends an empty row for the traveler to type into', () => {
    expect(addRow(['a'])).toEqual(['a', '']);
  });

  it('removes a row by position', () => {
    expect(removeRow(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
  });

  it('replaces one row without disturbing its neighbours', () => {
    expect(setRow(['a', 'b'], 1, 'B')).toEqual(['a', 'B']);
  });

  it('strips and drops the blank rows an add-button leaves behind', () => {
    expect(cleanRows([' a ', '', '   ', 'b'])).toEqual(['a', 'b']);
  });
});

describe('moveRow — the creator owns the order', () => {
  it('moves a row up', () => {
    expect(moveRow(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
  });

  it('moves a row down', () => {
    expect(moveRow(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });

  it('refuses to move off either end rather than wrapping around', () => {
    expect(moveRow(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveRow(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });
});
