import { placeTapTarget } from '../src/maps/placeTap';


const BIG_LAGOON = { lat: 11.1949, lng: 119.4013, zoom: 15 };


describe('where a tap on a place lands (PL-2 ticket 05)', () => {
  it('opens the in-app viewer when the place carries a pin', () => {
    expect(placeTapTarget('Big Lagoon', BIG_LAGOON, 'El Nido')).toEqual({
      kind: 'viewer',
      place: 'Big Lagoon',
      pin: BIG_LAGOON,
    });
  });

  it('hands off to Google Maps when the place was only ever typed', () => {
    const target = placeTapTarget('Big Lagoon', null, 'El Nido');

    expect(target?.kind).toBe('maps');
    expect(target?.kind === 'maps' && target.url).toContain('google.com/maps/search');
  });

  it('carries PL-1’s destination hint into the handoff, so an ambiguous name still lands', () => {
    const target = placeTapTarget('Big Lagoon', null, 'El Nido, Palawan');

    expect(target?.kind === 'maps' && decodeURIComponent(target.url)).toContain(
      'Big Lagoon, El Nido, Palawan',
    );
  });

  it('does not repeat a destination the place already names (PL-1’s hint rule, unchanged)', () => {
    const target = placeTapTarget('Big Lagoon, El Nido', null, 'El Nido');

    expect(target?.kind === 'maps' && decodeURIComponent(target.url)).not.toContain(
      'El Nido, El Nido',
    );
  });

  it('has nowhere to go when there is no place at all', () => {
    expect(placeTapTarget('', null, 'El Nido')).toBeNull();
    expect(placeTapTarget('   ', null, 'El Nido')).toBeNull();
  });

  it('opens the viewer for a pinned place even with no destination to hint with', () => {
    expect(placeTapTarget('Big Lagoon', BIG_LAGOON, null)?.kind).toBe('viewer');
  });

  it('falls back to the handoff when a stored pin is not a point on Earth', () => {
    const target = placeTapTarget('Big Lagoon', { lat: 999, lng: 0, zoom: 15 }, 'El Nido');

    expect(target?.kind)
      .toBe('maps');
  });

  it('refuses a pin whose zoom the tile provider does not serve, rather than rendering a grey screen', () => {
    expect(placeTapTarget('Big Lagoon', { lat: 11.1949, lng: 119.4013, zoom: 99 }, null)?.kind).toBe(
      'maps',
    );
  });
});
