import { MIN_PINCH_SPAN } from '../src/maps/mapGesture';
import {
  NO_GESTURE,
  pointerDown,
  pointerMove,
  pointerUp,
  type GestureState,
} from '../src/maps/gestureTracker';


const ZOOM = 14;

const at = (x: number, y: number) => ({ x, y });

const PRIMARY = true;

const SECOND_FINGER = false;

function pinchThen(state: GestureState): GestureState {
  let held = pointerDown(state, 1, at(100, 100), ZOOM, PRIMARY);
  held = pointerDown(held, 2, at(300, 100), ZOOM, SECOND_FINGER);
  held = pointerMove(held, 2, at(360, 100), ZOOM).state;
  held = pointerUp(held, 1, at(100, 100)).state;
  return pointerUp(held, 2, at(360, 100)).state;
}


describe('a drag after a pinch is a DRAG (PL-2, founder-found on the phone)', () => {
  it('leaves nothing behind, so the next single finger pans instead of zooming', () => {
    const after = pinchThen(NO_GESTURE);

    expect(after).toEqual(NO_GESTURE);

    const dragging = pointerDown(after, 3, at(200, 200), ZOOM, PRIMARY);
    const moved = pointerMove(dragging, 3, at(240, 260), ZOOM);

    expect(moved.pinch).toBeNull();
    expect(moved.pan).toEqual({ dx: 40, dy: 60 });
  });

  it('SELF-HEALS a leaked pointer — a fresh gesture starts from nothing whatever was left', () => {
    const leaked: GestureState = {
      ...NO_GESTURE,
      pointers: [{ id: 99, at: at(10, 10) }],
      everPinched: true,
      tracking: true,
    };

    const dragging = pointerDown(leaked, 1, at(200, 200), ZOOM, PRIMARY);
    const moved = pointerMove(dragging, 1, at(230, 200), ZOOM);

    expect(dragging.pointers).toHaveLength(1);
    expect(moved.pinch)
      .toBeNull();
    expect(moved.pan).toEqual({ dx: 30, dy: 0 });
  });

  it('a third finger cannot join and corrupt the span', () => {
    let held = pointerDown(NO_GESTURE, 1, at(100, 100), ZOOM, PRIMARY);
    held = pointerDown(held, 2, at(300, 100), ZOOM, SECOND_FINGER);
    const before = held.baseline;

    held = pointerDown(held, 3, at(101, 101), ZOOM, SECOND_FINGER);

    expect(held.pointers).toHaveLength(2);
    expect(held.baseline).toEqual(before);
  });
});


describe('the pinch itself (PL-2)', () => {
  it('reports the live span and the zoom it started from', () => {
    let held = pointerDown(NO_GESTURE, 1, at(100, 100), ZOOM, PRIMARY);
    held = pointerDown(held, 2, at(300, 100), ZOOM, SECOND_FINGER);

    const moved = pointerMove(held, 2, at(400, 100), ZOOM);

    expect(moved.pinch).toEqual({ span: 300, from: ZOOM, at: { x: 250, y: 100 } });
    expect(moved.pan).toBeNull();
  });

  it('takes no baseline from fingers landing on top of each other, and takes one once they part', () => {
    let held = pointerDown(NO_GESTURE, 1, at(100, 100), ZOOM, PRIMARY);
    held = pointerDown(held, 2, at(100 + MIN_PINCH_SPAN - 2, 100), ZOOM, SECOND_FINGER);
    expect(held.baseline).toBeNull();

    const parted = pointerMove(held, 2, at(400, 100), ZOOM);

    expect(parted.state.baseline).not.toBeNull();
    expect(parted.pinch?.span).toBe(300);
  });

  it('lifting one finger of two hands the remaining one a clean pan anchor', () => {
    let held = pointerDown(NO_GESTURE, 1, at(100, 100), ZOOM, PRIMARY);
    held = pointerDown(held, 2, at(300, 100), ZOOM, SECOND_FINGER);

    const lifted = pointerUp(held, 1, at(100, 100));

    expect(lifted.done).toBe(false);
    expect(lifted.state.anchor).toEqual({ x: 300, y: 100 });
    expect(lifted.state.baseline).toBeNull();
    expect(pointerMove(lifted.state, 2, at(320, 100), ZOOM).pan).toEqual({ dx: 20, dy: 0 });
  });

  it('remembers it pinched until the LAST finger lifts, so no lift is read as a tap', () => {
    let held = pointerDown(NO_GESTURE, 1, at(100, 100), ZOOM, PRIMARY);
    held = pointerDown(held, 2, at(300, 100), ZOOM, SECOND_FINGER);

    const first = pointerUp(held, 1, at(100, 100));
    const second = pointerUp(first.state, 2, at(300, 100));

    expect(first.pinched).toBe(true);
    expect(second.pinched).toBe(true);
  });

  it('a plain one-finger tap is not remembered as a pinch', () => {
    const held = pointerDown(NO_GESTURE, 1, at(100, 100), ZOOM, PRIMARY);

    expect(pointerUp(held, 1, at(101, 100)).pinched).toBe(false);
  });
});
