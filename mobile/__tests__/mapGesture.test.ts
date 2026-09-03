import {
  DOUBLE_TAP_MS,
  MIN_PINCH_SPAN,
  TAP_SLOP,
  afterTap,
  endsAsTap,
  nextWholeZoom,
  pinchBaseline,
  wasATap,
} from '../src/maps/mapGesture';
import { MAX_ZOOM, zoomAfterPinch } from '../src/maps/tileProjection';


describe('what counts as a tap rather than a pan (PL-2)', () => {
  it('a finger that barely moved was a tap', () => {
    expect(wasATap(0, 0)).toBe(true);
    expect(wasATap(TAP_SLOP - 1, 0)).toBe(true);
  });

  it('the slop is inclusive, so the boundary is a tap and not a one-pixel pan', () => {
    expect(wasATap(TAP_SLOP, 0)).toBe(true);
  });

  it('measures the diagonal, not each axis — a short drag in both is still a pan', () => {
    expect(wasATap(5, 5)).toBe(false);
  });

  it('a sign never rescues a long travel', () => {
    expect(wasATap(-40, 0)).toBe(false);
    expect(wasATap(0, -40)).toBe(false);
  });
});


describe('the double tap that zooms in (PL-2 — the founder pass that removed pinch)', () => {
  it('a second tap inside the window zooms', () => {
    expect(afterTap(1_000, 1_000 + DOUBLE_TAP_MS - 1).zoomIn).toBe(true);
  });

  it('a second tap after the window does not', () => {
    expect(afterTap(1_000, 1_000 + DOUBLE_TAP_MS + 1).zoomIn).toBe(false);
  });

  it('forgets the pair it just spent, so three taps are not two zooms', () => {
    const second = afterTap(1_000, 1_100);
    expect(second.zoomIn).toBe(true);
    expect(second.lastTapAt).toBe(0);
    expect(afterTap(second.lastTapAt, 1_200).zoomIn).toBe(false);
  });

  it('remembers a lone tap, so the next one can pair with it', () => {
    expect(afterTap(0, 5_000).lastTapAt).toBe(5_000);
  });

  it('does not zoom on the very first tap of a session', () => {
    expect(afterTap(0, Date.now()).zoomIn).toBe(false);
  });
});


describe('a gesture that PINCHED never ends as a tap (PL-2, founder-found on the phone)', () => {
  it('refuses the tap however still the last finger was', () => {
    expect(endsAsTap(true, 0, 0)).toBe(false);
    expect(endsAsTap(true, TAP_SLOP - 1, 0)).toBe(false);
  });

  it('still calls a genuine single-finger tap a tap', () => {
    expect(endsAsTap(false, 0, 0)).toBe(true);
    expect(endsAsTap(false, 2, 2)).toBe(true);
  });

  it('a pinch cannot bank a tap that a LATER pinch pairs with into a double-tap zoom', () => {
    const firstLift = endsAsTap(true, 1, 0);
    const secondLift = endsAsTap(true, 1, 0);

    expect([firstLift, secondLift]).toEqual([false, false]);
  });

  it('a long drag is not a tap either, pinched or not', () => {
    expect(endsAsTap(false, 90, 0)).toBe(false);
    expect(endsAsTap(true, 90, 0)).toBe(false);
  });
});


describe('a pinch needs two fingers actually apart to measure from (PL-2)', () => {
  it('refuses a baseline the fingers are too close to have meant', () => {
    expect(pinchBaseline(MIN_PINCH_SPAN - 1, 14)).toBeNull();
  });

  it('takes one the moment they are far enough apart to mean it', () => {
    expect(pinchBaseline(MIN_PINCH_SPAN, 14)).toEqual({ span: MIN_PINCH_SPAN, zoom: 14 });
  });

  it('a near-zero start span SATURATES the zoom on the first move, so it is refused', () => {
    expect(pinchBaseline(0.5, 14)).toBeNull();
    expect(zoomAfterPinch(14, 0.5, 200)).toBe(MAX_ZOOM);
  });
});


describe('a whole-level step moves ONE level, in both directions (PL-2, review pass)', () => {
  it('steps to the next level up and the next level down from a fraction', () => {
    expect(nextWholeZoom(14.6, 1)).toBe(15);
    expect(nextWholeZoom(14.6, -1)).toBe(14);
  });

  it('is SYMMETRIC — the S4.17 rounding trap, re-tripped one function over', () => {
    for (const zoom of [12, 12.1, 12.5, 12.9, 13]) {
      const up = nextWholeZoom(zoom, 1);
      const down = nextWholeZoom(zoom, -1);

      expect(up - zoom).toBeGreaterThan(0);
      expect(zoom - down).toBeGreaterThan(0);
      expect(up - down).toBeLessThanOrEqual(2);
    }
  });

  it('returns where it started when a whole level is stepped up then down', () => {
    expect(nextWholeZoom(nextWholeZoom(15, 1), -1)).toBe(15);
    expect(nextWholeZoom(nextWholeZoom(15, -1), 1)).toBe(15);
  });

  it('never jumps more than one level, which Math.round(zoom) + by did from 14.6', () => {
    expect(Math.abs(nextWholeZoom(14.6, 1) - 14.6)).toBeLessThanOrEqual(1);
    expect(Math.abs(nextWholeZoom(14.4, -1) - 14.4)).toBeLessThanOrEqual(1);
  });
});
