import {
  displacementFor,
  landingSlot,
  movedTo,
  orderedBy,
  reorderActionsFor,
} from '../src/itineraries/landingSlot';


const ROW = 60;


describe('landingSlot — where a drag would drop, asked continuously during the gesture', () => {
  it('stays put until the finger passes half a row', () => {
    expect(landingSlot(0, 1, 4, ROW)).toBe(1);
    expect(landingSlot(29, 1, 4, ROW)).toBe(1);
    expect(landingSlot(-29, 1, 4, ROW)).toBe(1);
  });

  it('advances one slot once half a row is crossed, in either direction', () => {
    expect(landingSlot(30, 1, 4, ROW)).toBe(2);
    expect(landingSlot(-30, 1, 4, ROW)).toBe(0);
  });

  it('tracks a longer drag slot by slot', () => {
    expect(landingSlot(120, 0, 4, ROW)).toBe(2);
    expect(landingSlot(180, 0, 4, ROW)).toBe(3);
  });

  it('clamps at both ends rather than dragging an activity out of the list', () => {
    expect(landingSlot(600, 0, 3, ROW)).toBe(2);
    expect(landingSlot(-600, 2, 3, ROW)).toBe(0);
  });

  it('refuses to divide by a row height it has not measured yet', () => {
    expect(landingSlot(200, 1, 4, 0)).toBe(1);
  });

  it('uses the MEASURED pitch, so a taller row still lands where it looks', () => {
    expect(landingSlot(60, 0, 4, 100)).toBe(1);
    expect(landingSlot(60, 0, 4, 60)).toBe(1);
    expect(landingSlot(59, 0, 4, 100)).toBe(1);
    expect(landingSlot(40, 0, 4, 100)).toBe(0);
  });

  it('measures PITCH, not height — the gap between rows is part of the travel', () => {
    const height = 60;
    const gap = 8;
    expect(landingSlot(height + gap, 0, 4, height + gap)).toBe(1);
    expect(landingSlot(2 * (height + gap), 0, 4, height + gap)).toBe(2);
  });
});


describe('displacementFor — the gap opening under the finger, live, before release', () => {
  it('lifts the rows the dragged one has passed on its way DOWN', () => {
    expect(displacementFor(1, 0, 2, ROW)).toBe(-ROW);
    expect(displacementFor(2, 0, 2, ROW)).toBe(-ROW);
  });

  it('pushes down the rows the dragged one has passed on its way UP', () => {
    expect(displacementFor(1, 3, 1, ROW)).toBe(ROW);
    expect(displacementFor(2, 3, 1, ROW)).toBe(ROW);
  });

  it('leaves rows beyond the landing slot exactly where they are', () => {
    expect(displacementFor(3, 0, 2, ROW)).toBe(0);
    expect(displacementFor(0, 3, 1, ROW)).toBe(0);
  });

  it('moves nothing while the drag has not yet changed the order', () => {
    for (const index of [0, 1, 2, 3]) {
      expect(displacementFor(index, 2, 2, ROW)).toBe(0);
    }
  });

  it('never displaces the dragged row itself — the finger owns that one', () => {
    expect(displacementFor(2, 2, 0, ROW)).toBe(0);
    expect(displacementFor(2, 2, 3, ROW)).toBe(0);
  });

  it('opens exactly ONE gap: the shifted rows always equal the distance travelled', () => {
    const shifted = [0, 1, 2, 3].filter((i) => displacementFor(i, 0, 3, ROW) !== 0);
    expect(shifted).toEqual([1, 2, 3]);
  });
});


describe('movedTo — the local order committed at the moment of release', () => {
  it('moves an id down, closing the gap behind it', () => {
    expect(movedTo(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('moves an id up', () => {
    expect(movedTo(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('never mutates the list it was handed', () => {
    const ids = ['a', 'b', 'c'];
    movedTo(ids, 0, 2);
    expect(ids).toEqual(['a', 'b', 'c']);
  });
});


describe('orderedBy — the visual order while the server catches up', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('renders the local order when one is held', () => {
    expect(orderedBy(items, ['c', 'a', 'b']).map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('renders the server order when no local order is held', () => {
    expect(orderedBy(items, null)).toBe(items);
  });

  it('falls back to the server order when the local one no longer fits — an activity deleted elsewhere', () => {
    expect(orderedBy(items, ['c', 'a', 'ghost'])).toBe(items);
    expect(orderedBy(items, ['c', 'a'])).toBe(items);
  });
});


describe('reorderActionsFor — the screen-reader path the arrows became', () => {
  it('offers both directions in the middle of the list', () => {
    expect(reorderActionsFor(1, 3).map((a) => a.name)).toEqual(['moveUp', 'moveDown']);
  });

  it('offers no move up at the top, and no move down at the bottom', () => {
    expect(reorderActionsFor(0, 3).map((a) => a.name)).toEqual(['moveDown']);
    expect(reorderActionsFor(2, 3).map((a) => a.name)).toEqual(['moveUp']);
  });

  it('offers nothing at all for a lone activity', () => {
    expect(reorderActionsFor(0, 1)).toEqual([]);
  });
});
