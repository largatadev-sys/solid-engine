import {
  detailFrom,
  headlineFor,
  movedAwayFrom,
  nameToSave,
  needsTyping,
} from '../src/maps/pickedPlace';


const HOTEL = { name: "Lolo Bob's B&B", context: 'El Nido, Palawan', lat: 11.17, lng: 119.39, kind: 'hotel' };

const POSTCODE = { name: '5313', context: 'El Nido, Palawan', lat: 11.19, lng: 119.4, kind: 'postcode' };


describe('what the crosshair resolves to (PL-2, the Uber pattern)', () => {
  it('turns a geocoder answer into something a traveler can read', () => {
    expect(detailFrom(HOTEL, false)).toEqual({
      name: "Lolo Bob's B&B",
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


describe('the headline under the map', () => {
  it('reads name and type, the way a venue reads', () => {
    expect(headlineFor(detailFrom(HOTEL, false), '')).toBe("Lolo Bob's B&B · hotel");
  });

  it('drops OSM’s meaningless "yes" type rather than printing it', () => {
    expect(headlineFor(detailFrom({ ...HOTEL, kind: 'yes' }, false), '')).toBe("Lolo Bob's B&B");
  });

  it('falls back to what the traveler typed when nothing resolved', () => {
    expect(headlineFor(null, 'My secret cove')).toBe('My secret cove');
  });

  it('says something honest when there is neither', () => {
    expect(headlineFor(null, '')).toBe('Dropped pin');
  });
});


describe('what actually gets saved', () => {
  it('saves the resolved name when the traveler typed nothing', () => {
    expect(nameToSave(detailFrom(HOTEL, false), '')).toBe("Lolo Bob's B&B");
  });

  it('a typed name always wins over the resolved one', () => {
    expect(nameToSave(detailFrom(HOTEL, false), 'The good B&B')).toBe('The good B&B');
  });

  it('has nothing to save when neither exists — confirm must stay blocked', () => {
    expect(nameToSave(null, '')).toBe('');
    expect(needsTyping(null, '')).toBe(true);
  });

  it('does not ask for typing when a place resolved', () => {
    expect(needsTyping(detailFrom(HOTEL, false), '')).toBe(false);
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
