import { lastPinIn, openingPinFor } from '../src/maps/openingPin';


const BIG_LAGOON = { lat: 11.1949, lng: 119.4013, zoom: 15 };

const NACPAN = { lat: 11.3167, lng: 119.4167, zoom: 14 };

const EL_NIDO = { lat: 11.18, lng: 119.39, zoom: 12 };


function day(activities: Array<{ pin: typeof BIG_LAGOON | null }>) {
  return { activities: activities.map((a, i) => ({ id: `a${i}`, pin: a.pin })) };
}


describe('where the picker opens (PL-2 ticket 04, user stories 5 and 6)', () => {
  it('opens on the trip’s destination pin when the trip has one', () => {
    expect(openingPinFor(EL_NIDO, [day([{ pin: BIG_LAGOON }])])).toEqual(EL_NIDO);
  });

  it('falls back to the last pin dropped in the trip when the destination is unpinned', () => {
    expect(openingPinFor(null, [day([{ pin: BIG_LAGOON }, { pin: NACPAN }])])).toEqual(NACPAN);
  });

  it('takes the last pinned activity, skipping the unpinned ones after it', () => {
    expect(openingPinFor(null, [day([{ pin: BIG_LAGOON }, { pin: null }])])).toEqual(BIG_LAGOON);
  });

  it('walks days in order, so a later day’s pin wins over an earlier one', () => {
    expect(openingPinFor(null, [day([{ pin: BIG_LAGOON }]), day([{ pin: NACPAN }])])).toEqual(NACPAN);
  });

  it('has nowhere to open when neither the trip nor any activity is pinned', () => {
    expect(openingPinFor(null, [day([{ pin: null }])])).toBeNull();
    expect(openingPinFor(null, [])).toBeNull();
  });

  it('ignores a stored pin that is not a point on Earth', () => {
    expect(openingPinFor({ lat: 999, lng: 0, zoom: 12 }, [day([{ pin: BIG_LAGOON }])])).toEqual(
      BIG_LAGOON,
    );
  });

  it('finds the last pin across a whole plan', () => {
    expect(lastPinIn([day([{ pin: BIG_LAGOON }]), day([{ pin: null }])])).toEqual(BIG_LAGOON);
    expect(lastPinIn([])).toBeNull();
  });
});


describe('the staged plan carries its pins under fields, and the same rule reads both', () => {
  it('finds a pin staged in the draft store, not yet saved', () => {
    const staged = [{ activities: [{ id: 'a1', fields: { title: 'Kayak', pin: BIG_LAGOON } }] }];

    expect(lastPinIn(staged)).toEqual(BIG_LAGOON);
  });

  it('prefers the trip destination over a staged pin, as user story 5 asks', () => {
    const staged = [{ activities: [{ id: 'a1', fields: { title: 'Kayak', pin: BIG_LAGOON } }] }];

    expect(openingPinFor(EL_NIDO, staged)).toEqual(EL_NIDO);
  });
});
