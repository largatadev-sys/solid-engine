import {
  edgeX,
  landingFor,
  yOf,
  type DockBounds,
} from '../src/feedback/dockGeometry';

const BOUNDS: DockBounds = {
  width: 393,
  height: 800,
  insetTop: 12,
  insetBottom: 12,
  disc: 40,
  rail: 16,
};

const NUDGE = 24;

const nudged = (from: { x: number; y: number }, dx: number, dy: number) =>
  landingFor({ x: from.x + dx * NUDGE, y: from.y + dy * NUDGE }, BOUNDS);

describe('the keyboard nudge lands like a drag', () => {
  const atRightRail = { x: edgeX('right', BOUNDS), y: 400 };
  const atLeftRail = { x: edgeX('left', BOUNDS), y: 400 };

  it('moves the bubble a nudge up and re-snaps to the same rail', () => {
    const landing = nudged(atRightRail, 0, -1);

    expect(landing.edge).toBe('right');
    expect(yOf(landing.y, BOUNDS)).toBeCloseTo(376, 6);
  });

  it('moves it a nudge down', () => {
    expect(yOf(nudged(atRightRail, 0, 1).y, BOUNDS)).toBeCloseTo(424, 6);
  });

  it('keeps the right rail for a single sideways nudge, since the centre stays past the midline', () => {
    expect(nudged(atRightRail, -1, 0).edge).toBe('right');
  });

  it('crosses to the other rail once the nudges carry the centre past the midline', () => {
    let at = atRightRail;
    for (let step = 0; step < 6; step += 1) {
      const landing = nudged(at, -1, 0);
      at = { x: at.x - NUDGE, y: yOf(landing.y, BOUNDS) };
    }

    expect(nudged(at, -1, 0).edge).toBe('left');
  });

  it('clamps at the top rather than leaving the frame', () => {
    const landing = nudged({ x: atLeftRail.x, y: 12 }, 0, -1);

    expect(landing.y).toBe(0);
    expect(yOf(landing.y, BOUNDS)).toBe(12);
  });

  it('clamps at the bottom', () => {
    const landing = nudged({ x: atLeftRail.x, y: 748 }, 0, 1);

    expect(landing.y).toBe(1);
    expect(yOf(landing.y, BOUNDS)).toBe(748);
  });
});
