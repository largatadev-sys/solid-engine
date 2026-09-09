import { addressOf, needsRewrite } from '../src/itineraries/itineraryAddress';


describe('the address a published link carries', () => {
  it('an itinerary id resolves to itself and needs no rewrite', () => {
    const address = addressOf('obj-1', { id: 'obj-1', tripId: 'trip-1' });

    expect(address).toEqual({ kind: 'itinerary', itineraryId: 'obj-1' });
    expect(needsRewrite(address)).toBe(false);
  });


  it('a trip id resolves to the itinerary behind it and asks to be rewritten', () => {
    const address = addressOf('trip-1', { id: 'obj-1', tripId: 'trip-1' });

    expect(address).toEqual({ kind: 'trip', tripId: 'trip-1', itineraryId: 'obj-1' });
    expect(needsRewrite(address)).toBe(true);
  });


  it('nothing loaded is missing, and a missing address never rewrites the url', () => {
    const address = addressOf('whatever', undefined);

    expect(address).toEqual({ kind: 'missing' });
    expect(needsRewrite(address)).toBe(false);
  });
});
