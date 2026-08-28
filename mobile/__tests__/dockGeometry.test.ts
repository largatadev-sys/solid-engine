import {
  clampY,
  defaultPosition,
  dismissZoneCentre,
  edgeX,
  fractionOf,
  inDismissZone,
  isDrag,
  landingFor,
  nearerEdge,
  verticalRange,
  withOverdrag,
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

describe('the vertical clamp', () => {
  it('runs from the top inset to the bottom inset less the disc', () => {
    expect(verticalRange(BOUNDS)).toEqual({ top: 12, bottom: 748 });
  });

  it('clamps at both ends', () => {
    expect(clampY(-500, BOUNDS)).toBe(12);
    expect(clampY(5000, BOUNDS)).toBe(748);
    expect(clampY(300, BOUNDS)).toBe(300);
  });

  it('collapses to a point rather than inverting on a tiny viewport', () => {
    const tiny: DockBounds = { ...BOUNDS, height: 30 };

    expect(verticalRange(tiny)).toEqual({ top: 12, bottom: 12 });
    expect(clampY(20, tiny)).toBe(12);
  });
});

describe('nearerEdge', () => {
  it('takes the left rail left of the midline and the right rail on or past it', () => {
    expect(nearerEdge(196, BOUNDS)).toBe('left');
    expect(nearerEdge(196.5, BOUNDS)).toBe('right');
    expect(nearerEdge(197, BOUNDS)).toBe('right');
  });

  it('places each rail at the inset', () => {
    expect(edgeX('left', BOUNDS)).toBe(16);
    expect(edgeX('right', BOUNDS)).toBe(337);
  });
});

describe('the vertical fraction', () => {
  it('round-trips through the clamped range', () => {
    [12, 100, 400, 748].forEach((y) => {
      expect(yOf(fractionOf(y, BOUNDS), BOUNDS)).toBeCloseTo(y, 6);
    });
  });

  it('keeps the proportional place across a resize', () => {
    const parked = fractionOf(380, BOUNDS);
    const shorter: DockBounds = { ...BOUNDS, height: 600 };

    const moved = yOf(parked, shorter);

    expect(moved).toBeGreaterThanOrEqual(verticalRange(shorter).top);
    expect(moved).toBeLessThanOrEqual(verticalRange(shorter).bottom);
    expect(fractionOf(moved, shorter)).toBeCloseTo(parked, 6);
  });

  it('pins a degenerate range to zero rather than dividing by it', () => {
    const tiny: DockBounds = { ...BOUNDS, height: 30 };

    expect(fractionOf(12, tiny)).toBe(0);
  });
});

describe('landingFor', () => {
  it('docks right when released right of centre and left when left', () => {
    expect(landingFor({ x: 300, y: 400 }, BOUNDS).edge).toBe('right');
    expect(landingFor({ x: 20, y: 400 }, BOUNDS).edge).toBe('left');
  });

  it('keeps the vertical position it was released at', () => {
    const landing = landingFor({ x: 300, y: 400 }, BOUNDS);

    expect(yOf(landing.y, BOUNDS)).toBeCloseTo(400, 6);
  });

  it('clamps a release past the bottom back into range', () => {
    const landing = landingFor({ x: 300, y: 5000 }, BOUNDS);

    expect(landing.y).toBe(1);
    expect(yOf(landing.y, BOUNDS)).toBe(748);
  });
});

describe('defaultPosition', () => {
  it('is the right rail, clear of the tab bar by the reserve', () => {
    const position = defaultPosition(BOUNDS, 96);

    expect(position.edge).toBe('right');
    expect(yOf(position.y, BOUNDS)).toBe(652);
  });
});

describe('the tap/drag threshold', () => {
  it('classifies travel under the threshold as a tap', () => {
    expect(isDrag({ x: 0, y: 0 }, { x: 3, y: 0 }, 4)).toBe(false);
    expect(isDrag({ x: 0, y: 0 }, { x: 2, y: 2 }, 4)).toBe(false);
  });

  it('classifies travel at or past it as a drag, in any direction', () => {
    expect(isDrag({ x: 0, y: 0 }, { x: 4, y: 0 }, 4)).toBe(true);
    expect(isDrag({ x: 0, y: 0 }, { x: 0, y: -9 }, 4)).toBe(true);
    expect(isDrag({ x: 10, y: 10 }, { x: 4, y: 10 }, 4)).toBe(true);
  });
});

describe('withOverdrag', () => {
  it('allows the overdrag past each rail and no further', () => {
    expect(withOverdrag(-500, BOUNDS, 12)).toBe(4);
    expect(withOverdrag(5000, BOUNDS, 12)).toBe(349);
  });

  it('leaves a position inside the rails untouched', () => {
    expect(withOverdrag(200, BOUNDS, 12)).toBe(200);
  });
});

describe('the dismiss zone', () => {
  const zone = { centre: dismissZoneCentre(BOUNDS, 80), radius: 44 };

  it('sits at bottom-centre of the frame', () => {
    expect(zone.centre).toEqual({ x: 196.5, y: 720 });
  });

  it('hits when the disc centre is inside the radius', () => {
    expect(inDismissZone({ x: 176.5, y: 700 }, BOUNDS, zone)).toBe(true);
  });

  it('misses when the disc is parked at a rail', () => {
    expect(inDismissZone({ x: 337, y: 400 }, BOUNDS, zone)).toBe(false);
    expect(inDismissZone({ x: 16, y: 720 }, BOUNDS, zone)).toBe(false);
  });

  it('misses just outside the radius', () => {
    expect(inDismissZone({ x: 176.5, y: 765 }, BOUNDS, zone)).toBe(false);
  });
});
