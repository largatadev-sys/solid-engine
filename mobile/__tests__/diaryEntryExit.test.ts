import { afterDeleteRoute, afterSaveRoute } from '../src/diary/diaryEntryExit';


const TRIP = 'trip-1';
const TITLE = 'Sunset at Las Cabanas';


describe('where the diary entry screen goes when it is finished, per the stack that opened it', () => {
  it('lands a save on the posted confirmation when the trip opened it', () => {
    expect(afterSaveRoute('trip', TRIP, TITLE)).toEqual({
      pathname: '/itineraries/[id]/diary/posted',
      params: { id: TRIP, title: TITLE, saved: 'true' },
    });
  });

  it('returns a save to the profile when the profile opened it, rather than flinging the traveler into the trip stack', () => {
    expect(afterSaveRoute('profile', TRIP, TITLE)).toEqual({ pathname: '/profile' });
  });

  it('lands a delete on the trip when the trip opened it', () => {
    expect(afterDeleteRoute('trip', TRIP)).toEqual({
      pathname: '/itineraries/[id]',
      params: { id: TRIP },
    });
  });

  it('returns a delete to the profile when the profile opened it', () => {
    expect(afterDeleteRoute('profile', TRIP)).toEqual({ pathname: '/profile' });
  });

  it('never sends the profile-s traveler to a route in the trip stack (S4.13: stacks do not share history)', () => {
    for (const route of [afterSaveRoute('profile', TRIP, TITLE), afterDeleteRoute('profile', TRIP)]) {
      expect(route.pathname).not.toContain('/itineraries/');
    }
  });
});
