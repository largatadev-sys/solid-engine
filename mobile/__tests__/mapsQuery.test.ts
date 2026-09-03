import {
  mapsLinkLabel,
  mapsPinUrl,
  mapsPlaceUrl,
  mapsQuery,
  mapsUrl,
} from '../src/places/mapsQuery';


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


describe('a pinned place hands Google the POINT, not the name (PL-2)', () => {
  it('sends coordinates, so the pin lands where the traveler put it', () => {
    expect(mapsPinUrl(11.1949, 119.4013)).toBe(
      'https://www.google.com/maps/search/?api=1&query=11.1949%2C119.4013',
    );
  });

  it('works for a name Google has never heard of — which is the whole point', () => {
    expect(mapsPinUrl(11.25, 119.3)).toContain('query=11.25%2C119.3');
  });

  it('handles the southern and western hemispheres without mangling the sign', () => {
    expect(mapsPinUrl(-33.8688, -151.2093)).toContain('query=-33.8688%2C-151.2093');
  });

  it('refuses a coordinate that is not a number rather than sending "NaN"', () => {
    expect(mapsPinUrl(Number.NaN, 119.4)).toBeUndefined();
    expect(mapsPinUrl(11.19, Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});


describe('a pinned place asks Google for the PLACE, anchored at our point (PL-2)', () => {
  it('sends the name with the map already centred where the traveler pinned it', () => {
    expect(mapsPlaceUrl('Lapus Lapus Beach', 11.178, 119.389, 16)).toBe(
      'https://www.google.com/maps/search/Lapus%20Lapus%20Beach/@11.178,119.389,16z',
    );
  });

  it('carries the zoom the traveler framed, so the escape opens as tight as the pin', () => {
    expect(mapsPlaceUrl('Big Lagoon', 11.19, 119.4, 19)).toContain(',19z');
  });

  it('clamps a zoom Google will not take rather than sending it', () => {
    expect(mapsPlaceUrl('Big Lagoon', 11.19, 119.4, 99)).toContain(',21z');
    expect(mapsPlaceUrl('Big Lagoon', 11.19, 119.4, -5)).toContain(',1z');
  });

  it('falls back to a sane zoom when the stored one is not a number', () => {
    expect(mapsPlaceUrl('Big Lagoon', 11.19, 119.4, Number.NaN)).toContain(',16z');
  });

  it('refuses a nameless or off-the-map place, leaving the caller to send coordinates', () => {
    expect(mapsPlaceUrl('   ', 11.19, 119.4, 16)).toBeUndefined();
    expect(mapsPlaceUrl('Big Lagoon', Number.NaN, 119.4, 16)).toBeUndefined();
  });

  it('escapes a name that would otherwise break the path', () => {
    expect(mapsPlaceUrl("Lolo Bob's B&B", 11.17, 119.39, 16)).toContain("Lolo%20Bob's%20B%26B");
  });
});
