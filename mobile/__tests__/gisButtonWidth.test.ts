import { gisButtonWidth } from '../src/components/GoogleSignInButton.web';

describe('the Google button is sized to its container, never past it (S4.0)', () => {
  it('takes the container width on a phone — the overflow the S4.0 screenshot caught', () => {
    expect(gisButtonWidth(345)).toBe(345);
  });

  it('never exceeds the width Google itself accepts', () => {
    expect(gisButtonWidth(1200)).toBe(400);
  });

  it('never renders unusably narrow', () => {
    expect(gisButtonWidth(80)).toBe(200);
  });

  it('falls back to the full width when the container has not been measured', () => {
    expect(gisButtonWidth(0)).toBe(400);
    expect(gisButtonWidth(Number.NaN)).toBe(400);
  });

  it('is always an integer — GIS rejects fractional widths', () => {
    expect(Number.isInteger(gisButtonWidth(344.6))).toBe(true);
    expect(gisButtonWidth(344.6)).toBe(344);
  });
});
