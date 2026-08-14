import {
  draggedFar,
  freeScroll,
  MIN_DRAG_PX,
  settledOffset,
  viewportPitch,
} from '../src/components/stripSettle';

describe('settledOffset', () => {
  it('snaps to the nearest multiple of the pitch it is given', () => {
    expect(settledOffset(210, 100)).toBe(200);
    expect(settledOffset(260, 100)).toBe(300);
  });

  it('settles a card rail on the card pitch, never on the viewport width', () => {
    const cardPitch = 297;
    expect(settledOffset(400, cardPitch)).toBe(297);
    expect(settledOffset(500, cardPitch)).toBe(594);
  });

  it('leaves a free-scrolling strip exactly where the traveler let go', () => {
    expect(settledOffset(137, freeScroll())).toBe(137);
    expect(settledOffset(0, freeScroll())).toBe(0);
  });

  it('leaves the offset alone rather than dividing by an unmeasured pitch', () => {
    expect(settledOffset(137, 0)).toBe(137);
    expect(settledOffset(137, -20)).toBe(137);
  });

  it('reports the viewport as the pitch for a pager', () => {
    expect(viewportPitch(393)).toBe(393);
    expect(settledOffset(500, viewportPitch(393))).toBe(393);
  });
});

describe('draggedFar', () => {
  it('does not count a click that never moved as a drag', () => {
    expect(draggedFar(0, 0)).toBe(false);
    expect(draggedFar(240, 240)).toBe(false);
  });

  it('does not count a hand tremor as a drag', () => {
    expect(draggedFar(0, MIN_DRAG_PX - 1)).toBe(false);
  });

  it('counts a real drag in either direction', () => {
    expect(draggedFar(0, MIN_DRAG_PX)).toBe(true);
    expect(draggedFar(300, 40)).toBe(true);
    expect(draggedFar(40, 300)).toBe(true);
  });
});
