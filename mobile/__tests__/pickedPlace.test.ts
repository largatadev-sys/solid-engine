import {
  detailFrom,
  headlineFor,
  movedAwayFrom,
  nameToSave,
  whereLine,
} from '../src/maps/pickedPlace';


const HOTEL = { name: "Lolo Bob's B&B", context: 'El Nido, Palawan', lat: 11.17, lng: 119.39, kind: 'hotel' };

const POSTCODE = { name: '5313', context: 'El Nido, Palawan', lat: 11.19, lng: 119.4, kind: 'postcode' };


describe('what the pin resolves to (PL-2, the Uber pattern)', () => {
  it('turns a geocoder answer into something a traveler can read', () => {
    expect(detailFrom(HOTEL, false)).toEqual({
      name: "Lolo Bob's B&B",
      nearby: false,
      kind: 'hotel',
      context: 'El Nido, Palawan',
      exact: false,
    });
  });

  it('rejects a postcode, because "5313" is not a place you tagged', () => {
    expect(detailFrom(POSTCODE, false)).toBeNull();
  });

  it('KEEPS a postcode-shaped answer when the traveler picked it from search', () => {
    expect(detailFrom(POSTCODE, true)).not.toBeNull();
  });

  it('has nothing to show over open water', () => {
    expect(detailFrom(null, false)).toBeNull();
  });

  it('refuses a nameless answer rather than rendering an empty headline', () => {
    expect(detailFrom({ ...HOTEL, name: '   ' }, false)).toBeNull();
  });
});


describe('the name the map offers', () => {
  it('is the venue name, with no OSM type appended', () => {
    expect(headlineFor(detailFrom(HOTEL, false))).toBe("Lolo Bob's B&B");
  });

  it('is empty when the map has nothing there, so the field shows its placeholder', () => {
    expect(headlineFor(null)).toBe('');
  });
});


describe('what gets saved is what the field holds', () => {
  it('saves the name, trimmed', () => {
    expect(nameToSave('  Nacpan Beach ')).toBe('Nacpan Beach');
  });

  it('has nothing to save when the traveler cleared it, so confirm must stay blocked', () => {
    expect(nameToSave('   ')).toBe('');
  });

  it('saves a name the traveler typed over an unnamed spot', () => {
    expect(nameToSave('Our secret cove')).toBe('Our secret cove');
  });
});

describe('a search pick stays exact until the traveler pans away', () => {
  const anchor = { lat: 11.1949, lng: 119.4013 };

  it('holds while the map has not really moved', () => {
    expect(movedAwayFrom(anchor, { lat: 11.19491, lng: 119.40131 })).toBe(false);
  });

  it('releases once the map moves a real distance', () => {
    expect(movedAwayFrom(anchor, { lat: 11.1975, lng: 119.4013 })).toBe(true);
  });

  it('treats an absent anchor as already moved, so panning always resolves', () => {
    expect(movedAwayFrom(null, anchor)).toBe(true);
  });
});


describe('a spot with nothing on it still tells the traveler WHERE (PL-2 founder pass)', () => {
  const NEARBY = {
    name: 'Tambalanang Island',
    context: 'El Nido, Palawan',
    lat: 11.25,
    lng: 119.3,
    kind: 'islet',
    nearby: true,
  };

  it('answers WHERE with the locality, never with a venue it is only close to', () => {
    expect(whereLine(detailFrom(NEARBY, false))).toBe('El Nido, Palawan');
  });

  it('leaves the name empty for a nearby anchor, so the field still asks to be filled', () => {
    expect(headlineFor(detailFrom(NEARBY, false))).toBe('');
  });

  it('reads the same for a place that IS named — one slot, one meaning', () => {
    expect(whereLine(detailFrom(HOTEL, false))).toBe('El Nido, Palawan');
  });

  it('says nothing at all when the map returned nothing at all', () => {
    expect(whereLine(null)).toBe('');
  });

  it('says nothing rather than guessing when the geocoder gave no locality', () => {
    expect(whereLine(detailFrom({ ...NEARBY, context: null }, false))).toBe('');
  });
});
