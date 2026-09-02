import { mapsLinkLabel, mapsQuery, mapsUrl } from '../src/places/mapsQuery';


describe('mapsQuery — the destination-hint rule (PL-1)', () => {
  it('returns the place alone when no destination is known', () => {
    expect(mapsQuery('Big Lagoon Kayaking', null)).toBe('Big Lagoon Kayaking');
  });

  it('appends the destination when the place does not carry it', () => {
    expect(mapsQuery('Big Lagoon Kayaking', 'El Nido, Palawan')).toBe(
      'Big Lagoon Kayaking, El Nido, Palawan',
    );
  });

  it('skips the hint when the place already contains the destination', () => {
    expect(mapsQuery('Big Lagoon, El Nido, Palawan', 'El Nido, Palawan')).toBe(
      'Big Lagoon, El Nido, Palawan',
    );
  });

  it('matches the destination case-insensitively', () => {
    expect(mapsQuery('Shimizu Island, EL NIDO', 'El Nido')).toBe('Shimizu Island, EL NIDO');
  });

  it('appends when the destination merely overlaps in words but is not contained', () => {
    expect(mapsQuery('Nido Beach Club', 'El Nido')).toBe('Nido Beach Club, El Nido');
  });

  it('trims surrounding whitespace on both sides before deciding', () => {
    expect(mapsQuery('  Big Lagoon  ', '  El Nido  ')).toBe('Big Lagoon, El Nido');
  });

  it('treats a blank destination as no destination', () => {
    expect(mapsQuery('Big Lagoon', '   ')).toBe('Big Lagoon');
  });

  it('returns undefined for a blank place — nothing is ever linked', () => {
    expect(mapsQuery('   ', 'El Nido')).toBeUndefined();
    expect(mapsQuery('', null)).toBeUndefined();
  });
});


describe('mapsUrl — the universal Google Maps search link (PL-1)', () => {
  it('builds the keyless universal search URL', () => {
    expect(mapsUrl('Big Lagoon', null)).toBe(
      'https://www.google.com/maps/search/?api=1&query=Big%20Lagoon',
    );
  });

  it('URL-encodes commas, ampersands and non-ASCII in the query', () => {
    expect(mapsUrl('Café & Bar', 'El Nido, Palawan')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Caf%C3%A9%20%26%20Bar%2C%20El%20Nido%2C%20Palawan',
    );
  });

  it('is undefined when the place is blank, so callers render nothing tappable', () => {
    expect(mapsUrl('  ', 'El Nido')).toBeUndefined();
  });
});


describe('the accessibility label every location link carries (PL-1)', () => {
  it('names the place and says the tap leaves for Google Maps', () => {
    expect(mapsLinkLabel('Big Lagoon')).toBe('Big Lagoon, open in Google Maps');
  });
});
