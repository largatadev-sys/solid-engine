import { DOUBLE_TAP_MS, TAP_SLOP, afterTap, wasATap } from '../src/maps/mapGesture';


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
