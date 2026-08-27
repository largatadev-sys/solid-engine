import { diaryIsEmptied, visibleAfterRemoval } from '../src/removal/removalProjection';


const ENTRIES = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];


describe('a removed row leaves the list the moment it is requested', () => {
  it('hides only the removed row', () => {
    expect(visibleAfterRemoval(ENTRIES, ['b']).map((entry) => entry.id)).toEqual(['a', 'c']);
  });

  it('leaves the list untouched when nothing is pending', () => {
    expect(visibleAfterRemoval(ENTRIES, [])).toHaveLength(3);
  });

  it('restores the row in place when the removal is undone, never at the end', () => {
    const collapsed = visibleAfterRemoval(ENTRIES, ['b']);
    const restored = visibleAfterRemoval(ENTRIES, []);

    expect(collapsed.map((entry) => entry.id)).toEqual(['a', 'c']);
    expect(restored.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
  });

  it('ignores a pending id the list does not hold', () => {
    expect(visibleAfterRemoval(ENTRIES, ['zzz'])).toHaveLength(3);
  });
});


describe('a diary is emptied by its last postcard leaving', () => {
  it('is emptied when every entry it holds is pending removal', () => {
    expect(diaryIsEmptied([{ id: 'a' }], ['a'])).toBe(true);
  });

  it('is not emptied while any entry survives', () => {
    expect(diaryIsEmptied(ENTRIES, ['a'])).toBe(false);
  });

  it('is not emptied when it was already empty — there is nothing to collapse behind', () => {
    expect(diaryIsEmptied([], [])).toBe(false);
  });

  it('is not emptied when its entries have not loaded yet', () => {
    expect(diaryIsEmptied(undefined, ['a'])).toBe(false);
  });

  it('comes back the moment the removal is undone', () => {
    expect(diaryIsEmptied([{ id: 'a' }], ['a'])).toBe(true);
    expect(diaryIsEmptied([{ id: 'a' }], [])).toBe(false);
  });
});
