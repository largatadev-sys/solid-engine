import { captionOverflows, UNMEASURED } from '../src/feed/captionClamp';

const LINE = 19;


describe('captionOverflows — "more" belongs only to a caption that clamps', () => {
  it('says no while nothing has been measured yet, so "more" cannot flash on mount', () => {
    expect(captionOverflows(UNMEASURED)).toBe(false);
    expect(captionOverflows({ full: LINE * 4, clamped: 0 })).toBe(false);
    expect(captionOverflows({ full: 0, clamped: LINE * 2 })).toBe(false);
  });

  it('says no for a caption that already fits in its two lines', () => {
    expect(captionOverflows({ full: LINE, clamped: LINE })).toBe(false);
    expect(captionOverflows({ full: LINE * 2, clamped: LINE * 2 })).toBe(false);
  });

  it('says yes the moment the unclamped text is taller than the clamped text', () => {
    expect(captionOverflows({ full: LINE * 3, clamped: LINE * 2 })).toBe(true);
    expect(captionOverflows({ full: LINE * 9, clamped: LINE * 2 })).toBe(true);
  });

  it('ignores a sub-pixel difference, which is rounding rather than overflow', () => {
    expect(captionOverflows({ full: 38.4, clamped: 38 })).toBe(false);
    expect(captionOverflows({ full: 39.5, clamped: 38 })).toBe(true);
  });

  it('never claims overflow from a shorter full measurement, however that arrived', () => {
    expect(captionOverflows({ full: LINE, clamped: LINE * 2 })).toBe(false);
  });
});
