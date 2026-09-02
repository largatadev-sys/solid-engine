import { MAX_ZOOM, MIN_ZOOM } from '../src/maps/tileProjection';
import {
  isValidPin,
  pinAfterEdit,
  pinConfirmable,
  samePlaceText,
  type Pin,
} from '../src/maps/pinRules';


const BIG_LAGOON: Pin = { lat: 11.1949, lng: 119.4013, zoom: 15 };


describe('a pin is valid only inside the world it can be drawn in', () => {
  it('accepts a pin a traveler could actually have dropped', () => {
    expect(isValidPin(BIG_LAGOON)).toBe(true);
  });

  it.each([
    ['latitude past the north pole', { lat: 90.1, lng: 0, zoom: 12 }],
    ['latitude past the south pole', { lat: -90.1, lng: 0, zoom: 12 }],
    ['longitude past the antimeridian', { lat: 0, lng: 180.5, zoom: 12 }],
    ['longitude past the western antimeridian', { lat: 0, lng: -180.5, zoom: 12 }],
    ['zoom below what the provider serves', { lat: 0, lng: 0, zoom: MIN_ZOOM - 1 }],
    ['zoom above what the provider serves', { lat: 0, lng: 0, zoom: MAX_ZOOM + 1 }],
    ['a fractional zoom', { lat: 0, lng: 0, zoom: 12.5 }],
    ['a latitude that is not a number', { lat: Number.NaN, lng: 0, zoom: 12 }],
    ['a longitude that is not a number', { lat: 0, lng: Number.NaN, zoom: 12 }],
    ['an infinite coordinate', { lat: 0, lng: Number.POSITIVE_INFINITY, zoom: 12 }],
  ])('refuses %s', (_name, pin) => {
    expect(isValidPin(pin)).toBe(false);
  });

  it.each([
    ['the exact poles of the world', { lat: 90, lng: 0, zoom: 12 }],
    ['the antimeridian itself', { lat: 0, lng: 180, zoom: 12 }],
    ['the western antimeridian', { lat: 0, lng: -180, zoom: 12 }],
    ['null island', { lat: 0, lng: 0, zoom: MIN_ZOOM }],
  ])('accepts %s as a boundary a traveler can reach', (_name, pin) => {
    expect(isValidPin(pin)).toBe(true);
  });
});


describe('a pin requires a place a traveler can read', () => {
  it('refuses to confirm a pin with no label', () => {
    expect(pinConfirmable(BIG_LAGOON, '')).toBe(false);
  });

  it('refuses to confirm a pin whose label is only whitespace', () => {
    expect(pinConfirmable(BIG_LAGOON, '   ')).toBe(false);
  });

  it('confirms a pin that has both a point and a name', () => {
    expect(pinConfirmable(BIG_LAGOON, 'Big Lagoon')).toBe(true);
  });

  it('refuses to confirm an invalid pin even with a label', () => {
    expect(pinConfirmable({ lat: 999, lng: 0, zoom: 12 }, 'Nowhere')).toBe(false);
  });

  it('refuses to confirm when no pin was dropped', () => {
    expect(pinConfirmable(null, 'Big Lagoon')).toBe(false);
  });
});


describe('the stale-ref rule: editing a place clears its pin', () => {
  it('clears the pin when the place is genuinely renamed', () => {
    expect(pinAfterEdit(BIG_LAGOON, 'Big Lagoon', 'Small Lagoon')).toBeNull();
  });

  it('keeps the pin when the text is unchanged', () => {
    expect(pinAfterEdit(BIG_LAGOON, 'Big Lagoon', 'Big Lagoon')).toEqual(BIG_LAGOON);
  });

  it('keeps the pin when only surrounding whitespace changed', () => {
    expect(pinAfterEdit(BIG_LAGOON, 'Big Lagoon', '  Big Lagoon  ')).toEqual(BIG_LAGOON);
  });

  it('keeps the pin when only the casing changed', () => {
    expect(pinAfterEdit(BIG_LAGOON, 'Big Lagoon', 'big lagoon')).toEqual(BIG_LAGOON);
  });

  it('clears the pin when a typo is corrected, because the text did change', () => {
    expect(pinAfterEdit(BIG_LAGOON, 'Big Lagon', 'Big Lagoon')).toBeNull();
  });

  it('clears the pin when the place is emptied', () => {
    expect(pinAfterEdit(BIG_LAGOON, 'Big Lagoon', '')).toBeNull();
  });

  it('never clears when there was no pin to begin with', () => {
    expect(pinAfterEdit(null, '', 'Big Lagoon')).toBeNull();
    expect(pinAfterEdit(null, 'Big Lagoon', 'Small Lagoon')).toBeNull();
  });

  it('keeps a pin dropped against an empty label until the label itself moves', () => {
    expect(pinAfterEdit(BIG_LAGOON, '', '')).toEqual(BIG_LAGOON);
  });

  it('is atomic on search acceptance: text and pin arrive together and never self-clear', () => {
    const accepted = pinAfterEdit(BIG_LAGOON, 'Big Lagoon', 'Big Lagoon');

    expect(accepted).toEqual(BIG_LAGOON);
  });
});


describe('place text comparison is the stale-ref rule’s only judgement', () => {
  it.each([
    ['identical text', 'Big Lagoon', 'Big Lagoon', true],
    ['different casing', 'Big Lagoon', 'BIG LAGOON', true],
    ['padded whitespace', 'Big Lagoon', '  Big Lagoon ', true],
    ['a different place', 'Big Lagoon', 'Small Lagoon', false],
    ['a truncation', 'Big Lagoon', 'Big Lago', false],
    ['both empty', '', '   ', true],
  ])('%s compares as %p', (_name, one, other, expected) => {
    expect(samePlaceText(one, other)).toBe(expected);
  });
});
