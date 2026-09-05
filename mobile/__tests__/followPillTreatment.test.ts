import {
  followPillLabel,
  followPillTreatment,
} from '../src/profile/followPillTreatment';

describe('the pill wears one of three treatments, and never changes width between them', () => {
  it('offers Follow filled, the only call to action of the three', () => {
    expect(followPillTreatment('none')).toEqual({
      label: 'Follow',
      filled: true,
      muted: false,
      glyph: false,
    });
  });

  it('states Requested in the quiet third treatment — outlined, muted, glyphless', () => {
    expect(followPillTreatment('requested')).toEqual({
      label: 'Requested',
      filled: false,
      muted: true,
      glyph: false,
    });
  });

  it('keeps Following as S4.37 shipped it — outlined, ink, with its check', () => {
    expect(followPillTreatment('following')).toEqual({
      label: 'Following',
      filled: false,
      muted: false,
      glyph: true,
    });
  });

  it('distinguishes Requested from Following, which are both outlined', () => {
    expect(followPillTreatment('requested')).not.toEqual(followPillTreatment('following'));
  });

  it('names the state and the traveler, so a screen reader hears which is which', () => {
    expect(followPillLabel('requested', 'Maya Ocampo')).toBe('Requested Maya Ocampo');
    expect(followPillLabel('none', 'Maya Ocampo')).toBe('Follow Maya Ocampo');
    expect(followPillLabel('following', 'Maya Ocampo')).toBe('Following Maya Ocampo');
  });
});
